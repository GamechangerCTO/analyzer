import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import CostCalculator from '@/components/CostCalculator'

export default async function AdminCostCalculatorPage() {
  const supabase = createClient()

  // בדיקת אימות המשתמש
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  
  if (authError || !user) {
    redirect('/login')
  }

  // בדיקה שהמשתמש הוא אדמין
  const { data: adminCheck } = await supabase
    .from('system_admins')
    .select('id')
    .eq('user_id', user.id)
    .single()

  if (!adminCheck) {
    redirect('/dashboard')
  }

  return (
    <div className="container mx-auto py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">מחשבון עלויות AI</h1>
        <p className="text-gray-600">
          כלי ניהול עלויות מתקדם לאדמינים - ניתוח עלויות OpenAI והמלצות לגבילת שימוש
        </p>
      </div>
      
      <CostCalculator />
    </div>
  )
}



