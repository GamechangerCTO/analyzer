import { createServerComponentClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import CompanyQuestionnaireForm from '@/components/CompanyQuestionnaireForm'

export default async function CompanyQuestionnairePage() {
  const supabase = createServerComponentClient({ cookies })
  
  const { data: { session } } = await supabase.auth.getSession()
  
  if (!session) {
    redirect('/login')
  }

  // קבלת פרטי המשתמש
  const { data: user } = await supabase
    .from('users')
    .select('*, companies(*)')
    .eq('id', session.user.id)
    .single()

  if (!user) {
    redirect('/login')
  }

  // בדיקה שהמשתמש הוא מנהל של החברה
  if (user.role !== 'manager' && user.role !== 'admin') {
    redirect('/dashboard')
  }

  if (!user.company_id) {
    redirect('/dashboard')
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-4">
            שאלון החברה
          </h1>
          <p className="text-lg text-gray-600">
            השלמת השאלון חיונית לקבלת ניתוח מדויק ומותאם לצרכי החברה שלכם
          </p>
        </div>
        
        <CompanyQuestionnaireForm 
          companyId={user.company_id} 
          companyData={user.companies}
        />
      </div>
    </div>
  )
} 