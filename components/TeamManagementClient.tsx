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
  const [successMessage, setSuccessMessage] = useState('')
  const [userQuota, setUserQuota] = useState<{total_users: number, used_users: number, available_users: number} | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [roleFilter, setRoleFilter] = useState<'all' | 'agent' | 'manager'>('all')
  const [statusFilter, setStatusFilter] = useState<'all' | 'approved' | 'pending'>('all')
  const [formData, setFormData] = useState<AddAgentFormData>({
    fullName: '',
    email: '',
    notes: ''
  })
  const [isSubmitting, setIsSubmitting] = useState(false)

  const supabase = getSupabaseClient()

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

      // קבלת נתוני מכסת המשתמשים
      const { data: quotaData } = await supabase
        .rpc('get_company_user_quota', { p_company_id: companyId })

      if (quotaData && quotaData.length > 0) {
        setUserQuota(quotaData[0])
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
      // קריאה ל-API החדש שבודק מכסה
      const response = await fetch('/api/team/add-agent', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: formData.email,
          full_name: formData.fullName
        })
      })

      const result = await response.json()

      if (!response.ok) {
        // אם אין מכסה זמינה - הצג הודעה מפורטת
        if (result.error === 'No available quota') {
          alert(`❌ לא ניתן להוסיף נציג חדש\n\n${result.message}`)
        } else {
          throw new Error(result.error || 'שגיאה בהוספת הנציג')
        }
        return
      }

      // אפס טופס וסגור מודל
      setFormData({ fullName: '', email: '', notes: '' })
      setShowAddAgentModal(false)

      // הנציג נוסף בהצלחה
      setSuccessMessage(`✅ ${result.message}`)
      setShowSuccessNotification(true)

      // רענן נתונים
      await fetchData()

      // הסתר התראת הצלחה אחרי 7 שניות
      setTimeout(() => {
        setShowSuccessNotification(false)
        setSuccessMessage('')
      }, 7000)

    } catch (error) {
      console.error('Error submitting agent request:', error)
      alert('שגיאה בהוספת הנציג: ' + (error as Error).message)
    } finally {
      setIsSubmitting(false)
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved': return 'text-success bg-success/10 border-success/20'
      case 'pending': return 'text-warning bg-warning/10 border-warning/20'
      case 'rejected': return 'text-error bg-error/10 border-error/20'
      default: return 'text-indigo-night/60 bg-ice-gray border-ice-gray'
    }
  }

  const getStatusText = (status: string) => {
    switch (status) {
      case 'approved': return 'מאושר'
      case 'pending': return 'ממתין'
      case 'rejected': return 'נדחה'
      default: return 'לא ידוע'
    }
  }

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'manager': return Crown
      case 'agent': return Users
      default: return Users
    }
  }

  const getRoleText = (role: string) => {
    switch (role) {
      case 'manager': return 'מנהל'
      case 'agent': return 'נציג'
      default: return 'לא ידוע'
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="text-center space-y-4">
          <div className="w-16 h-16 bg-lemon-mint/20 rounded-2xl flex items-center justify-center mx-auto animate-lemon-pulse">
            <Users className="w-8 h-8 text-lemon-mint-dark animate-spin" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-indigo-night">טוען נתוני הצוות...</h3>
            <p className="text-indigo-night/60">אוסף את כל פרטי החברים</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      {/* כותרת וסטטיסטיקות */}
      <div className="replayme-card p-8 bg-gradient-to-l from-indigo-night to-indigo-night/80 text-white">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-6">
            <div className="w-20 h-20 bg-lemon-mint/20 rounded-2xl flex items-center justify-center">
              <Users className="w-10 h-10 text-lemon-mint" />
            </div>
            <div>
              <h1 className="text-display text-3xl font-bold mb-2">
                צוות {company?.name || 'החברה'} 👥
              </h1>
              <p className="text-white/80 text-lg">
                ניהול והוספת חברי צוות חדשים
              </p>
            </div>
          </div>
          
          <div className="text-center">
            <div className="text-3xl font-bold text-lemon-mint mb-1">
              {agents.length}
            </div>
            <div className="text-white/60 text-sm">
              חברי צוות
            </div>
          </div>
        </div>
      </div>

      {/* מכסת משתמשים */}
      {userQuota && (
        <div className="replayme-card p-6 border-r-4 border-electric-coral">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-3">
              <Target className="w-6 h-6 text-electric-coral" />
              <h3 className="text-display text-xl font-bold text-indigo-night">
                מכסת משתמשים
              </h3>
            </div>
            <div className="text-2xl font-bold text-electric-coral">
              {userQuota.used_users}/{userQuota.total_users}
            </div>
          </div>
          
          <div className="space-y-3">
            <div className="progress-bar">
              <div 
                className="progress-bar-fill bg-electric-coral" 
                style={{ width: `${(userQuota.used_users / userQuota.total_users) * 100}%` }}
              ></div>
            </div>
            
            <div className="flex justify-between text-sm">
              <span className="text-indigo-night/60">בשימוש: {userQuota.used_users}</span>
              <span className="text-success font-medium">זמינים: {userQuota.available_users}</span>
            </div>
          </div>
        </div>
      )}

      {/* סרגל פעולות */}
      <div className="flex flex-col lg:flex-row gap-6 items-start lg:items-center justify-between">
        <div className="flex flex-col sm:flex-row gap-4 flex-1">
          {/* חיפוש */}
          <div className="relative flex-1 max-w-md">
            <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 text-indigo-night/40 w-5 h-5" />
            <input
              type="text"
              placeholder="חיפוש לפי שם או אימייל..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-4 pr-12 py-3 border-2 border-ice-gray rounded-xl focus:border-lemon-mint focus:outline-none transition-colors duration-200 text-indigo-night"
            />
          </div>

          {/* פילטרים */}
          <div className="flex gap-3">
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value as 'all' | 'agent' | 'manager')}
              className="px-4 py-3 border-2 border-ice-gray rounded-xl focus:border-lemon-mint focus:outline-none transition-colors duration-200 text-indigo-night bg-white"
            >
              <option value="all">כל התפקידים</option>
              <option value="agent">נציגים</option>
              <option value="manager">מנהלים</option>
            </select>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as 'all' | 'approved' | 'pending')}
              className="px-4 py-3 border-2 border-ice-gray rounded-xl focus:border-lemon-mint focus:outline-none transition-colors duration-200 text-indigo-night bg-white"
            >
              <option value="all">כל הסטטוסים</option>
              <option value="approved">מאושרים</option>
              <option value="pending">ממתינים</option>
            </select>
          </div>
        </div>

        {/* כפתור הוספת נציג */}
        <button
          onClick={() => setShowAddAgentModal(true)}
          className="replayme-button-primary"
        >
          <div className="flex items-center space-x-2">
            <UserPlus className="w-5 h-5" />
            <span>הוסף חבר צוות</span>
          </div>
        </button>
      </div>

      {/* רשימת חברי הצוות */}
      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
        {filteredAgents.map((agent) => {
          const RoleIcon = getRoleIcon(agent.role)
          return (
            <div key={agent.id} className="replayme-card p-6 card-hover">
              <div className="space-y-4">
                {/* כותרת הכרטיס */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                                         <Avatar avatarUrl={`geom${(parseInt(agent.id.slice(-2), 16) % 12) + 1}`} fullName={agent.full_name} className="w-12 h-12" />
                    <div>
                      <h3 className="font-semibold text-indigo-night text-lg">
                        {agent.full_name || 'ללא שם'}
                      </h3>
                      <div className="flex items-center space-x-2">
                        <RoleIcon className="w-4 h-4 text-indigo-night/60" />
                        <span className="text-sm text-indigo-night/60">
                          {getRoleText(agent.role)}
                        </span>
                      </div>
                    </div>
                  </div>
                  
                  {/* סטטוס */}
                  <div className={`px-3 py-1 rounded-full text-xs font-medium border ${getStatusColor(agent.is_approved ? 'approved' : 'pending')}`}>
                    {agent.is_approved ? (
                      <div className="flex items-center space-x-1">
                        <CheckCircle className="w-3 h-3" />
                        <span>פעיל</span>
                      </div>
                    ) : (
                      <div className="flex items-center space-x-1">
                        <Clock className="w-3 h-3" />
                        <span>ממתין</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* פרטי קשר */}
                <div className="space-y-2">
                  <div className="flex items-center space-x-3 text-sm text-indigo-night/70">
                    <Mail className="w-4 h-4" />
                    <span>{agent.email}</span>
                  </div>
                  <div className="flex items-center space-x-3 text-sm text-indigo-night/70">
                    <Calendar className="w-4 h-4" />
                    <span>הצטרף ב-{new Date(agent.created_at).toLocaleDateString('he-IL')}</span>
                  </div>
                </div>

                {/* פעולות */}
                <div className="flex gap-2 pt-2">
                  <Link 
                    href={`/team/edit-agent/${agent.id}`}
                    className="flex-1 py-2 px-3 rounded-lg border border-ice-gray hover:bg-lemon-mint/10 transition-colors duration-200 text-center text-sm font-medium text-indigo-night"
                  >
                    <div className="flex items-center justify-center space-x-1">
                      <Edit className="w-4 h-4" />
                      <span>עריכה</span>
                    </div>
                  </Link>
                  
                  <Link 
                    href={`/dashboard/agent?userId=${agent.id}`}
                    className="flex-1 py-2 px-3 rounded-lg bg-lemon-mint/20 hover:bg-lemon-mint/30 transition-colors duration-200 text-center text-sm font-medium text-lemon-mint-dark"
                  >
                    <div className="flex items-center justify-center space-x-1">
                      <BarChart3 className="w-4 h-4" />
                      <span>ביצועים</span>
                    </div>
                  </Link>
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* מודל הוספת נציג */}
      {showAddAgentModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="replayme-card max-w-md w-full p-8">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-display text-2xl font-bold text-indigo-night">
                הוסף חבר צוות חדש
              </h3>
              <button
                onClick={() => setShowAddAgentModal(false)}
                className="p-2 hover:bg-ice-gray rounded-lg transition-colors duration-200"
              >
                <X className="w-5 h-5 text-indigo-night/60" />
              </button>
            </div>

            <form onSubmit={handleAddAgent} className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-indigo-night mb-2">
                  שם מלא <span className="text-electric-coral">*</span>
                </label>
                <input
                  type="text"
                  value={formData.fullName}
                  onChange={(e) => setFormData({...formData, fullName: e.target.value})}
                  required
                  className="w-full p-3 border-2 border-ice-gray rounded-xl focus:border-lemon-mint focus:outline-none transition-colors duration-200 text-indigo-night"
                  placeholder="הכנס שם מלא"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-indigo-night mb-2">
                  כתובת אימייל <span className="text-electric-coral">*</span>
                </label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({...formData, email: e.target.value})}
                  required
                  className="w-full p-3 border-2 border-ice-gray rounded-xl focus:border-lemon-mint focus:outline-none transition-colors duration-200 text-indigo-night"
                  placeholder="הכנס כתובת אימייל"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-indigo-night mb-2">
                  הערות נוספות
                </label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({...formData, notes: e.target.value})}
                  rows={3}
                  className="w-full p-3 border-2 border-ice-gray rounded-xl focus:border-lemon-mint focus:outline-none transition-colors duration-200 text-indigo-night resize-none"
                  placeholder="הערות אופציונליות..."
                />
              </div>

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setShowAddAgentModal(false)}
                  className="flex-1 replayme-button-secondary"
                >
                  ביטול
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-1 replayme-button-primary disabled:opacity-50"
                >
                  {isSubmitting ? (
                    <div className="flex items-center justify-center space-x-2">
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      <span>שולח...</span>
                    </div>
                  ) : (
                    'הוסף חבר צוות'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* הודעת הצלחה */}
      {showSuccessNotification && (
        <div className="fixed top-4 left-1/2 transform -translate-x-1/2 z-50">
          <div className="success-indicator p-4 rounded-xl shadow-lg max-w-md">
            <div className="flex items-center space-x-3">
              <CheckCircle className="w-5 h-5 flex-shrink-0" />
              <p className="font-medium">{successMessage}</p>
              <button
                onClick={() => setShowSuccessNotification(false)}
                className="p-1 hover:bg-white/20 rounded"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* הודעה כשאין תוצאות */}
      {filteredAgents.length === 0 && !loading && (
        <div className="replayme-card p-12 text-center">
          <div className="w-16 h-16 bg-indigo-night/10 rounded-2xl flex items-center justify-center mx-auto mb-6">
            <Users className="w-8 h-8 text-indigo-night/60" />
          </div>
          <h3 className="text-xl font-semibold text-indigo-night mb-2">
            לא נמצאו חברי צוות
          </h3>
          <p className="text-indigo-night/60 mb-6">
            {searchTerm || roleFilter !== 'all' || statusFilter !== 'all' 
              ? 'נסה לשנות את הפילטרים או החיפוש'
              : 'התחל בהוספת חברי צוות חדשים לחברה'
            }
          </p>
          <button
            onClick={() => setShowAddAgentModal(true)}
            className="replayme-button-primary"
          >
            הוסף חבר צוות ראשון
          </button>
        </div>
      )}
    </div>
  )
} 