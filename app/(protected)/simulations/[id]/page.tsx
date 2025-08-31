import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import RealtimeSimulation from '@/components/RealtimeSimulation'

interface SimulationPageProps {
  params: {
    id: string
  }
}

export default async function SimulationPage({ params }: SimulationPageProps) {
  const supabase = createClient()
  
  // בדיקת אימות
  const { data: { session }, error } = await supabase.auth.getSession()
  if (error || !session) {
    redirect('/login')
  }

  // קבלת נתוני הסימולציה
  const { data: simulation } = await supabase
    .from('simulations')
    .select('*')
    .eq('id', params.id)
    .eq('agent_id', session.user.id)
    .single()

  // קבלת פרסונה נפרדת
  let customerPersona = null
  if (simulation?.customer_persona) {
    const { data: personaData } = await supabase
      .from('customer_personas_hebrew')
      .select('*')
      .eq('id', simulation.customer_persona)
      .single()
    
    customerPersona = personaData
  }

  if (!simulation) {
    redirect('/simulations')
  }

  // קבלת נתוני הנציג
  const { data: user } = await supabase
    .from('users')
    .select('*')
    .eq('id', session.user.id)
    .single()

  // קבלת נתוני החברה
  let company = null
  if (user?.company_id) {
    const { data: companyData } = await supabase
      .from('companies')
      .select(`
        *,
        company_questionnaires (*)
      `)
      .eq('id', user.company_id)
      .single()
    
    company = companyData
  }

        return (
    <div className="min-h-screen bg-gray-50">
      <RealtimeSimulation 
        simulation={{
          ...simulation,
          customer_personas_hebrew: customerPersona ? [customerPersona] : []
        }}
        user={user}
        company={company}
      />
    </div>
  )
} 