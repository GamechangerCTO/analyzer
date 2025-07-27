'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { TrendingUp, Calendar, Clock, CheckCircle, AlertTriangle, ArrowRight, Phone, Target, User } from 'lucide-react'
import Link from 'next/link'

// קומפוננטים חדשים מאורגנים
import WelcomeHero from '@/components/WelcomeHero'
import DashboardStats from '@/components/DashboardStats'
import ModernChart from '@/components/ModernChart'
import DashboardRecommendation from '@/components/DashboardRecommendation'
import AgentSummary from '@/components/AgentSummary'
import LoadingDashboard from '@/components/LoadingDashboard'

interface AgentDashboardContentProps {
  userId: string
  companyId: string | null
  targetUserInfo?: { full_name: string | null; email: string } | null
}

interface DashboardStats {
  totalCalls: number
  avgScore: number
  successfulCalls: number
  weekCalls: number
}

interface Call {
  id: string
  call_type: string
  customer_name: string | null
  created_at: string
  overall_score: number | null
  processing_status: string | null
  red_flag: boolean | null
}

export default function AgentDashboardContent({ userId, companyId, targetUserInfo }: AgentDashboardContentProps) {
  const supabase = createClient()
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState<DashboardStats>({
    totalCalls: 0,
    avgScore: 0,
    successfulCalls: 0,
    weekCalls: 0
  })
  const [calls, setCalls] = useState<Call[]>([])
  const [agentInfo, setAgentInfo] = useState<{
    full_name: string | null
    email: string | null
    avatar_url?: string | null
  } | null>(null)

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        // שליפת נתוני הנציג
        const { data: userData } = await supabase
          .from('users')
          .select('full_name, email, avatar_url')
          .eq('id', userId)
          .single()
        
        setAgentInfo(userData)

        // שליפת נתוני השיחות המלאים
        const { data: callsData, error: callsError } = await supabase
          .from('calls')
          .select('id, call_type, overall_score, processing_status, created_at, red_flag, customer_name')
          .eq('user_id', userId)
          .order('created_at', { ascending: false })

        if (callsError) {
          console.error('Error fetching calls:', callsError)
          return
        }

        setCalls(callsData || [])

        // חישוב סטטיסטיקות
        const totalCalls = callsData?.length || 0
        const callsWithScore = callsData?.filter(call => call.overall_score !== null) || []
        const avgScore = callsWithScore.length > 0 
          ? callsWithScore.reduce((sum, call) => sum + (call.overall_score || 0), 0) / callsWithScore.length
          : 0
        const successfulCalls = callsWithScore.filter(call => (call.overall_score || 0) >= 80).length
        
        // שיחות השבוע
        const oneWeekAgo = new Date()
        oneWeekAgo.setDate(oneWeekAgo.getDate() - 7)
        const weekCalls = callsData?.filter(call => new Date(call.created_at) >= oneWeekAgo).length || 0

        setStats({
          totalCalls,
          avgScore,
          successfulCalls,
          weekCalls
        })

      } catch (error) {
        console.error('Error fetching dashboard data:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchDashboardData()
  }, [userId, supabase])

  // פונקציות עזר לטבלת השיחות
  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('he-IL', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const getCallTypeIcon = (callType: string) => {
    const icons: { [key: string]: JSX.Element } = {
      'sales_call': <Phone className="w-4 h-4" />,
      'follow_up_before_offer': <Target className="w-4 h-4" />,
      'follow_up_after_offer': <CheckCircle className="w-4 h-4" />,
      'appointment_scheduling': <Calendar className="w-4 h-4" />,
      'follow_up_appointment': <Clock className="w-4 h-4" />,
      'customer_service': <User className="w-4 h-4" />
    }
    return icons[callType] || <Phone className="w-4 h-4" />
  }

  const getCallTypeName = (callType: string) => {
    const names: { [key: string]: string } = {
      'sales_call': 'מכירה טלפונית',
      'follow_up_before_offer': 'פולו אפ לפני הצעה',
      'follow_up_after_offer': 'פולו אפ אחרי הצעה',
      'appointment_scheduling': 'תאום פגישה',
      'follow_up_appointment': 'פולו אפ תאום',
      'customer_service': 'שירות לקוחות'
    }
    return names[callType] || callType
  }

  const getScoreColor = (score: number | null) => {
    if (!score) return 'bg-gray-100 text-gray-600'
    if (score >= 85) return 'bg-green-100 text-green-700'
    if (score >= 70) return 'bg-amber-100 text-amber-700'
    return 'bg-red-100 text-red-700'
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-700'
      case 'pending':
        return 'bg-amber-100 text-amber-700'
      case 'error':
        return 'bg-red-100 text-red-700'
      default:
        return 'bg-gray-100 text-gray-600'
    }
  }

  const getStatusText = (status: string) => {
    switch (status) {
      case 'completed':
        return 'הושלם'
      case 'pending':
        return 'בתהליך'
      case 'error':
        return 'שגיאה'
      default:
        return status
    }
  }

  if (loading) {
    return <LoadingDashboard />
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-glacier-neutral-50 via-white to-glacier-primary-50/30 p-6">
      <div className="max-w-7xl mx-auto space-y-8 animate-in fade-in duration-700">
        
        {/* שורה ראשונה - כותרת וסטטיסטיקות */}
        <div className="space-y-6">
          <WelcomeHero 
            agentInfo={agentInfo}
            targetUserInfo={targetUserInfo}
            isViewingOtherAgent={!!targetUserInfo}
          />
          <DashboardStats
            totalCalls={stats.totalCalls}
            avgScore={stats.avgScore}
            successfulCalls={stats.successfulCalls}
            weekCalls={stats.weekCalls}
            loading={loading}
          />
        </div>

        {/* חלוקה 20-80: גרפים וטבלת שיחות */}
        <div className="grid grid-cols-1 xl:grid-cols-5 gap-8">
          
          {/* 20% - גרפים אנכיים */}
          <div className="xl:col-span-1 space-y-6">
            {calls.length > 0 && (
              <>
                {/* גרף מגמת ציונים */}
                <div className="bg-white/90 backdrop-blur-md border border-glacier-neutral-200/50 rounded-2xl shadow-glacier-soft p-4">
                  <ModernChart
                    data={{
                      labels: calls.slice(-10).map((call, index) => `${index + 1}`),
                      values: calls.slice(-10).map(call => call.overall_score || 0)
                    }}
                    title="מגמת ביצועים"
                    type="line"
                    height={250}
                    showTrend={true}
                  />
                </div>

                {/* גרף פיזור סוגי שיחות */}
                <div className="bg-white/90 backdrop-blur-md border border-glacier-neutral-200/50 rounded-2xl shadow-glacier-soft p-4">
                  <ModernChart
                    data={{
                      labels: Array.from(new Set(calls.map(call => {
                        const names: { [key: string]: string } = {
                          'sales_call': 'מכירה',
                          'follow_up_before_offer': 'פולו אפ לפני',
                          'follow_up_after_offer': 'פולו אפ אחרי',
                          'appointment_scheduling': 'תאום פגישה',
                          'follow_up_appointment': 'פולו אפ תאום',
                          'customer_service': 'שירות לקוחות'
                        }
                        return names[call.call_type] || call.call_type
                      }))),
                      values: Array.from(new Set(calls.map(call => call.call_type))).map(type => 
                        calls.filter(call => call.call_type === type).length
                      )
                    }}
                    title="סוגי שיחות"
                    type="doughnut"
                    height={250}
                    showTrend={false}
                  />
                </div>
              </>
            )}
          </div>

          {/* 80% - טבלת שיחות מלאה */}
          <div className="xl:col-span-4">
            <div className="bg-white/90 backdrop-blur-md border border-glacier-neutral-200/50 rounded-2xl shadow-glacier-soft overflow-hidden">
              {/* כותרת הטבלה */}
              <div className="px-6 py-4 border-b border-glacier-neutral-200/50 bg-gradient-to-r from-glacier-primary-50 to-glacier-accent-50">
                <div className="flex items-center justify-between">
                  <h2 className="text-xl font-bold text-glacier-neutral-900">כל השיחות</h2>
                  <Link 
                    href="/dashboard/calls"
                    className="text-sm font-medium text-glacier-primary-600 hover:text-glacier-primary-700 transition-colors"
                  >
                    פתח בדף נפרד
                  </Link>
                </div>
              </div>

              {/* תוכן הטבלה */}
              {calls.length === 0 ? (
                <div className="text-center py-12">
                  <div className="w-16 h-16 bg-gradient-to-br from-glacier-primary-100 to-glacier-accent-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                    <Phone className="w-8 h-8 text-glacier-primary-600" />
                  </div>
                  <h3 className="text-lg font-semibold text-glacier-neutral-900 mb-2">אין עדיין שיחות</h3>
                  <p className="text-glacier-neutral-600 mb-6">התחל את מסע האימון שלך על ידי העלאת השיחה הראשונה</p>
                  {!targetUserInfo && (
                    <Link 
                      href="/upload" 
                      className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-glacier-primary-500 to-glacier-accent-500 text-white rounded-xl hover:from-glacier-primary-600 hover:to-glacier-accent-600 transition-all duration-300 font-medium"
                    >
                      <Phone className="w-5 h-5" />
                      <span>העלה שיחה ראשונה</span>
                    </Link>
                  )}
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-glacier-neutral-200/30">
                    <thead className="bg-glacier-neutral-50/50">
                      <tr>
                        <th className="px-4 py-3 text-right text-xs font-medium text-glacier-neutral-500 uppercase tracking-wider">
                          תאריך
                        </th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-glacier-neutral-500 uppercase tracking-wider">
                          סוג שיחה
                        </th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-glacier-neutral-500 uppercase tracking-wider">
                          שם לקוח
                        </th>
                        <th className="px-4 py-3 text-center text-xs font-medium text-glacier-neutral-500 uppercase tracking-wider">
                          ציון
                        </th>
                        <th className="px-4 py-3 text-center text-xs font-medium text-glacier-neutral-500 uppercase tracking-wider">
                          סטטוס
                        </th>
                        <th className="px-4 py-3 text-center text-xs font-medium text-glacier-neutral-500 uppercase tracking-wider">
                          פעולות
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-glacier-neutral-200/30">
                      {calls.map((call, index) => (
                        <tr 
                          key={call.id} 
                          className="hover:bg-glacier-primary-50/30 transition-colors duration-200"
                          style={{ animationDelay: `${index * 30}ms` }}
                        >
                          <td className="px-4 py-4 whitespace-nowrap text-sm text-glacier-neutral-900">
                            {formatDate(call.created_at)}
                          </td>
                          <td className="px-4 py-4 whitespace-nowrap">
                            <div className="flex items-center gap-2">
                              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-glacier-accent-400 to-glacier-accent-600 flex items-center justify-center text-white">
                                {getCallTypeIcon(call.call_type)}
                              </div>
                              <span className="text-sm font-medium text-glacier-neutral-900">
                                {getCallTypeName(call.call_type)}
                              </span>
                            </div>
                          </td>
                          <td className="px-4 py-4 whitespace-nowrap text-sm text-glacier-neutral-900">
                            <div className="flex items-center gap-2">
                              {call.customer_name || 'לקוח ללא שם'}
                              {call.red_flag && (
                                <AlertTriangle className="w-4 h-4 text-red-500" />
                              )}
                            </div>
                          </td>
                          <td className="px-4 py-4 whitespace-nowrap text-center">
                            {call.overall_score ? (
                              <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getScoreColor(call.overall_score)}`}>
                                {call.overall_score.toFixed(1)}
                              </span>
                            ) : (
                              <span className="text-gray-400 text-xs">-</span>
                            )}
                          </td>
                          <td className="px-4 py-4 whitespace-nowrap text-center">
                            <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(call.processing_status || 'pending')}`}>
                              {getStatusText(call.processing_status || 'pending')}
                            </span>
                          </td>
                          <td className="px-4 py-4 whitespace-nowrap text-center">
                            {call.processing_status === 'completed' && (
                              <Link 
                                href={`/call/${call.id}`}
                                className="inline-flex items-center gap-1 px-3 py-1 bg-glacier-primary-500 text-white rounded-lg hover:bg-glacier-primary-600 transition-colors text-xs font-medium"
                              >
                                <span>צפה</span>
                                <ArrowRight className="w-3 h-3" />
                              </Link>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* המלצה חכמה */}
        <DashboardRecommendation
          avgScore={stats.avgScore}
          successfulCalls={stats.successfulCalls}
          totalCalls={stats.totalCalls}
          isViewingOtherAgent={!!targetUserInfo}
        />

        {/* ניתוח ביצועים מתקדם - 5 השיחות האחרונות */}
        <div className="space-y-6">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-glacier-accent-400 to-glacier-accent-600 flex items-center justify-center text-white shadow-glacier-soft">
              <TrendingUp className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-glacier-neutral-900">ניתוח ביצועים מתקדם</h2>
              <p className="text-glacier-neutral-600">תובנות מבוססות נתונים מ-5 השיחות האחרונות</p>
            </div>
          </div>

          {/* הסרה זמנית של AgentSummary כדי לחסוך quota */}
          <div className="bg-gradient-to-br from-blue-50 to-purple-50 rounded-2xl p-6 border border-blue-200">
            <div className="text-center">
              <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <TrendingUp className="w-8 h-8 text-blue-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">ניתוח ביצועים זמנית מושבת</h3>
              <p className="text-gray-600">התכונה תחזור בקרוב - אנחנו עובדים על שיפורים</p>
            </div>
          </div>
        </div>

      </div>
    </div>
  )
} 