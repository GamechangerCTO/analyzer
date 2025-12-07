import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import OpenAI from 'openai'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
})

export async function POST(request: Request) {
  try {
    const { simulationId, transcript, duration } = await request.json()
    
    if (!simulationId) {
      return NextResponse.json({ error: 'חסר מזהה סימולציה' }, { status: 400 })
    }
    
    const supabase = createClient()
    
    // בדיקת אימות
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'לא מאומת' }, { status: 401 })
    }
    
    // שליפת הסימולציה
    const { data: simulation, error: simError } = await supabase
      .from('simulations')
      .select(`
        *,
        customer_personas_hebrew (*)
      `)
      .eq('id', simulationId)
      .eq('agent_id', user.id)
      .single()
    
    if (simError || !simulation) {
      return NextResponse.json({ error: 'סימולציה לא נמצאה' }, { status: 404 })
    }
    
    // שליפת היסטוריית השיחה אם לא סופק transcript
    let finalTranscript = transcript
    if (!finalTranscript && simulation.conversation_history) {
      finalTranscript = simulation.conversation_history
        .map((msg: any) => `${msg.role === 'user' ? 'נציג' : 'לקוח'}: ${msg.content}`)
        .join('\n\n')
    }
    
    // יצירת דוח ניתוח
    console.log('📊 יוצר דוח ניתוח לסימולציה...')
    
    const persona = simulation.customer_personas_hebrew
    const selectedTopics = simulation.selected_topics || ['כללי']
    
    const analysisPrompt = `אתה מנתח מקצועי של שיחות מכירות ושירות. נתח את הסימולציה הבאה והפק דוח מפורט.

**פרטי הסימולציה:**
- פרסונת לקוח: ${persona?.persona_name || 'לקוח כללי'}
- סוג אישיות: ${persona?.personality_type || 'סטנדרטי'}
- נושאים לאימון: ${selectedTopics.join(', ')}
- משך: ${duration ? Math.floor(duration / 60) + ' דקות' : 'לא ידוע'}

**תמלול השיחה:**
${finalTranscript || 'לא זמין'}

**הפק דוח JSON עם המבנה הבא:**
{
  "overall_score": [1-10],
  "communication_score": [1-10],
  "objection_handling_score": [1-10],
  "rapport_building_score": [1-10],
  "closing_score": [1-10],
  "product_knowledge_score": [1-10],
  "summary": "סיכום קצר של הביצוע",
  "strengths": ["נקודת חוזק 1", "נקודת חוזק 2"],
  "improvement_areas": ["תחום לשיפור 1", "תחום לשיפור 2"],
  "action_items": ["המלצה 1", "המלצה 2", "המלצה 3"],
  "detailed_feedback": {
    "opening": "משוב על פתיחת השיחה",
    "needs_discovery": "משוב על איתור צרכים",
    "objection_handling": "משוב על טיפול בהתנגדויות",
    "closing": "משוב על סגירה"
  }
}

החזר רק JSON תקין, ללא הסברים נוספים.`

    let reportData = {
      overall_score: 6,
      communication_score: 6,
      objection_handling_score: 6,
      rapport_building_score: 6,
      closing_score: 6,
      product_knowledge_score: 6,
      summary: 'הסימולציה הושלמה',
      strengths: ['השתתפות פעילה'],
      improvement_areas: ['להמשיך לתרגל'],
      action_items: ['לתרגל יותר'],
      detailed_feedback: {}
    }
    
    try {
      // שימוש ב-GPT-5-nano ליצירת הדוח
      const response = await (openai as any).responses.create({
        model: 'gpt-5-nano-2025-08-07',
        input: analysisPrompt,
        reasoning: { effort: 'low' }
      })
      
      const content = response.output_text || ''
      
      // ניקוי וניתוח JSON
      let cleaned = content.replace(/```(?:json|JSON)?\s*/g, '').replace(/```\s*$/g, '').trim()
      const jsonStart = cleaned.indexOf('{')
      if (jsonStart !== -1) {
        cleaned = cleaned.substring(jsonStart)
      }
      
      // מציאת סוף ה-JSON
      let braceCount = 0
      let lastValidEnd = -1
      for (let i = 0; i < cleaned.length; i++) {
        if (cleaned[i] === '{') braceCount++
        else if (cleaned[i] === '}') {
          braceCount--
          if (braceCount === 0) {
            lastValidEnd = i
            break
          }
        }
      }
      
      if (lastValidEnd !== -1) {
        cleaned = cleaned.substring(0, lastValidEnd + 1)
      }
      
      reportData = JSON.parse(cleaned)
      console.log('✅ דוח נוצר בהצלחה')
      
    } catch (analysisError) {
      console.error('⚠️ שגיאה ביצירת דוח, משתמש בברירת מחדל:', analysisError)
      
      // Fallback ל-Chat Completions
      try {
        const fallbackResponse = await openai.chat.completions.create({
          model: 'gpt-4o-mini',
          messages: [{ role: 'user', content: analysisPrompt }],
          temperature: 0.3
        })
        
        const fallbackContent = fallbackResponse.choices[0]?.message?.content || ''
        let fallbackCleaned = fallbackContent.replace(/```(?:json|JSON)?\s*/g, '').replace(/```\s*$/g, '').trim()
        const jsonStart = fallbackCleaned.indexOf('{')
        if (jsonStart !== -1) {
          fallbackCleaned = fallbackCleaned.substring(jsonStart)
        }
        
        reportData = JSON.parse(fallbackCleaned)
      } catch (fallbackError) {
        console.error('❌ גם fallback נכשל:', fallbackError)
      }
    }
    
    // שמירת הדוח
    const { data: report, error: reportError } = await supabase
      .from('simulation_reports_hebrew')
      .insert({
        simulation_id: simulationId,
        agent_id: user.id,
        company_id: simulation.company_id,
        overall_score: reportData.overall_score || 6,
        communication_score: reportData.communication_score || 6,
        objection_handling_score: reportData.objection_handling_score || 6,
        rapport_building_score: reportData.rapport_building_score || 6,
        closing_score: reportData.closing_score || 6,
        product_knowledge_score: reportData.product_knowledge_score || 6,
        detailed_feedback: reportData.detailed_feedback || {},
        improvement_areas: reportData.improvement_areas || [],
        strengths: reportData.strengths || [],
        action_items: reportData.action_items || []
      })
      .select()
      .single()
    
    if (reportError) {
      console.error('שגיאה בשמירת דוח:', reportError)
    }
    
    // עדכון הסימולציה
    const { error: updateError } = await supabase
      .from('simulations')
      .update({
        status: 'completed',
        completed_at: new Date().toISOString(),
        duration_seconds: duration || 0,
        transcript: finalTranscript,
        score: reportData.overall_score || 6
      })
      .eq('id', simulationId)
    
    if (updateError) {
      console.error('שגיאה בעדכון סימולציה:', updateError)
    }
    
    // עדכון דקות סימולציה
    if (duration && duration > 0) {
      const minutes = Math.ceil(duration / 60)
      
      await supabase.rpc('use_simulation_minutes', {
        p_company_id: simulation.company_id,
        p_minutes: minutes
      })
    }
    
    return NextResponse.json({
      success: true,
      reportId: report?.id,
      score: reportData.overall_score
    })
    
  } catch (error) {
    console.error('שגיאה בסיום סימולציה:', error)
    return NextResponse.json({ 
      error: 'שגיאה בסיום הסימולציה',
      details: error instanceof Error ? error.message : 'Unknown'
    }, { status: 500 })
  }
}

