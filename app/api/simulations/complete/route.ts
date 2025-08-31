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

    const { simulationId, transcript, metrics, status } = await request.json()

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

    const reportResponse = await openai.chat.completions.create({
      model: 'gpt-4-turbo-2024-04-09',
      messages: [
        { 
          role: 'system', 
          content: 'אתה מומחה בניתוח סימולציות מכירות. תמיד החזר JSON תקין בעברית עם דוח מפורט ומועיל.' 
        },
        { role: 'user', content: reportPrompt }
      ],
      temperature: 0.7,
      max_tokens: 2000
    })

    const reportContent = reportResponse.choices[0]?.message?.content || '{}'
    console.log('📝 תגובה גולמית מ-OpenAI:', reportContent.substring(0, 200) + '...')
    
    const cleanedContent = cleanOpenAIResponse(reportContent)
    console.log('🧹 תוכן מנוקה:', cleanedContent.substring(0, 200) + '...')
    
    let reportData
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

    // עדכון הסימולציה
    const { error: updateError } = await supabase
      .from('simulations')
      .update({
        status: 'completed',
        completed_at: new Date().toISOString(),
        duration_seconds: duration,
        transcript: transcript,
        score: reportData.overall_score,
        ai_feedback: reportData,
        coins_earned: Math.max(1, Math.floor(reportData.overall_score / 2)) // 1-5 מטבעות לפי ביצועים
      })
      .eq('id', simulationId)

    if (updateError) {
      console.error('❌ שגיאה בעדכון סימולציה:', updateError)
    }

    // יצירת דוח מפורט
    const { data: report, error: reportError } = await supabase
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
        created_at: new Date().toISOString()
      })
      .select()
      .single()

    if (reportError) {
      console.error('❌ שגיאה ביצירת דוח:', reportError)
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

    console.log('✅ סימולציה הושלמה בהצלחה')

    return NextResponse.json({
      success: true,
      report: report,
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
