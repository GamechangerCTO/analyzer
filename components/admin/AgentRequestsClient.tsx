'use client'

import React, { useState, useEffect } from 'react'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import Link from 'next/link'
import { Database } from '@/types/database.types'

type AgentRequest = Database['public']['Tables']['agent_approval_requests']['Row'] & {
  companies?: {
    id: string
    name: string
  }
  users?: {
    id: string
    full_name: string | null
    email: string | null
  }
}

interface AgentRequestsClientProps {
  adminId: string
  adminName: string | null
}

export default function AgentRequestsClient({ adminId, adminName }: AgentRequestsClientProps) {
  const [requests, setRequests] = useState<AgentRequest[]>([])
  const [filteredRequests, setFilteredRequests] = useState<AgentRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('pending')
  const [processingRequests, setProcessingRequests] = useState<Set<string>>(new Set())
  const [showSuccessNotification, setShowSuccessNotification] = useState<string | null>(null)

  const supabase = createClientComponentClient<Database>()

  useEffect(() => {
    fetchRequests()
  }, [])

  useEffect(() => {
    let filtered = requests

    if (searchTerm) {
      filtered = filtered.filter(request => 
        request.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        request.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        request.companies?.name?.toLowerCase().includes(searchTerm.toLowerCase())
      )
    }

    if (statusFilter !== 'all') {
      filtered = filtered.filter(request => request.status === statusFilter)
    }

    setFilteredRequests(filtered)
  }, [requests, searchTerm, statusFilter])

  const fetchRequests = async () => {
    try {
      setLoading(true)

      const { data: requestsData, error } = await supabase
        .from('agent_approval_requests')
        .select(`
          *,
          companies(id, name),
          users!agent_approval_requests_requested_by_fkey(id, full_name, email)
        `)
        .order('created_at', { ascending: false })

      if (error) throw error

      setRequests(requestsData || [])
    } catch (error) {
      console.error('Error fetching agent requests:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleApproveRequest = async (requestId: string) => {
    if (processingRequests.has(requestId)) return

    try {
      setProcessingRequests(prev => new Set(prev).add(requestId))

      const request = requests.find(r => r.id === requestId)
      if (!request) return

      // קריאה ל-API route לאישור
      const response = await fetch('/api/admin/approve-agent', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          requestId: requestId,
          adminId: adminId
        })
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'שגיאה באישור הבקשה')
      }

      setShowSuccessNotification(result.message)
      await fetchRequests()

      setTimeout(() => setShowSuccessNotification(null), 5000)

    } catch (error) {
      console.error('Error approving request:', error)
      alert('שגיאה באישור הבקשה: ' + (error as Error).message)
    } finally {
      setProcessingRequests(prev => {
        const newSet = new Set(prev)
        newSet.delete(requestId)
        return newSet
      })
    }
  }

  const handleRejectRequest = async (requestId: string) => {
    if (processingRequests.has(requestId)) return

    const reason = prompt('אנא הזן סיבה לדחיית הבקשה (אופציונלי):')
    if (reason === null) return // המשתמש ביטל

    try {
      setProcessingRequests(prev => new Set(prev).add(requestId))

      const request = requests.find(r => r.id === requestId)
      if (!request) return

      // קריאה ל-API route לדחייה
      const response = await fetch('/api/admin/reject-agent', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          requestId: requestId,
          adminId: adminId,
          reason: reason
        })
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'שגיאה בדחיית הבקשה')
      }

      setShowSuccessNotification(result.message)
      await fetchRequests()

      setTimeout(() => setShowSuccessNotification(null), 5000)

    } catch (error) {
      console.error('Error rejecting request:', error)
      alert('שגיאה בדחיית הבקשה: ' + (error as Error).message)
    } finally {
      setProcessingRequests(prev => {
        const newSet = new Set(prev)
        newSet.delete(requestId)
        return newSet
      })
    }
  }

  const createNotificationForRequester = async (
    request: AgentRequest, 
    action: 'approved' | 'rejected',
    reason?: string
  ) => {
    try {
      const message = action === 'approved' 
        ? `בקשתך להוספת הנציג ${request.full_name} אושרה על ידי מנהל המערכת`
        : `בקשתך להוספת הנציג ${request.full_name} נדחתה${reason ? `: ${reason}` : ''}`

      await supabase
        .from('agent_notifications')
        .insert({
          user_id: request.requested_by,
          company_id: request.company_id,
          title: action === 'approved' ? 'בקשת נציג אושרה' : 'בקשת נציג נדחתה',
          message,
          notification_type: 'agent_request_response',
          metadata: {
            requestId: request.id,
            action,
            reason: reason || null,
            agentName: request.full_name
          }
        })
    } catch (error) {
      console.error('Error creating notification:', error)
    }
  }

  const generateTempPassword = () => {
    return Math.random().toString(36).slice(-8) + Math.random().toString(36).slice(-8)
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return 'bg-yellow-100 text-yellow-800'
      case 'approved':
        return 'bg-green-100 text-green-800'
      case 'rejected':
        return 'bg-red-100 text-red-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const getStatusText = (status: string) => {
    switch (status) {
      case 'pending':
        return 'ממתין'
      case 'approved':
        return 'אושר'
      case 'rejected':
        return 'נדחה'
      default:
        return status
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      {/* הודעת הצלחה */}
      {showSuccessNotification && (
        <div className="fixed top-4 left-4 right-4 bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded-lg shadow-lg z-50">
          <div className="flex justify-between items-center">
            <span>✅ {showSuccessNotification}</span>
            <button 
              onClick={() => setShowSuccessNotification(null)}
              className="text-green-700 hover:text-green-900"
            >
              ✕
            </button>
          </div>
        </div>
      )}

      {/* כותרת ופעולות */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-800">בקשות הוספת נציגים</h1>
          <p className="text-gray-600 mt-1">ניהול בקשות מנהלים להוספת נציגים חדשים</p>
        </div>
        <Link
          href="/dashboard/admin"
          className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-800 rounded-lg transition-colors duration-200"
        >
          ← חזרה לניהול מערכת
        </Link>
      </div>

      {/* סטטיסטיקות מהירות */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-xl shadow-lg border border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-gray-800 mb-1">סה"כ בקשות</h3>
              <p className="text-3xl font-bold text-blue-600">{requests.length}</p>
            </div>
            <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
              <svg className="w-6 h-6 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-lg border border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-gray-800 mb-1">ממתינות</h3>
              <p className="text-3xl font-bold text-yellow-600">
                {requests.filter(r => r.status === 'pending').length}
              </p>
            </div>
            <div className="w-12 h-12 bg-yellow-100 rounded-full flex items-center justify-center">
              <svg className="w-6 h-6 text-yellow-600" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
              </svg>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-lg border border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-gray-800 mb-1">אושרו</h3>
              <p className="text-3xl font-bold text-green-600">
                {requests.filter(r => r.status === 'approved').length}
              </p>
            </div>
            <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
              <svg className="w-6 h-6 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-lg border border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-gray-800 mb-1">נדחו</h3>
              <p className="text-3xl font-bold text-red-600">
                {requests.filter(r => r.status === 'rejected').length}
              </p>
            </div>
            <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
              <svg className="w-6 h-6 text-red-600" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
            </div>
          </div>
        </div>
      </div>

      {/* מסננים וחיפוש */}
      <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-6">
        <h2 className="text-xl font-semibold text-gray-800 mb-4">רשימת בקשות ({filteredRequests.length})</h2>
        
        <div className="flex flex-col md:flex-row gap-4 mb-6">
          <div className="flex-1">
            <input
              type="text"
              placeholder="חיפוש לפי שם נציג, אימייל או שם חברה..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          <div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as 'all' | 'pending' | 'approved' | 'rejected')}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="all">כל הסטטוסים</option>
              <option value="pending">ממתינות לאישור</option>
              <option value="approved">אושרו</option>
              <option value="rejected">נדחו</option>
            </select>
          </div>
        </div>

        {/* טבלת בקשות */}
        {filteredRequests.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">פרטי נציג</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">חברה</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">מבקש</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">תאריך בקשה</th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">סטטוס</th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">פעולות</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredRequests.map((request) => (
                  <tr key={request.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <div className="text-sm font-medium text-gray-900">{request.full_name}</div>
                        <div className="text-sm text-gray-500">{request.email}</div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {request.companies?.name || 'לא ידוע'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {request.users?.full_name || 'לא ידוע'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(request.created_at).toLocaleDateString('he-IL')}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(request.status)}`}>
                        {getStatusText(request.status)}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center">
                      {request.status === 'pending' ? (
                        <div className="flex justify-center space-x-3">
                          <button 
                            onClick={() => handleApproveRequest(request.id)}
                            disabled={processingRequests.has(request.id)}
                            className="text-green-600 hover:text-green-800 text-sm font-medium disabled:opacity-50"
                          >
                            {processingRequests.has(request.id) ? 'מעבד...' : 'אישור'}
                          </button>
                          <button 
                            onClick={() => handleRejectRequest(request.id)}
                            disabled={processingRequests.has(request.id)}
                            className="text-red-600 hover:text-red-800 text-sm font-medium disabled:opacity-50"
                          >
                            דחייה
                          </button>
                        </div>
                      ) : request.status === 'approved' ? (
                        <span className="text-green-600 text-sm">✓ אושר</span>
                      ) : (
                        <span className="text-red-600 text-sm">✗ נדחה</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center py-8">
            <p className="text-gray-500">לא נמצאו בקשות המתאימות למסננים שנבחרו</p>
          </div>
        )}
      </div>
    </div>
  )
} 