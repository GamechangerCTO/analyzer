import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import CompanyQuestionnaireForm from '@/components/CompanyQuestionnaireForm'

interface PageProps {
  params: {
    id: string
  }
}

export default async function EditCompanyQuestionnairePage({ params }: PageProps) {
  const supabase = createClient()
  
  const { data: { session } } = await supabase.auth.getSession()
  
  if (!session) {
    redirect('/login')
  }

  // קבלת פרטי המשתמש ובדיקה שהוא מנהל מערכת
  const { data: user } = await supabase
    .from('users')
    .select('*')
    .eq('id', session.user.id)
    .single()

  if (!user) {
    redirect('/login')
  }

  // בדיקה שהמשתמש הוא מנהל מערכת
  if (user.role !== 'admin') {
    redirect('/dashboard')
  }

  // קבלת פרטי החברה
  const { data: company, error: companyError } = await supabase
    .from('companies')
    .select('*')
    .eq('id', params.id)
    .single()

  if (companyError || !company) {
    redirect('/dashboard/admin/companies')
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-4">
            עריכת שאלון החברה - {company.name}
          </h1>
          <p className="text-lg text-gray-600">
            עריכת פרטי השאלון עבור החברה
          </p>
          <div className="mt-4">
            <a
              href="/dashboard/admin/companies"
              className="text-blue-600 hover:text-blue-800 underline"
            >
              ← חזרה לרשימת החברות
            </a>
          </div>
        </div>
        
        <CompanyQuestionnaireForm 
          companyId={params.id}
          companyData={company}
          isAdminEdit={true}
        />
      </div>
    </div>
  )
} 