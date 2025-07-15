import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { addCallLog } from '@/lib/addCallLog'

// פונקציית cleanOpenAIResponse העדכנית והקריטית
function cleanOpenAIResponse(content: string): string {
  if (!content) return '{}';
  
  // ניקוי Markdown blocks
  let cleaned = content.replace(/```(?:json|JSON)?\s*/g, '').replace(/```\s*$/g, '');
  cleaned = cleaned.replace(/^`+|`+$/g, '').trim();
  
  // חיפוש JSON boundaries
  const jsonStart = cleaned.indexOf('{');
  if (jsonStart !== -1) {
    cleaned = cleaned.substring(jsonStart);
  }
  
  // 🆕 תיקון קריטי חדש - מפתחות שמופיעים ללא פסיק אחרי ערך
  // Pattern: "תובנות":"טקסט" איך_משפרים": -> "תובנות":"טקסט", "איך_משפרים":
  cleaned = cleaned.replace(/("[\u0590-\u05FF\w_]+"\s*:\s*"[^"]*")\s*([א-ת\w_]+"\s*:)/g, (match, p1, p2) => {
    return `${p1}, "${p2}`;
  });
  
  // 🆕 תיקון מרכאות שנסגרות באמצע הערך
  // Pattern: "key":"value" unquoted_next_key": -> "key":"value", "unquoted_next_key":
  cleaned = cleaned.replace(/("[\u0590-\u05FF\w_]+"\s*:\s*"[^"]*")\s*([^,\s][^":]*":\s*)/g, (match, p1, p2) => {
    return `${p1}, ${p2}`;
  });
  
  // מחפש patterns של: "key":"value", text" ומתקן אותם
  cleaned = cleaned.replace(/("[\u0590-\u05FF\w_]+"\s*:\s*"[^"]+)"(\s*,\s*)([^":}\]]+)"/g, (match, p1, p2, p3) => {
    return `${p1} ${p3.trim()}"`;
  });
  
  // תיקון נוסף למקרים של מרכאות כפולות באמצע ערך
  cleaned = cleaned.replace(/:\s*"([^"]*)"(,)([^":{}[\]]+)"/g, ':"$1 $3"');
  
  // אלגוריתם איזון סוגריים
  let braceCount = 0;
  let lastValidEnd = -1;
  
  for (let i = 0; i < cleaned.length; i++) {
    const char = cleaned[i];
    if (char === '{') braceCount++;
    else if (char === '}') {
      braceCount--;
      if (braceCount === 0) {
        lastValidEnd = i;
        break;
      }
    }
  }
  
  if (lastValidEnd !== -1) {
    cleaned = cleaned.substring(0, lastValidEnd + 1);
  }
  
  // תיקון אוטומטי
  try {
    JSON.parse(cleaned);
    return cleaned;
  } catch (error) {
    let fixed = cleaned
      .replace(/,(\s*[}\]])/g, '$1')
      .replace(/([^\\]")([^"]*?)\n([^"]*?)(")/g, '$1$2 $3$4')
      .replace(/\\"/g, '"').replace(/\\n/g, ' ');
    
    if (!fixed.endsWith('}') && fixed.includes('{')) {
      fixed += '}';
    }
    
    try {
      JSON.parse(fixed);
      return fixed;
    } catch {
      return '{}';
    }
  }
}

