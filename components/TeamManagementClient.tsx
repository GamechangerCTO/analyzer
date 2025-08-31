'use client'

import React, { useState, useEffect } from 'react'
import { getSupabaseClient } from '@/lib/supabase/client'
import Link from 'next/link'
import { Database } from '@/types/database.types'
import { 
  Users, 
  UserPlus, 
  Search, 
  Filter, 
  Plus, 
  Edit, 
  Trash2, 
  Award, 
  Clock, 
  CheckCircle, 
  AlertCircle, 
  Mail, 
  Phone, 
  Building, 
  Calendar,
  Star,
  TrendingUp,
  Activity,
  X,
  Eye,
  BarChart3,
  Target,
  Crown,
  Shield
} from 'lucide-react'
import Avatar from '@/components/Avatar'
import AdvancedDataTable from '@/components/AdvancedDataTable'

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
  password: string
  notes?: string
}

interface AgentWithStats extends Agent {
  total_calls?: number
  weekly_calls?: number
  avg_score?: number
  last_call_date?: string | null
  activity_status?: 'active' | 'moderate' | 'inactive'
}

export default function TeamManagementClient({ userId, companyId, userRole, userFullName }: TeamManagementClientProps) {
  const [agents, setAgents] = useState<AgentWithStats[]>([])
  const [company, setCompany] = useState<Company | null>(null)
  const [subscription, setSubscription] = useState<Subscription | null>(null)
  const [myRequests, setMyRequests] = useState<AgentRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [showAddAgentModal, setShowAddAgentModal] = useState(false)
  const [showSuccessNotification, setShowSuccessNotification] = useState(false)
  const [successMessage, setSuccessMessage] = useState('')
  // מגבלת משתמשים הוסרה - השארנו רק מגבלת דקות
  const [formData, setFormData] = useState<AddAgentFormData>({
    fullName: '',
    email: '',
    password: '',
    notes: ''
  })
  const [isSubmitting, setIsSubmitting] = useState(false)

  const supabase = getSupabaseClient()

  // טעינת נתונים ראשונית
  useEffect(() => {
    fetchData()
  }, [companyId])

  const fetchData = async () => {
    try {
      setLoading(true)
      
      // טעינת פרטי החברה
      const { data: companyData } = await supabase
        .from('companies')
        .select('*')
        .eq('id', companyId)
        .single()
      
      setCompany(companyData)

      // טעינת מנוי
      const { data: subscriptionData } = await supabase
        .from('company_subscriptions')
        .select(`
          *,
          subscription_plans(*)
        `)
        .eq('company_id', companyId)
        .eq('is_active', true)
        .single()
      
      setSubscription(subscriptionData)

      // מגבלת משתמשים הוסרה

      // טעינת נציגים עם נתוני ביצועים
      const { data: agentsData } = await supabase
        .from('users')
        .select('*')
        .eq('company_id', companyId)
        .in('role', ['agent', 'manager', 'owner'])
        .order('created_at', { ascending: false })

      if (agentsData) {
        // הוספת נתוני ביצועים לכל נציג
        const agentsWithStats = await Promise.all(
          agentsData.map(async (agent) => {
            // שליפת נתוני שיחות
            const { data: callsData } = await supabase
              .from('calls')
              .select('id, overall_score, created_at')
              .eq('user_id', agent.id)

            const totalCalls = callsData?.length || 0
            
            // שיחות השבוע
            const oneWeekAgo = new Date()
            oneWeekAgo.setDate(oneWeekAgo.getDate() - 7)
            const weeklyCalls = callsData?.filter(call => 
              new Date(call.created_at) >= oneWeekAgo
            ).length || 0

            // ציון ממוצע
            const callsWithScore = callsData?.filter(call => call.overall_score !== null) || []
            const avgScore = callsWithScore.length > 0 
              ? callsWithScore.reduce((sum, call) => sum + (call.overall_score || 0), 0) / callsWithScore.length
              : 0

            // תאריך שיחה אחרונה
            const lastCallDate = callsData && callsData.length > 0 
              ? callsData[0].created_at 
              : null

            // סטטוס פעילות
            let activityStatus: 'active' | 'moderate' | 'inactive' = 'inactive'
            if (weeklyCalls >= 10) activityStatus = 'active'
            else if (weeklyCalls >= 3) activityStatus = 'moderate'

            return {
              ...agent,
              total_calls: totalCalls,
              weekly_calls: weeklyCalls,
              avg_score: Number(avgScore.toFixed(1)),
              last_call_date: lastCallDate,
              activity_status: activityStatus
            }
          })
        )

        setAgents(agentsWithStats)
      }

      // טעינת בקשות הנציגים שלי
      const { data: requestsData } = await supabase
        .from('agent_approval_requests')
        .select('*')
        .eq('requested_by', userId)
        .order('created_at', { ascending: false })
      
      setMyRequests(requestsData || [])

    } catch (error) {
      console.error('שגיאה בטעינת נתונים:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleAddAgent = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)

    try {
      const response = await fetch('/api/team/add-agent', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          full_name: formData.fullName,
          email: formData.email,
          password: formData.password,
          companyId,
          requesterId: userId,
          notes: formData.notes
        }),
      })

      const result = await response.json()

      if (response.ok) {
        setSuccessMessage(result.message)
        setShowSuccessNotification(true)
        setShowAddAgentModal(false)
        setFormData({ fullName: '', email: '', password: '', notes: '' })
        
        // רענון הנתונים
        fetchData()
        
        setTimeout(() => {
          setShowSuccessNotification(false)
        }, 5000)
      } else {
        alert(result.error || 'שגיאה בהוספת הנציג')
      }
    } catch (error) {
      console.error('שגיאה בהוספת נציג:', error)
      alert('שגיאה בהוספת הנציג')
    } finally {
      setIsSubmitting(false)
    }
  }

  // Helper functions
  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'לא ידוע'
    return new Date(dateString).toLocaleDateString('he-IL')
  }

  const getRoleName = (role: string) => {
    const roleNames = {
      'owner': 'בעלים',
      'manager': 'מנהל',
      'agent': 'נציג'
    }
    return roleNames[role as keyof typeof roleNames] || role
  }

  const getRoleIcon = (role: string) => {
    const roleIcons = {
      'owner': <Crown className="w-4 h-4" />,
      'manager': <Shield className="w-4 h-4" />,
      'agent': <Users className="w-4 h-4" />
    }
    return roleIcons[role as keyof typeof roleIcons] || <Users className="w-4 h-4" />
  }

  const getStatusBadge = (isApproved: boolean | null) => {
    if (isApproved === true) {
      return <span className="px-2 py-1 bg-green-100 text-green-800 rounded-full text-xs font-medium">מאושר</span>
    } else if (isApproved === false) {
      return <span className="px-2 py-1 bg-red-100 text-red-800 rounded-full text-xs font-medium">נדחה</span>
    } else {
      return <span className="px-2 py-1 bg-yellow-100 text-yellow-800 rounded-full text-xs font-medium">ממתין</span>
    }
  }

  const getActivityBadge = (status: 'active' | 'moderate' | 'inactive') => {
    const statusConfig = {
      'active': { color: 'bg-green-100 text-green-800', text: 'פעיל' },
      'moderate': { color: 'bg-yellow-100 text-yellow-800', text: 'בינוני' },
      'inactive': { color: 'bg-red-100 text-red-800', text: 'לא פעיל' }
    }
    
    const config = statusConfig[status]
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${config.color}`}>
        {config.text}
      </span>
    )
  }

  // Define table columns
  const columns = [
    {
      key: 'full_name',
      title: 'שם מלא',
      sortable: true,
      filterable: true,
      render: (value: string, row: AgentWithStats) => (
        <div className="flex items-center gap-3">
          <Avatar
            avatarUrl={null}
            fullName={value || 'משתמש'}
            size="sm"
          />
          <div>
            <div className="font-medium text-gray-900">{value}</div>
            <div className="text-sm text-gray-500">{row.email}</div>
          </div>
        </div>
      )
    },
    {
      key: 'role',
      title: 'תפקיד',
      sortable: true,
      filterable: true,
      filterType: 'select' as const,
      filterOptions: [
        { value: 'owner', label: 'בעלים' },
        { value: 'manager', label: 'מנהל' },
        { value: 'agent', label: 'נציג' }
      ],
      render: (value: string) => (
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center text-white">
            {getRoleIcon(value)}
          </div>
          <span className="font-medium">{getRoleName(value)}</span>
        </div>
      )
    },
    {
      key: 'is_approved',
      title: 'סטטוס',
      sortable: true,
      filterable: true,
      filterType: 'select' as const,
      filterOptions: [
        { value: 'true', label: 'מאושר' },
        { value: 'false', label: 'נדחה' },
        { value: 'null', label: 'ממתין' }
      ],
      render: (value: boolean | null) => getStatusBadge(value)
    },
    {
      key: 'activity_status',
      title: 'פעילות',
      sortable: true,
      filterable: true,
      filterType: 'select' as const,
      filterOptions: [
        { value: 'active', label: 'פעיל' },
        { value: 'moderate', label: 'בינוני' },
        { value: 'inactive', label: 'לא פעיל' }
      ],
      render: (value: 'active' | 'moderate' | 'inactive') => getActivityBadge(value)
    },
    {
      key: 'total_calls',
      title: 'סה"כ שיחות',
      sortable: true,
      filterable: true,
      filterType: 'number' as const,
      render: (value: number) => (
        <div className="flex items-center gap-2">
          <Phone className="w-4 h-4 text-gray-400" />
          <span className="font-medium">{value || 0}</span>
        </div>
      )
    },
    {
      key: 'weekly_calls',
      title: 'שיחות השבוע',
      sortable: true,
      filterable: true,
      filterType: 'number' as const,
      render: (value: number) => (
        <div className="flex items-center gap-2">
          <Calendar className="w-4 h-4 text-gray-400" />
          <span className="font-medium">{value || 0}</span>
        </div>
      )
    },
    {
      key: 'avg_score',
      title: 'ציון ממוצע',
      sortable: true,
      filterable: true,
      filterType: 'number' as const,
      render: (value: number) => {
        if (!value) return <span className="text-gray-400">אין נתונים</span>
        
        let colorClass = ''
        if (value >= 8) colorClass = 'text-green-600 bg-green-100'
        else if (value >= 6) colorClass = 'text-yellow-600 bg-yellow-100'
        else if (value >= 4) colorClass = 'text-orange-600 bg-orange-100'
        else colorClass = 'text-red-600 bg-red-100'
        
        return (
          <div className="flex items-center gap-2">
            <Star className="w-4 h-4 text-gray-400" />
            <span className={`px-2 py-1 rounded-full text-xs font-medium ${colorClass}`}>
              {value.toFixed(1)}
            </span>
          </div>
        )
      }
    },
    {
      key: 'last_call_date',
      title: 'שיחה אחרונה',
      sortable: true,
      filterable: true,
      filterType: 'date' as const,
      render: (value: string | null) => (
        <div className="flex items-center gap-2">
          <Clock className="w-4 h-4 text-gray-400" />
          <span>{formatDate(value)}</span>
        </div>
      )
    },
    {
      key: 'created_at',
      title: 'תאריך הצטרפות',
      sortable: true,
      filterable: true,
      filterType: 'date' as const,
      render: (value: string) => formatDate(value)
    },
    {
      key: 'id',
      title: 'פעולות',
      sortable: false,
      filterable: false,
      searchable: false,
      render: (value: string, row: AgentWithStats) => (
        <div className="flex items-center gap-2">
          <Link 
            href={`/dashboard/agent?user=${value}`}
            className="inline-flex items-center gap-1 px-3 py-1 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-colors text-xs font-medium"
            title="צפה בדשבורד"
          >
            <Eye className="w-3 h-3" />
            <span>צפה</span>
          </Link>
          
          {userRole === 'manager' && row.role === 'agent' && (
            <Link 
              href={`/team/edit-agent/${value}`}
              className="inline-flex items-center gap-1 px-3 py-1 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors text-xs font-medium"
              title="ערוך נציג"
            >
              <Edit className="w-3 h-3" />
              <span>ערוך</span>
            </Link>
          )}
        </div>
      )
    }
  ]

  // Export function
  const handleExport = () => {
    const headers = [
      'שם מלא',
      'אימייל',
      'תפקיד',
      'סטטוס אישור',
      'פעילות',
      'סה"כ שיחות',
      'שיחות השבוע',
      'ציון ממוצע',
      'שיחה אחרונה',
      'תאריך הצטרפות'
    ].join(',')
    
    const rows = agents.map(agent => [
      agent.full_name || '',
      agent.email || '',
      getRoleName(agent.role || ''),
      agent.is_approved === true ? 'מאושר' : agent.is_approved === false ? 'נדחה' : 'ממתין',
      agent.activity_status === 'active' ? 'פעיל' : agent.activity_status === 'moderate' ? 'בינוני' : 'לא פעיל',
      agent.total_calls || 0,
      agent.weekly_calls || 0,
      agent.avg_score || 0,
      formatDate(agent.last_call_date || null),
      formatDate(agent.created_at)
    ].map(field => `"${String(field).replace(/"/g, '""')}"`).join(',')).join('\n')
    
    const csv = `${headers}\n${rows}`
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `team_management_${new Date().toISOString().split('T')[0]}.csv`
    a.click()
    window.URL.revokeObjectURL(url)
  }

  return (
    <div className="space-y-8">
      {/* Success Notification */}
      {showSuccessNotification && (
        <div className="fixed top-4 right-4 z-50 bg-green-50 border border-green-200 rounded-lg p-4 shadow-lg">
          <div className="flex items-center">
            <CheckCircle className="w-5 h-5 text-green-400" />
            <p className="mr-3 text-sm font-medium text-green-800">{successMessage}</p>
            <button
              type="button"
              className="mr-auto -mx-1.5 -my-1.5 bg-green-50 text-green-500 rounded-lg focus:ring-2 focus:ring-green-400 p-1.5 hover:bg-green-100"
              onClick={() => setShowSuccessNotification(false)}
            >
              <X className="w-3 h-3" />
            </button>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">ניהול צוות</h1>
          <p className="mt-1 text-sm text-gray-600">
            נהל את הנציגים שלך, צפה בביצועים והוסף חברי צוות חדשים
          </p>
        </div>
        
        <div className="flex gap-3">
          <button
            onClick={() => setShowAddAgentModal(true)}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            <UserPlus className="w-4 h-4 mr-2" />
            הוסף נציג
          </button>
        </div>
      </div>

      {/* מגבלת משתמשים הוסרה - רק מגבלת דקות רלוונטית */}

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
          <div className="flex items-center">
            <div className="p-3 bg-blue-100 rounded-xl">
              <Users className="w-6 h-6 text-blue-600" />
            </div>
            <div className="mr-4">
              <p className="text-sm font-medium text-gray-600">סה"כ חברי צוות</p>
              <p className="text-2xl font-bold text-gray-900">{agents.length}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
          <div className="flex items-center">
            <div className="p-3 bg-green-100 rounded-xl">
              <CheckCircle className="w-6 h-6 text-green-600" />
            </div>
            <div className="mr-4">
              <p className="text-sm font-medium text-gray-600">נציגים פעילים</p>
              <p className="text-2xl font-bold text-gray-900">
                {agents.filter(agent => agent.activity_status === 'active').length}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
          <div className="flex items-center">
            <div className="p-3 bg-purple-100 rounded-xl">
              <BarChart3 className="w-6 h-6 text-purple-600" />
            </div>
            <div className="mr-4">
              <p className="text-sm font-medium text-gray-600">ציון ממוצע צוות</p>
              <p className="text-2xl font-bold text-gray-900">
                {agents.filter(a => a.avg_score).length > 0 
                  ? (agents.reduce((sum, a) => sum + (a.avg_score || 0), 0) / agents.filter(a => a.avg_score).length).toFixed(1)
                  : 'אין נתונים'
                }
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
          <div className="flex items-center">
            <div className="p-3 bg-yellow-100 rounded-xl">
              <Clock className="w-6 h-6 text-yellow-600" />
            </div>
            <div className="mr-4">
              <p className="text-sm font-medium text-gray-600">בקשות ממתינות</p>
              <p className="text-2xl font-bold text-gray-900">{myRequests.length}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Advanced Team Table */}
      <AdvancedDataTable
        data={agents}
        columns={columns}
        loading={loading}
        title="רשימת חברי הצוות"
        subtitle={`${agents.length} חברי צוות עם נתוני ביצועים מפורטים`}
        onRefresh={fetchData}
        onExport={handleExport}
        globalSearch={true}
        pagination={true}
        pageSize={15}
        className="shadow-xl"
      />

      {/* Add Agent Modal */}
      {showAddAgentModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50 flex items-center justify-center">
          <div className="bg-white p-8 rounded-xl shadow-xl max-w-md w-full mx-4">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-lg font-semibold text-gray-900">הוסף נציג חדש</h3>
              <button
                onClick={() => setShowAddAgentModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
            
            <form onSubmit={handleAddAgent} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  שם מלא *
                </label>
                <input
                  type="text"
                  required
                  value={formData.fullName}
                  onChange={(e) => setFormData(prev => ({ ...prev, fullName: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="הכנס שם מלא"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  כתובת אימייל *
                </label>
                <input
                  type="email"
                  required
                  value={formData.email}
                  onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="הכנס כתובת אימייל"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  סיסמה זמנית *
                </label>
                <input
                  type="password"
                  required
                  minLength={6}
                  value={formData.password}
                  onChange={(e) => setFormData(prev => ({ ...prev, password: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="הכנס סיסמה זמנית (לפחות 6 תווים)"
                />
                <p className="mt-1 text-xs text-gray-500">
                  הנציג יתבקש להחליף את הסיסמה בכניסה הראשונה
                </p>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  הערות (אופציונלי)
                </label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="הערות נוספות על הנציג..."
                />
              </div>
              
              <div className="flex justify-end gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowAddAgentModal(false)}
                  className="px-4 py-2 text-gray-600 border border-gray-300 rounded-md hover:bg-gray-50"
                >
                  ביטול
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  {isSubmitting ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      שולח...
                    </>
                  ) : (
                    <>
                      <UserPlus className="w-4 h-4" />
                      הוסף נציג
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
} 