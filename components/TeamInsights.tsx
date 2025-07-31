'use client'

import { useState, useEffect } from 'react'
import { 
  Lightbulb, 
  TrendingUp, 
  Shield, 
  Target, 
  AlertCircle, 
  Brain,
  Zap,
  Star,
  CheckCircle
} from 'lucide-react'

interface TeamInsightsProps {
  companyId: string
}

interface TeamInsightsData {
  key_insights: string[]
  improvement_recommendations: string[]
  team_strengths: string[]
  priority_focus?: string
  calls_analyzed: number
  team_average_score: number
  analysis_period: string
  team_size: number
  last_updated: string
  error?: string
}

export default function TeamInsights({ companyId }: TeamInsightsProps) {
  const [insightsData, setInsightsData] = useState<TeamInsightsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchTeamInsights = async () => {
      try {
        setLoading(true)
        const response = await fetch(`/api/team-insights?companyId=${companyId}`)
        const data = await response.json()
        
        if (!response.ok) {
          throw new Error(data.error || 'שגיאה בטעינת תובנות הצוות')
        }
        
        setInsightsData(data)
        setError(null)
      } catch (err: any) {
        console.error('Error fetching team insights:', err)
        setError(err.message || 'שגיאה בטעינת תובנות הצוות')
      } finally {
        setLoading(false)
      }
    }

    if (companyId) {
      fetchTeamInsights()
    }
  }, [companyId])

  if (loading) {
    return (
      <div className="bg-white border-2 border-brand-primary/20 rounded-tl-3xl rounded-br-3xl shadow-sm p-6">
        <div className="animate-pulse">
          <div className="flex items-center mb-6">
            <div className="w-12 h-12 bg-gradient-to-br from-brand-primary/20 to-brand-secondary/20 rounded-tl-2xl rounded-br-2xl mr-3"></div>
            <div className="space-y-2">
              <div className="h-6 bg-neutral-200 rounded w-64"></div>
              <div className="h-4 bg-neutral-200 rounded w-48"></div>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="space-y-3">
                <div className="h-4 bg-neutral-200 rounded w-full"></div>
                <div className="h-4 bg-neutral-200 rounded w-3/4"></div>
                <div className="h-4 bg-neutral-200 rounded w-1/2"></div>
              </div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  if (error || !insightsData) {
    return (
      <div className="bg-white border-2 border-brand-warning/30 rounded-tl-3xl rounded-br-3xl shadow-sm p-6">
        <div className="flex items-center text-brand-warning mb-3">
          <AlertCircle className="w-6 h-6 ml-3" />
          <h3 className="text-xl font-bold">
            {error?.includes('אין מספיק') ? 'אין מספיק נתונים' : 'שגיאה בטעינת תובנות'}
          </h3>
        </div>
        <p className="text-neutral-600">
          {error?.includes('אין מספיק') 
            ? 'הצוות עדיין לא ביצע מספיק שיחות מנותחות לחישוב תובנות מפורטות'
            : error || 'לא ניתן לטעון את תובנות הצוות'
          }
        </p>
      </div>
    )
  }

  const scoreColor = insightsData.team_average_score >= 8 ? 'text-brand-success' : 
                    insightsData.team_average_score >= 6 ? 'text-brand-warning' : 'text-red-600'
  
  const scoreBgColor = insightsData.team_average_score >= 8 ? 'bg-brand-success/10 border-brand-success/30' : 
                      insightsData.team_average_score >= 6 ? 'bg-brand-warning/10 border-brand-warning/30' : 'bg-red-50 border-red-200'

  return (
    <div className="bg-white border-2 border-brand-primary/20 rounded-tl-3xl rounded-br-3xl shadow-sm p-6 space-y-6">
      {/* כותרת עם סטטיסטיקות */}
      <div className="flex items-center justify-between">
        <div className="flex items-center">
          <div className="w-16 h-16 bg-white rounded-tl-2xl rounded-br-2xl flex items-center justify-center shadow-lg mr-4 border-2 border-neutral-200">
            <Brain className="w-10 h-10 text-brand-primary" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-neutral-800">🧠 תובנות מהצוות</h2>
            <p className="text-neutral-600 text-sm">
              ניתוח חכם של {insightsData.calls_analyzed} שיחות אחרונות • {insightsData.team_size} חברי צוות
            </p>
          </div>
        </div>
        
        {/* ציון ממוצע צוות */}
        <div className={`px-4 py-3 rounded-tl-xl rounded-br-xl border-2 ${scoreBgColor}`}>
          <div className="text-center">
            <div className={`text-2xl font-bold ${scoreColor}`}>
              {insightsData.team_average_score}
            </div>
            <div className="text-xs text-neutral-600">ציון צוות</div>
          </div>
        </div>
      </div>

      {/* פוקוס עיקרי */}
      {insightsData.priority_focus && (
        <div className="bg-gradient-to-r from-brand-primary/10 to-brand-secondary/10 border-2 border-brand-primary/20 rounded-tl-2xl rounded-br-2xl p-4">
          <div className="flex items-center mb-2">
            <Target className="w-5 h-5 text-brand-primary ml-2" />
            <h4 className="font-bold text-neutral-800">🎯 הפוקוס השבועי</h4>
          </div>
          <p className="text-neutral-700 font-medium">{insightsData.priority_focus}</p>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* תובנות מרכזיות */}
        <div className="space-y-4">
          <div className="flex items-center">
            <Lightbulb className="w-5 h-5 text-brand-primary ml-2" />
            <h4 className="font-bold text-neutral-800">💡 תובנות מרכזיות</h4>
          </div>
          
          <div className="space-y-3">
            {insightsData.key_insights && insightsData.key_insights.length > 0 ? (
              insightsData.key_insights.map((insight, index) => (
                <div key={index} className="bg-gradient-to-r from-brand-primary/5 to-brand-primary/10 border border-brand-primary/20 rounded-tl-xl rounded-br-xl p-4">
                  <div className="flex items-start">
                    <div className="w-6 h-6 bg-brand-primary rounded-full flex items-center justify-center text-white text-xs font-bold mr-3 mt-0.5 flex-shrink-0">
                      {index + 1}
                    </div>
                    <p className="text-sm text-neutral-700 leading-relaxed">{insight}</p>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-4 text-neutral-500">
                <Brain className="w-8 h-8 mx-auto mb-2 text-neutral-400" />
                <p className="text-sm">אין תובנות זמינות</p>
              </div>
            )}
          </div>
        </div>

        {/* המלצות לשיפור */}
        <div className="space-y-4">
          <div className="flex items-center">
            <TrendingUp className="w-5 h-5 text-brand-warning ml-2" />
            <h4 className="font-bold text-neutral-800">🚀 המלצות לשיפור</h4>
          </div>
          
          <div className="space-y-3">
            {insightsData.improvement_recommendations && insightsData.improvement_recommendations.length > 0 ? (
              insightsData.improvement_recommendations.map((recommendation, index) => (
                <div key={index} className="bg-gradient-to-r from-brand-warning/5 to-brand-warning/10 border border-brand-warning/20 rounded-tr-xl rounded-bl-xl p-4">
                  <div className="flex items-start">
                    <Zap className="w-4 h-4 text-brand-warning ml-2 mt-0.5 flex-shrink-0" />
                    <p className="text-sm text-neutral-700 leading-relaxed">{recommendation}</p>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-4 text-neutral-500">
                <CheckCircle className="w-8 h-8 mx-auto mb-2 text-brand-success" />
                <p className="text-sm">אין המלצות לשיפור</p>
              </div>
            )}
          </div>
        </div>

        {/* נקודות חוזק */}
        <div className="space-y-4">
          <div className="flex items-center">
            <Shield className="w-5 h-5 text-brand-success ml-2" />
            <h4 className="font-bold text-neutral-800">💪 נקודות חוזק הצוות</h4>
          </div>
          
          <div className="space-y-3">
            {insightsData.team_strengths && insightsData.team_strengths.length > 0 ? (
              insightsData.team_strengths.map((strength, index) => (
                <div key={index} className="bg-gradient-to-r from-brand-success/5 to-brand-success/10 border border-brand-success/20 rounded-tl-xl rounded-br-xl p-4">
                  <div className="flex items-start">
                    <Star className="w-4 h-4 text-brand-success ml-2 mt-0.5 flex-shrink-0" />
                    <p className="text-sm text-neutral-700 leading-relaxed">{strength}</p>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-4 text-neutral-500">
                <AlertCircle className="w-8 h-8 mx-auto mb-2 text-neutral-400" />
                <p className="text-sm">אין נקודות חוזק זמינות</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* מידע נוסף */}
      <div className="border-t border-neutral-200 pt-4">
        <div className="flex items-center justify-between text-sm text-neutral-600">
          <span>תקופת ניתוח: {insightsData.analysis_period}</span>
          <div className="flex items-center">
            <div className="w-2 h-2 bg-brand-success rounded-full ml-2"></div>
            <span>עודכן כעת</span>
          </div>
        </div>
      </div>
    </div>
  )
}