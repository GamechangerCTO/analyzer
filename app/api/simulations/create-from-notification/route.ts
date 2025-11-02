import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  try {
    const { notificationId, callIds, weakParameters } = await request.json()
    
    if (!notificationId || !callIds || callIds.length === 0) {
      return NextResponse.json({ 
        error: 'נתונים חסרים' 
      }, { status: 400 })
    }
    
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      return NextResponse.json({ error: 'לא מחובר' }, { status: 401 })
    }
    
    // שליפת נתוני המשתמש
    const { data: userData } = await supabase
      .from('users')
      .select('*, companies(*)')
      .eq('id', user.id)
      .single()
    
    if (!userData) {
      return NextResponse.json({ error: 'משתמש לא נמצא' }, { status: 404 })
    }
    
    // בדיקת מכסה
    const { data: canCreate } = await supabase
      .rpc('can_create_simulation', {
        p_company_id: userData.company_id,
        p_estimated_minutes: 10
      })
    
    if (!canCreate) {
      return NextResponse.json({ 
        error: 'אין מספיק דקות סימולציה זמינות' 
      }, { status: 403 })
    }
    
    // שליפת נתוני החברה עם השאלון
    const { data: companyData } = await supabase
      .from('companies')
      .select(`
        *,
        company_questionnaires (*)
      `)
      .eq('id', userData.company_id)
      .single()
    
    // שליפת שיחות לניתוח (אם יש)
    let callAnalysisData = undefined
    if (callIds && callIds.length > 0) {
      const { data: callData } = await supabase
        .from('calls')
        .select('*')
        .in('id', callIds)
        .limit(1)
        .single()
      
      if (callData) {
        callAnalysisData = {
          call_type: callData.call_type || 'מכירות',
          overall_score: callData.overall_score || 0,
          content_analysis: callData.analysis_report,
          tone_analysis: callData.tone_analysis_report,
          red_flags: [],
          improvement_areas: weakParameters?.map((p: any) => p.hebrewName || p.name) || []
        }
      }
    }
    
    // יצירת persona מותאמת אישית עם AI בהתבסס על נתוני החברה
    const personaResponse = await fetch(`${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/api/simulations/generate-persona`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': request.headers.get('cookie') || ''
      },
      body: JSON.stringify({
        companyId: userData.company_id,
        agentId: user.id,
        targetWeaknesses: weakParameters?.map((p: any) => p.hebrewName || p.name) || [],
        difficulty: 'בינוני',
        callAnalysis: callAnalysisData
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
    
    // יצירת תרחיש
    const focusAreas = weakParameters?.map((p: any) => p.hebrewName || p.name).join(', ') || 'תחומים לשיפור'
    const scenario = `סימולציה אוטומטית מבוססת על ניתוח שיחות.\n\nתחומים לתרגול: ${focusAreas}`
    
    // יצירת סימולציה
    const { data: simulation, error: simError } = await supabase
      .from('simulations')
      .insert({
        agent_id: user.id,
        company_id: userData.company_id,
        simulation_type: 'אוטומטי',
        customer_persona: personaId,
        difficulty_level: 'בינוני',
        scenario_description: scenario,
        simulation_mode: 'auto',
        focused_parameters: weakParameters || [],
        based_on_calls: callIds,
        status: 'pending'
      })
      .select()
      .single()
    
    if (simError) {
      console.error('Error creating simulation:', simError)
      return NextResponse.json({ error: 'שגיאה ביצירת סימולציה' }, { status: 500 })
    }
    
    return NextResponse.json({ simulationId: simulation.id })
    
  } catch (error) {
    console.error('Error:', error)
    return NextResponse.json({ 
      error: 'שגיאה כללית',
      details: error instanceof Error ? error.message : 'Unknown'
    }, { status: 500 })
  }
}

