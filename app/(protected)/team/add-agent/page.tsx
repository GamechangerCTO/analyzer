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

  // קבלת מספר הנציגים הנוכחי בחברה (לצורך תצוגה בלבד)
  const { count: agentsCount } = await supabase
    .from('users')
    .select('id', { count: 'exact', head: true })
    .eq('company_id', userData.company_id)
    .eq('role', 'agent')

  // מגבלת נציגים הוסרה לחלוטין - מנהלים יכולים להוסיף נציגים בחופשיות
  // המגבלה היחידה היא על דקות שימוש, לא על מספר נציגים
  
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
        <p className="mb-6 text-gray-600">
          הוסף נציג חדש לחברה <strong>{companyData.name}</strong>.
          {agentsCount !== null && (
            <span className="mr-2">
              נמצאים כעת {agentsCount} נציגים בחברה שלך.
            </span>
          )}
          <span className="block mt-2 text-sm text-green-600">
            ✅ תוכל להוסיף נציגים ללא הגבלה. המגבלה היחידה היא על דקות השימוש.
          </span>
        </p>
        
        <AddAgentForm 
          companyId={companyData.id} 
          requesterId={userData.id}
        />
      </div>
    </div>
  )
} 