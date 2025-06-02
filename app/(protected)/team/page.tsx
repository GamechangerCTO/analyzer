import React from 'react'
import { cookies } from 'next/headers'
import { createClient } from '@/lib/supabase/server'
import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'

export default async function TeamPage() {
  const cookieStore = cookies()
  const supabase = createClient(cookieStore)
  
  const { data: { user }, error } = await supabase.auth.getUser()
  
  if (!user || error) {
    redirect('/login')
  }
  
  // בדיקה שהמשתמש הוא מנהל או בעל חברה
  const { data: userData, error: userError } = await supabase
    .from('users')
    .select('id, role, company_id, full_name')
    .eq('id', user.id)
    .single()
  
  if (userError || !userData) {
    notFound()
  }
  
  if (userData.role !== 'manager' && userData.role !== 'owner') {
    redirect('/dashboard')
  }
  
  // בדיקה שיש company_id
  if (!userData.company_id) {
    notFound()
  }
  
  // קבלת פרטי החברה
  const { data: companyData } = await supabase
    .from('companies')
    .select('*')
    .eq('id', userData.company_id)
    .single()
  
  // בדיקת מידע על המנוי של החברה
  const { data: subscriptionData } = await supabase
    .from('company_subscriptions')
    .select(`
      *,
      subscription_plans(name, max_agents)
    `)
    .eq('company_id', userData.company_id)
    .order('created_at', { ascending: false })
    .limit(1)
    .single()
  
  // קבלת רשימת הנציגים בחברה
  const { data: agentsData } = await supabase
    .from('users')
    .select('*')
    .eq('company_id', userData.company_id)
    .order('created_at', { ascending: false })
  
  // קבלת בקשות הרשמה פתוחות
  const { data: pendingRequests } = await supabase
    .from('agent_approval_requests')
    .select('*')
    .eq('company_id', userData.company_id)
    .eq('status', 'pending')
    .order('created_at', { ascending: false })
  
  const canAddMoreAgents = subscriptionData 
    ? (agentsData?.filter(agent => agent.role === 'agent').length || 0) < subscriptionData.subscription_plans.max_agents
    : false
  
  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">ניהול צוות</h1>
        <div className="flex space-x-4">
          {canAddMoreAgents ? (
            <Link
              href="/team/add-agent"
              className="px-4 py-2 bg-primary text-white rounded-md hover:bg-primary-dark"
            >
              הוספת נציג חדש
            </Link>
          ) : (
            <Link
              href="/team/upgrade"
              className="px-4 py-2 bg-amber-500 text-white rounded-md hover:bg-amber-600"
            >
              שדרוג חבילה
            </Link>
          )}
        </div>
      </div>
      
      {/* כרטיסיות סיכום */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-xl font-semibold mb-2">נציגים</h2>
          <p className="text-3xl font-bold">
            {agentsData?.filter(agent => agent.role === 'agent').length || 0}
            {subscriptionData && (
              <span className="text-sm font-normal text-gray-500">
                /{subscriptionData.subscription_plans.max_agents}
              </span>
            )}
          </p>
          <p className="mt-2 text-sm text-gray-500">נציגים פעילים בחברה</p>
        </div>
        
        <div className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-xl font-semibold mb-2">מנהלים</h2>
          <p className="text-3xl font-bold">
            {agentsData?.filter(agent => agent.role === 'manager').length || 0}
          </p>
          <p className="mt-2 text-sm text-gray-500">מנהלים בחברה</p>
        </div>
        
        <div className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-xl font-semibold mb-2">בקשות ממתינות</h2>
          <p className="text-3xl font-bold">{pendingRequests?.length || 0}</p>
          <p className="mt-2 text-sm text-gray-500">בקשות להוספת נציגים</p>
        </div>
      </div>
      
      {/* מידע על המנוי */}
      {subscriptionData && (
        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-semibold">פרטי מנוי</h2>
            <Link
              href="/team/upgrade"
              className="text-primary hover:underline text-sm"
            >
              שדרוג חבילה
            </Link>
          </div>
          <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <p className="text-sm text-gray-500">חבילה</p>
              <p className="font-medium">{subscriptionData.subscription_plans.name}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">מכסת נציגים</p>
              <p className="font-medium">{subscriptionData.subscription_plans.max_agents}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">סטטוס</p>
              <p className="font-medium">{subscriptionData.is_active ? 'פעיל' : 'לא פעיל'}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">תוקף</p>
              <p className="font-medium">
                {subscriptionData.expires_at 
                  ? new Date(subscriptionData.expires_at).toLocaleDateString('he-IL')
                  : 'ללא הגבלה'}
              </p>
            </div>
          </div>
        </div>
      )}
      
      {/* רשימת נציגים */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="p-6">
          <h2 className="text-xl font-semibold mb-4">אנשי צוות</h2>
          
          {agentsData && agentsData.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      שם מלא
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      אימייל
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      תפקיד
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      סטטוס
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      הצטרף בתאריך
                    </th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                      פעולות
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {agentsData.map((agent) => (
                    <tr key={agent.id}>
                      <td className="px-4 py-4 whitespace-nowrap text-sm">
                        {agent.full_name || 'ללא שם'}
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm">
                        {agent.email}
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm">
                        {agent.role === 'owner' ? 'בעל חברה' : 
                         agent.role === 'manager' ? 'מנהל' : 
                         agent.role === 'agent' ? 'נציג' : 
                         agent.role}
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm">
                        <span 
                          className={`px-2 py-1 rounded-full text-xs font-medium ${
                            agent.is_approved 
                              ? 'bg-green-100 text-green-800' 
                              : 'bg-yellow-100 text-yellow-800'
                          }`}
                        >
                          {agent.is_approved ? 'מאושר' : 'ממתין לאישור'}
                        </span>
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm">
                        {new Date(agent.created_at).toLocaleDateString('he-IL')}
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-center">
                        <div className="flex justify-center space-x-2">
                          <Link 
                            href={`/team/edit-agent/${agent.id}`} 
                            className="text-indigo-600 hover:text-indigo-900"
                          >
                            עריכה
                          </Link>
                          
                          {agent.id !== user.id && agent.role !== 'owner' && (
                            <button 
                              className="text-red-600 hover:text-red-900"
                              // onClick={() => handleRemoveAgent(agent.id)}
                            >
                              הסרה
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-4">
              <p className="text-gray-500">לא נמצאו נציגים</p>
            </div>
          )}
        </div>
      </div>
      
      {/* בקשות ממתינות */}
      {pendingRequests && pendingRequests.length > 0 && (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="p-6">
            <h2 className="text-xl font-semibold mb-4">בקשות ממתינות לאישור</h2>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      שם מלא
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      אימייל
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      תאריך בקשה
                    </th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                      פעולות
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {pendingRequests.map((request) => (
                    <tr key={request.id}>
                      <td className="px-4 py-4 whitespace-nowrap text-sm">
                        {request.full_name || 'ללא שם'}
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm">
                        {request.email}
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm">
                        {new Date(request.created_at).toLocaleDateString('he-IL')}
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-center">
                        <div className="flex justify-center space-x-2">
                          <button 
                            className="text-green-600 hover:text-green-900"
                            // onClick={() => handleApproveRequest(request.id)}
                          >
                            אישור
                          </button>
                          <button 
                            className="text-red-600 hover:text-red-900"
                            // onClick={() => handleRejectRequest(request.id)}
                          >
                            דחייה
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  )
} 