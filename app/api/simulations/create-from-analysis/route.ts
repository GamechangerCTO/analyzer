import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  try {
    const { callId, weakParameters } = await request.json()
    
    if (!callId || !weakParameters || weakParameters.length === 0) {
      return NextResponse.json({ 
        error: 'נתונים חסרים - נדרש callId ופרמטרים חלשים' 
      }, { status: 400 })
    }
    
    const supabase = createClient()
    
    // 1. שליפת השיחה
    const { data: call, error: callError } = await supabase
      .from('calls')
      .select('*, users!inner(*), companies!inner(*)')
      .eq('id', callId)
      .single()
    
    if (callError || !call) {
      console.error('Error fetching call:', callError)
      return NextResponse.json({ error: 'שיחה לא נמצאה' }, { status: 404 })
    }
    
    // 2. בדיקת מכסת דקות סימולציה
    const { data: canCreate, error: quotaError } = await supabase
      .rpc('can_create_simulation', {
        p_company_id: call.company_id,
        p_estimated_minutes: 10
      })
    
    if (quotaError) {
      console.error('Error checking simulation quota:', quotaError)
    }
    
    if (!canCreate) {
      return NextResponse.json({ 
        error: 'אין מספיק דקות סימולציה זמינות. אנא פנה למנהל שלך.',
        code: 'INSUFFICIENT_QUOTA'
      }, { status: 403 })
    }
    
    // 3. שליפת נתוני החברה עם השאלון
    const { data: companyData } = await supabase
      .from('companies')
      .select(`
        *,
        company_questionnaires (*)
      `)
      .eq('id', call.company_id)
      .single()
    
    // 4. יצירת persona מותאמת אישית עם AI בהתבסס על נתוני החברה
    const personaResponse = await fetch(`${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/api/simulations/generate-persona`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': request.headers.get('cookie') || ''
      },
      body: JSON.stringify({
        companyId: call.company_id,
        agentId: call.user_id,
        targetWeaknesses: weakParameters.map((p: any) => p.hebrewName),
        difficulty: 'בינוני',
        callAnalysis: {
          call_type: call.call_type,
          overall_score: call.overall_score || 0,
          content_analysis: call.analysis_report,
          tone_analysis: call.tone_analysis_report,
          red_flags: [],
          improvement_areas: weakParameters.map((p: any) => p.hebrewName)
        }
      })
    })
    
    if (!personaResponse.ok) {
      console.error('Error generating persona:', await personaResponse.text())
      return NextResponse.json({ 
        error: 'שגיאה ביצירת פרסונת לקוח' 
      }, { status: 500 })
    }
    
    const { persona } = await personaResponse.json()
    const personaId = persona.id
    
    // 4. יצירת תרחיש ממוקד
    const focusAreas = weakParameters.map((p: any) => p.hebrewName).join(', ')
    const scenario = `סימולציה ממוקדת לשיפור בתחומים: ${focusAreas}

מטרת הסימולציה:
${weakParameters.map((p: any) => `- ${p.hebrewName} (ציון נוכחי: ${p.score}/10)`).join('\n')}

בסימולציה זו, הלקוח יאתגר את הנציג בדיוק בתחומים אלה כדי לאפשר תרגול ממוקד ושיפור מהיר.`
    
    // 5. יצירת הסימולציה
    const { data: simulation, error: simulationError } = await supabase
      .from('simulations')
      .insert({
        agent_id: call.user_id,
        company_id: call.company_id,
        simulation_type: call.call_type || 'מכירות',
        customer_persona: personaId,
        difficulty_level: 'ממוקד',
        scenario_description: scenario,
        simulation_mode: 'manual',
        focused_parameters: weakParameters,
        based_on_calls: [callId],
        status: 'pending'
      })
      .select()
      .single()
    
    if (simulationError) {
      console.error('Error creating simulation:', simulationError)
      return NextResponse.json({ 
        error: 'שגיאה ביצירת הסימולציה' 
      }, { status: 500 })
    }
    
    return NextResponse.json({ 
      simulationId: simulation.id,
      message: 'הסימולציה נוצרה בהצלחה',
      focusAreas: focusAreas
    })
    
  } catch (error) {
    console.error('Error in create-from-analysis:', error)
    return NextResponse.json({ 
      error: 'שגיאה כללית ביצירת סימולציה',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

