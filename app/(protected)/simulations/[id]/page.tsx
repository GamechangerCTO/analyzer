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
    .select(`
      *,
      customer_personas_hebrew (*)
    `)
    .eq('id', params.id)
    .eq('agent_id', session.user.id)
    .single()

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
  const { data: company } = await supabase
    .from('companies')
    .select(`
      *,
      company_questionnaires (*)
    `)
    .eq('id', user?.company_id)
    .single()

  return (
    <div className="min-h-screen bg-gray-50">
      <RealtimeSimulation 
        simulation={simulation}
        user={user}
        company={company}
      />
    </div>
  )
}