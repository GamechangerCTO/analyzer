import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import OpenAI from 'openai'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

// פונקציה לניקוי תגובות OpenAI מ-JSON לא תקין
function cleanOpenAIResponse(content: string): string {
  if (!content) return '{}';
  
  let cleaned = content.replace(/```(?:json|JSON)?\s*/g, '').replace(/```\s*$/g, '');
  cleaned = cleaned.replace(/^`+|`+$/g, '').trim();
  
  const jsonStart = cleaned.indexOf('{');
  if (jsonStart !== -1) {
    cleaned = cleaned.substring(jsonStart);
  }
  
  // תיקון קריטי לשגיאות JSON נפוצות
  cleaned = cleaned.replace(/("[\u0590-\u05FF\w_]+"\s*:\s*"[^"]*")\s*([א-ת\w_]+"\s*:)/g, (match, p1, p2) => {
    return `${p1}, "${p2}`;
  });
  
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

export async function POST(request: NextRequest) {
  try {
    const supabase = createClient()
    
    // בדיקת אימות
    const { data: { session }, error: authError } = await supabase.auth.getSession()
    if (authError || !session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { simulationId, transcript, metrics, status, generateReport = true } = await request.json()

    console.log('🏁 מסיים סימולציה:', simulationId)

    // קבלת נתוני הסימולציה
    const { data: simulation } = await supabase
      .from('simulations')
      .select(`
        *,
        customer_personas_hebrew (*)
      `)
      .eq('id', simulationId)
      .eq('agent_id', session.user.id)
      .single()

    if (!simulation) {
      return NextResponse.json({ error: 'Simulation not found' }, { status: 404 })
    }

    // חישוב משך הסימולציה
    const duration = metrics.startTime ? 
      Math.floor((Date.now() - new Date(metrics.startTime).getTime()) / 1000) : 0

    let reportData: any = null
    let report: any = null

    // יצירת דוח רק אם נדרש
    if (generateReport) {
      console.log('🤖 יוצר דוח AI...')
      
      // יצירת דוח AI מפורט בעברית
      const reportPrompt = `
אתה מומחה בניתוח סימולציות מכירות ויצירת דוחות בעברית.

## פרטי הסימולציה:
- לקוח ווירטואלי: ${simulation.customer_personas_hebrew?.[0]?.persona_name || 'לא צוין'}
- סוג אישיות: ${simulation.customer_personas_hebrew?.[0]?.personality_type || 'לא צוין'}
- רמת קושי: ${simulation.difficulty_level}
- משך זמן: ${Math.floor(duration / 60)} דקות

## תמלול השיחה:
${transcript || 'לא זמין תמלול'}

## מטריקות:
- זמן תגובה ממוצע: ${metrics.responseTime || 0}ms
- מספר הפרעות: ${metrics.interruptionsCount || 0}
- התנגדות נוכחית: ${metrics.currentObjection || 'לא זוהתה'}

צור דוח מפורט בעברית שיכלול:

1. **ניתוח ביצועים כללי** - איך הנציג התמודד עם האתגר
2. **נקודות חוזק** - מה עבד טוב בשיחה
3. **תחומים לשיפור** - איפה יש מקום להתפתחות
4. **ציטוטים ספציפיים** - דוגמאות מהשיחה עם הסבר
5. **המלצות מעשיות** - צעדים קונקרטיים לשיפור
6. **ציון מפורט** - ציון מ-1 עד 10 עם הנמקה

החזר JSON בפורמט:
{
  "overall_score": <ציון מ-1 עד 10>,
  "summary": "סיכום כללי של הביצועים",
  "strengths": ["חוזקה 1", "חוזקה 2", "חוזקה 3"],
  "improvement_areas": ["תחום לשיפור 1", "תחום לשיפור 2"],
  "specific_feedback": [
    {
      "category": "קטגוריה",
      "quote": "ציטוט מהשיחה",
      "analysis": "ניתוח מה טוב/רע",
      "suggestion": "הצעה לשיפור"
    }
  ],
  "recommendations": [
    "המלצה מעשית 1",
    "המלצה מעשית 2",
    "המלצה מעשית 3"
  ],
  "next_training_focus": "התמקדות לאימון הבא",
  "detailed_scores": {
    "communication": <1-10>,
    "objection_handling": <1-10>,
    "relationship_building": <1-10>,
    "closing": <1-10>,
    "product_knowledge": <1-10>
  }
}
`

      console.log('🤖 יוצר דוח AI...')

      const systemInstruction = 'אתה מומחה בניתוח סימולציות מכירות. תמיד החזר JSON תקין בעברית עם דוח מפורט ומועיל.'
      
      // ✅ שימוש ב-Responses API למודלי GPT-5 Nano
      const reportResponse = await (openai as any).responses.create({
        model: 'gpt-5-nano-2025-08-07',
        input: systemInstruction + '\n\n' + reportPrompt,
        reasoning: { effort: "low" },
        text: { verbosity: "high" }
      })

      const reportContent = reportResponse.output_text || '{}'
      console.log('📝 תגובה גולמית מ-OpenAI:', reportContent.substring(0, 200) + '...')
      
      const cleanedContent = cleanOpenAIResponse(reportContent)
      console.log('🧹 תוכן מנוקה:', cleanedContent.substring(0, 200) + '...')
      
      try {
        reportData = JSON.parse(cleanedContent)
      } catch (parseError: any) {
        console.error('❌ שגיאה בניתוח JSON:', parseError.message)
        
        // fallback - דוח בסיסי
        reportData = {
          overall_score: 7,
          summary: `סימולציה הושלמה עם ${simulation.customer_personas_hebrew?.[0]?.persona_name || 'לקוח ווירטואלי'}. הנציג הראה ביצועים סבירים.`,
          strengths: ['השתתפות פעילה', 'ניסיון להתמודד עם התנגדויות'],
          improvement_areas: ['שיפור זמני תגובה', 'חיזוק ביטחון'],
          specific_feedback: [],
          recommendations: ['המשך אימון על התמודדות עם התנגדויות', 'תרגול שאלות פתוחות'],
          next_training_focus: 'בניית קשר עם לקוחות',
          detailed_scores: {
            communication: 7,
            objection_handling: 6,
            relationship_building: 7,
            closing: 6,
            product_knowledge: 7
          }
        }
      }
      
      // שמירת ציונים לפני/אחרי
      const beforeScores = simulation.focused_parameters || []
      const afterScores = beforeScores.map((param: any) => ({
        name: param.name,
        hebrewName: param.hebrewName,
        score: reportData.detailed_scores?.[param.name] || param.score + 1, // default: שיפור של 1
        category: param.category
      }))

      const improvementDelta = beforeScores.reduce((acc: any, param: any) => {
        const afterScore = afterScores.find((a: any) => a.name === param.name)?.score || param.score
        acc[param.name] = {
          before: param.score,
          after: afterScore,
          delta: afterScore - param.score
        }
        return acc
      }, {})

      // יצירת דוח מפורט
      const { data: reportResult, error: reportError } = await supabase
        .from('simulation_reports_hebrew')
        .insert({
          simulation_id: simulationId,
          agent_id: session.user.id,
          company_id: simulation.company_id,
          overall_score: reportData.overall_score,
          detailed_scores: reportData.detailed_scores,
          summary: reportData.summary,
          strengths: reportData.strengths,
          improvement_areas: reportData.improvement_areas,
          specific_feedback: reportData.specific_feedback,
          recommendations: reportData.recommendations,
          next_training_focus: reportData.next_training_focus,
          simulation_metrics: metrics,
          before_simulation_scores: beforeScores,
          after_simulation_scores: afterScores,
          improvement_delta: improvementDelta,
          created_at: new Date().toISOString()
        })
        .select()
        .single()

      if (reportError) {
        console.error('❌ שגיאה ביצירת דוח:', reportError)
      } else {
        report = reportResult
      }
      
      // עדכון מטבעות הנציג
      await supabase
        .from('agent_coins')
        .upsert({
          agent_id: session.user.id,
          company_id: simulation.company_id,
          total_coins: Math.max(1, Math.floor(reportData.overall_score / 2)),
          last_earned: new Date().toISOString()
        }, {
          onConflict: 'agent_id',
          ignoreDuplicates: false
        })
    } else {
      console.log('⏹️ סימולציה נעצרה ללא יצירת דוח')
      // ציון בסיסי לסימולציה שנעצרה
      reportData = { overall_score: 5 }
    }

    // עדכון הסימולציה
    const { error: updateError } = await supabase
      .from('simulations')
      .update({
        status: 'completed',
        completed_at: new Date().toISOString(),
        duration_seconds: duration,
        transcript: transcript,
        score: reportData.overall_score,
        ai_feedback: generateReport ? reportData : null,
        coins_earned: generateReport ? Math.max(1, Math.floor(reportData.overall_score / 2)) : 0
      })
      .eq('id', simulationId)

    if (updateError) {
      console.error('❌ שגיאה בעדכון סימולציה:', updateError)
    }

    // ספירת דקות סימולציה
    console.log('⏱️ מעדכן מכסת דקות סימולציה...', { 
      company_id: simulation.company_id, 
      duration_seconds: duration 
    })
    
    const { data: minutesDeducted, error: minutesError } = await supabase
      .rpc('deduct_simulation_minutes', {
        p_company_id: simulation.company_id,
        p_simulation_id: simulationId,
        p_duration_seconds: duration
      })
    
    if (minutesError) {
      console.error('❌ שגיאה בספירת דקות סימולציה:', minutesError)
      // לא נכשיל את הסימולציה בגלל זה, רק לוג
    } else {
      console.log('✅ דקות סימולציה עודכנו:', minutesDeducted)
    }

    console.log('✅ סימולציה הושלמה בהצלחה')

    return NextResponse.json({
      success: true,
      report: report,
      reportId: report?.id || null,
      simulation: {
        ...simulation,
        status: 'completed',
        score: reportData.overall_score,
        duration_seconds: duration
      }
    })

  } catch (error) {
    console.error('💥 שגיאה כללית בסיום סימולציה:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
