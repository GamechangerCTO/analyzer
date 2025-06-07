'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { 
  Users, 
  Phone, 
  TrendingUp, 
  Award,
  Clock,
  BarChart3,
  FileText,
  Building2,
  Upload,
  Star,
  Target,
  Activity,
  ArrowUpRight,
  Calendar,
  PieChart,
  Zap
} from 'lucide-react'
import Avatar from '@/components/Avatar'

interface ManagerDashboardContentProps {
  userId: string
  companyId: string | null
}

interface DashboardStats {
  totalAgents: number
  totalCalls: number
  avgScore: number
  successfulCalls: number
  pendingCalls: number
}

interface AgentPerformance {
  id: string
  name: string
  totalCalls: number
  avgScore: number
  successfulCalls: number
  trend: 'up' | 'down' | 'stable'
}

export default function ManagerDashboardContent({ userId, companyId }: ManagerDashboardContentProps) {
  const router = useRouter()
  const supabase = createClient()
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState<DashboardStats>({
    totalAgents: 0,
    totalCalls: 0,
    avgScore: 0,
    successfulCalls: 0,
    pendingCalls: 0
  })
  const [topAgents, setTopAgents] = useState<AgentPerformance[]>([])
  const [managerInfo, setManagerInfo] = useState<{
    full_name: string | null
    email: string | null
  } | null>(null)

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        // שליפת נתוני המנהל
        const { data: { user } } = await supabase.auth.getUser()
        if (user && user.email) {
          const { data: userData } = await supabase
            .from('users')
            .select('full_name, email')
            .eq('id', userId)
            .single()
          
          setManagerInfo(userData)
        }

        // שליפת נתוני הנציגים
        if (!companyId) {
          setLoading(false)
          return
        }

        const { data: agents, error: agentsError } = await supabase
          .from('users')
          .select('id, full_name')
          .eq('company_id', companyId)
          .eq('role', 'agent')

        if (agentsError) {
          console.error('Error fetching agents:', agentsError)
          return
        }

        // שליפת נתוני השיחות
        const agentIds = agents?.map(agent => agent.id) || []
        if (agentIds.length === 0) {
          setLoading(false)
          return
        }

        const { data: calls, error: callsError } = await supabase
          .from('calls')
          .select('id, user_id, overall_score, processing_status, created_at')
          .in('user_id', agentIds)

        if (callsError) {
          console.error('Error fetching calls:', callsError)
          return
        }

        // חישוב סטטיסטיקות
        const totalAgents = agents?.length || 0
        const totalCalls = calls?.length || 0
        const callsWithScore = calls?.filter(call => call.overall_score !== null) || []
        const avgScore = callsWithScore.length > 0 
          ? callsWithScore.reduce((sum, call) => sum + (call.overall_score || 0), 0) / callsWithScore.length
          : 0
        const successfulCalls = callsWithScore.filter(call => (call.overall_score || 0) >= 8).length
        const pendingCalls = calls?.filter(call => call.processing_status === 'pending').length || 0

        setStats({
          totalAgents,
          totalCalls,
          avgScore,
          successfulCalls,
          pendingCalls
        })

        // חישוב ביצועי נציגים מובילים
        const agentPerformance = agents?.map(agent => {
          const agentCalls = calls?.filter(call => call.user_id === agent.id) || []
          const agentCallsWithScore = agentCalls.filter(call => call.overall_score !== null)
          const agentAvgScore = agentCallsWithScore.length > 0
            ? agentCallsWithScore.reduce((sum, call) => sum + (call.overall_score || 0), 0) / agentCallsWithScore.length
            : 0
          const agentSuccessfulCalls = agentCallsWithScore.filter(call => (call.overall_score || 0) >= 8).length

          return {
            id: agent.id,
            name: agent.full_name || 'נציג ללא שם',
            totalCalls: agentCalls.length,
            avgScore: agentAvgScore,
            successfulCalls: agentSuccessfulCalls,
            trend: 'stable' as const // זמנית - יש לחשב מטרנד אמיתי
          }
        }).sort((a, b) => b.avgScore - a.avgScore).slice(0, 5) || []

        setTopAgents(agentPerformance)

      } catch (error) {
        console.error('Error fetching dashboard data:', error)
      } finally {
        setLoading(false)
      }
    }

    if (companyId) {
      fetchDashboardData()
    }
  }, [userId, companyId, supabase])

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="text-center space-y-4">
          <div className="w-16 h-16 bg-lemon-mint/20 rounded-2xl flex items-center justify-center mx-auto animate-lemon-pulse">
            <Activity className="w-8 h-8 text-lemon-mint-dark animate-spin" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-indigo-night">טוען נתוני דשבורד...</h3>
            <p className="text-indigo-night/60">אוסף את כל המידע החשוב עבורך</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      {/* כותרת ברוכים הבאים */}
      <div className="replayme-card p-8 bg-gradient-to-l from-indigo-night to-indigo-night/80 text-white">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-6">
            <div className="w-20 h-20 bg-lemon-mint/20 rounded-2xl flex items-center justify-center">
              <Users className="w-10 h-10 text-lemon-mint" />
            </div>
            <div>
              <h1 className="text-display text-3xl font-bold mb-2">
                ברוך הבא, {managerInfo?.full_name || 'מנהל'} 👋
              </h1>
              <p className="text-white/80 text-lg">
                הנה המצב העדכני של הצוות שלך
              </p>
            </div>
          </div>
          
          <div className="text-center">
            <div className="text-2xl font-mono font-bold text-lemon-mint mb-1">
              {new Date().toLocaleDateString('he-IL')}
            </div>
            <div className="text-white/60 text-sm">
              {new Date().toLocaleDateString('he-IL', { weekday: 'long' })}
            </div>
          </div>
        </div>
      </div>

      {/* סטטיסטיקות עיקריות */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="replayme-card p-6 border-r-4 border-lemon-mint">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-indigo-night/60 text-sm font-medium mb-1">סה"כ נציגים</p>
              <p className="text-3xl font-bold text-indigo-night animate-score-bounce">{stats.totalAgents}</p>
              <p className="text-lemon-mint-dark text-sm font-medium mt-1">פעילים במערכת</p>
            </div>
            <div className="w-12 h-12 bg-lemon-mint/20 rounded-xl flex items-center justify-center">
              <Users className="w-6 h-6 text-lemon-mint-dark" />
            </div>
          </div>
        </div>

        <div className="replayme-card p-6 border-r-4 border-electric-coral">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-indigo-night/60 text-sm font-medium mb-1">סה"כ שיחות</p>
              <p className="text-3xl font-bold text-indigo-night animate-score-bounce">{stats.totalCalls}</p>
              <p className="text-electric-coral text-sm font-medium mt-1">נותחו ונבדקו</p>
            </div>
            <div className="w-12 h-12 bg-electric-coral/20 rounded-xl flex items-center justify-center">
              <Phone className="w-6 h-6 text-electric-coral" />
            </div>
          </div>
        </div>

        <div className="replayme-card p-6 border-r-4 border-success">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-indigo-night/60 text-sm font-medium mb-1">ציון ממוצע</p>
              <p className={`text-3xl font-bold animate-score-bounce ${
                stats.avgScore >= 8 ? 'score-high' : 
                stats.avgScore >= 6 ? 'score-medium' : 'score-low'
              }`}>
                {stats.avgScore.toFixed(1)}
              </p>
              <p className="text-success text-sm font-medium mt-1">מתוך 10</p>
            </div>
            <div className="w-12 h-12 bg-success/20 rounded-xl flex items-center justify-center">
              <Star className="w-6 h-6 text-success" />
            </div>
          </div>
        </div>

        <div className="replayme-card p-6 border-r-4 border-warning">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-indigo-night/60 text-sm font-medium mb-1">שיחות ממתינות</p>
              <p className="text-3xl font-bold text-indigo-night animate-score-bounce">{stats.pendingCalls}</p>
              <p className="text-warning text-sm font-medium mt-1">לעיבוד</p>
            </div>
            <div className="w-12 h-12 bg-warning/20 rounded-xl flex items-center justify-center">
              <Clock className="w-6 h-6 text-warning" />
            </div>
          </div>
        </div>
      </div>

      {/* תצוגת ביצועי נציגים מובילים */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2">
          <div className="replayme-card p-8">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-display text-2xl font-bold text-indigo-night">
                הנציגים המובילים 🏆
              </h3>
              <Link href="/team" className="replayme-button-secondary text-sm">
                צפה בכל הצוות
              </Link>
            </div>

            <div className="space-y-4">
              {topAgents.map((agent, index) => (
                <div key={agent.id} className="replayme-card-secondary p-4 border-r-4 border-lemon-mint/50">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                      <div className="flex items-center space-x-3">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white font-bold text-sm ${
                          index === 0 ? 'bg-yellow-500' :
                          index === 1 ? 'bg-gray-400' :
                          index === 2 ? 'bg-amber-600' : 'bg-indigo-night'
                        }`}>
                          {index + 1}
                        </div>
                        <Avatar seed={agent.id} className="w-10 h-10" />
                      </div>
                      
                      <div>
                        <h4 className="font-semibold text-indigo-night">{agent.name}</h4>
                        <p className="text-sm text-indigo-night/60">
                          {agent.totalCalls} שיחות | {agent.successfulCalls} מוצלחות
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center space-x-4">
                      <div className="text-center">
                        <div className={`text-2xl font-bold ${
                          agent.avgScore >= 8 ? 'score-high' :
                          agent.avgScore >= 6 ? 'score-medium' : 'score-low'
                        }`}>
                          {agent.avgScore.toFixed(1)}
                        </div>
                        <div className="text-xs text-indigo-night/60">ממוצע</div>
                      </div>
                      
                      <div className={`w-6 h-6 rounded-full flex items-center justify-center ${
                        agent.trend === 'up' ? 'bg-success/20' :
                        agent.trend === 'down' ? 'bg-error/20' : 'bg-ice-gray'
                      }`}>
                        <ArrowUpRight className={`w-4 h-4 ${
                          agent.trend === 'up' ? 'text-success' :
                          agent.trend === 'down' ? 'text-error rotate-90' : 'text-indigo-night/60'
                        }`} />
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* פעולות מהירות */}
        <div className="space-y-6">
          <div className="replayme-card p-6">
            <h3 className="text-display text-xl font-bold text-indigo-night mb-6">
              פעולות מהירות ⚡
            </h3>
            
            <div className="space-y-4">
              <Link href="/upload" className="block p-4 rounded-xl border border-ice-gray hover:bg-lemon-mint/10 transition-colors duration-200 group">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-lemon-mint/20 rounded-lg flex items-center justify-center group-hover:bg-lemon-mint/30 transition-colors">
                    <Upload className="w-5 h-5 text-lemon-mint-dark" />
                  </div>
                  <div>
                    <div className="font-semibold text-indigo-night">העלה שיחה</div>
                    <div className="text-sm text-indigo-night/60">ניתוח מיידי</div>
                  </div>
                </div>
              </Link>

              <Link href="/dashboard/manager/all-calls" className="block p-4 rounded-xl border border-ice-gray hover:bg-electric-coral/10 transition-colors duration-200 group">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-electric-coral/20 rounded-lg flex items-center justify-center group-hover:bg-electric-coral/30 transition-colors">
                    <BarChart3 className="w-5 h-5 text-electric-coral" />
                  </div>
                  <div>
                    <div className="font-semibold text-indigo-night">כל השיחות</div>
                    <div className="text-sm text-indigo-night/60">צפייה ופילטור</div>
                  </div>
                </div>
              </Link>

              <Link href="/team" className="block p-4 rounded-xl border border-ice-gray hover:bg-indigo-night/10 transition-colors duration-200 group">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-indigo-night/20 rounded-lg flex items-center justify-center group-hover:bg-indigo-night/30 transition-colors">
                    <Users className="w-5 h-5 text-indigo-night" />
                  </div>
                  <div>
                    <div className="font-semibold text-indigo-night">ניהול צוות</div>
                    <div className="text-sm text-indigo-night/60">הוספה ועריכה</div>
                  </div>
                </div>
              </Link>

              <Link href="/dashboard/manager/company-details" className="block p-4 rounded-xl border border-ice-gray hover:bg-success/10 transition-colors duration-200 group">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-success/20 rounded-lg flex items-center justify-center group-hover:bg-success/30 transition-colors">
                    <Building2 className="w-5 h-5 text-success" />
                  </div>
                  <div>
                    <div className="font-semibold text-indigo-night">פרטי החברה</div>
                    <div className="text-sm text-indigo-night/60">הגדרות ותצורה</div>
                  </div>
                </div>
              </Link>
            </div>
          </div>

          {/* סטטיסטיקות נוספות */}
          <div className="replayme-card p-6">
            <h3 className="text-display text-xl font-bold text-indigo-night mb-6">
              תובנות השבוע 📊
            </h3>
            
            <div className="space-y-4">
              <div className="flex items-center justify-between p-3 bg-cream-sand rounded-lg">
                <div className="flex items-center space-x-3">
                  <Target className="w-5 h-5 text-success" />
                  <span className="text-sm font-medium text-indigo-night">שיחות מוצלחות</span>
                </div>
                <div className="text-lg font-bold text-success">
                  {((stats.successfulCalls / stats.totalCalls) * 100 || 0).toFixed(0)}%
                </div>
              </div>

              <div className="flex items-center justify-between p-3 bg-cream-sand rounded-lg">
                <div className="flex items-center space-x-3">
                  <Activity className="w-5 h-5 text-electric-coral" />
                  <span className="text-sm font-medium text-indigo-night">קצב שיחות יומי</span>
                </div>
                <div className="text-lg font-bold text-electric-coral">
                  {Math.round(stats.totalCalls / 7)}
                </div>
              </div>

              <div className="flex items-center justify-between p-3 bg-cream-sand rounded-lg">
                <div className="flex items-center space-x-3">
                  <Zap className="w-5 h-5 text-warning" />
                  <span className="text-sm font-medium text-indigo-night">נציגים פעילים</span>
                </div>
                <div className="text-lg font-bold text-warning">
                  {topAgents.filter(agent => agent.totalCalls > 0).length}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* הודעת עידוד */}
      <div className="replayme-card-secondary p-8 border-r-4 border-lemon-mint">
        <div className="flex items-center space-x-6">
          <div className="w-16 h-16 bg-lemon-mint/20 rounded-2xl flex items-center justify-center animate-lemon-pulse">
            <Award className="w-8 h-8 text-lemon-mint-dark" />
          </div>
          <div>
            <h3 className="text-display text-2xl font-bold text-indigo-night mb-2">
              עבודה מצוינת! 🎉
            </h3>
            <p className="text-lg text-indigo-night/70 leading-relaxed">
              הצוות שלך ממשיך להתפתח ולהשתפר. המשיכו לעבוד יחד ולהגיע לגבהים חדשים!
            </p>
          </div>
        </div>
      </div>
    </div>
  )
} 