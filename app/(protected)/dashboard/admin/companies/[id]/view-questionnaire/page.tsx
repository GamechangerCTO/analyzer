import { createServerComponentClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import Link from 'next/link'

interface PageProps {
  params: {
    id: string
  }
}

export default async function ViewCompanyQuestionnairePage({ params }: PageProps) {
  const supabase = createServerComponentClient({ cookies })
  
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

  // קבלת נתוני השאלון
  const { data: questionnaire, error: questionnaireError } = await supabase
    .from('company_questionnaires')
    .select('*')
    .eq('company_id', params.id)
    .maybeSingle()

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-4">
            צפייה בשאלון החברה - {company.name}
          </h1>
          <p className="text-lg text-gray-600">
            פרטי השאלון עבור החברה
          </p>
          <div className="mt-4 flex justify-center gap-4">
            <Link
              href="/dashboard/admin/companies"
              className="text-blue-600 hover:text-blue-800 underline"
            >
              ← חזרה לרשימת החברות
            </Link>
            <Link
              href={`/dashboard/admin/companies/${params.id}/edit-questionnaire`}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg"
            >
              ערוך שאלון
            </Link>
          </div>
        </div>
        
        <div className="bg-white rounded-xl shadow-lg p-8">
          {questionnaire ? (
            <div className="space-y-6">
              {/* מצב השאלון */}
              <div className="mb-6 p-4 bg-blue-50 rounded-md">
                <div className="flex justify-between items-center">
                  <h3 className="text-lg font-semibold text-blue-800">
                    סטטוס השאלון
                  </h3>
                  <div className="flex items-center gap-2">
                    {questionnaire.is_complete ? (
                      <span className="px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm font-medium">
                        ✓ הושלם ({questionnaire.completion_score}%)
                      </span>
                    ) : (
                      <span className="px-3 py-1 bg-yellow-100 text-yellow-800 rounded-full text-sm font-medium">
                        חלקי ({questionnaire.completion_score}%)
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* שם החברה */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">שם החברה</label>
                <p className="text-gray-900 bg-gray-50 p-3 rounded-md">{questionnaire.name || '-'}</p>
              </div>

              {/* תחום/סגמנט */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">תחום/סגמנט</label>
                <p className="text-gray-900 bg-gray-50 p-3 rounded-md">{questionnaire.sector || '-'}</p>
              </div>

              {/* פרטים על המוצר/השירות */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">פרטים על המוצר/השירות</label>
                <p className="text-gray-900 bg-gray-50 p-3 rounded-md whitespace-pre-wrap">{questionnaire.product_info || '-'}</p>
              </div>

              {/* עלות המוצר/שירות */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">עלות המוצר/שירות</label>
                <p className="text-gray-900 bg-gray-50 p-3 rounded-md">{questionnaire.avg_product_cost || '-'}</p>
              </div>

              {/* סוגי מוצרים */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">סוגי מוצרים</label>
                <p className="text-gray-900 bg-gray-50 p-3 rounded-md">
                  {questionnaire.product_types && Array.isArray(questionnaire.product_types) && questionnaire.product_types.length > 0 
                    ? questionnaire.product_types.join(', ') 
                    : '-'}
                </p>
              </div>

              {/* קהל יעד */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">קהל יעד פרטי/עסקי</label>
                <p className="text-gray-900 bg-gray-50 p-3 rounded-md">{questionnaire.audience || '-'}</p>
              </div>

              {/* בידולים */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">בידולים ויתרונות משמעותיים</label>
                <div className="bg-gray-50 p-3 rounded-md">
                  {questionnaire.differentiators && Array.isArray(questionnaire.differentiators) && questionnaire.differentiators.length > 0 ? (
                    <ul className="list-disc list-inside space-y-1">
                      {questionnaire.differentiators
                        .filter((diff: string) => diff.trim())
                        .map((diff: string, index: number) => (
                        <li key={index} className="text-gray-900">{diff}</li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-gray-500">אין בידולים רשומים</p>
                  )}
                </div>
              </div>

              {/* תועלות לקוח */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">תועלות עבור הלקוח</label>
                <div className="bg-gray-50 p-3 rounded-md">
                  {questionnaire.customer_benefits && Array.isArray(questionnaire.customer_benefits) && questionnaire.customer_benefits.length > 0 ? (
                    <ul className="list-disc list-inside space-y-1">
                      {questionnaire.customer_benefits
                        .filter((benefit: string) => benefit.trim())
                        .map((benefit: string, index: number) => (
                        <li key={index} className="text-gray-900">{benefit}</li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-gray-500">אין תועלות לקוח רשומות</p>
                  )}
                </div>
              </div>

              {/* תועלות חברה */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">תועלות עבור החברה</label>
                <div className="bg-gray-50 p-3 rounded-md">
                  {questionnaire.company_benefits && Array.isArray(questionnaire.company_benefits) && questionnaire.company_benefits.length > 0 ? (
                    <ul className="list-disc list-inside space-y-1">
                      {questionnaire.company_benefits
                        .filter((benefit: string) => benefit.trim())
                        .map((benefit: string, index: number) => (
                        <li key={index} className="text-gray-900">{benefit}</li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-gray-500">אין תועלות חברה רשומות</p>
                  )}
                </div>
              </div>

              {/* חומרים מקצועיים */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">חומרים מקצועיים</label>
                <div className="bg-gray-50 p-3 rounded-md">
                  <p className="text-gray-900 mb-2">
                    <span className="font-medium">מעוניין להעלות חומרים:</span> {questionnaire.uploads_professional_materials ? 'כן' : 'לא'}
                  </p>
                  {questionnaire.professional_materials_files && Array.isArray(questionnaire.professional_materials_files) && questionnaire.professional_materials_files.length > 0 ? (
                    <div>
                      <p className="font-medium text-gray-700 mb-1">קבצים שהועלו:</p>
                      <ul className="list-disc list-inside space-y-1">
                        {questionnaire.professional_materials_files.map((file: string, index: number) => (
                          <li key={index} className="text-gray-900 text-sm">{file.split('/').pop()}</li>
                        ))}
                      </ul>
                    </div>
                  ) : (
                    <p className="text-gray-500 text-sm">אין קבצים מקצועיים</p>
                  )}
                </div>
              </div>

              {/* מידע נוסף */}
              <div className="pt-6 border-t border-gray-200">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-gray-600">
                  <div>
                    <span className="font-medium">תאריך יצירה:</span> {questionnaire.created_at ? new Date(questionnaire.created_at).toLocaleDateString('he-IL') : '-'}
                  </div>
                  <div>
                    <span className="font-medium">תאריך עדכון אחרון:</span> {questionnaire.updated_at ? new Date(questionnaire.updated_at).toLocaleDateString('he-IL') : '-'}
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center py-8">
              <p className="text-gray-500 text-lg mb-4">השאלון טרם מולא עבור חברה זו</p>
              <Link
                href={`/dashboard/admin/companies/${params.id}/edit-questionnaire`}
                className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg"
              >
                צור שאלון חדש
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  )
} 