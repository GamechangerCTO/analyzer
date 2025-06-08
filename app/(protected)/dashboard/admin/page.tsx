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
  Bell
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
      <div className="flex justify-center items-center min-h-screen">
        <div className="text-center space-y-4">
          <div className="w-16 h-16 bg-lemon-mint/20 rounded-2xl flex items-center justify-center mx-auto animate-lemon-pulse">
            <Shield className="w-8 h-8 text-lemon-mint-dark animate-spin" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-indigo-night">טוען נתוני מערכת...</h3>
            <p className="text-indigo-night/60">אוסף נתונים ממערכת ReplayMe</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      {/* כותרת מנהל מערכת */}
      <div className="replayme-card p-8 bg-gradient-to-l from-indigo-night to-indigo-night/80 text-white">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-6">
            <div className="w-20 h-20 bg-lemon-mint/20 rounded-2xl flex items-center justify-center">
              <Crown className="w-10 h-10 text-lemon-mint" />
            </div>
            <div>
              <h1 className="text-display text-3xl font-bold mb-2">
                בקרת מערכת ReplayMe 👑
              </h1>
              <p className="text-white/80 text-lg">
                לוח בקרה מתקדם לניהול המערכת
              </p>
            </div>
          </div>
          
          <div className="flex items-center space-x-3">
            <button 
              onClick={fetchQuickAnalytics}
              className="px-4 py-2 bg-indigo-night/20 hover:bg-indigo-night/30 text-indigo-night rounded-lg transition-colors duration-200 flex items-center space-x-2"
            >
              <BarChart3 className="w-4 h-4" />
              <span>רענן אנליטיקס</span>
            </button>
            
            <button 
              onClick={fetchAdminStats}
              className="px-6 py-3 bg-lemon-mint/20 hover:bg-lemon-mint/30 text-lemon-mint rounded-xl transition-colors duration-200 flex items-center space-x-2"
            >
              <RefreshCw className="w-5 h-5" />
              <span>רענן נתונים</span>
            </button>
          </div>
        </div>
      </div>

      {/* התראה דחופה */}
      {showUrgentAlert && getTotalPendingItems() > 0 && (
        <div className="replayme-card p-6 border-r-4 border-warning bg-warning/5">
          <div className="flex items-start justify-between">
            <div className="flex items-start space-x-4">
              <div className="w-12 h-12 bg-warning/20 rounded-xl flex items-center justify-center animate-coral-pulse">
                <Bell className="w-6 h-6 text-warning" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-indigo-night mb-2">
                  🔔 יש לך {getTotalPendingItems()} פעולות ממתינות!
                </h3>
                <div className="space-y-2">
                  {stats.pendingUsers > 0 && (
                    <div className="flex items-center space-x-3">
                      <UserCheck className="w-4 h-4 text-warning" />
                      <Link 
                        href="/dashboard/admin/users" 
                        className="text-indigo-night font-medium hover:text-lemon-mint-dark transition-colors underline"
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
              className="p-2 hover:bg-ice-gray rounded-lg transition-colors duration-200"
            >
              <X className="w-5 h-5 text-indigo-night/60" />
            </button>
          </div>
        </div>
      )}

      {/* סטטיסטיקות כלליות */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="replayme-card p-6 border-r-4 border-lemon-mint">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-indigo-night/60 text-sm font-medium mb-1">סה"כ משתמשים</p>
              <p className="text-3xl font-bold text-indigo-night animate-score-bounce">{stats.totalUsers}</p>
              <p className="text-sm text-lemon-mint-dark font-medium mt-1">
                {stats.approvedUsers} מאושרים
              </p>
            </div>
            <div className="w-12 h-12 bg-lemon-mint/20 rounded-xl flex items-center justify-center">
              <Users className="w-6 h-6 text-lemon-mint-dark" />
            </div>
          </div>
        </div>

        <div className="replayme-card p-6 border-r-4 border-warning">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-indigo-night/60 text-sm font-medium mb-1">ממתינים לאישור</p>
              <p className="text-3xl font-bold text-indigo-night animate-score-bounce">{stats.pendingUsers}</p>
              <p className="text-sm text-warning font-medium mt-1">
                דורש פעולה
              </p>
            </div>
            <div className="w-12 h-12 bg-warning/20 rounded-xl flex items-center justify-center">
              <Clock className="w-6 h-6 text-warning" />
            </div>
          </div>
        </div>

        <div className="replayme-card p-6 border-r-4 border-success">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-indigo-night/60 text-sm font-medium mb-1">משתמשים מאושרים</p>
              <p className="text-3xl font-bold text-indigo-night animate-score-bounce">{stats.approvedUsers}</p>
              <p className="text-sm text-success font-medium mt-1">
                פעילים במערכת
              </p>
            </div>
            <div className="w-12 h-12 bg-success/20 rounded-xl flex items-center justify-center">
              <CheckCircle className="w-6 h-6 text-success" />
            </div>
          </div>
        </div>

        <div className="replayme-card p-6 border-r-4 border-electric-coral">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-indigo-night/60 text-sm font-medium mb-1">חברות במערכת</p>
              <p className="text-3xl font-bold text-indigo-night animate-score-bounce">{stats.totalCompanies}</p>
              <p className="text-sm text-electric-coral font-medium mt-1">
                פעילות
              </p>
            </div>
            <div className="w-12 h-12 bg-electric-coral/20 rounded-xl flex items-center justify-center">
              <Building2 className="w-6 h-6 text-electric-coral" />
            </div>
          </div>
        </div>
      </div>

      {/* אנליטיקס OpenAI */}
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-display text-2xl font-bold text-indigo-night">
            אנליטיקס OpenAI 📊
          </h2>
          <Link 
            href="/dashboard/admin/analytics" 
            className="px-6 py-3 bg-indigo-night hover:bg-indigo-night/90 text-white rounded-xl transition-colors duration-200 flex items-center space-x-2"
          >
            <BarChart3 className="w-5 h-5" />
            <span>צפה בדוח מפורט</span>
          </Link>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {/* נתוני אנליטיקס בסיסיים - נתונים אמיתיים */}
          <div className="replayme-card p-6 border-r-4 border-purple-500">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-indigo-night/60 text-sm font-medium mb-1">עלות חודשית</p>
                <p className="text-3xl font-bold text-indigo-night">
                  {analytics.loading ? (
                    <span className="animate-pulse">$--</span>
                  ) : analytics.error ? (
                    <span className="text-red-500 text-lg">שגיאה</span>
                  ) : (
                    `$${analytics.totalCosts.toFixed(2)}`
                  )}
                </p>
                <p className="text-sm text-purple-600 font-medium mt-1">
                  {analytics.loading ? 'טוען נתונים...' : 
                   analytics.error ? 'לא ניתן לטעון' : 
                   '30 ימים אחרונים'}
                </p>
              </div>
              <div className="w-12 h-12 bg-purple-500/20 rounded-xl flex items-center justify-center">
                <CreditCard className="w-6 h-6 text-purple-600" />
              </div>
            </div>
          </div>

          <div className="replayme-card p-6 border-r-4 border-blue-500">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-indigo-night/60 text-sm font-medium mb-1">בקשות API</p>
                <p className="text-3xl font-bold text-indigo-night">
                  {analytics.loading ? (
                    <span className="animate-pulse">--</span>
                  ) : analytics.error ? (
                    <span className="text-red-500 text-lg">שגיאה</span>
                  ) : (
                    analytics.totalRequests >= 1000 ? 
                      `${(analytics.totalRequests / 1000).toFixed(1)}K` : 
                      analytics.totalRequests.toString()
                  )}
                </p>
                <p className="text-sm text-blue-600 font-medium mt-1">
                  {analytics.loading ? 'טוען נתונים...' : 
                   analytics.error ? 'לא ניתן לטעון' : 
                   'בקשות כוללות'}
                </p>
              </div>
              <div className="w-12 h-12 bg-blue-500/20 rounded-xl flex items-center justify-center">
                <Activity className="w-6 h-6 text-blue-600" />
              </div>
            </div>
          </div>

          <div className="replayme-card p-6 border-r-4 border-green-500">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-indigo-night/60 text-sm font-medium mb-1">טוקנים</p>
                <p className="text-3xl font-bold text-indigo-night">
                  {analytics.loading ? (
                    <span className="animate-pulse">--</span>
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
                <p className="text-sm text-green-600 font-medium mt-1">
                  {analytics.loading ? 'טוען נתונים...' : 
                   analytics.error ? 'לא ניתן לטעון' : 
                   'סה"כ טוקנים'}
                </p>
              </div>
              <div className="w-12 h-12 bg-green-500/20 rounded-xl flex items-center justify-center">
                <TrendingUp className="w-6 h-6 text-green-600" />
              </div>
            </div>
          </div>

          <div className="replayme-card p-6 border-r-4 border-orange-500">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-indigo-night/60 text-sm font-medium mb-1">עלות לבקשה</p>
                <p className="text-3xl font-bold text-indigo-night">
                  {analytics.loading ? (
                    <span className="animate-pulse">$--</span>
                  ) : analytics.error ? (
                    <span className="text-red-500 text-lg">שגיאה</span>
                  ) : (
                    `$${analytics.averageRequestCost.toFixed(4)}`
                  )}
                </p>
                <p className="text-sm text-orange-600 font-medium mt-1">
                  {analytics.loading ? 'טוען נתונים...' : 
                   analytics.error ? 'לא ניתן לטעון' : 
                   'ממוצע לבקשה'}
                </p>
              </div>
              <div className="w-12 h-12 bg-orange-500/20 rounded-xl flex items-center justify-center">
                <Star className="w-6 h-6 text-orange-600" />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* תפריט ניהול */}
      <div className="space-y-6">
        <h2 className="text-display text-2xl font-bold text-indigo-night">
          תפריט ניהול מתקדם ⚙️
        </h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* ניהול משתמשים */}
          <Link 
            href="/dashboard/admin/users" 
            className={`replayme-card p-6 card-hover block ${
              stats.pendingUsers > 0 ? 'border-r-4 border-warning bg-warning/5' : ''
            }`}
          >
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="w-12 h-12 bg-lemon-mint/20 rounded-xl flex items-center justify-center">
                  <Users className="w-6 h-6 text-lemon-mint-dark" />
                </div>
                {stats.pendingUsers > 0 && (
                  <div className="bg-warning text-white text-xs font-bold px-2 py-1 rounded-full animate-coral-pulse">
                    {stats.pendingUsers}
                  </div>
                )}
              </div>
              
              <div>
                <h3 className="text-xl font-bold text-indigo-night mb-2">
                  ניהול משתמשים
                </h3>
                <p className="text-indigo-night/70 text-sm leading-relaxed">
                  אישור משתמשים חדשים, ניהול הרשאות ועריכת פרטים
                </p>
                {stats.pendingUsers > 0 && (
                  <p className="text-warning text-sm font-medium mt-2">
                    🔥 {stats.pendingUsers} משתמשים ממתינים לאישור
                  </p>
                )}
              </div>
            </div>
          </Link>

          {/* ניהול חברות */}
          <Link 
            href="/dashboard/admin/companies" 
            className="replayme-card p-6 card-hover block"
          >
            <div className="space-y-4">
              <div className="w-12 h-12 bg-electric-coral/20 rounded-xl flex items-center justify-center">
                <Building2 className="w-6 h-6 text-electric-coral" />
              </div>
              
              <div>
                <h3 className="text-xl font-bold text-indigo-night mb-2">
                  ניהול חברות
                </h3>
                <p className="text-indigo-night/70 text-sm leading-relaxed">
                  הוספה, עריכה ומחיקה של חברות במערכת
                </p>
                <p className="text-electric-coral text-sm font-medium mt-2">
                  {stats.totalCompanies} חברות רשומות
                </p>
              </div>
            </div>
          </Link>

          {/* מכסות משתמשים */}
          <Link 
            href="/dashboard/admin/company-quotas" 
            className="replayme-card p-6 card-hover block"
          >
            <div className="space-y-4">
              <div className="w-12 h-12 bg-success/20 rounded-xl flex items-center justify-center">
                <Target className="w-6 h-6 text-success" />
              </div>
              
              <div>
                <h3 className="text-xl font-bold text-indigo-night mb-2">
                  מכסות משתמשים
                </h3>
                <p className="text-indigo-night/70 text-sm leading-relaxed">
                  ניהול מכסות ותוכניות מנוי לחברות שונות
                </p>
                <p className="text-success text-sm font-medium mt-2">
                  ניהול אוטומטי ומתקדם
                </p>
              </div>
            </div>
          </Link>

          {/* בקשות נציגים */}
          <Link 
            href="/dashboard/admin/agent-requests" 
            className="replayme-card p-6 card-hover block"
          >
            <div className="space-y-4">
              <div className="w-12 h-12 bg-warning/20 rounded-xl flex items-center justify-center">
                <UserCheck className="w-6 h-6 text-warning" />
              </div>
              
              <div>
                <h3 className="text-xl font-bold text-indigo-night mb-2">
                  בקשות נציגים
                </h3>
                <p className="text-indigo-night/70 text-sm leading-relaxed">
                  אישור בקשות הוספת נציגים חדשים מחברות
                </p>
                <p className="text-warning text-sm font-medium mt-2">
                  מעקב אחר בקשות ממתינות
                </p>
              </div>
            </div>
          </Link>

          {/* ניהול תמחור */}
          <Link 
            href="/dashboard/admin/pricing-management" 
            className="replayme-card p-6 card-hover block"
          >
            <div className="space-y-4">
              <div className="w-12 h-12 bg-indigo-night/20 rounded-xl flex items-center justify-center">
                <CreditCard className="w-6 h-6 text-indigo-night" />
              </div>
              
              <div>
                <h3 className="text-xl font-bold text-indigo-night mb-2">
                  ניהול תמחור
                </h3>
                <p className="text-indigo-night/70 text-sm leading-relaxed">
                  הגדרת מחירים ותוכניות מנוי למוצרי המערכת
                </p>
                <p className="text-indigo-night text-sm font-medium mt-2">
                  מחירים ותוכניות
                </p>
              </div>
            </div>
          </Link>

          {/* הגדרות מערכת */}
          <Link 
            href="/dashboard/admin/system-settings" 
            className="replayme-card p-6 card-hover block"
          >
            <div className="space-y-4">
              <div className="w-12 h-12 bg-ice-gray/40 rounded-xl flex items-center justify-center">
                <Settings className="w-6 h-6 text-indigo-night/80" />
              </div>
              
              <div>
                <h3 className="text-xl font-bold text-indigo-night mb-2">
                  הגדרות מערכת
                </h3>
                <p className="text-indigo-night/70 text-sm leading-relaxed">
                  הגדרות כלליות, הודעות מערכת ותצורות מתקדמות
                </p>
                <p className="text-indigo-night/80 text-sm font-medium mt-2">
                  תצורה מתקדמת
                </p>
              </div>
            </div>
          </Link>
        </div>
      </div>

      {/* תובנות מהירות */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="replayme-card p-6">
          <h3 className="text-display text-xl font-bold text-indigo-night mb-6">
            תובנות מהירות 📊
          </h3>
          
          <div className="space-y-4">
            <div className="flex items-center justify-between p-3 bg-cream-sand rounded-lg">
              <div className="flex items-center space-x-3">
                <TrendingUp className="w-5 h-5 text-success" />
                <span className="text-sm font-medium text-indigo-night">קצב צמיחה</span>
              </div>
              <div className="text-lg font-bold text-success">
                {stats.totalUsers > 0 ? `+${Math.round((stats.approvedUsers / stats.totalUsers) * 100)}%` : '0%'}
              </div>
            </div>

            <div className="flex items-center justify-between p-3 bg-cream-sand rounded-lg">
              <div className="flex items-center space-x-3">
                <Activity className="w-5 h-5 text-electric-coral" />
                <span className="text-sm font-medium text-indigo-night">יעילות אישור</span>
              </div>
              <div className="text-lg font-bold text-electric-coral">
                {stats.totalUsers > 0 ? `${Math.round((stats.approvedUsers / stats.totalUsers) * 100)}%` : '0%'}
              </div>
            </div>

            <div className="flex items-center justify-between p-3 bg-cream-sand rounded-lg">
              <div className="flex items-center space-x-3">
                <Star className="w-5 h-5 text-warning" />
                <span className="text-sm font-medium text-indigo-night">משתמשים לחברה</span>
              </div>
              <div className="text-lg font-bold text-warning">
                {stats.totalCompanies > 0 ? Math.round(stats.totalUsers / stats.totalCompanies) : 0}
              </div>
            </div>
          </div>
        </div>

        <div className="replayme-card p-6">
          <h3 className="text-display text-xl font-bold text-indigo-night mb-6">
            פעולות מומלצות 🎯
          </h3>
          
          <div className="space-y-4">
            {stats.pendingUsers > 0 && (
              <div className="p-4 border border-warning/30 rounded-xl bg-warning/5">
                <div className="flex items-start space-x-3">
                  <AlertTriangle className="w-5 h-5 text-warning mt-0.5" />
                  <div>
                    <h4 className="font-semibold text-indigo-night">בדוק משתמשים ממתינים</h4>
                    <p className="text-sm text-indigo-night/70 mt-1">
                      יש {stats.pendingUsers} משתמשים שממתינים לאישור שלך
                    </p>
                    <Link 
                      href="/dashboard/admin/users"
                      className="inline-block mt-2 text-sm font-medium text-warning hover:underline"
                    >
                      עבור לאישור →
                    </Link>
                  </div>
                </div>
              </div>
            )}

            <div className="p-4 border border-success/30 rounded-xl bg-success/5">
              <div className="flex items-start space-x-3">
                <BarChart3 className="w-5 h-5 text-success mt-0.5" />
                <div>
                  <h4 className="font-semibold text-indigo-night">בדוק ביצועים</h4>
                  <p className="text-sm text-indigo-night/70 mt-1">
                    עיין בדוחות שימוש ופעילות החברות
                  </p>
                  <Link 
                    href="/dashboard/admin/reports"
                    className="inline-block mt-2 text-sm font-medium text-success hover:underline"
                  >
                    צפה בדוחות →
                  </Link>
                </div>
              </div>
            </div>

            <div className="p-4 border border-electric-coral/30 rounded-xl bg-electric-coral/5">
              <div className="flex items-start space-x-3">
                <Settings className="w-5 h-5 text-electric-coral mt-0.5" />
                <div>
                  <h4 className="font-semibold text-indigo-night">עדכן הגדרות</h4>
                  <p className="text-sm text-indigo-night/70 mt-1">
                    וודא שהגדרות המערכת מעודכנות ומתאימות
                  </p>
                  <Link 
                    href="/dashboard/admin/system-settings"
                    className="inline-block mt-2 text-sm font-medium text-electric-coral hover:underline"
                  >
                    הגדרות מערכת →
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
} 