export async function GET(request: NextRequest) {
  try {
    const supabase = createClient()
    const agentId = request.nextUrl.searchParams.get('agentId')
    
    if (!agentId) {
      return NextResponse.json({ error: 'מזהה נציג נדרש' }, { status: 400 })
    }

    // שליפת 5 השיחות האחרונות של הנציג שהושלמו
    const { data: recentCalls, error: callsError } = await supabase
      .from('calls')
      .select('id, analysis_report, tone_analysis_report, overall_score, call_type, created_at')
      .eq('user_id', agentId)
      .eq('processing_status', 'completed')
      .not('analysis_report', 'is', null)
      .order('created_at', { ascending: false })
      .limit(5)

    if (callsError) {
      console.error('Error fetching calls:', callsError)
      return NextResponse.json({ error: 'שגיאה בשליפת השיחות' }, { status: 500 })
    }

    if (!recentCalls || recentCalls.length === 0) {
      return NextResponse.json({
        improvement_points: ['אין מספיק שיחות מנותחות כדי לספק המלצות'],
        preservation_points: ['אין מספיק שיחות מנותחות כדי לזהות נקודות חוזק'],
        calls_analyzed: 0,
        average_score: 0
      })
    }

    // חילוץ נקודות לשיפור ושימור מכל השיחות
    const allImprovementPoints: string[] = []
    const allPreservationPoints: string[] = []
    let totalScore = 0

    recentCalls.forEach((call) => {
      const analysisReport = (call.analysis_report as any) || {}
      const toneReport = (call.tone_analysis_report as any) || {}
      
      // חילוץ נקודות לשיפור
      const improvementFromAnalysis = analysisReport.improvement_points || 
                                    analysisReport.נקודות_לשיפור || 
                                    analysisReport['נקודות לשיפור'] || []
      const improvementFromTone = toneReport.המלצות_שיפור || 
                                toneReport.improvement_recommendations || []
      
      if (Array.isArray(improvementFromAnalysis)) {
        allImprovementPoints.push(...improvementFromAnalysis)
      }
      if (Array.isArray(improvementFromTone)) {
        allImprovementPoints.push(...improvementFromTone)
      }
      
      // חילוץ נקודות לשימור
      const preservationFromAnalysis = analysisReport.strengths_and_preservation_points || 
                                     analysisReport.נקודות_חוזק || 
                                     analysisReport['נקודות חוזק לשימור'] || []
      const preservationFromTone = toneReport.נקודות_חוזק_טונליות || 
                                 toneReport.strength_points || []
      
      if (Array.isArray(preservationFromAnalysis)) {
        allPreservationPoints.push(...preservationFromAnalysis)
      }
      if (Array.isArray(preservationFromTone)) {
        allPreservationPoints.push(...preservationFromTone)
      }
      
      // חישוב ציון
      totalScore += call.overall_score || 0
    })

    const averageScore = Math.round((totalScore / recentCalls.length) * 10) / 10

    // יצירת פרומפט ל-OpenAI לסיכום חכם
    const openai = new (await import('openai')).default({
      apiKey: process.env.OPENAI_API_KEY,
    })

    const summaryPrompt = `
אתה מומחה לאימון נציגי מכירות ושירות לקוחות. 
תפקידך לנתח את כל נקודות השיפור ונקודות השימור מ-${recentCalls.length} השיחות האחרונות של הנציג ולספק סיכום מרוכז ופרקטי.

נתונים:
- מספר שיחות שנותחו: ${recentCalls.length}
- ציון ממוצע: ${averageScore}/10
- נקודות לשיפור שזוהו: ${allImprovementPoints.join(', ')}
- נקודות לשימור שזוהו: ${allPreservationPoints.join(', ')}

בחר את 3 נקודות השיפור החשובות ביותר ואת 3 נקודות השימור החשובות ביותר.
התמקד בנקודות שחוזרות על עצמן או שהן הכי משמעותיות לביצועי הנציג.

החזר JSON במבנה הבא:
{
  "improvement_points": [
    "נקודת שיפור 1 - ספציפית ופרקטית",
    "נקודת שיפור 2 - ספציפית ופרקטית", 
    "נקודת שיפור 3 - ספציפית ופרקטית"
  ],
  "preservation_points": [
    "נקודת שימור 1 - מה הנציג עושה טוב",
    "נקודת שימור 2 - מה הנציג עושה טוב",
    "נקודת שימור 3 - מה הנציג עושה טוב"
  ],
  "summary": "סיכום קצר של המגמות שנצפו בשיחות האחרונות"
}

⚠️ חובה: החזר JSON נקי בלבד ללא markdown או backticks!
`

    const openaiResponse = await openai.chat.completions.create({
      model: 'gpt-4o-2024-08-06',
      messages: [
        {
          role: 'system',
          content: 'אתה מומחה בניתוח נתוני ביצועים ומתמחה בסיכום נקודות לשיפור ושימור לנציגי מכירות ושירות.'
        },
        {
          role: 'user',
          content: summaryPrompt
        }
      ],
      temperature: 0.3
    })

    const rawContent = openaiResponse.choices[0].message.content || '{}'
    
    // שימוש בפונקציית ניקוי הקריטית
    const cleanedContent = cleanOpenAIResponse(rawContent)
    
    let summaryData
    try {
      summaryData = JSON.parse(cleanedContent)
    } catch (parseError: any) {
      console.error('שגיאה בניתוח JSON:', parseError.message)
      console.error('תוכן גולמי:', rawContent.substring(0, 500))
      
      // fallback אינטליגנטי
      summaryData = {
        improvement_points: allImprovementPoints.slice(0, 3).length > 0 
          ? allImprovementPoints.slice(0, 3)
          : ['שפר את הטון הכללי', 'התמקד יותר בצרכי הלקוח', 'עבוד על סגירת עסקאות'],
        preservation_points: allPreservationPoints.slice(0, 3).length > 0
          ? allPreservationPoints.slice(0, 3) 
          : ['המשך גישה מקצועית', 'שמור על רמת שירות טובה', 'התמדה בעבודה איכותית'],
        summary: 'ניתוח הושלם על סמך הנתונים הזמינים'
      }
    }

    return NextResponse.json({
      ...summaryData,
      calls_analyzed: recentCalls.length,
      average_score: averageScore,
      analysis_period: '5 השיחות האחרונות'
    })

  } catch (error) {
    console.error('Error in agent summary:', error)
    return NextResponse.json({ 
      error: 'שגיאה בחישוב סיכום הנציג',
      improvement_points: ['שגיאה טכנית - אנא נסה שוב מאוחר יותר'],
      preservation_points: ['שגיאה טכנית - אנא נסה שוב מאוחר יותר'],
      calls_analyzed: 0,
      average_score: 0
    }, { status: 500 })
  }
} 