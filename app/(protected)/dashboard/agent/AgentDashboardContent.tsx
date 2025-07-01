'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import Avatar from '@/components/Avatar'

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
  created_at: string
  overall_score: number | null
  processing_status: string | null
  red_flag: boolean | null
}

export default function AgentDashboardContent({ userId, companyId, targetUserInfo }: AgentDashboardContentProps) {
  const router = useRouter()
  const supabase = createClient()
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState<DashboardStats>({
    totalCalls: 0,
    avgScore: 0,
    successfulCalls: 0,
    weekCalls: 0
  })
  const [calls, setCalls] = useState<Call[]>([])
  const [isSideMenuOpen, setIsSideMenuOpen] = useState(false)
  const [isNotificationsMenuOpen, setIsNotificationsMenuOpen] = useState(false)
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false)
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
          .select('id, call_type, overall_score, processing_status, created_at, red_flag')
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
        const successfulCalls = callsWithScore.filter(call => (call.overall_score || 0) >= 8).length
        
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

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return <span className="success-indicator">הושלם</span>
      case 'pending':
        return <span className="px-3 py-1 rounded-full text-sm font-medium bg-warning/10 text-warning border border-warning/20">בתהליך</span>
      case 'error':
        return <span className="red-flag-indicator">שגיאה</span>
      default:
        return <span className="px-3 py-1 rounded-full text-sm font-medium bg-cream-sand text-indigo-night border border-ice-gray">{status}</span>
    }
  }

  const getScoreBadge = (score: number | null, redFlag: boolean | null) => {
    if (score === null) return null
    
    let className = ''
    if (redFlag) className = 'score-low'
    else if (score >= 8.5) className = 'score-high'
    else if (score >= 7) className = 'score-medium'
    else className = 'score-low'
    
    return (
      <div className={`score-display ${className} flex items-center space-x-1`}>
        <span>{score.toFixed(1)}</span>
        {redFlag && <span className="text-electric-coral animate-coral-pulse">🚩</span>}
      </div>
    )
  }

  const getCallTypeIcon = (callType: string) => {
    const icons: { [key: string]: string } = {
      'sales_call': '📞',
      'follow_up_before_offer': '📋',
      'follow_up_after_offer': '✅',
      'appointment_scheduling': '📅',
      'follow_up_appointment': '🔄',
      'customer_service': '🛠️'
    }
    return icons[callType] || '📞'
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

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="text-center">
          <div className="w-16 h-16 bg-lemon-mint/20 rounded-full flex items-center justify-center mb-4 animate-lemon-pulse mx-auto">
            <svg className="w-8 h-8 text-lemon-mint-dark" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
          </div>
          <p className="text-indigo-night font-medium text-display">טוען את דשבורד האימון שלך...</p>
          <p className="text-indigo-night/60 text-sm mt-1">מחשב ביצועים ומכין המלצות</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      {/* כותרת עם ברכה */}
      <div className="replayme-card p-8">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Avatar 
              avatarUrl={agentInfo?.avatar_url} 
              fullName={targetUserInfo?.full_name || agentInfo?.full_name} 
              size="lg"
            />
            <div>
              <h1 className="text-display text-3xl font-bold text-indigo-night">
                שלום, {targetUserInfo?.full_name || agentInfo?.full_name || 'נציג'}! 👋
              </h1>
              <p className="text-indigo-night/60 mt-1">
                {targetUserInfo ? 'מציג נתוני נציג' : 'ברוך הבא לחדר הכושר המכירתי שלך'}
              </p>
            </div>
          </div>
          
          {!targetUserInfo && (
            <div className="flex space-x-3">
              <Link href="/simulations" className="replayme-button-primary">
                <span className="flex items-center space-x-2">
                  <span>חדר כושר 🏋️‍♂️</span>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                </span>
              </Link>
              <Link href="/upload" className="replayme-button-secondary">
                <span className="flex items-center space-x-2">
                  <span>העלה שיחה</span>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                  </svg>
                </span>
              </Link>
            </div>
          )}
        </div>
      </div>

      {/* סטטיסטיקות */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* סה"כ שיחות */}
        <div className="choacee-card-clay choacee-interactive">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-neutral-500 text-sm font-medium">סה"כ שיחות</p>
              <p className="choacee-text-display text-3xl font-bold text-clay-primary animate-score-bounce">
                {stats.totalCalls}
              </p>
            </div>
            <div className="w-12 h-12 bg-clay-success/20 rounded-clay flex items-center justify-center">
              <svg className="w-6 h-6 text-clay-success-dark" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
              </svg>
            </div>
          </div>
        </div>

        {/* ציון ממוצע */}
        <div className="choacee-card-clay choacee-interactive">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-neutral-500 text-sm font-medium">ציון ממוצע</p>
              <p className={`choacee-text-display text-3xl font-bold animate-score-bounce ${
                stats.avgScore >= 8.5 ? 'text-clay-success' : 
                stats.avgScore >= 7 ? 'text-clay-warning' : 'text-clay-danger'
              }`}>
                {stats.avgScore > 0 ? stats.avgScore.toFixed(1) : '-'}
              </p>
            </div>
            <div className={`w-12 h-12 rounded-clay flex items-center justify-center ${
              stats.avgScore >= 8.5 ? 'bg-clay-success/20' : 
              stats.avgScore >= 7 ? 'bg-clay-warning/20' : 'bg-clay-danger/20'
            }`}>
              <svg className={`w-6 h-6 ${
                stats.avgScore >= 8.5 ? 'text-clay-success' : 
                stats.avgScore >= 7 ? 'text-clay-warning' : 'text-clay-danger'
              }`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>
        </div>

        {/* שיחות מוצלחות */}
        <div className="choacee-card-clay choacee-interactive">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-neutral-500 text-sm font-medium">שיחות מוצלחות</p>
              <p className="choacee-text-display text-3xl font-bold text-clay-success animate-score-bounce">
                {stats.successfulCalls}
              </p>
              <p className="text-xs text-neutral-400 mt-1">ציון מעל 8.0</p>
            </div>
            <div className="w-12 h-12 bg-clay-success/20 rounded-clay flex items-center justify-center">
              <svg className="w-6 h-6 text-clay-success" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
          </div>
        </div>

        {/* שיחות השבוע */}
        <div className="choacee-card-clay choacee-interactive">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-neutral-500 text-sm font-medium">השבוע</p>
              <p className="choacee-text-display text-3xl font-bold text-clay-primary animate-score-bounce">
                {stats.weekCalls}
              </p>
              <p className="text-xs text-neutral-400 mt-1">7 ימים אחרונים</p>
            </div>
            <div className="w-12 h-12 bg-clay-primary/20 rounded-clay flex items-center justify-center">
              <svg className="w-6 h-6 text-clay-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
          </div>
        </div>
      </div>

      {/* המלצה יומית */}
      {!targetUserInfo && (
        <div className="choacee-card-glass p-6 border-r-4 border-clay-success">
          <div className="flex items-start space-x-4">
            <div className="w-12 h-12 bg-clay-success/30 rounded-clay flex items-center justify-center flex-shrink-0 animate-clay-float">
              <svg className="w-6 h-6 text-clay-success-dark" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
              </svg>
            </div>
            <div className="flex-1">
              <h3 className="choacee-text-display text-lg font-semibold text-clay-primary mb-2">💡 המלצת האימון היומית</h3>
              <p className="choacee-text-body text-neutral-600 mb-4">
                {stats.avgScore < 7 
                  ? "התמקד היום בשיפור טכניקות הקשבה ובניית אמפתיה עם הלקוח. נסה לתרגל שיחת מכירה עם דגש על זיהוי צרכים."
                  : stats.successfulCalls < 3
                  ? "אתה בדרך הנכונה! נסה להעלות עוד 2-3 שיחות השבוע כדי לחזק את הביצועים."
                  : "ביצועים מעולים! המשך לתרגל טכניקות מתקדמות וחדד את כישורי הסגירה."
                }
              </p>
              <Link href="/simulations" className="choacee-btn-clay-primary text-sm">
                התחל אימון 🚀
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* רשימת שיחות */}
      <div className="choacee-card-clay-raised p-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="choacee-text-display text-2xl font-bold text-clay-primary">שיחות אחרונות</h2>
            <p className="choacee-text-body text-neutral-500 text-sm mt-1">מיון לפי תאריך יצירה</p>
          </div>
          {!targetUserInfo && (
            <Link href="/upload" className="choacee-btn-clay-secondary text-sm">
              <span className="flex items-center space-x-2">
                <span>העלה שיחה חדשה</span>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
              </span>
            </Link>
          )}
        </div>

        {calls.length === 0 ? (
          <div className="text-center py-12">
            <div className="w-20 h-20 bg-cream-sand rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-10 h-10 text-indigo-night/40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-indigo-night mb-2">אין עדיין שיחות</h3>
            <p className="text-indigo-night/60 mb-6">התחל את מסע האימון שלך על ידי העלאת השיחה הראשונה</p>
            {!targetUserInfo && (
              <Link href="/upload" className="replayme-button-primary">
                העלה שיחה ראשונה
              </Link>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            {calls.slice(0, 10).map((call) => (
              <div key={call.id} className="flex items-center justify-between p-4 border border-ice-gray rounded-lg hover:bg-cream-sand/30 transition-colors duration-200">
                <div className="flex items-center space-x-4">
                  <div className="text-2xl">{getCallTypeIcon(call.call_type)}</div>
                  <div>
                    <h4 className="font-semibold text-indigo-night">{getCallTypeName(call.call_type)}</h4>
                    <p className="text-sm text-indigo-night/60">{formatDate(call.created_at)}</p>
                  </div>
                </div>
                
                <div className="flex items-center space-x-3">
                  {getStatusBadge(call.processing_status || 'unknown')}
                  {getScoreBadge(call.overall_score, call.red_flag)}
                  
                  {call.processing_status === 'completed' && (
                    <Link 
                      href={`/call/${call.id}`}
                      className="text-sm text-lemon-mint-dark hover:text-lemon-mint font-medium underline decoration-2 underline-offset-4"
                    >
                      צפה בניתוח
                    </Link>
                  )}
                </div>
              </div>
            ))}
            
            {/* קישור לכל השיחות */}
            {calls.length > 10 && (
              <div className="text-center pt-4">
                <Link 
                  href={targetUserInfo ? `/dashboard/calls?agent=${userId}` : '/dashboard/calls'}
                  className="replayme-button-secondary text-sm"
                >
                  <span className="flex items-center space-x-2">
                    <span>צפה בכל השיחות ({calls.length})</span>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                    </svg>
                  </span>
                </Link>
              </div>
            )}
            
            {calls.length <= 10 && calls.length > 0 && (
              <div className="text-center pt-4">
                <Link 
                  href={targetUserInfo ? `/dashboard/calls?agent=${userId}` : '/dashboard/calls'}
                  className="text-sm text-lemon-mint-dark hover:text-lemon-mint font-medium underline decoration-2 underline-offset-4"
                >
                  צפה בדף השיחות המלא
                </Link>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
} 