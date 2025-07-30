import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

// Force dynamic rendering for this API route
export const dynamic = 'force-dynamic'

// פונקציית exponential backoff לקריאות OpenAI
async function callOpenAIWithBackoff(openai: any, params: any, maxRetries = 5) {
  let delay = 1000 // התחל עם שנייה אחת
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      // הוסף delay לפני כל קריאה (מלבד הראשונה)
      if (attempt > 1) {
        console.log(`🔄 נסיון ${attempt}/${maxRetries} אחרי delay של ${delay}ms`)
        await new Promise(resolve => setTimeout(resolve, delay))
      }
      
      const response = await openai.chat.completions.create(params)
      console.log(`✅ קריאת OpenAI הצליחה בנסיון ${attempt}`)
      return response
      
    } catch (error: any) {
      console.error(`❌ נסיון ${attempt} נכשל:`, error.message)
      
      // אם זה rate limit error, המשך לנסות
      if (error.status === 429 && attempt < maxRetries) {
        // הכפל את הdelay עם jitter (רנדומיות)
        const jitter = Math.random() * 0.5 + 0.75 // בין 0.75 ל-1.25
        delay = Math.min(delay * 2 * jitter, 60000) // מקסימום 60 שניות
        continue
      }
      
      // אם זה לא rate limit או נגמרו הנסיונות - זרוק שגיאה
      throw error
    }
  }
  
  throw new Error(`נכשלו כל ${maxRetries} הנסיונות לקריאת OpenAI`)
}

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
  
  // תיקון קריטי חדש - מפתחות שמופיעים ללא פסיק אחרי ערך
  cleaned = cleaned.replace(/("[\u0590-\u05FF\w_]+"\s*:\s*"[^"]*")\s*([א-ת\w_]+"\s*:)/g, (match, p1, p2) => {
    return `${p1}, "${p2}`;
  });
  
  // תיקון מרכאות שנסגרות באמצע הערך
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
    const companyId = request.nextUrl.searchParams.get('companyId')
    
    if (!companyId) {
      return NextResponse.json({ error: 'מזהה חברה נדרש' }, { status: 400 })
    }

    // שליפת 5 השיחות האחרונות של כל הצוות שהושלמו
    const { data: teamMembers, error: teamError } = await supabase
      .from('users')
      .select('id, full_name, role')
      .eq('company_id', companyId)
      .in('role', ['agent', 'manager'])

    if (teamError) {
      console.error('Error fetching team members:', teamError)
      return NextResponse.json({ error: 'שגיאה בשליפת חברי הצוות' }, { status: 500 })
    }

    if (!teamMembers || teamMembers.length === 0) {
      return NextResponse.json({
        key_insights: ['אין עדיין חברי צוות במערכת'],
        improvement_recommendations: ['הוסף נציגים למערכת כדי לקבל תובנות'],
        team_strengths: ['אין מספיק נתונים'],
        calls_analyzed: 0,
        team_average_score: 0,
        analysis_period: 'לא זמין'
      })
    }

    const teamIds = teamMembers.map(member => member.id)

    // שליפת 5 השיחות האחרונות של הצוות
    const { data: recentCalls, error: callsError } = await supabase
      .from('calls')
      .select(`
        id, 
        analysis_report, 
        tone_analysis_report, 
        overall_score, 
        call_type, 
        created_at,
        user_id,
        users!inner(full_name, role)
      `)
      .in('user_id', teamIds)
      .eq('processing_status', 'completed')
      .not('analysis_report', 'is', null)
      .order('created_at', { ascending: false })
      .limit(5)

    if (callsError) {
      console.error('Error fetching team calls:', callsError)
      return NextResponse.json({ error: 'שגיאה בשליפת שיחות הצוות' }, { status: 500 })
    }

    if (!recentCalls || recentCalls.length === 0) {
      return NextResponse.json({
        key_insights: ['אין מספיק שיחות מנותחות מהצוות'],
        improvement_recommendations: ['הצוות צריך לבצע עוד שיחות כדי לקבל תובנות'],
        team_strengths: ['אין מספיק נתונים לזיהוי נקודות חוזק'],
        calls_analyzed: 0,
        team_average_score: 0,
        analysis_period: 'לא זמין'
      })
    }

    // חילוץ נתונים מכל השיחות
    const allImprovementPoints: string[] = []
    const allPreservationPoints: string[] = []
    const callDetails: any[] = []
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
      
      // פרטי השיחה למטא דטה
      callDetails.push({
        agent_name: (call.users as any)?.full_name || 'לא זמין',
        score: call.overall_score || 0,
        call_type: call.call_type,
        date: call.created_at
      })
    })

    const teamAverageScore = Math.round((totalScore / recentCalls.length) * 10) / 10

    // יצירת פרומפט מתקדם לניתוח צוות
    const openai = new (await import('openai')).default({
      apiKey: process.env.OPENAI_API_KEY,
    })

    const teamAnalysisPrompt = `
אתה מומחה לניתוח ביצועי צוותי מכירות ושירות לקוחות ברמה ארגונית.
תפקידך לנתח את כל נתוני הביצועים של הצוות ולספק תובנות אסטרטגיות למנהל.

נתוני הצוות:
- מספר שיחות שנותחו: ${recentCalls.length}
- ציון ממוצע של הצוות: ${teamAverageScore}/10
- מספר חברי צוות: ${teamMembers.length}
- פירוט שיחות: ${callDetails.map(call => `${call.agent_name}: ${call.score}/10 (${call.call_type})`).join(', ')}

נקודות שיפור שזוהו בצוות:
${allImprovementPoints.join(', ')}

נקודות חוזק שזוהו בצוות:
${allPreservationPoints.join(', ')}

בחר את 3 התובנות המרכזיות ביותר על הצוות, את 3 ההמלצות החשובות ביותר לשיפור, ואת 3 נקודות החוזק הבולטות.
התמקד בדפוסים שחוזרים על עצמם ברמת הצוות ובהזדמנויות לשיפור משמעותי.

החזר JSON במבנה הבא:
{
  "key_insights": [
    "תובנה מרכזית 1 על ביצועי הצוות",
    "תובנה מרכזית 2 על מגמות בצוות", 
    "תובנה מרכזית 3 על אתגרים או הצלחות"
  ],
  "improvement_recommendations": [
    "המלצה 1 לשיפור ביצועי הצוות",
    "המלצה 2 לחיזוק נקודות חולשה",
    "המלצה 3 לאופטימיזציה של תהליכים"
  ],
  "team_strengths": [
    "נקודת חוזק 1 של הצוות",
    "נקודת חוזק 2 לשימור והעמסה",
    "נקודת חוזק 3 שיש לנצל"
  ],
  "priority_focus": "הפוקוס העיקרי שהמנהל צריך להתמקד בו השבוע"
}

⚠️ חובה: החזר JSON נקי בלבד ללא markdown או backticks!
    `

    console.log('🚀 מתחיל ניתוח תובנות צוות עם OpenAI...')
    
    const openaiResponse = await callOpenAIWithBackoff(openai, {
      model: 'gpt-4o-2024-08-06',
      messages: [
        {
          role: 'system',
          content: 'אתה יועץ ניהול מומחה בניתוח ביצועי צוותי מכירות ושירות לקוחות. אתה מספק תובנות אסטרטגיות ופרקטיות למנהלים.'
        },
        {
          role: 'user',
          content: teamAnalysisPrompt
        }
      ],
      temperature: 0.3
    }, 5) // מקסימום 5 נסיונות

    const rawContent = openaiResponse.choices[0].message.content || '{}'
    const cleanedContent = cleanOpenAIResponse(rawContent)
    
    let insightsData
    try {
      insightsData = JSON.parse(cleanedContent)
    } catch (parseError: any) {
      console.error('שגיאה בניתוח JSON:', parseError.message)
      console.error('תוכן גולמי:', rawContent.substring(0, 500))
      
      // fallback אינטליגנטי
      insightsData = {
        key_insights: [
          `הצוות ביצע ${recentCalls.length} שיחות עם ציון ממוצע ${teamAverageScore}`,
          'נדרש ניתוח נוסף כדי לזהות מגמות',
          'המשך לעקוב אחר ביצועי הצוות'
        ],
        improvement_recommendations: allImprovementPoints.slice(0, 3).length > 0 
          ? allImprovementPoints.slice(0, 3)
          : ['שפר תקשורת עם לקוחות', 'התמקד בסגירת עסקאות', 'חזק את כישורי המכירה'],
        team_strengths: allPreservationPoints.slice(0, 3).length > 0
          ? allPreservationPoints.slice(0, 3) 
          : ['מקצועיות בשירות', 'יחס חיובי ללקוחות', 'התמדה בעבודה'],
        priority_focus: 'המשך פיתוח הצוות וחיזוק נקודות החולשה'
      }
    }

    return NextResponse.json({
      ...insightsData,
      calls_analyzed: recentCalls.length,
      team_average_score: teamAverageScore,
      analysis_period: '5 השיחות האחרונות של הצוות',
      team_size: teamMembers.length,
      last_updated: new Date().toISOString()
    })

  } catch (error) {
    console.error('Error in team insights:', error)
    return NextResponse.json({ 
      error: 'שגיאה בחישוב תובנות הצוות',
      key_insights: ['שגיאה טכנית - אנא נסה שוב מאוחר יותר'],
      improvement_recommendations: ['שגיאה טכנית - אנא נסה שוב מאוחר יותר'],
      team_strengths: ['שגיאה טכנית - אנא נסה שוב מאוחר יותר'],
      calls_analyzed: 0,
      team_average_score: 0
    }, { status: 500 })
  }
}