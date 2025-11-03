'use client'

import React, { useEffect, useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { 
  Users, 
  Building2, 
  Settings, 
  AlertTriangle, 
  CheckCircle, 
  Clock,
  Shield,
  BarChart3,
  Star,
  Target,
  Activity,
  RefreshCw,
  TrendingUp,
  Crown,
  UserCheck,
  FileText,
  CreditCard,
  X,
  Bell,
  Sparkles,
  ChevronRight,
  Zap,
  Eye,
  Plus,
  Calculator,
  Key,
  Database
} from 'lucide-react'

interface AdminStats {
  totalUsers: number
  pendingUsers: number
  approvedUsers: number
  totalCompanies: number
}

interface QuickAnalytics {
  totalCosts: number
  totalRequests: number
  totalTokens: number
  averageRequestCost: number
  loading: boolean
  error: string | null
}

export default function AdminDashboardPage() {
  const [stats, setStats] = useState<AdminStats>({
    totalUsers: 0,
    pendingUsers: 0,
    approvedUsers: 0,
    totalCompanies: 0
  })
  const [analytics, setAnalytics] = useState<QuickAnalytics>({
    totalCosts: 0,
    totalRequests: 0,
    totalTokens: 0,
    averageRequestCost: 0,
    loading: true,
    error: null
  })
  const [loading, setLoading] = useState(true)
  const [showUrgentAlert, setShowUrgentAlert] = useState(false)

  useEffect(() => {
    fetchAdminStats()
    fetchQuickAnalytics()
  }, [])

  useEffect(() => {
    // הצגת התראה דחופה אם יש משתמשים ממתינים לאישור
    if (stats.pendingUsers > 0) {
      setShowUrgentAlert(true)
    }
  }, [stats])

  const fetchAdminStats = async () => {
    try {
      setLoading(true)
      const supabase = createClient()

      // סטטיסטיקות משתמשים
      const { data: allUsers, error: usersError } = await supabase
        .from('users')
        .select('id, is_approved')
      
      if (usersError) throw usersError

      const totalUsers = allUsers?.length || 0
      const pendingUsers = allUsers?.filter(u => !u.is_approved).length || 0
      const approvedUsers = allUsers?.filter(u => u.is_approved).length || 0

      // סטטיסטיקות חברות
      const { data: allCompanies, error: companiesError } = await supabase
        .from('companies')
        .select('id')
      
      if (companiesError) throw companiesError

      const totalCompanies = allCompanies?.length || 0

      setStats({
        totalUsers,
        pendingUsers,
        approvedUsers,
        totalCompanies
      })

    } catch (error) {
      console.error('שגיאה בטעינת סטטיסטיקות:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchQuickAnalytics = async () => {
    try {
      setAnalytics(prev => ({ ...prev, loading: true, error: null }))

      const response = await fetch('/api/admin/analytics?days=30')
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`)
      }

      const result = await response.json()
      
      if (!result.success) {
        throw new Error(result.message || 'Failed to fetch analytics')
      }

      const data = result.data
      setAnalytics({
        totalCosts: data.summary.totalCosts,
        totalRequests: data.summary.totalRequests,
        totalTokens: data.summary.totalInputTokens + data.summary.totalOutputTokens,
        averageRequestCost: data.summary.averageRequestCost,
        loading: false,
        error: null
      })

    } catch (error) {
      console.error('שגיאה בטעינת אנליטיקס:', error)
      setAnalytics(prev => ({
        ...prev,
        loading: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }))
    }
  }

  const getTotalPendingItems = () => {
    return stats.pendingUsers
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen bg-white">
        <div className="text-center space-y-6">
          <div className="w-20 h-20 bg-gradient-to-br from-glacier-primary to-glacier-accent rounded-3xl flex items-center justify-center mx-auto animate-pulse">
            <Shield className="w-10 h-10 text-white animate-spin" />
          </div>
          <div>
            <h3 className="text-2xl font-bold text-neutral-900 mb-2">טוען נתוני מערכת...</h3>
            <p className="text-neutral-600">אוסף נתונים ממערכת Coachee</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-white via-glacier-primary/5 to-glacier-accent/10 p-6 space-y-8">
      {/* כותרת מנהל מערכת מחודשת */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-glacier-primary via-glacier-primary to-glacier-accent p-8 shadow-2xl backdrop-blur-xl">
        <div className="absolute inset-0 bg-gradient-to-r from-white/10 to-transparent"></div>
        <div className="relative flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
          <div className="flex items-center gap-6">
            <div className="w-24 h-24 bg-white/20 backdrop-blur-xl rounded-3xl flex items-center justify-center shadow-lg">
              <Crown className="w-12 h-12 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2 mb-2">
                <h1 className="text-4xl font-bold text-white">
                  מרכז בקרה מתקדם
                </h1>
                <Sparkles className="w-6 h-6 text-white animate-pulse" />
              </div>
              <p className="text-white/90 text-lg">
                לוח הבקרה הראשי לניהול פלטפורמת Coachee
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            <button 
              onClick={fetchQuickAnalytics}
              className="group px-6 py-3 bg-white/20 hover:bg-white/30 backdrop-blur-xl text-white rounded-2xl transition-all duration-300 flex items-center gap-2 hover:scale-105 hover:shadow-lg transform-gpu"
            >
              <BarChart3 className="w-5 h-5 group-hover:animate-pulse" />
              <span className="font-medium">רענן אנליטיקס</span>
            </button>
            
            <button 
              onClick={fetchAdminStats}
              className="group px-6 py-3 bg-white/90 hover:bg-white text-glacier-primary rounded-2xl transition-all duration-300 flex items-center gap-2 hover:scale-105 hover:shadow-lg font-semibold transform-gpu"
            >
              <RefreshCw className="w-5 h-5 group-hover:rotate-180 transition-transform duration-500" />
              <span>רענן נתונים</span>
            </button>
          </div>
        </div>
      </div>

      {/* התראה דחופה מעוצבת */}
      {showUrgentAlert && getTotalPendingItems() > 0 && (
        <div className="relative rounded-2xl bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 p-6 shadow-lg backdrop-blur-xl overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-r from-amber-100/50 to-orange-100/50"></div>
          <div className="relative flex items-start justify-between">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 bg-gradient-to-br from-amber-400 to-orange-500 rounded-2xl flex items-center justify-center shadow-lg animate-pulse">
                <Bell className="w-6 h-6 text-white" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-neutral-900 mb-2 flex items-center gap-2">
                  פעולות ממתינות לטיפול
                  <Zap className="w-5 h-5 text-amber-500" />
                </h3>
                <div className="space-y-2">
                  {stats.pendingUsers > 0 && (
                    <div className="flex items-center gap-3">
                      <UserCheck className="w-5 h-5 text-amber-600" />
                      <Link 
                        href="/dashboard/admin/users" 
                        className="text-neutral-900 font-semibold hover:text-glacier-primary transition-colors underline decoration-glacier-primary/30 hover:decoration-glacier-primary decoration-2 underline-offset-4"
                      >
                        {stats.pendingUsers} משתמשים ממתינים לאישור
                      </Link>
                    </div>
                  )}
                </div>
              </div>
            </div>
            
            <button
              onClick={() => setShowUrgentAlert(false)}
              className="p-2 hover:bg-white/50 rounded-xl transition-colors duration-200 group"
            >
              <X className="w-5 h-5 text-neutral-600 group-hover:text-neutral-800" />
            </button>
          </div>
        </div>
      )}

      {/* סטטיסטיקות כלליות מחודשות */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="group relative rounded-2xl bg-white/90 backdrop-blur-xl border border-glacier-primary/20 p-6 shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-[1.02] transform-gpu overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-glacier-primary/5 to-glacier-accent/5"></div>
          <div className="relative flex items-center justify-between">
            <div>
              <p className="text-neutral-600 text-sm font-medium mb-2">סה"כ משתמשים</p>
              <p className="text-3xl font-bold text-neutral-900 mb-1">{stats.totalUsers}</p>
              <p className="text-sm text-glacier-primary font-semibold">
                {stats.approvedUsers} מאושרים
              </p>
            </div>
            <div className="w-14 h-14 bg-gradient-to-br from-glacier-primary to-glacier-accent rounded-2xl flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-300">
              <Users className="w-7 h-7 text-white" />
            </div>
          </div>
        </div>

        <div className="group relative rounded-2xl bg-white/90 backdrop-blur-xl border border-amber-200 p-6 shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-[1.02] transform-gpu overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-amber-50 to-orange-50"></div>
          <div className="relative flex items-center justify-between">
            <div>
              <p className="text-neutral-600 text-sm font-medium mb-2">ממתינים לאישור</p>
              <p className="text-3xl font-bold text-neutral-900 mb-1">{stats.pendingUsers}</p>
              <p className="text-sm text-amber-600 font-semibold">
                דורש פעולה
              </p>
            </div>
            <div className="w-14 h-14 bg-gradient-to-br from-amber-400 to-orange-500 rounded-2xl flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-300">
              <Clock className="w-7 h-7 text-white" />
            </div>
          </div>
        </div>

        <div className="group relative rounded-2xl bg-white/90 backdrop-blur-xl border border-emerald-200 p-6 shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-[1.02] transform-gpu overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-emerald-50 to-green-50"></div>
          <div className="relative flex items-center justify-between">
            <div>
              <p className="text-neutral-600 text-sm font-medium mb-2">משתמשים מאושרים</p>
              <p className="text-3xl font-bold text-neutral-900 mb-1">{stats.approvedUsers}</p>
              <p className="text-sm text-emerald-600 font-semibold">
                פעילים במערכת
              </p>
            </div>
            <div className="w-14 h-14 bg-gradient-to-br from-emerald-400 to-green-500 rounded-2xl flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-300">
              <CheckCircle className="w-7 h-7 text-white" />
            </div>
          </div>
        </div>

        <div className="group relative rounded-2xl bg-white/90 backdrop-blur-xl border border-glacier-secondary/20 p-6 shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-[1.02] transform-gpu overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-glacier-secondary/5 to-glacier-accent/5"></div>
          <div className="relative flex items-center justify-between">
            <div>
              <p className="text-neutral-600 text-sm font-medium mb-2">חברות במערכת</p>
              <p className="text-3xl font-bold text-neutral-900 mb-1">{stats.totalCompanies}</p>
              <p className="text-sm text-glacier-secondary font-semibold">
                פעילות
              </p>
            </div>
            <div className="w-14 h-14 bg-gradient-to-br from-glacier-secondary to-glacier-accent rounded-2xl flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-300">
              <Building2 className="w-7 h-7 text-white" />
            </div>
          </div>
        </div>
      </div>

      {/* אנליטיקס OpenAI מעוצב מחדש */}
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <h2 className="text-3xl font-bold text-neutral-900">
              אנליטיקס OpenAI
            </h2>
            <div className="w-8 h-8 bg-gradient-to-br from-blue-400 to-purple-500 rounded-xl flex items-center justify-center">
              <BarChart3 className="w-5 h-5 text-white" />
            </div>
          </div>
          <Link 
            href="/dashboard/admin/analytics" 
            className="group px-6 py-3 bg-gradient-to-r from-glacier-primary to-glacier-accent hover:from-glacier-accent hover:to-glacier-primary text-white rounded-2xl transition-all duration-300 flex items-center gap-2 hover:scale-105 hover:shadow-xl font-semibold transform-gpu"
          >
            <Eye className="w-5 h-5 group-hover:scale-110 transition-transform duration-300" />
            <span>צפה בדוח מפורט</span>
            <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform duration-300" />
          </Link>
        </div>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {/* עלות חודשית */}
          <div className="group relative rounded-2xl bg-white/90 backdrop-blur-xl border border-purple-200 p-6 shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-[1.02] transform-gpu overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-purple-50 to-indigo-50"></div>
            <div className="relative flex items-center justify-between">
              <div>
                <p className="text-neutral-600 text-sm font-medium mb-2">עלות חודשית</p>
                <p className="text-3xl font-bold text-neutral-900 mb-1">
                  {analytics.loading ? (
                    <span className="animate-pulse bg-neutral-200 rounded px-4 py-1">--</span>
                  ) : analytics.error ? (
                    <span className="text-red-500 text-lg">שגיאה</span>
                  ) : (
                    `$${analytics.totalCosts.toFixed(2)}`
                  )}
                </p>
                <p className="text-sm text-purple-600 font-semibold">
                  {analytics.loading ? 'טוען נתונים...' : 
                   analytics.error ? 'לא ניתן לטעון' : 
                   '30 ימים אחרונים'}
                </p>
              </div>
              <div className="w-14 h-14 bg-gradient-to-br from-purple-400 to-indigo-500 rounded-2xl flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-300">
                <CreditCard className="w-7 h-7 text-white" />
              </div>
            </div>
          </div>

          {/* בקשות API */}
          <div className="group relative rounded-2xl bg-white/90 backdrop-blur-xl border border-blue-200 p-6 shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-[1.02] transform-gpu overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-blue-50 to-cyan-50"></div>
            <div className="relative flex items-center justify-between">
              <div>
                <p className="text-neutral-600 text-sm font-medium mb-2">בקשות API</p>
                <p className="text-3xl font-bold text-neutral-900 mb-1">
                  {analytics.loading ? (
                    <span className="animate-pulse bg-neutral-200 rounded px-4 py-1">--</span>
                  ) : analytics.error ? (
                    <span className="text-red-500 text-lg">שגיאה</span>
                  ) : (
                    analytics.totalRequests >= 1000 ? 
                      `${(analytics.totalRequests / 1000).toFixed(1)}K` : 
                      analytics.totalRequests.toString()
                  )}
                </p>
                <p className="text-sm text-blue-600 font-semibold">
                  {analytics.loading ? 'טוען נתונים...' : 
                   analytics.error ? 'לא ניתן לטעון' : 
                   'בקשות כוללות'}
                </p>
              </div>
              <div className="w-14 h-14 bg-gradient-to-br from-blue-400 to-cyan-500 rounded-2xl flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-300">
                <Activity className="w-7 h-7 text-white" />
              </div>
            </div>
          </div>

          {/* טוקנים */}
          <div className="group relative rounded-2xl bg-white/90 backdrop-blur-xl border border-emerald-200 p-6 shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-[1.02] transform-gpu overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-emerald-50 to-green-50"></div>
            <div className="relative flex items-center justify-between">
              <div>
                <p className="text-neutral-600 text-sm font-medium mb-2">טוקנים</p>
                <p className="text-3xl font-bold text-neutral-900 mb-1">
                  {analytics.loading ? (
                    <span className="animate-pulse bg-neutral-200 rounded px-4 py-1">--</span>
                  ) : analytics.error ? (
                    <span className="text-red-500 text-lg">שגיאה</span>
                  ) : (
                    analytics.totalTokens >= 1000000 ? 
                      `${(analytics.totalTokens / 1000000).toFixed(1)}M` :
                    analytics.totalTokens >= 1000 ? 
                      `${(analytics.totalTokens / 1000).toFixed(1)}K` : 
                      analytics.totalTokens.toString()
                  )}
                </p>
                <p className="text-sm text-emerald-600 font-semibold">
                  {analytics.loading ? 'טוען נתונים...' : 
                   analytics.error ? 'לא ניתן לטעון' : 
                   'סה"כ טוקנים'}
                </p>
              </div>
              <div className="w-14 h-14 bg-gradient-to-br from-emerald-400 to-green-500 rounded-2xl flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-300">
                <TrendingUp className="w-7 h-7 text-white" />
              </div>
            </div>
          </div>

          {/* עלות לבקשה */}
          <div className="group relative rounded-2xl bg-white/90 backdrop-blur-xl border border-orange-200 p-6 shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-[1.02] transform-gpu overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-orange-50 to-amber-50"></div>
            <div className="relative flex items-center justify-between">
              <div>
                <p className="text-neutral-600 text-sm font-medium mb-2">עלות לבקשה</p>
                <p className="text-3xl font-bold text-neutral-900 mb-1">
                  {analytics.loading ? (
                    <span className="animate-pulse bg-neutral-200 rounded px-4 py-1">--</span>
                  ) : analytics.error ? (
                    <span className="text-red-500 text-lg">שגיאה</span>
                  ) : (
                    `$${analytics.averageRequestCost.toFixed(4)}`
                  )}
                </p>
                <p className="text-sm text-orange-600 font-semibold">
                  {analytics.loading ? 'טוען נתונים...' : 
                   analytics.error ? 'לא ניתן לטעון' : 
                   'ממוצע לבקשה'}
                </p>
              </div>
              <div className="w-14 h-14 bg-gradient-to-br from-orange-400 to-amber-500 rounded-2xl flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-300">
                <Star className="w-7 h-7 text-white" />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* תפריט ניהול מתקדם */}
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <h2 className="text-3xl font-bold text-neutral-900">
            תפריט ניהול מתקדם
          </h2>
          <div className="w-8 h-8 bg-gradient-to-br from-glacier-primary to-glacier-accent rounded-xl flex items-center justify-center">
            <Settings className="w-5 h-5 text-white" />
          </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* ניהול משתמשים */}
          <Link 
            href="/dashboard/admin/users" 
            className={`group relative rounded-2xl bg-white/90 backdrop-blur-xl border p-6 shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-[1.02] transform-gpu overflow-hidden ${
              stats.pendingUsers > 0 ? 'border-amber-300 bg-gradient-to-br from-amber-50 to-orange-50' : 'border-glacier-primary/20'
            }`}
          >
            <div className="absolute inset-0 bg-gradient-to-br from-white/50 to-transparent"></div>
            <div className="relative space-y-4">
              <div className="flex items-center justify-between">
                <div className="w-14 h-14 bg-gradient-to-br from-glacier-primary to-glacier-accent rounded-2xl flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-300">
                  <Users className="w-7 h-7 text-white" />
                </div>
                {stats.pendingUsers > 0 && (
                  <div className="bg-gradient-to-r from-amber-400 to-orange-500 text-white text-sm font-bold px-3 py-1 rounded-full animate-pulse shadow-lg">
                    {stats.pendingUsers}
                  </div>
                )}
                <ChevronRight className="w-5 h-5 text-neutral-400 group-hover:text-glacier-primary group-hover:translate-x-1 transition-all duration-300" />
              </div>
              
              <div>
                <h3 className="text-xl font-bold text-neutral-900 mb-2">
                  ניהול משתמשים
                </h3>
                <p className="text-neutral-600 text-sm leading-relaxed mb-3">
                  אישור משתמשים חדשים, ניהול הרשאות ועריכת פרטים
                </p>
                {stats.pendingUsers > 0 && (
                  <p className="text-amber-600 text-sm font-semibold flex items-center gap-2">
                    <Zap className="w-4 h-4" />
                    {stats.pendingUsers} משתמשים ממתינים לאישור
                  </p>
                )}
              </div>
            </div>
          </Link>

          {/* ניהול חברות */}
          <Link 
            href="/dashboard/admin/companies" 
            className="group relative rounded-2xl bg-white/90 backdrop-blur-xl border border-glacier-secondary/20 p-6 shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-[1.02] transform-gpu overflow-hidden"
          >
            <div className="absolute inset-0 bg-gradient-to-br from-glacier-secondary/5 to-glacier-accent/5"></div>
            <div className="relative space-y-4">
              <div className="flex items-center justify-between">
                <div className="w-14 h-14 bg-gradient-to-br from-glacier-secondary to-glacier-accent rounded-2xl flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-300">
                  <Building2 className="w-7 h-7 text-white" />
                </div>
                <ChevronRight className="w-5 h-5 text-neutral-400 group-hover:text-glacier-secondary group-hover:translate-x-1 transition-all duration-300" />
              </div>
              
              <div>
                <h3 className="text-xl font-bold text-neutral-900 mb-2">
                  ניהול חברות
                </h3>
                <p className="text-neutral-600 text-sm leading-relaxed mb-3">
                  הוספה, עריכה ומחיקה של חברות במערכת
                </p>
                <p className="text-glacier-secondary text-sm font-semibold flex items-center gap-2">
                  <Building2 className="w-4 h-4" />
                  {stats.totalCompanies} חברות רשומות
                </p>
              </div>
            </div>
          </Link>

          {/* מכסות משתמשים הוסרו - נותרה רק מגבלת דקות */}

          {/* בקשות נציגים */}
          <Link 
            href="/dashboard/admin/agent-requests" 
            className="group relative rounded-2xl bg-white/90 backdrop-blur-xl border border-amber-200 p-6 shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-[1.02] transform-gpu overflow-hidden"
          >
            <div className="absolute inset-0 bg-gradient-to-br from-amber-50 to-orange-50"></div>
            <div className="relative space-y-4">
              <div className="flex items-center justify-between">
                <div className="w-14 h-14 bg-gradient-to-br from-amber-400 to-orange-500 rounded-2xl flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-300">
                  <UserCheck className="w-7 h-7 text-white" />
                </div>
                <ChevronRight className="w-5 h-5 text-neutral-400 group-hover:text-amber-500 group-hover:translate-x-1 transition-all duration-300" />
              </div>
              
              <div>
                <h3 className="text-xl font-bold text-neutral-900 mb-2">
                  בקשות נציגים
                </h3>
                <p className="text-neutral-600 text-sm leading-relaxed mb-3">
                  אישור בקשות הוספת נציגים חדשים מחברות
                </p>
                <p className="text-amber-600 text-sm font-semibold flex items-center gap-2">
                  <Eye className="w-4 h-4" />
                  מעקב אחר בקשות ממתינות
                </p>
              </div>
            </div>
          </Link>

          {/* ניהול תמחור */}
          <Link 
            href="/dashboard/admin/pricing-management" 
            className="group relative rounded-2xl bg-white/90 backdrop-blur-xl border border-blue-200 p-6 shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-[1.02] transform-gpu overflow-hidden"
          >
            <div className="absolute inset-0 bg-gradient-to-br from-blue-50 to-indigo-50"></div>
            <div className="relative space-y-4">
              <div className="flex items-center justify-between">
                <div className="w-14 h-14 bg-gradient-to-br from-blue-400 to-indigo-500 rounded-2xl flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-300">
                  <CreditCard className="w-7 h-7 text-white" />
                </div>
                <ChevronRight className="w-5 h-5 text-neutral-400 group-hover:text-blue-500 group-hover:translate-x-1 transition-all duration-300" />
              </div>
              
              <div>
                <h3 className="text-xl font-bold text-neutral-900 mb-2">
                  ניהול תמחור
                </h3>
                <p className="text-neutral-600 text-sm leading-relaxed mb-3">
                  הגדרת מחירים ותוכניות מנוי למוצרי המערכת
                </p>
                <p className="text-blue-600 text-sm font-semibold flex items-center gap-2">
                  <Star className="w-4 h-4" />
                  מחירים ותוכניות
                </p>
              </div>
            </div>
          </Link>

          {/* מחשבון עלויות AI */}
          <Link 
            href="/dashboard/admin/cost-calculator" 
            className="group relative rounded-2xl bg-white/90 backdrop-blur-xl border border-purple-200 p-6 shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-[1.02] transform-gpu overflow-hidden"
          >
            <div className="absolute inset-0 bg-gradient-to-br from-purple-50 to-pink-50"></div>
            <div className="relative space-y-4">
              <div className="flex items-center justify-between">
                <div className="w-14 h-14 bg-gradient-to-br from-purple-400 to-pink-500 rounded-2xl flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-300">
                  <Calculator className="w-7 h-7 text-white" />
                </div>
                <ChevronRight className="w-5 h-5 text-neutral-400 group-hover:text-purple-500 group-hover:translate-x-1 transition-all duration-300" />
              </div>
              
              <div>
                <h3 className="text-xl font-bold text-neutral-900 mb-2">
                  מחשבון עלויות AI
                </h3>
                <p className="text-neutral-600 text-sm leading-relaxed mb-3">
                  ניתוח עלויות OpenAI, המלצות גבולות וחישוב ROI
                </p>
                <p className="text-purple-600 text-sm font-semibold flex items-center gap-2">
                  <Calculator className="w-4 h-4" />
                  כלי ניהול עלויות מתקדם
                </p>
              </div>
            </div>
          </Link>

          {/* הגדרות מערכת */}
          <Link 
            href="/dashboard/admin/system-settings" 
            className="group relative rounded-2xl bg-white/90 backdrop-blur-xl border border-neutral-200 p-6 shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-[1.02] transform-gpu overflow-hidden"
          >
            <div className="absolute inset-0 bg-gradient-to-br from-neutral-50 to-neutral-100"></div>
            <div className="relative space-y-4">
              <div className="flex items-center justify-between">
                <div className="w-14 h-14 bg-gradient-to-br from-neutral-400 to-neutral-600 rounded-2xl flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-300">
                  <Settings className="w-7 h-7 text-white" />
                </div>
                <ChevronRight className="w-5 h-5 text-neutral-400 group-hover:text-neutral-600 group-hover:translate-x-1 transition-all duration-300" />
              </div>
              
              <div>
                <h3 className="text-xl font-bold text-neutral-900 mb-2">
                  הגדרות מערכת
                </h3>
                <p className="text-neutral-600 text-sm leading-relaxed mb-3">
                  הגדרות כלליות, הודעות מערכת ותצורות מתקדמות
                </p>
                <p className="text-neutral-600 text-sm font-semibold flex items-center gap-2">
                  <Settings className="w-4 h-4" />
                  תצורה מתקדמת
                </p>
              </div>
            </div>
          </Link>

          {/* ניהול API Keys - Partner API */}
          <Link 
            href="/dashboard/admin/partner-api" 
            className="group relative rounded-2xl bg-white/90 backdrop-blur-xl border border-purple-200 p-6 shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-[1.02] transform-gpu overflow-hidden"
          >
            <div className="absolute inset-0 bg-gradient-to-br from-purple-50 to-indigo-50"></div>
            <div className="relative space-y-4">
              <div className="flex items-center justify-between">
                <div className="w-14 h-14 bg-gradient-to-br from-purple-400 to-indigo-500 rounded-2xl flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-300">
                  <Key className="w-7 h-7 text-white" />
                </div>
                <ChevronRight className="w-5 h-5 text-neutral-400 group-hover:text-purple-500 group-hover:translate-x-1 transition-all duration-300" />
              </div>
              
              <div>
                <h3 className="text-xl font-bold text-neutral-900 mb-2">
                  Partner API Keys
                </h3>
                <p className="text-neutral-600 text-sm leading-relaxed mb-3">
                  ניהול מפתחות API לשותפים עסקיים והתממשקויות חיצוניות
                </p>
                <p className="text-purple-600 text-sm font-semibold flex items-center gap-2">
                  <Key className="w-4 h-4" />
                  יצירת וניהול מפתחות
                </p>
              </div>
            </div>
          </Link>

          {/* גילוי חברות - Partner API */}
          <Link 
            href="/dashboard/admin/companies-list" 
            className="group relative rounded-2xl bg-white/90 backdrop-blur-xl border border-cyan-200 p-6 shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-[1.02] transform-gpu overflow-hidden"
          >
            <div className="absolute inset-0 bg-gradient-to-br from-cyan-50 to-blue-50"></div>
            <div className="relative space-y-4">
              <div className="flex items-center justify-between">
                <div className="w-14 h-14 bg-gradient-to-br from-cyan-400 to-blue-500 rounded-2xl flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-300">
                  <Database className="w-7 h-7 text-white" />
                </div>
                <ChevronRight className="w-5 h-5 text-neutral-400 group-hover:text-cyan-500 group-hover:translate-x-1 transition-all duration-300" />
              </div>
              
              <div>
                <h3 className="text-xl font-bold text-neutral-900 mb-2">
                  גילוי חברות
                </h3>
                <p className="text-neutral-600 text-sm leading-relaxed mb-3">
                  חיפוש והעתקת Company IDs לשימוש ב-Partner API
                </p>
                <p className="text-cyan-600 text-sm font-semibold flex items-center gap-2">
                  <Database className="w-4 h-4" />
                  {stats.totalCompanies} חברות זמינות
                </p>
              </div>
            </div>
          </Link>
        </div>
      </div>

      {/* תובנות מהירות ופעולות מומלצות */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="relative rounded-2xl bg-white/90 backdrop-blur-xl border border-glacier-primary/20 p-6 shadow-lg overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-glacier-primary/5 to-glacier-accent/5"></div>
          <div className="relative">
            <h3 className="text-2xl font-bold text-neutral-900 mb-6 flex items-center gap-3">
              תובנות מהירות
              <div className="w-8 h-8 bg-gradient-to-br from-glacier-primary to-glacier-accent rounded-xl flex items-center justify-center">
                <BarChart3 className="w-5 h-5 text-white" />
              </div>
            </h3>
            
            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 bg-white/60 backdrop-blur-sm rounded-2xl border border-emerald-200 hover:scale-[1.02] transition-transform duration-300">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-gradient-to-br from-emerald-400 to-green-500 rounded-xl flex items-center justify-center">
                    <TrendingUp className="w-5 h-5 text-white" />
                  </div>
                  <span className="text-sm font-semibold text-neutral-900">קצב צמיחה</span>
                </div>
                <div className="text-xl font-bold text-emerald-600">
                  {stats.totalUsers > 0 ? `+${Math.round((stats.approvedUsers / stats.totalUsers) * 100)}%` : '0%'}
                </div>
              </div>

              <div className="flex items-center justify-between p-4 bg-white/60 backdrop-blur-sm rounded-2xl border border-glacier-secondary/20 hover:scale-[1.02] transition-transform duration-300">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-gradient-to-br from-glacier-secondary to-glacier-accent rounded-xl flex items-center justify-center">
                    <Activity className="w-5 h-5 text-white" />
                  </div>
                  <span className="text-sm font-semibold text-neutral-900">יעילות אישור</span>
                </div>
                <div className="text-xl font-bold text-glacier-secondary">
                  {stats.totalUsers > 0 ? `${Math.round((stats.approvedUsers / stats.totalUsers) * 100)}%` : '0%'}
                </div>
              </div>

              <div className="flex items-center justify-between p-4 bg-white/60 backdrop-blur-sm rounded-2xl border border-amber-200 hover:scale-[1.02] transition-transform duration-300">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-gradient-to-br from-amber-400 to-orange-500 rounded-xl flex items-center justify-center">
                    <Star className="w-5 h-5 text-white" />
                  </div>
                  <span className="text-sm font-semibold text-neutral-900">משתמשים לחברה</span>
                </div>
                <div className="text-xl font-bold text-amber-600">
                  {stats.totalCompanies > 0 ? Math.round(stats.totalUsers / stats.totalCompanies) : 0}
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="relative rounded-2xl bg-white/90 backdrop-blur-xl border border-glacier-primary/20 p-6 shadow-lg overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-glacier-primary/5 to-glacier-accent/5"></div>
          <div className="relative">
            <h3 className="text-2xl font-bold text-neutral-900 mb-6 flex items-center gap-3">
              פעולות מומלצות
              <div className="w-8 h-8 bg-gradient-to-br from-glacier-primary to-glacier-accent rounded-xl flex items-center justify-center">
                <Target className="w-5 h-5 text-white" />
              </div>
            </h3>
            
            <div className="space-y-4">
              {stats.pendingUsers > 0 && (
                <div className="p-4 border border-amber-300 rounded-2xl bg-gradient-to-r from-amber-50 to-orange-50 hover:scale-[1.02] transition-transform duration-300">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 bg-gradient-to-br from-amber-400 to-orange-500 rounded-xl flex items-center justify-center mt-0.5">
                      <AlertTriangle className="w-5 h-5 text-white" />
                    </div>
                    <div className="flex-1">
                      <h4 className="font-bold text-neutral-900 mb-1">בדוק משתמשים ממתינים</h4>
                      <p className="text-sm text-neutral-700 mb-2">
                        יש {stats.pendingUsers} משתמשים שממתינים לאישור שלך
                      </p>
                      <Link 
                        href="/dashboard/admin/users"
                        className="inline-flex items-center gap-2 text-sm font-semibold text-amber-600 hover:text-amber-700 transition-colors group"
                      >
                        <span>עבור לאישור</span>
                        <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform duration-300" />
                      </Link>
                    </div>
                  </div>
                </div>
              )}

              <div className="p-4 border border-emerald-300 rounded-2xl bg-gradient-to-r from-emerald-50 to-green-50 hover:scale-[1.02] transition-transform duration-300">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 bg-gradient-to-br from-emerald-400 to-green-500 rounded-xl flex items-center justify-center mt-0.5">
                    <BarChart3 className="w-5 h-5 text-white" />
                  </div>
                  <div className="flex-1">
                    <h4 className="font-bold text-neutral-900 mb-1">בדוק ביצועים</h4>
                    <p className="text-sm text-neutral-700 mb-2">
                      עיין בדוחות שימוש ופעילות החברות
                    </p>
                    <Link 
                      href="/dashboard/admin/analytics"
                      className="inline-flex items-center gap-2 text-sm font-semibold text-emerald-600 hover:text-emerald-700 transition-colors group"
                    >
                      <span>צפה בדוחות</span>
                      <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform duration-300" />
                    </Link>
                  </div>
                </div>
              </div>

              <div className="p-4 border border-glacier-primary/30 rounded-2xl bg-gradient-to-r from-glacier-primary/5 to-glacier-accent/5 hover:scale-[1.02] transition-transform duration-300">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 bg-gradient-to-br from-glacier-primary to-glacier-accent rounded-xl flex items-center justify-center mt-0.5">
                    <Settings className="w-5 h-5 text-white" />
                  </div>
                  <div className="flex-1">
                    <h4 className="font-bold text-neutral-900 mb-1">עדכן הגדרות</h4>
                    <p className="text-sm text-neutral-700 mb-2">
                      וודא שהגדרות המערכת מעודכנות ומתאימות
                    </p>
                    <Link 
                      href="/dashboard/admin/system-settings"
                      className="inline-flex items-center gap-2 text-sm font-semibold text-glacier-primary hover:text-glacier-accent transition-colors group"
                    >
                      <span>הגדרות מערכת</span>
                      <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform duration-300" />
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
} 