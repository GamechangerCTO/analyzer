import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import CreateSimulationForm from '@/components/CreateSimulationForm'

export default async function CreateSimulationPage() {
  const supabase = createClient()
  
  // בדיקת אימות
  const { data: { session }, error } = await supabase.auth.getSession()
  if (error || !session) {
    redirect('/login')
  }

  // קבלת נתוני המשתמש
  const { data: user } = await supabase
    .from('users')
    .select('*')
    .eq('id', session.user.id)
    .single()

  // קבלת ניתוחי שיחות אחרונים של המשתמש
  const { data: recentCalls } = await supabase
    .from('calls')
    .select('*')
    .eq('user_id', session.user.id)
    .not('analysis_report', 'is', null)
    .order('created_at', { ascending: false })
    .limit(10)

  // קבלת נתוני החברה
  const { data: company } = await supabase
    .from('companies')
    .select(`
      *,
      company_questionnaires (*)
    `)
    .eq('id', user?.company_id)
    .single()

  // קבלת פרסונות קיימות
  const { data: existingPersonas } = await supabase
    .from('customer_personas_hebrew')
    .select('*')
    .eq('company_id', user?.company_id)
    .eq('is_active', true)
    .order('created_at', { ascending: false })

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            🎯 צור סימולציה מותאמת אישית
          </h1>
          <p className="text-gray-600">
            צור חוויית אימון מכירות מותאמת בדיוק לצרכים שלך, בהתבסס על הניתוחים הקיימים שלך
          </p>
        </div>

        <CreateSimulationForm 
          user={user}
          recentCalls={recentCalls || []}
          company={company}
          existingPersonas={existingPersonas || []}
        />
      </div>
    </div>
  )
}
