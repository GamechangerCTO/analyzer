'use client'

import React, { useState, useEffect } from 'react'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import Link from 'next/link'
import { Database } from '@/types/database.types'

type Agent = Database['public']['Tables']['users']['Row']
type Subscription = Database['public']['Tables']['company_subscriptions']['Row'] & {
  subscription_plans: Database['public']['Tables']['subscription_plans']['Row']
}
type AgentRequest = Database['public']['Tables']['agent_approval_requests']['Row']
type Company = Database['public']['Tables']['companies']['Row']

interface TeamManagementClientProps {
  userId: string
  companyId: string
  userRole: string
  userFullName: string | null
}

interface AddAgentFormData {
  fullName: string
  email: string
  notes?: string
}

export default function TeamManagementClient({ userId, companyId, userRole, userFullName }: TeamManagementClientProps) {
  const [agents, setAgents] = useState<Agent[]>([])
  const [filteredAgents, setFilteredAgents] = useState<Agent[]>([])
  const [company, setCompany] = useState<Company | null>(null)
  const [subscription, setSubscription] = useState<Subscription | null>(null)
  const [myRequests, setMyRequests] = useState<AgentRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [showAddAgentModal, setShowAddAgentModal] = useState(false)
  const [showSuccessNotification, setShowSuccessNotification] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [roleFilter, setRoleFilter] = useState<'all' | 'agent' | 'manager'>('all')
  const [statusFilter, setStatusFilter] = useState<'all' | 'approved' | 'pending'>('all')
  const [formData, setFormData] = useState<AddAgentFormData>({
    fullName: '',
    email: '',
    notes: ''
  })
  const [isSubmitting, setIsSubmitting] = useState(false)

  const supabase = createClientComponentClient<Database>()

  // טעינת נתונים ראשונית
  useEffect(() => {
    fetchData()
  }, [companyId])

  // סינון נציגים
  useEffect(() => {
    let filtered = agents

    if (searchTerm) {
      filtered = filtered.filter(agent => 
        agent.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        agent.email?.toLowerCase().includes(searchTerm.toLowerCase())
      )
    }

    if (roleFilter !== 'all') {
      filtered = filtered.filter(agent => agent.role === roleFilter)
    }

    if (statusFilter !== 'all') {
      if (statusFilter === 'approved') {
        filtered = filtered.filter(agent => agent.is_approved === true)
      } else {
        filtered = filtered.filter(agent => agent.is_approved === false)
      }
    }

    setFilteredAgents(filtered)
  }, [agents, searchTerm, roleFilter, statusFilter])

  const fetchData = async () => {
    try {
      setLoading(true)

      // קבלת פרטי החברה
      const { data: companyData } = await supabase
        .from('companies')
        .select('*')
        .eq('id', companyId)
        .single()

      if (companyData) {
        setCompany(companyData)
      }

      // קבלת פרטי המנוי
      const { data: subscriptionData } = await supabase
        .from('company_subscriptions')
        .select(`
          *,
          subscription_plans(*)
        `)
        .eq('company_id', companyId)
        .order('created_at', { ascending: false })
        .limit(1)
        .single()

      if (subscriptionData) {
        setSubscription(subscriptionData as Subscription)
      }

      // קבלת רשימת הנציגים
      const { data: agentsData } = await supabase
        .from('users')
        .select('*')
        .eq('company_id', companyId)
        .order('created_at', { ascending: false })

      if (agentsData) {
        setAgents(agentsData)
      }

      // קבלת הבקשות שהמנהל הנוכחי שלח
      const { data: requestsData } = await supabase
        .from('agent_approval_requests')
        .select('*')
        .eq('requested_by', userId)
        .order('created_at', { ascending: false })

      if (requestsData) {
        setMyRequests(requestsData)
      }

    } catch (error) {
      console.error('Error fetching team data:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleAddAgent = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)

    try {
      // יצירת בקשה למנהל מערכת
      const { error } = await supabase
        .from('agent_approval_requests')
        .insert({
          company_id: companyId,
          full_name: formData.fullName,
          email: formData.email,
          requested_by: userId,
          status: 'pending'
        })

      if (error) throw error

      // יצירת התראה למנהלי מערכת
      await createSystemAdminNotification(formData)

      // אפס טופס וסגור מודל
      setFormData({ fullName: '', email: '', notes: '' })
      setShowAddAgentModal(false)
      setShowSuccessNotification(true)

      // רענן נתונים
      await fetchData()

      // הסתר התראת הצלחה אחרי 5 שניות
      setTimeout(() => setShowSuccessNotification(false), 5000)

    } catch (error) {
      console.error('Error submitting agent request:', error)
      alert('שגיאה בשליחת הבקשה. אנא נסה שוב.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const createSystemAdminNotification = async (agentData: AddAgentFormData) => {
    try {
      // קבלת כל מנהלי המערכת
      const { data: admins } = await supabase
        .from('system_admins')
        .select('user_id')

      if (admins && admins.length > 0) {
        // יצירת התראה לכל מנהל מערכת
        const notifications = admins.map(admin => ({
          user_id: admin.user_id,
          company_id: companyId,
          title: 'בקשת הוספת נציג חדש',
          message: `המנהל ${userFullName || 'ללא שם'} מבקש להוסיף נציג חדש: ${agentData.fullName} (${agentData.email})`,
          notification_type: 'agent_request',
          action_url: `/dashboard/admin/agent-requests`,
          metadata: {
            requestedBy: userId,
            agentName: agentData.fullName,
            agentEmail: agentData.email,
            companyId: companyId
          }
        }))

        await supabase
          .from('agent_notifications')
          .insert(notifications)
      }
    } catch (error) {
      console.error('Error creating admin notifications:', error)
    }
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
        return 'ממתין לאישור'
      case 'approved':
        return 'אושר'
      case 'rejected':
        return 'נדחה'
      default:
        return status
    }
  }

  const agentStats = {
    totalAgents: agents.filter(agent => agent.role === 'agent').length,
    totalManagers: agents.filter(agent => agent.role === 'manager').length,
    pendingRequestsCount: myRequests.filter(req => req.status === 'pending').length
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
            <span>✅ הבקשה נשלחה בהצלחה למנהל המערכת לאישור!</span>
            <button 
              onClick={() => setShowSuccessNotification(false)}
              className="text-green-700 hover:text-green-900"
            >
              ✕
            </button>
          </div>
        </div>
      )}

      {/* כותרת ופעולות */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h1 className="text-3xl font-bold text-gray-800">ניהול צוות</h1>
        <div className="flex flex-col sm:flex-row gap-3">
          <Link
            href="/dashboard"
            className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-800 rounded-lg transition-colors duration-200 text-center"
          >
            ← חזרה לדשבורד
          </Link>
          <button
            onClick={() => setShowAddAgentModal(true)}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors duration-200"
          >
            + הוסף נציג
          </button>
        </div>
      </div>

      {/* כרטיסיות סיכום */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-xl shadow-lg border border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-gray-800 mb-2">נציגים</h2>
              <p className="text-3xl font-bold text-blue-600">
                {agentStats.totalAgents}
                {subscription && (
                  <span className="text-sm font-normal text-gray-500 mr-1">
                    /{subscription.subscription_plans.max_agents}
                  </span>
                )}
              </p>
              <p className="mt-2 text-sm text-gray-500">נציגים פעילים בחברה</p>
            </div>
            <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
              <svg className="w-6 h-6 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                <path d="M13 6a3 3 0 11-6 0 3 3 0 016 0zM18 8a2 2 0 11-4 0 2 2 0 014 0zM14 15a4 4 0 00-8 0v3h8v-3z" />
              </svg>
            </div>
          </div>
        </div>
        
        <div className="bg-white p-6 rounded-xl shadow-lg border border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-gray-800 mb-2">מנהלים</h2>
              <p className="text-3xl font-bold text-green-600">{agentStats.totalManagers}</p>
              <p className="mt-2 text-sm text-gray-500">מנהלים בחברה</p>
            </div>
            <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
              <svg className="w-6 h-6 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>
        </div>
        
        <div className="bg-white p-6 rounded-xl shadow-lg border border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-gray-800 mb-2">הבקשות שלי</h2>
              <p className="text-3xl font-bold text-orange-600">{agentStats.pendingRequestsCount}</p>
              <p className="mt-2 text-sm text-gray-500">בקשות ממתינות לאישור</p>
            </div>
            <div className="w-12 h-12 bg-orange-100 rounded-full flex items-center justify-center">
              <svg className="w-6 h-6 text-orange-600" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
              </svg>
            </div>
          </div>
        </div>
      </div>

      {/* מידע על המנוי */}
      {subscription && (
        <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-6">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">פרטי מנוי</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <p className="text-sm text-gray-500 mb-1">חבילה</p>
              <p className="font-medium text-gray-800">{subscription.subscription_plans.name}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500 mb-1">מכסת נציגים</p>
              <p className="font-medium text-gray-800">{subscription.subscription_plans.max_agents}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500 mb-1">סטטוס</p>
              <p className="font-medium text-gray-800">
                {subscription.is_active ? (
                  <span className="text-green-600">פעיל</span>
                ) : (
                  <span className="text-red-600">לא פעיל</span>
                )}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-500 mb-1">תוקף</p>
              <p className="font-medium text-gray-800">
                {subscription.expires_at 
                  ? new Date(subscription.expires_at).toLocaleDateString('he-IL')
                  : 'ללא הגבלה'}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* מסננים וחיפוש */}
      <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-6">
        <h2 className="text-xl font-semibold text-gray-800 mb-4">אנשי צוות ({filteredAgents.length})</h2>
        
        <div className="flex flex-col md:flex-row gap-4 mb-6">
          <div className="flex-1">
            <input
              type="text"
              placeholder="חיפוש לפי שם או אימייל..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          <div>
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value as 'all' | 'agent' | 'manager')}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="all">כל התפקידים</option>
              <option value="agent">נציגים</option>
              <option value="manager">מנהלים</option>
            </select>
          </div>
          <div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as 'all' | 'approved' | 'pending')}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="all">כל הסטטוסים</option>
              <option value="approved">מאושרים</option>
              <option value="pending">ממתינים לאישור</option>
            </select>
          </div>
        </div>

        {/* טבלת נציגים */}
        {filteredAgents.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">שם מלא</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">אימייל</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">תפקיד</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">סטטוס</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">הצטרף בתאריך</th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">פעולות</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredAgents.map((agent) => (
                  <tr key={agent.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {agent.full_name || 'ללא שם'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {agent.email}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {agent.role === 'owner' ? 'בעל חברה' : 
                       agent.role === 'manager' ? 'מנהל' : 
                       agent.role === 'agent' ? 'נציג' : 
                       agent.role}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
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
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(agent.created_at).toLocaleDateString('he-IL')}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center">
                      <div className="flex justify-center space-x-3">
                        <Link 
                          href={`/team/edit-agent/${agent.id}`} 
                          className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                        >
                          עריכה
                        </Link>
                        {agent.id !== userId && agent.role !== 'owner' && (
                          <button 
                            className="text-red-600 hover:text-red-800 text-sm font-medium"
                            onClick={() => {
                              if (confirm('האם אתה בטוח שברצונך להסיר את המשתמש?')) {
                                // TODO: Implement remove user
                              }
                            }}
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
          <div className="text-center py-8">
            <p className="text-gray-500">לא נמצאו נציגים המתאימים למסננים שנבחרו</p>
          </div>
        )}
      </div>

      {/* הבקשות שלי */}
      {myRequests.length > 0 && (
        <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-6">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">הבקשות שלי ({myRequests.length})</h2>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">שם נציג</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">אימייל</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">תאריך בקשה</th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">סטטוס</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">תאריך עדכון</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {myRequests.map((request) => (
                  <tr key={request.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {request.full_name}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {request.email}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(request.created_at).toLocaleDateString('he-IL')}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(request.status)}`}>
                        {getStatusText(request.status)}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {request.approved_at 
                        ? new Date(request.approved_at).toLocaleDateString('he-IL')
                        : '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          
          {myRequests.filter(req => req.status === 'pending').length > 0 && (
            <div className="mt-4 bg-blue-50 border border-blue-200 rounded-lg p-4">
              <p className="text-sm text-blue-800">
                💡 יש לך {myRequests.filter(req => req.status === 'pending').length} בקשות ממתינות לאישור מנהל המערכת.
              </p>
            </div>
          )}
        </div>
      )}

      {/* מודל הוספת נציג */}
      {showAddAgentModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-semibold text-gray-800">הוסף נציג חדש</h3>
              <button
                onClick={() => setShowAddAgentModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <form onSubmit={handleAddAgent} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">שם מלא</label>
                <input
                  type="text"
                  required
                  value={formData.fullName}
                  onChange={(e) => setFormData({...formData, fullName: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="הכנס שם מלא"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">כתובת אימייל</label>
                <input
                  type="email"
                  required
                  value={formData.email}
                  onChange={(e) => setFormData({...formData, email: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="הכנס כתובת אימייל"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">הערות (אופציונלי)</label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({...formData, notes: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  rows={3}
                  placeholder="הערות נוספות לגבי הנציג..."
                />
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <p className="text-sm text-blue-800">
                  💡 הבקשה תישלח למנהל המערכת לאישור ויטופל בהקדם.
                </p>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowAddAgentModal(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                >
                  ביטול
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                >
                  {isSubmitting ? 'שולח...' : 'שלח בקשה'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
} 