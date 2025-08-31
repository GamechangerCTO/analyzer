import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import SimulationReport from '@/components/SimulationReport'

interface SimulationReportPageProps {
  params: {
    id: string
  }
}

export default async function SimulationReportPage({ params }: SimulationReportPageProps) {
  const supabase = createClient()
  
  // בדיקת אימות
  const { data: { session }, error } = await supabase.auth.getSession()
  if (error || !session) {
    redirect('/login')
  }

  // חיפוש הדוח - יכול להיות לפי simulation ID או report ID
  let report = null
  
  // ניסיון ראשון - חיפוש לפי report ID
  const { data: directReport } = await supabase
    .from('simulation_reports_hebrew')
    .select(`
      *,
      simulations (
        *,
        customer_personas_hebrew (*)
      )
    `)
    .eq('id', params.id)
    .eq('agent_id', session.user.id)
    .single()

  if (directReport) {
    report = directReport
  } else {
    // ניסיון שני - חיפוש לפי simulation ID
    const { data: simulationReport } = await supabase
      .from('simulation_reports_hebrew')
      .select(`
        *,
        simulations (
          *,
          customer_personas_hebrew (*)
        )
      `)
      .eq('simulation_id', params.id)
      .eq('agent_id', session.user.id)
      .order('created_at', { ascending: false })
      .limit(1)
      .single()

    if (simulationReport) {
      report = simulationReport
    }
  }

  if (!report) {
    redirect('/simulations')
  }

  // קבלת נתוני המשתמש
  const { data: user } = await supabase
    .from('users')
    .select('*')
    .eq('id', session.user.id)
    .single()

  // קבלת דוחות אחרונים להשוואה
  const { data: recentReports } = await supabase
    .from('simulation_reports_hebrew')
    .select('overall_score, created_at, detailed_scores')
    .eq('agent_id', session.user.id)
    .order('created_at', { ascending: false })
    .limit(10)

  return (
    <div className="min-h-screen bg-gray-50">
      <SimulationReport 
        report={report}
        user={user}
        recentReports={recentReports || []}
      />
    </div>
  )
}
