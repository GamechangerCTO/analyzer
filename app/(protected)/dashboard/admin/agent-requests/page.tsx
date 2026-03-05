'use client'

import React, { useState, useEffect } from 'react'
import { getSupabaseClient } from '@/lib/supabase/client'
import Link from 'next/link'
import { Database } from '@/types/database.types'

type AgentRequest = Database['public']['Tables']['agent_approval_requests']['Row'] & {
  users: {
    full_name: string | null
  } | null,
  companies: {
    name: string
  } | null
}

// ממשק QuotaPurchaseData הוסר - מגבלת משתמשים בוטלה

export default function AgentRequestsPage() {
  const [requests, setRequests] = useState<AgentRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'all' | 'pending' | 'agents' | 'quota'>('all')
  const [processingId, setProcessingId] = useState<string | null>(null)

  const supabase = getSupabaseClient()

  useEffect(() => {
    fetchRequests()
  }, [])

  const fetchRequests = async () => {
    try {
      const { data, error } = await supabase
        .from('agent_approval_requests')
        .select(`
          *,
          users!agent_approval_requests_requested_by_fkey(full_name),
          companies(name)
        `)
        .order('created_at', { ascending: false })

      if (error) throw error
      setRequests(data || [])
    } catch (error) {
      console.error('Error fetching requests:', error)
    } finally {
      setLoading(false)
    }
  }

  // פונקציות מכסות הוסרו - מגבלת משתמשים בוטלה

  const filteredRequests = requests.filter(request => {
    if (filter === 'pending') return request.status === 'pending'
    // מגבלת משתמשים הוסרה - כל הבקשות הן בקשות נציגים רגילות
    if (filter === 'agents') return true
    if (filter === 'quota') return false // אין יותר בקשות מכסה
    return true
  })

  const handleApprove = async (requestId: string) => {
    setProcessingId(requestId)
    try {
      const request = requests.find(r => r.id === requestId)
      if (!request) return

      // מגבלת משתמשים הוסרה - כל הבקשות מטופלות כבקשות רגילות
      const response = await fetch('/api/admin/approve-agent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ requestId })
      })

      const result = await response.json()
      if (response.ok) {
        await fetchRequests()
        alert('✅ בקשת הנציג אושרה בהצלחה!')
      } else {
        throw new Error(result.error)
      }
    } catch (error) {
      console.error('Error approving request:', error)
      alert('❌ שגיאה באישור הבקשה: ' + (error as Error).message)
    } finally {
      setProcessingId(null)
    }
  }

  // פונקציית רכישת מכסה הוסרה - מגבלת משתמשים בוטלה

  const updateRequestStatus = async (requestId: string, status: string) => {
    await supabase
      .from('agent_approval_requests')
      .update({ status })
      .eq('id', requestId)
  }

  const handleReject = async (requestId: string) => {
    const reason = prompt('סיבת דחיית הבקשה (אופציונלי):')
    
    setProcessingId(requestId)
    try {
      const response = await fetch('/api/admin/reject-agent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ requestId, reason })
      })

      const result = await response.json()
      if (response.ok) {
        await fetchRequests()
        alert('✅ הבקשה נדחתה בהצלחה')
      } else {
        throw new Error(result.error)
      }
    } catch (error) {
      console.error('Error rejecting request:', error)
      alert('❌ שגיאה בדחיית הבקשה: ' + (error as Error).message)
    } finally {
      setProcessingId(null)
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-800'
      case 'approved': return 'bg-green-100 text-green-800'
      case 'rejected': return 'bg-red-100 text-red-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getStatusText = (status: string) => {
    switch (status) {
      case 'pending': return 'ממתין'
      case 'approved': return 'אושר'
      case 'rejected': return 'נדחה'
      default: return status
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-brand-primary"></div>
      </div>
    )
  }

  const pendingCount = requests.filter(r => r.status === 'pending').length
  const agentRequestsCount = requests.length // כל הבקשות הן בקשות נציגים
  const quotaRequestsCount = 0 // אין יותר בקשות מכסה

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* כותרת */}
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-gray-800">בקשות נציגים ומכסות</h1>
        <Link 
          href="/dashboard/admin"
          className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-800 rounded-lg transition-colors"
        >
          ← חזרה לדשבורד אדמין
        </Link>
      </div>

      {/* סטטיסטיקות */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-lg shadow border border-gray-200">
          <h3 className="text-sm font-medium text-gray-500">סה"כ בקשות</h3>
          <p className="text-2xl font-bold text-gray-900">{requests.length}</p>
        </div>
        <div className="bg-yellow-50 p-4 rounded-lg shadow border border-yellow-200">
          <h3 className="text-sm font-medium text-yellow-700">ממתינות לטיפול</h3>
          <p className="text-2xl font-bold text-yellow-800">{pendingCount}</p>
        </div>
        <div className="bg-brand-info-light p-4 rounded-lg shadow border border-brand-info-light">
          <h3 className="text-sm font-medium text-brand-primary-dark">בקשות נציגים</h3>
          <p className="text-2xl font-bold text-brand-primary-dark">{agentRequestsCount}</p>
        </div>
        <div className="bg-brand-accent-light p-4 rounded-lg shadow border border-brand-accent-light">
          <h3 className="text-sm font-medium text-brand-info-dark">בקשות מכסות</h3>
          <p className="text-2xl font-bold text-brand-info-dark">{quotaRequestsCount}</p>
        </div>
      </div>

      {/* מסננים */}
      <div className="bg-white p-4 rounded-lg shadow border border-gray-200">
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setFilter('all')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              filter === 'all' ? 'bg-brand-primary text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            הכל ({requests.length})
          </button>
          <button
            onClick={() => setFilter('pending')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              filter === 'pending' ? 'bg-yellow-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            ממתינות ({pendingCount})
          </button>
          <button
            onClick={() => setFilter('agents')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              filter === 'agents' ? 'bg-brand-primary text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            בקשות נציגים ({agentRequestsCount})
          </button>
          <button
            onClick={() => setFilter('quota')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              filter === 'quota' ? 'bg-brand-info text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            בקשות מכסות ({quotaRequestsCount})
          </button>
        </div>
      </div>

      {/* רשימת בקשות */}
      <div className="bg-white rounded-lg shadow border border-gray-200">
        {filteredRequests.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            {filter === 'all' ? 'אין בקשות' : `אין בקשות ${filter === 'pending' ? 'ממתינות' : filter === 'agents' ? 'נציגים' : 'מכסות'}`}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">סוג</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">פרטים</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">חברה</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">מבקש</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">סטטוס</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">תאריך</th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">פעולות</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredRequests.map((request) => {
                  // מגבלת משתמשים הוסרה - כל הבקשות הן בקשות נציגים רגילות
                  
                  return (
                    <tr key={request.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-brand-info-light text-brand-primary-dark">
                          👤 נציג
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div>
                          <p className="text-sm font-medium text-gray-900">{request.users?.full_name || 'לא ידוע'}</p>
                          <p className="text-sm text-gray-500">{request.agent_id}</p>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {request.companies?.name || 'לא ידוע'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {request.users?.full_name || 'לא ידוע'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(request.status)}`}>
                          {getStatusText(request.status)}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {new Date(request.created_at).toLocaleDateString('he-IL')}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-center text-sm font-medium">
                        {request.status === 'pending' && (
                          <div className="flex justify-center gap-2">
                            <button
                              onClick={() => handleApprove(request.id)}
                              disabled={processingId === request.id}
                              className="text-green-600 hover:text-green-900 disabled:opacity-50"
                            >
                              {processingId === request.id ? '⏳' : '✅ אשר'}
                            </button>
                            <button
                              onClick={() => handleReject(request.id)}
                              disabled={processingId === request.id}
                              className="text-red-600 hover:text-red-900 disabled:opacity-50"
                            >
                              ❌ דחה
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
} 