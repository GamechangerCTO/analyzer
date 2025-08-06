import React from 'react'
import { cookies } from 'next/headers'
import { createClient } from '@/lib/supabase/server'
import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import AddAgentForm from '@/components/AddAgentForm'

export default async function AddAgentPage() {
  const supabase = createClient()
  
  const { data: { user }, error } = await supabase.auth.getUser()
  
  if (!user || error) {
    redirect('/login')
  }
  
  // בדיקה שהמשתמש הוא מנהל
  const { data: userData, error: userError } = await supabase
    .from('users')
    .select('id, role, company_id, full_name')
    .eq('id', user.id)
    .single()
  
  if (userError || !userData) {
    notFound()
  }
  
  if (userData.role !== 'manager') {
    redirect('/dashboard')
  }
  
  // בדיקה שיש company_id
  if (!userData.company_id) {
    notFound()
  }
  
  // בדיקת פרטי החברה
  const { data: companyData } = await supabase
    .from('companies')
    .select('id, name')
    .eq('id', userData.company_id)
    .single()
  
  if (!companyData) {
    notFound()
  }
  
    // בדיקה האם זו חברת POC (לא צריכה מנוי)
  const isPocCompany = companyData.is_poc === true

  // מגבלת נציגים הוסרה - מנהלים יכולים להוסיף נציגים בחופשיות
  // רק בדיקה שיש מנוי פעיל (לחברות שאינן POC)
  let subscriptionData = null
  if (!isPocCompany) {
    const { data } = await supabase
      .from('company_subscriptions')
      .select(`
        is_active
      `)
      .eq('company_id', userData.company_id)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()
    
    subscriptionData = data
  }

  // קבלת מספר הנציגים הנוכחי בחברה (לצורך תצוגה בלבד)
  const { count: agentsCount } = await supabase
    .from('users')
    .select('id', { count: 'exact', head: true })
    .eq('company_id', userData.company_id)
    .eq('role', 'agent')

  // בדיקה האם ניתן להוסיף נציגים - מגבלת נציגים הוסרה
  let canAddAgent = true
  let limitMessage = null

  // חברות POC תמיד יכולות להוסיף נציגים
  if (isPocCompany) {
    canAddAgent = true
  } else if (!subscriptionData || !subscriptionData.is_active) {
    canAddAgent = false
    limitMessage = 'המנוי שלך אינו פעיל. אנא פנה לתמיכה לפעלת המנוי או עבור לעמוד הגדרת המנוי.'
  }
  
  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">הוספת נציג חדש</h1>
        <Link
          href="/team"
          className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-800 rounded-lg"
        >
          חזרה לניהול צוות
        </Link>
      </div>
      
      <div className="bg-white rounded-lg shadow p-6">
        {canAddAgent ? (
          <>
            <p className="mb-6 text-gray-600">
              הוסף נציג חדש לחברה <strong>{companyData.name}</strong>.
              {agentsCount !== null && (
                <span className="mr-2">
                  נמצאים כעת {agentsCount} נציגים בחברה שלך.
                </span>
              )}
              {isPocCompany && (
                <span className="block mt-2 text-sm text-blue-600">
                  ℹ️ כחברת POC, תוכלו להוסיף נציגים ללא הגבלה.
                </span>
              )}
            </p>
            
            <AddAgentForm 
              companyId={companyData.id} 
              requesterId={userData.id}
            />
          </>
        ) : (
          <div className="text-center py-8">
            <h2 className="text-xl font-semibold mb-4">לא ניתן להוסיף נציגים</h2>
            <p className="text-gray-600 mb-6">{limitMessage}</p>
            <div className="space-x-4">
              <Link
                href="/subscription-setup"
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg"
              >
                הגדרת מנוי
              </Link>
              <Link
                href="/team"
                className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-800 rounded-lg"
              >
                חזרה לניהול צוות
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  )
} 