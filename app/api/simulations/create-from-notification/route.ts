import { createClient } from '@/utils/supabase/server'
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
    
    // קבלת persona
    const { data: personas } = await supabase
      .from('customer_personas_hebrew')
      .select('*')
      .eq('company_id', userData.company_id)
      .eq('is_active', true)
      .limit(1)
    
    let personaId = personas?.[0]?.id
    
    if (!personaId) {
      const { data: newPersona } = await supabase
        .from('customer_personas_hebrew')
        .insert({
          company_id: userData.company_id,
          created_by: user.id,
          customer_name: 'לקוח אוטומטי',
          business_type: 'כללי',
          personality_traits: ['מקצועי'],
          is_active: true
        })
        .select()
        .single()
      
      personaId = newPersona.id
    }
    
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

