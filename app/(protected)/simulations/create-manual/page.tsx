import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import ManualSimulationForm from '@/components/ManualSimulationForm'

export default async function CreateManualSimulationPage() {
  const supabase = createClient()
  
  // בדיקת אימות
  const { data: { session }, error } = await supabase.auth.getSession()
  if (error || !session) {
    redirect('/login')
  }

  // קבלת נתוני המשתמש
  const { data: userData } = await supabase
    .from('users')
    .select('*, companies(*)')
    .eq('id', session.user.id)
    .single()

  if (!userData) {
    redirect('/dashboard')
  }

  // קבלת רשימת נציגים (תלוי בהרשאות)
  const isManagerOrAdmin = userData.role === 'manager' || userData.role === 'admin'
  
  let agents = []
  if (isManagerOrAdmin) {
    // מנהל רואה את כל הנציגים בחברה
    const { data } = await supabase
      .from('users')
      .select('*')
      .eq('company_id', userData.company_id)
      .in('role', ['agent', 'manager'])
      .order('full_name')
    
    agents = data || []
  } else {
    // נציג רואה רק את עצמו
    agents = [userData]
  }

  // קבלת מכסת דקות
  const { data: quotaData } = await supabase
    .rpc('get_simulation_minutes_quota', {
      p_company_id: userData.company_id
    })
    .single()

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">
            🎯 יצירת סימולציה ידנית
          </h1>
          <p className="text-gray-600 text-lg">
            בחר נציג, שיחות לניתוח, והגדר דגשים ספציפיים לסימולציה מותאמת אישית
          </p>
        </div>

        {/* טופס */}
        <ManualSimulationForm 
          agents={agents}
          currentUser={userData}
          quota={quotaData}
        />
      </div>
    </div>
  )
}

