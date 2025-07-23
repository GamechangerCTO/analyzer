'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { TrendingUp } from 'lucide-react'

// קומפוננטים חדשים מאורגנים
import WelcomeHero from '@/components/WelcomeHero'
import DashboardStats from '@/components/DashboardStats'
import ModernChart from '@/components/ModernChart'
import DashboardRecommendation from '@/components/DashboardRecommendation'
import CallsList from '@/components/CallsList'
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

  if (loading) {
    return <LoadingDashboard />
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-glacier-neutral-50 via-white to-glacier-primary-50/30">
      <div className="space-y-8 animate-in fade-in duration-700">
        
        {/* כותרת הדשבורד */}
        <WelcomeHero 
          agentInfo={agentInfo}
          targetUserInfo={targetUserInfo}
          isViewingOtherAgent={!!targetUserInfo}
        />

        {/* סטטיסטיקות מתקדמות */}
        <DashboardStats
          totalCalls={stats.totalCalls}
          avgScore={stats.avgScore}
          successfulCalls={stats.successfulCalls}
          weekCalls={stats.weekCalls}
          loading={loading}
        />

        {/* גרפים וויזואליזציות */}
        {calls.length > 0 && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* גרף מגמת ציונים */}
            <ModernChart
              data={{
                labels: calls.slice(-10).map((call, index) => `שיחה ${index + 1}`),
                values: calls.slice(-10).map(call => call.overall_score || 0)
              }}
              title="מגמת ביצועים - 10 שיחות אחרונות"
              type="line"
              height={320}
              showTrend={true}
            />

            {/* גרף פיזור סוגי שיחות */}
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
              title="פיזור סוגי שיחות"
              type="doughnut"
              height={320}
              showTrend={false}
            />
            </div>
          )}

        {/* המלצה חכמה */}
        <DashboardRecommendation
          avgScore={stats.avgScore}
          successfulCalls={stats.successfulCalls}
          totalCalls={stats.totalCalls}
          isViewingOtherAgent={!!targetUserInfo}
        />

        {/* ניתוח ביצועים מתקדם */}
        <div className="space-y-6">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-glacier-accent-400 to-glacier-accent-600 flex items-center justify-center text-white shadow-glacier-soft">
              <TrendingUp className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-glacier-neutral-900">ניתוח ביצועים מתקדם</h2>
              <p className="text-glacier-neutral-600">תובנות מבוססות AI מ-5 השיחות האחרונות (זמנית מושבת)</p>
          </div>
        </div>

          {/* הסרה זמנית של AgentSummary כדי לחסוך quota */}
          <div className="bg-gradient-to-br from-blue-50 to-purple-50 rounded-2xl p-6 border border-blue-200">
            <div className="text-center">
              <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <TrendingUp className="w-8 h-8 text-blue-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">סיכום AI זמנית מושבת</h3>
              <p className="text-gray-600">התכונה תחזור בקרוב - אנחנו עובדים על שיפורים</p>
            </div>
          </div>
        </div>

        {/* רשימת שיחות מעוצבת */}
        <CallsList 
          calls={calls}
          targetUserInfo={targetUserInfo}
          userId={userId}
        />

      </div>
    </div>
  )
} 