'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'
import ProgressLineChart from '@/components/ProgressLineChart'

interface SimulationData {
  id: string
  simulation_type: string
  difficulty_level: string
  status: string
  created_at: string
  completed_at: string | null
  score: number | null
  duration_seconds: number | null
  customer_personas_hebrew?: {
    persona_name: string
    personality_type: string
  }
  simulation_reports_hebrew?: {
    overall_score: number
    summary: string
    strengths: string[]
    improvement_areas: string[]
  }[]
}

interface SimulationsDashboardProps {
  userId: string
  userRole: 'agent' | 'manager' | 'admin'
  companyId?: string | null
}

export default function SimulationsDashboard({ userId, userRole, companyId }: SimulationsDashboardProps) {
  const [simulations, setSimulations] = useState<SimulationData[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [stats, setStats] = useState({
    total: 0,
    completed: 0,
    averageScore: 0,
    thisWeek: 0
  })
  const [progressData, setProgressData] = useState<{labels: string[], data: number[]}>({
    labels: [],
    data: []
  })

  const supabase = createClient()

  useEffect(() => {
    fetchSimulations()
  }, [userId, userRole])

  const fetchSimulations = async () => {
    try {
      let query = supabase
        .from('simulations')
        .select(`
          *,
          customer_personas_hebrew:persona_id (
            persona_name,
            personality_type
          ),
          simulation_reports_hebrew!simulation_id (
            overall_score,
            summary,
            strengths,
            improvement_areas
          )
        `)

      // סינון לפי תפקיד
      if (userRole === 'agent') {
        query = query.eq('agent_id', userId)
      } else if (userRole === 'manager' && companyId) {
        query = query.eq('company_id', companyId)
      }

      const { data, error } = await query
        .order('created_at', { ascending: false })
        .limit(20)

      if (error) throw error

      setSimulations(data || [])
      
      // חישוב סטטיסטיקות
      const totalSims = data?.length || 0
      const completedSims = data?.filter(s => s.status === 'completed').length || 0
      const scores = data?.filter(s => s.score).map(s => s.score!) || []
      const avgScore = scores.length > 0 ? scores.reduce((a, b) => a + b, 0) / scores.length : 0
      
      const oneWeekAgo = new Date()
      oneWeekAgo.setDate(oneWeekAgo.getDate() - 7)
      const thisWeekSims = data?.filter(s => 
        new Date(s.created_at) > oneWeekAgo
      ).length || 0

      setStats({
        total: totalSims,
        completed: completedSims,
        averageScore: Math.round(avgScore * 10) / 10,
        thisWeek: thisWeekSims
      })
      
      // 🔴 חדש: נתוני התקדמות לגרף
      const completedWithScores = data?.filter(s => 
        s.status === 'completed' && s.simulation_reports_hebrew?.[0]?.overall_score
      ).slice(0, 10).reverse() || []
      
      if (completedWithScores.length > 0) {
        setProgressData({
          labels: completedWithScores.map(s => 
            new Date(s.created_at).toLocaleDateString('he-IL', { day: '2-digit', month: '2-digit' })
          ),
          data: completedWithScores.map(s => s.simulation_reports_hebrew?.[0]?.overall_score || 0)
        })
      }

    } catch (error) {
      console.error('שגיאה בטעינת סימולציות:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-green-100 text-green-800'
      case 'active': return 'bg-blue-100 text-blue-800'
      case 'pending': return 'bg-yellow-100 text-yellow-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getScoreColor = (score: number) => {
    if (score >= 8) return 'text-green-600'
    if (score >= 6) return 'text-yellow-600'
    return 'text-red-600'
  }

  const formatDuration = (seconds: number | null) => {
    if (!seconds) return 'לא ידוע'
    const minutes = Math.floor(seconds / 60)
    const remainingSeconds = seconds % 60
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`
  }

  if (isLoading) {
    return (
      <div className="bg-white rounded-xl shadow-lg p-6">
        <div className="animate-pulse">
          <div className="h-6 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="space-y-3">
            <div className="h-4 bg-gray-200 rounded"></div>
            <div className="h-4 bg-gray-200 rounded w-5/6"></div>
            <div className="h-4 bg-gray-200 rounded w-4/6"></div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* סטטיסטיקות */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-sm font-medium text-gray-500">סך הכל סימולציות</h3>
          <p className="text-2xl font-bold text-blue-600">{stats.total}</p>
        </div>
        
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-sm font-medium text-gray-500">הושלמו</h3>
          <p className="text-2xl font-bold text-green-600">{stats.completed}</p>
        </div>
        
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-sm font-medium text-gray-500">ציון ממוצע</h3>
          <p className={`text-2xl font-bold ${getScoreColor(stats.averageScore)}`}>
            {stats.averageScore > 0 ? stats.averageScore : '-'}
          </p>
        </div>
        
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-sm font-medium text-gray-500">השבוע</h3>
          <p className="text-2xl font-bold text-purple-600">{stats.thisWeek}</p>
        </div>
      </div>

      {/* 🔴 גרף התקדמות */}
      {progressData.data.length > 1 && (
        <div className="bg-white rounded-xl shadow-lg p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">📈 התקדמות ציונים</h3>
          <ProgressLineChart 
            title="ציוני סימולציות"
            height={250}
            data={{
              labels: progressData.labels,
              datasets: [{
                label: 'ציון',
                data: progressData.data,
                borderColor: 'rgb(59, 130, 246)',
                backgroundColor: 'rgba(59, 130, 246, 0.1)'
              }]
            }}
          />
          <div className="mt-4 flex justify-between text-sm text-gray-500">
            <span>ראשון: {progressData.data[0]}/10</span>
            <span>אחרון: {progressData.data[progressData.data.length - 1]}/10</span>
            <span className={progressData.data[progressData.data.length - 1] > progressData.data[0] ? 'text-green-600 font-bold' : 'text-red-600 font-bold'}>
              {progressData.data[progressData.data.length - 1] > progressData.data[0] ? '📈 עלייה' : '📉 ירידה'}: {Math.abs(progressData.data[progressData.data.length - 1] - progressData.data[0]).toFixed(1)} נק׳
            </span>
          </div>
        </div>
      )}

      {/* כפתור יצירת סימולציה חדשה */}
      {userRole === 'agent' && (
        <div className="bg-gradient-to-r from-blue-500 to-purple-600 rounded-xl p-6 text-white">
          <div className="flex justify-between items-center">
            <div>
              <h3 className="text-lg font-bold mb-2">🎯 מוכן לאימון חדש?</h3>
              <p className="text-blue-100">
                התחל סימולציה חדשה ושפר את כישורי המכירות שלך
              </p>
            </div>
            <Link 
              href="/simulations/create"
              className="bg-white text-blue-600 px-6 py-3 rounded-lg font-medium hover:bg-blue-50 transition-colors"
            >
              התחל אימון 🚀
            </Link>
          </div>
        </div>
      )}

      {/* רשימת סימולציות */}
      <div className="bg-white rounded-xl shadow-lg overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">
            סימולציות אחרונות
          </h2>
        </div>

        {simulations.length === 0 ? (
          <div className="p-8 text-center">
            <div className="text-gray-400 text-4xl mb-4">🎭</div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              אין סימולציות עדיין
            </h3>
            <p className="text-gray-500 mb-4">
              {userRole === 'agent' 
                ? 'התחל את הסימולציה הראשונה שלך'
                : 'הנציגים עדיין לא ביצעו סימולציות'
              }
            </p>
            {userRole === 'agent' && (
              <Link 
                href="/simulations/create"
                className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                התחל עכשיו
              </Link>
            )}
          </div>
        ) : (
          <div className="divide-y divide-gray-200">
            {simulations.map((simulation) => (
              <div key={simulation.id} className="p-6 hover:bg-gray-50 transition-colors">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="font-medium text-gray-900">
                        {simulation.customer_personas_hebrew?.persona_name || 'לקוח ווירטואלי'}
                      </h3>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(simulation.status)}`}>
                        {simulation.status === 'completed' ? 'הושלם' :
                         simulation.status === 'active' ? 'פעיל' :
                         simulation.status === 'pending' ? 'ממתין' : simulation.status}
                      </span>
                      <span className="px-2 py-1 bg-gray-100 text-gray-700 rounded-full text-xs">
                        {simulation.difficulty_level}
                      </span>
                    </div>

                    <div className="text-sm text-gray-600 mb-2">
                      <span className="font-medium">סוג:</span> {simulation.simulation_type} • 
                      <span className="font-medium mr-2">משך:</span> {formatDuration(simulation.duration_seconds)} • 
                      <span className="font-medium mr-2">תאריך:</span> {new Date(simulation.created_at).toLocaleDateString('he-IL')}
                    </div>

                    {simulation.simulation_reports_hebrew?.[0] && (
                      <div className="text-sm text-gray-600">
                        <span className="font-medium">סיכום:</span> {simulation.simulation_reports_hebrew[0].summary}
                      </div>
                    )}
                  </div>

                  <div className="flex items-center gap-4">
                    {simulation.score && (
                      <div className="text-center">
                        <div className={`text-2xl font-bold ${getScoreColor(simulation.score)}`}>
                          {simulation.score}
                        </div>
                        <div className="text-xs text-gray-500">ציון</div>
                      </div>
                    )}

                    <div className="flex flex-col gap-2">
                      {simulation.status === 'completed' && (
                        <Link
                          href={`/simulations/report/${simulation.id}`}
                          className="px-3 py-1 bg-blue-100 text-blue-700 rounded text-sm hover:bg-blue-200 transition-colors text-center"
                        >
                          צפה בדוח
                        </Link>
                      )}
                      
                      {simulation.status === 'pending' && (
                        <Link
                          href={`/simulations/${simulation.id}`}
                          className="px-3 py-1 bg-green-100 text-green-700 rounded text-sm hover:bg-green-200 transition-colors text-center"
                        >
                          המשך
                        </Link>
                      )}
                    </div>
                  </div>
                </div>

                {/* נקודות חזקות ושיפור */}
                {simulation.simulation_reports_hebrew?.[0] && (
                  <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                    {simulation.simulation_reports_hebrew[0].strengths.length > 0 && (
                      <div>
                        <h4 className="text-sm font-medium text-green-700 mb-1">נקודות חזקות:</h4>
                        <ul className="text-sm text-gray-600 space-y-1">
                          {simulation.simulation_reports_hebrew[0].strengths.slice(0, 2).map((strength, index) => (
                            <li key={index} className="flex items-start gap-2">
                              <span className="text-green-500 text-xs mt-1">✓</span>
                              {strength}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {simulation.simulation_reports_hebrew[0].improvement_areas.length > 0 && (
                      <div>
                        <h4 className="text-sm font-medium text-orange-700 mb-1">לשיפור:</h4>
                        <ul className="text-sm text-gray-600 space-y-1">
                          {simulation.simulation_reports_hebrew[0].improvement_areas.slice(0, 2).map((area, index) => (
                            <li key={index} className="flex items-start gap-2">
                              <span className="text-orange-500 text-xs mt-1">→</span>
                              {area}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
