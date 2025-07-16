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
import AgentSummary from '@/components/AgentSummary'

interface ManagerDashboardContentProps {
  userId: string
  companyId: string | null
}

// פונקציה לברכה לפי שעה
const getTimeBasedGreeting = () => {
  const hour = new Date().getHours()
  
  if (hour >= 5 && hour < 12) {
    return 'בוקר טוב'
  } else if (hour >= 12 && hour < 17) {
    return 'צהריים טובים'
  } else if (hour >= 17 && hour < 22) {
    return 'ערב טוב'
  } else {
    return 'לילה טוב'
  }
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
  const [allAgents, setAllAgents] = useState<AgentPerformance[]>([])
  const [managerInfo, setManagerInfo] = useState<{
    full_name: string | null
    email: string | null
  } | null>(null)
  const greeting = getTimeBasedGreeting()

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
        setAllAgents(agents?.map(agent => {
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
            trend: 'stable' as const
          }
        }) || [])

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
          <div className="w-16 h-16 bg-clay-accent/20 rounded-clay flex items-center justify-center mx-auto animate-clay-float">
            <Activity className="w-8 h-8 text-clay-accent animate-spin" />
          </div>
          <div>
            <h3 className="choacee-text-display text-lg font-semibold text-clay-primary">טוען נתוני דשבורד...</h3>
            <p className="choacee-text-body text-neutral-600">אוסף את כל המידע החשוב עבורך</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      {/* כותרת עליונה פשוטה עם ברכה לפי שעה */}
      <div className="choacee-card-clay-raised bg-gradient-to-r from-glacier-primary-500 via-glacier-accent-500 to-glacier-secondary-500 p-6 mb-6">
        <div className="max-w-7xl mx-auto text-center">
          <h1 className="choacee-text-display text-4xl font-bold mb-2 text-white">
            {greeting}, {managerInfo?.full_name || 'מנהל'}!
          </h1>
          <p className="text-white/90 text-xl">
            🚀 דשבורד ניהול Coachee
          </p>
        </div>
      </div>

      {/* סטטיסטיקות מרכזיות */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {/* סה"כ נציגים */}
        <div className="choacee-card-clay choacee-interactive">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-neutral-500 text-sm font-medium">נציגים פעילים</p>
              <p className="choacee-text-display text-3xl font-bold text-clay-primary mt-2">
                {stats.totalAgents}
              </p>
              <p className="text-xs text-neutral-400 mt-1">בצוות שלך</p>
            </div>
            <div className="w-12 h-12 bg-clay-accent/20 rounded-clay flex items-center justify-center">
              <Users className="w-6 h-6 text-clay-accent" />
            </div>
          </div>
        </div>

        {/* סה"כ שיחות */}
        <div className="choacee-card-clay choacee-interactive">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-neutral-500 text-sm font-medium">סה"כ שיחות</p>
              <p className="choacee-text-display text-3xl font-bold text-clay-primary mt-2">
                {stats.totalCalls}
              </p>
              <p className="text-xs text-neutral-400 mt-1">של כל הצוות</p>
            </div>
            <div className="w-12 h-12 bg-clay-success/20 rounded-clay flex items-center justify-center">
              <Phone className="w-6 h-6 text-clay-success" />
            </div>
          </div>
        </div>

        {/* ציון ממוצע */}
        <div className="choacee-card-clay choacee-interactive">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-neutral-500 text-sm font-medium">ציון ממוצע</p>
              <p className={`choacee-text-display text-3xl font-bold mt-2 ${
                stats.avgScore >= 8.5 ? 'text-clay-success' : 
                stats.avgScore >= 7 ? 'text-clay-warning' : 'text-clay-danger'
              }`}>
                {stats.avgScore > 0 ? stats.avgScore.toFixed(1) : '-'}
              </p>
              <p className="text-xs text-neutral-400 mt-1">מתוך 10</p>
            </div>
            <div className={`w-12 h-12 rounded-clay flex items-center justify-center ${
              stats.avgScore >= 8.5 ? 'bg-clay-success/20' : 
              stats.avgScore >= 7 ? 'bg-clay-warning/20' : 'bg-clay-danger/20'
            }`}>
              <TrendingUp className={`w-6 h-6 ${
                stats.avgScore >= 8.5 ? 'text-clay-success' : 
                stats.avgScore >= 7 ? 'text-clay-warning' : 'text-clay-danger'
              }`} />
            </div>
          </div>
        </div>

        {/* שיחות מוצלחות */}
        <div className="choacee-card-clay choacee-interactive">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-neutral-500 text-sm font-medium">שיחות מוצלחות</p>
              <p className="choacee-text-display text-3xl font-bold text-clay-success mt-2">
                {stats.successfulCalls}
              </p>
              <p className="text-xs text-neutral-400 mt-1">ציון מעל 8.0</p>
            </div>
            <div className="w-12 h-12 bg-clay-success/20 rounded-clay flex items-center justify-center">
              <Award className="w-6 h-6 text-clay-success" />
            </div>
          </div>
        </div>
      </div>

      {/* שיחות בתהליך */}
      {stats.pendingCalls > 0 && (
        <div className="choacee-card-glass border border-clay-warning/30 rounded-clay p-4 mb-8">
          <div className="flex items-center gap-2">
            <Clock className="w-5 h-5 text-clay-warning" />
            <p className="text-clay-warning-dark font-medium">
              {stats.pendingCalls} שיחות בתהליך עיבוד
            </p>
          </div>
        </div>
      )}

      {/* תצוגת ביצועי נציגים מובילים */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2">
          <div className="choacee-card-clay-raised p-8">
            <div className="flex items-center justify-between mb-6">
              <h3 className="choacee-text-display text-2xl font-bold text-clay-primary">
                הנציגים המובילים 🏆
              </h3>
              <Link href="/team" className="choacee-btn-clay-secondary text-sm">
                צפה בכל הצוות
              </Link>
            </div>

            <div className="space-y-4">
              {topAgents.map((agent, index) => (
                <Link 
                  key={agent.id} 
                  href={`/dashboard/calls?agent=${agent.id}`}
                  className="block choacee-card-glass p-4 border-r-4 border-clay-accent/50 hover:border-clay-accent hover:bg-clay-accent/5 transition-all duration-200 cursor-pointer choacee-interactive"
                >
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
                        <Avatar fullName={agent.name} className="w-10 h-10" />
                      </div>
                      
                      <div>
                        <h4 className="font-semibold text-clay-primary group-hover:text-clay-accent transition-colors">
                          {agent.name}
                        </h4>
                        <p className="text-sm text-neutral-600">
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
                        <div className="text-xs text-neutral-500">ממוצע</div>
                      </div>
                      
                      <div className="flex items-center space-x-2">
                        <div className={`w-6 h-6 rounded-full flex items-center justify-center ${
                          agent.trend === 'up' ? 'bg-clay-success/20' :
                          agent.trend === 'down' ? 'bg-clay-danger/20' : 'bg-neutral-200'
                        }`}>
                          <ArrowUpRight className={`w-4 h-4 ${
                            agent.trend === 'up' ? 'text-clay-success' :
                            agent.trend === 'down' ? 'text-clay-danger rotate-90' : 'text-neutral-500'
                          }`} />
                        </div>
                        
                        <div className="text-xs text-neutral-500 hover:text-clay-accent transition-colors">
                          לחץ לצפייה בשיחות
                        </div>
                      </div>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </div>

        {/* פעולות מהירות */}
        <div className="space-y-6">
          <div className="choacee-card-clay p-6">
            <h3 className="choacee-text-display text-xl font-bold text-clay-primary mb-6">
              פעולות מהירות ⚡
            </h3>
            
            <div className="space-y-4">
              <Link href="/upload" className="block p-4 rounded-clay border border-neutral-200 hover:bg-clay-secondary/10 transition-colors duration-200 group choacee-interactive">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-clay-secondary/20 rounded-clay flex items-center justify-center group-hover:bg-clay-secondary/30 transition-colors">
                    <Upload className="w-5 h-5 text-clay-secondary" />
                  </div>
                  <div>
                    <div className="font-semibold text-clay-primary">העלה שיחה</div>
                    <div className="text-sm text-neutral-600">ניתוח מיידי</div>
                  </div>
                </div>
              </Link>

              <Link href="/dashboard/manager/all-calls" className="block p-4 rounded-clay border border-neutral-200 hover:bg-clay-danger/10 transition-colors duration-200 group choacee-interactive">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-clay-danger/20 rounded-clay flex items-center justify-center group-hover:bg-clay-danger/30 transition-colors">
                    <BarChart3 className="w-5 h-5 text-clay-danger" />
                  </div>
                  <div>
                    <div className="font-semibold text-clay-primary">כל השיחות</div>
                    <div className="text-sm text-neutral-600">צפייה ופילטור</div>
                  </div>
                </div>
              </Link>

              <Link href="/team" className="block p-4 rounded-clay border border-neutral-200 hover:bg-clay-primary/10 transition-colors duration-200 group choacee-interactive">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-clay-primary/20 rounded-clay flex items-center justify-center group-hover:bg-clay-primary/30 transition-colors">
                    <Users className="w-5 h-5 text-clay-primary" />
                  </div>
                  <div>
                    <div className="font-semibold text-clay-primary">ניהול צוות</div>
                    <div className="text-sm text-neutral-600">הוספה ועריכה</div>
                  </div>
                </div>
              </Link>

              <Link href="/dashboard/manager/company-details" className="block p-4 rounded-clay border border-neutral-200 hover:bg-clay-success/10 transition-colors duration-200 group choacee-interactive">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-clay-success/20 rounded-clay flex items-center justify-center group-hover:bg-clay-success/30 transition-colors">
                    <Building2 className="w-5 h-5 text-clay-success" />
                  </div>
                  <div>
                    <div className="font-semibold text-clay-primary">פרטי החברה</div>
                    <div className="text-sm text-neutral-600">הגדרות ותצורה</div>
                  </div>
                </div>
              </Link>
            </div>
          </div>

          {/* סטטיסטיקות נוספות */}
          <div className="choacee-card-clay p-6">
            <h3 className="choacee-text-display text-xl font-bold text-clay-primary mb-6">
              תובנות השבוע 📊
            </h3>
            
            <div className="space-y-4">
              <div className="flex items-center justify-between p-3 bg-glass-light rounded-clay">
                <div className="flex items-center space-x-3">
                  <Target className="w-5 h-5 text-clay-success" />
                  <span className="text-sm font-medium text-clay-primary">שיחות מוצלחות</span>
                </div>
                <div className="text-lg font-bold text-clay-success">
                  {((stats.successfulCalls / stats.totalCalls) * 100 || 0).toFixed(0)}%
                </div>
              </div>

              <div className="flex items-center justify-between p-3 bg-glass-light rounded-clay">
                <div className="flex items-center space-x-3">
                  <Activity className="w-5 h-5 text-clay-danger" />
                  <span className="text-sm font-medium text-clay-primary">קצב שיחות יומי</span>
                </div>
                <div className="text-lg font-bold text-clay-danger">
                  {Math.round(stats.totalCalls / 7)}
                </div>
              </div>

              <div className="flex items-center justify-between p-3 bg-glass-light rounded-clay">
                <div className="flex items-center space-x-3">
                  <Zap className="w-5 h-5 text-clay-warning" />
                  <span className="text-sm font-medium text-clay-primary">נציגים פעילים</span>
                </div>
                <div className="text-lg font-bold text-clay-warning">
                  {topAgents.filter(agent => agent.totalCalls > 0).length}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* סיכומי נציגים */}
      {allAgents.length > 0 && (
        <div className="space-y-6">
          <div className="choacee-card-clay-raised p-8">
            <div className="flex items-center justify-between mb-6">
              <h3 className="choacee-text-display text-2xl font-bold text-clay-primary">
                סיכומי נציגים 📋
              </h3>
              <p className="text-sm text-neutral-600">
                נקודות לשיפור ושימור לכל נציג על סמך 5 השיחות האחרונות
              </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {allAgents
                .filter(agent => agent.totalCalls > 0) // רק נציגים עם שיחות
                .map(agent => (
                  <div key={agent.id} className="space-y-4">
                    <AgentSummary 
                      agentId={agent.id} 
                      agentName={agent.name}
                      isOwnSummary={false}
                    />
                  </div>
                ))}
            </div>

            {allAgents.filter(agent => agent.totalCalls > 0).length === 0 && (
              <div className="text-center py-12">
                <div className="w-20 h-20 bg-neutral-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Users className="w-10 h-10 text-neutral-400" />
                </div>
                <h3 className="text-lg font-semibold text-neutral-600 mb-2">אין עדיין נתונים</h3>
                <p className="text-neutral-500">לא נמצאו נציגים עם שיחות מנותחות</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* הודעת עידוד */}
      <div className="choacee-card-glass p-8 border-r-4 border-clay-success">
        <div className="flex items-center space-x-6">
          <div className="w-16 h-16 bg-clay-success/20 rounded-clay flex items-center justify-center animate-clay-float">
            <Award className="w-8 h-8 text-clay-success" />
          </div>
          <div>
            <h3 className="choacee-text-display text-2xl font-bold text-clay-primary mb-2">
              עבודה מצוינת! 🎉
            </h3>
            <p className="choacee-text-body text-lg text-neutral-600 leading-relaxed">
              הצוות שלך ממשיך להתפתח ולהשתפר. המשיכו לעבוד יחד ולהגיע לגבהים חדשים!
            </p>
          </div>
        </div>
      </div>
    </div>
  )
} 