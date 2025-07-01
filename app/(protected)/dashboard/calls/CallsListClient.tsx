'use client'

import { useEffect, useState } from 'react'
import { getSupabaseClient } from '@/lib/supabase/client'
import Link from 'next/link'

interface Call {
  id: string
  call_type: string
  created_at: string
  overall_score: number | null
  processing_status: string
  users: { full_name: string | null } | null
}

interface CallsListClientProps {
  userId: string
  companyId: string | null
  userRole: string | null
  filterByAgent?: string
}

export default function CallsListClient({ userId, companyId, userRole, filterByAgent }: CallsListClientProps) {
  const [calls, setCalls] = useState<Call[]>([])
  const [loading, setLoading] = useState(true)
  const [agentName, setAgentName] = useState<string | null>(null)
  const supabase = getSupabaseClient()

  useEffect(() => {
    async function fetchCalls() {
      let query = supabase
        .from('calls')
        .select(`
          id, 
          call_type, 
          created_at, 
          overall_score, 
          processing_status,
          user_id,
          users(full_name)
        `)
        .order('created_at', { ascending: false })

      // סינון לפי הרשאות משתמש
      if (userRole === 'agent') {
        query = query.eq('user_id', userId)
      } else if (userRole === 'manager' && companyId) {
        query = query.eq('company_id', companyId)
      }

      // סינון נוסף לפי עובד ספציפי אם נתבקש
      if (filterByAgent) {
        query = query.eq('user_id', filterByAgent)
        
        // קבלת שם העובד לתצוגה
        const { data: agentData } = await supabase
          .from('users')
          .select('full_name')
          .eq('id', filterByAgent)
          .single()
        
        if (agentData) {
          setAgentName(agentData.full_name)
        }
      }

      const { data, error } = await query

      if (error) {
        console.error('Error fetching calls:', error)
      } else {
        // התמודדות עם מבנה הנתונים מ-Supabase
        const processedData = (data || []).map((call: any) => ({
          ...call,
          users: Array.isArray(call.users) ? call.users[0] || null : call.users
        }))
        setCalls(processedData)
      }
      
      setLoading(false)
    }

    fetchCalls()
  }, [userId, companyId, userRole, filterByAgent, supabase])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900">
          {filterByAgent && agentName ? `שיחות של ${agentName}` : 'כל השיחות'}
        </h1>
        <p className="text-gray-600 mt-2">
          {filterByAgent && agentName 
            ? `צפה בכל השיחות של ${agentName}` 
            : 'צפה בכל השיחות שלך'
          }
        </p>
        {filterByAgent && (
          <div className="mt-4">
            <Link 
              href="/dashboard/calls"
              className="inline-flex items-center text-blue-600 hover:text-blue-800 font-medium"
            >
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
              חזרה לכל השיחות
            </Link>
          </div>
        )}
      </div>

      <div className="bg-white shadow rounded-lg overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-xl font-semibold">רשימת שיחות</h2>
        </div>
        
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  תאריך
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  סוג שיחה
                </th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                  ציון
                </th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                  סטטוס
                </th>
                {userRole !== 'agent' && (
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    נציג
                  </th>
                )}
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                  פעולות
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {calls.map((call) => (
                <tr key={call.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {new Date(call.created_at).toLocaleDateString('he-IL')}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {call.call_type}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-center">
                    {call.overall_score ? (
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                        call.overall_score >= 8 
                          ? 'bg-green-100 text-green-800' 
                          : call.overall_score >= 6
                          ? 'bg-yellow-100 text-yellow-800'
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {call.overall_score.toFixed(1)}
                      </span>
                    ) : (
                      <span className="text-gray-400">-</span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-center text-sm">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                      call.processing_status === 'completed' 
                        ? 'bg-green-100 text-green-800' 
                        : call.processing_status === 'error'
                        ? 'bg-red-100 text-red-800'
                        : 'bg-yellow-100 text-yellow-800'
                    }`}>
                      {call.processing_status === 'completed' ? 'הושלם' : 
                       call.processing_status === 'error' ? 'שגיאה' : 'בעבודה'}
                    </span>
                  </td>
                  {userRole !== 'agent' && (
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {call.users?.full_name || 'לא ידוע'}
                    </td>
                  )}
                  <td className="px-6 py-4 whitespace-nowrap text-center">
                    <Link 
                      href={`/dashboard/calls/${call.id}`}
                      className="text-primary hover:text-primary-dark font-medium"
                    >
                      צפה
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          
          {calls.length === 0 && (
            <div className="text-center py-12">
              <p className="text-gray-500">אין שיחות עדיין</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
} 