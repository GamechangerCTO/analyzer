import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import CompanyQuestionnaireForm from '@/components/CompanyQuestionnaireForm'

export default async function CompanyQuestionnairePage({
  searchParams,
}: {
  searchParams: { first_login?: string; view?: string }
}) {
  const supabase = createClient()
  
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

  // בדיקה שהמשתמש הוא מנהל
  if (user.role !== 'manager' && user.role !== 'admin') {
    redirect('/dashboard')
  }

  if (!user.company_id) {
    redirect('/dashboard')
  }

  const isFirstLogin = searchParams.first_login === 'true'
  const isView = searchParams.view === 'true'

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-4">
            {isFirstLogin ? 'השלמת פרטי החברה' : 'שאלון החברה'}
          </h1>
          <p className="text-lg text-gray-600">
            {isFirstLogin 
              ? 'כדי להתחיל להשתמש במערכת, אנא השלם את פרטי החברה והשאלון הבא. המידע הזה יעזור לנו לספק לך ניתוח מדויק ומותאם'
              : 'השלמת השאלון חיונית לקבלת ניתוח מדויק ומותאם לצרכי החברה שלכם'
            }
          </p>
          {isFirstLogin && (
            <div className="mt-4 p-4 bg-blue-100 border border-blue-300 rounded-lg">
              <p className="text-blue-800 font-medium">
                💡 זוהי הכניסה הראשונה שלך כמנהל החברה. השלמת השאלון נדרשת לפני שתוכל לגשת לדשבורד
              </p>
            </div>
          )}
        </div>
        
        <CompanyQuestionnaireForm 
          companyId={user.company_id} 
          companyData={user.companies}
          isFirstLogin={isFirstLogin}
          isView={isView}
        />
      </div>
    </div>
  )
} 