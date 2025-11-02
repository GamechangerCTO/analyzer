import { createClient } from '@/utils/supabase/server'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  try {
    const { 
      agentId, 
      callIds, 
      customNotes, 
      difficulty, 
      estimatedDuration,
      weakParameters 
    } = await request.json()
    
    if (!agentId || !callIds || callIds.length === 0) {
      return NextResponse.json({ 
        error: 'נתונים חסרים - נדרש נציג ושיחות' 
      }, { status: 400 })
    }
    
    const supabase = createClient()
    
    // 1. שליפת נתוני הנציג
    const { data: agent, error: agentError } = await supabase
      .from('users')
      .select('*, companies(*)')
      .eq('id', agentId)
      .single()
    
    if (agentError || !agent) {
      console.error('Error fetching agent:', agentError)
      return NextResponse.json({ error: 'נציג לא נמצא' }, { status: 404 })
    }
    
    // 2. בדיקת מכסת דקות סימולציה
    const { data: canCreate, error: quotaError } = await supabase
      .rpc('can_create_simulation', {
        p_company_id: agent.company_id,
        p_estimated_minutes: estimatedDuration || 10
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
    
    // 3. קבלת או יצירת persona מתאימה
    const { data: existingPersonas } = await supabase
      .from('customer_personas_hebrew')
      .select('*')
      .eq('company_id', agent.company_id)
      .eq('is_active', true)
      .limit(1)
    
    let personaId = existingPersonas?.[0]?.id
    
    if (!personaId) {
      // יצירת persona בסיסית
      const { data: newPersona, error: personaError } = await supabase
        .from('customer_personas_hebrew')
        .insert({
          company_id: agent.company_id,
          created_by: agentId,
          customer_name: 'לקוח אימון ידני',
          business_type: agent.companies?.name || 'כללי',
          company_size: 'בינוני',
          personality_traits: ['מקצועי', 'מאתגר'],
          pain_points: ['צריך פתרון איכותי'],
          background_info: `לקוח סימולציה ידנית עבור ${agent.companies?.name || 'החברה'}`,
          preferred_communication: 'ישיר ומקצועי',
          decision_making_style: 'מבוסס נתונים',
          is_active: true
        })
        .select()
        .single()
      
      if (personaError) {
        console.error('Error creating persona:', personaError)
        return NextResponse.json({ 
          error: 'שגיאה ביצירת פרסונת לקוח' 
        }, { status: 500 })
      }
      
      personaId = newPersona.id
    }
    
    // 4. יצירת תיאור התרחיש
    const focusAreas = weakParameters?.length > 0 
      ? weakParameters.map((p: any) => p.hebrewName).join(', ')
      : 'שיפור כללי'
    
    let scenario = `סימולציה ידנית מבוססת על ${callIds.length} שיחות נבחרות.\n\n`
    
    if (weakParameters && weakParameters.length > 0) {
      scenario += `תחומים לשיפור:\n`
      scenario += weakParameters.map((p: any) => 
        `- ${p.hebrewName} (ציון נוכחי: ${p.score}/10)`
      ).join('\n')
      scenario += '\n\n'
    }
    
    if (customNotes) {
      scenario += `דגשים מיוחדים:\n${customNotes}\n\n`
    }
    
    scenario += `רמת קושי: ${difficulty}`
    
    // 5. יצירת הסימולציה
    const { data: simulation, error: simulationError } = await supabase
      .from('simulations')
      .insert({
        agent_id: agentId,
        company_id: agent.company_id,
        simulation_type: 'סימולציה ידנית',
        customer_persona: personaId,
        difficulty_level: difficulty,
        scenario_description: scenario,
        simulation_mode: 'manual',
        focused_parameters: weakParameters || [],
        based_on_calls: callIds,
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
      message: 'הסימולציה הידנית נוצרה בהצלחה',
      focusAreas: focusAreas,
      callsCount: callIds.length
    })
    
  } catch (error) {
    console.error('Error in create-manual:', error)
    return NextResponse.json({ 
      error: 'שגיאה כללית ביצירת סימולציה',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

