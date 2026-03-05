'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { TrendingUp, TrendingDown, Star, Target, User, AlertCircle, CheckCircle } from 'lucide-react'

interface AgentSummaryProps {
  agentId: string
  agentName?: string
  isOwnSummary?: boolean // האם זה סיכום של הנציג עצמו או של מנהל על הנציג
}

interface SummaryData {
  improvement_points: string[]
  preservation_points: string[]
  summary: string
  calls_analyzed: number
  average_score: number
  analysis_period: string
  error?: string
}

export default function AgentSummary({ agentId, agentName, isOwnSummary = true }: AgentSummaryProps) {
  const [summaryData, setSummaryData] = useState<SummaryData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchSummary = async () => {
      try {
        setLoading(true)
        
        // ראשית, נסה לקרוא מהמסד נתונים
        const cachedResponse = await fetch(`/api/agent-summary-cached?userId=${agentId}`)
        
        if (cachedResponse.ok) {
          const cachedData = await cachedResponse.json()
          if (cachedData && cachedData.insights_data) {
            console.log('✅ טעינת תובנות סוכן מהמסד נתונים (מטמון)')
            setSummaryData(cachedData.insights_data)
            setError(null)
            setLoading(false)
            return
          }
        }

        // אם אין נתונים מטמוניים או שהם ישנים, קרא מ-API כרגיל
        console.log('📡 קריאה ל-API לתובנות סוכן (אין מטמון או מטמון ישן)')
        const response = await fetch(`/api/agent-summary?agentId=${agentId}`)
        const data = await response.json()
        
        if (!response.ok) {
          throw new Error(data.error || 'שגיאה בטעינת הסיכום')
        }
        
        setSummaryData(data)
        setError(null)
      } catch (err: any) {
        console.error('Error fetching agent summary:', err)
        setError(err.message || 'שגיאה בטעינת הסיכום')
      } finally {
        setLoading(false)
      }
    }

    if (agentId) {
      fetchSummary()
    }
  }, [agentId])

  if (loading) {
    return (
      <div className="bg-white rounded-xl shadow-lg p-6">
        <div className="animate-pulse">
          <div className="flex items-center mb-4">
            <div className="w-8 h-8 bg-gray-200 rounded-lg mr-3"></div>
            <div className="h-6 bg-gray-200 rounded w-48"></div>
          </div>
          <div className="space-y-3">
            <div className="h-4 bg-gray-200 rounded w-full"></div>
            <div className="h-4 bg-gray-200 rounded w-3/4"></div>
            <div className="h-4 bg-gray-200 rounded w-1/2"></div>
          </div>
        </div>
      </div>
    )
  }

  if (error || !summaryData) {
    return (
      <div className="bg-white rounded-xl shadow-lg p-6 border-r-4 border-orange-400">
        <div className="flex items-center text-orange-600 mb-2">
          <AlertCircle className="w-5 h-5 ml-2" />
          <h3 className="font-semibold">
            {error?.includes('אין מספיק שיחות') ? 'אין מספיק נתונים' : 'שגיאה בטעינת הסיכום'}
          </h3>
        </div>
        <p className="text-gray-600 text-sm">
          {error?.includes('אין מספיק שיחות') 
            ? `${agentName || 'הנציג'} עדיין לא ביצע מספיק שיחות מנותחות לחישוב סיכום מפורט`
            : error || 'לא ניתן לטעון את נתוני הסיכום'
          }
        </p>
      </div>
    )
  }

  const scoreColor = summaryData.average_score >= 8 ? 'text-green-600' : 
                    summaryData.average_score >= 6 ? 'text-yellow-600' : 'text-red-600'
  
  const scoreBgColor = summaryData.average_score >= 8 ? 'bg-green-50 border-green-200' : 
                      summaryData.average_score >= 6 ? 'bg-yellow-50 border-yellow-200' : 'bg-red-50 border-red-200'

  return (
    <div className="bg-white rounded-xl shadow-lg p-6 space-y-6">
      {/* כותרת עם פרטי הסיכום */}
      <div className="flex items-center justify-between">
        <div className="flex items-center">
          <User className="w-6 h-6 text-brand-primary ml-3" />
          <div>
            <h3 className="text-xl font-semibold text-gray-800">
              {isOwnSummary ? 'הסיכום שלי' : `סיכום ${agentName || 'נציג'}`}
            </h3>
            <p className="text-sm text-gray-600">
              על סמך {summaryData.calls_analyzed} שיחות אחרונות
            </p>
          </div>
        </div>
        
        {/* ציון ממוצע */}
        <div className={`px-4 py-2 rounded-lg border ${scoreBgColor}`}>
          <div className="text-center">
            <div className={`text-2xl font-bold ${scoreColor}`}>
              {summaryData.average_score}
            </div>
            <div className="text-xs text-gray-600">ציון ממוצע</div>
          </div>
        </div>
      </div>

      {/* סיכום כללי */}
      {summaryData.summary && (
        <div className="bg-brand-info-light border border-brand-info-light rounded-lg p-4">
          <h4 className="font-medium text-brand-primary-dark mb-2">📊 סיכום מגמות</h4>
          <p className="text-brand-primary-dark text-sm leading-relaxed">{summaryData.summary}</p>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* נקודות לשיפור */}
        <div className="space-y-4">
          <div className="flex items-center">
            <TrendingUp className="w-5 h-5 text-orange-600 ml-2" />
            <h4 className="font-semibold text-gray-800">🎯 נקודות לשיפור</h4>
          </div>
          
          <div className="space-y-3">
            {summaryData.improvement_points && summaryData.improvement_points.length > 0 ? (
              summaryData.improvement_points.map((point, index) => (
                <div key={index} className="bg-orange-50 border border-orange-200 rounded-lg p-4">
                  <div className="flex items-start">
                    <Target className="w-4 h-4 text-orange-600 ml-2 mt-0.5 flex-shrink-0" />
                    <p className="text-sm text-gray-700 leading-relaxed">{point}</p>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-4 text-gray-500">
                <CheckCircle className="w-8 h-8 mx-auto mb-2 text-green-500" />
                <p className="text-sm">אין נקודות שיפור זמינות</p>
              </div>
            )}
          </div>
        </div>

        {/* נקודות לשימור */}
        <div className="space-y-4">
          <div className="flex items-center">
            <Star className="w-5 h-5 text-green-600 ml-2" />
            <h4 className="font-semibold text-gray-800">💪 נקודות לשימור</h4>
          </div>
          
          <div className="space-y-3">
            {summaryData.preservation_points && summaryData.preservation_points.length > 0 ? (
              summaryData.preservation_points.map((point, index) => (
                <div key={index} className="bg-brand-success-light border border-brand-success-light rounded-lg p-4">
                  <div className="flex items-start">
                    <Star className="w-4 h-4 text-green-600 ml-2 mt-0.5 flex-shrink-0" />
                    <p className="text-sm text-gray-700 leading-relaxed">{point}</p>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-4 text-gray-500">
                <AlertCircle className="w-8 h-8 mx-auto mb-2 text-gray-400" />
                <p className="text-sm">אין נקודות חוזק זמינות</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* מידע נוסף */}
      <div className="border-t pt-4">
        <div className="flex items-center justify-between text-sm text-gray-600">
          <span>תקופת ניתוח: {summaryData.analysis_period}</span>
          <span className="flex items-center">
            <div className="w-2 h-2 bg-green-500 rounded-full ml-2"></div>
            עודכן כעת
          </span>
        </div>
      </div>
    </div>
  )
} 