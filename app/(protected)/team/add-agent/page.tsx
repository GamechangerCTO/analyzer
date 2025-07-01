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
  
  // בדיקת מגבלות המנוי
  const { data: subscriptionData } = await supabase
    .from('company_subscriptions')
    .select(`
      agents_count,
      is_active,
      subscription_plans(max_agents)
    `)
    .eq('company_id', userData.company_id)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()
  
  // קבלת מספר הנציגים הנוכחי בחברה
  const { count: agentsCount } = await supabase
    .from('users')
    .select('id', { count: 'exact', head: true })
    .eq('company_id', userData.company_id)
    .eq('role', 'agent')
  
  // בדיקה האם ניתן להוסיף נציגים נוספים
  let canAddAgent = false
  let limitMessage = null
  
  // מספר הנציגים המרבי - במידה וקיים
  const maxAgents = subscriptionData?.subscription_plans?.max_agents;
  
  if (!subscriptionData || !subscriptionData.is_active) {
    limitMessage = 'המנוי שלך אינו פעיל. אנא שדרג את המנוי כדי להוסיף נציגים.'
  } else if (agentsCount && maxAgents && agentsCount >= maxAgents) {
    limitMessage = `הגעת למגבלת הנציגים (${maxAgents}). אנא שדרג את המנוי כדי להוסיף נציגים נוספים.`
  } else {
    canAddAgent = true
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
              {maxAgents && (
                <span className="mr-2">
                  נותרו {maxAgents - (agentsCount || 0)} מתוך {maxAgents} נציגים במנוי שלך.
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
            <h2 className="text-xl font-semibold mb-4">לא ניתן להוסיף נציגים נוספים</h2>
            <p className="text-gray-600 mb-6">{limitMessage}</p>
            <Link
              href="/team/upgrade"
              className="px-4 py-2 bg-primary text-white rounded-md hover:bg-primary-dark"
            >
              שדרוג מנוי
            </Link>
          </div>
        )}
      </div>
    </div>
  )
} 