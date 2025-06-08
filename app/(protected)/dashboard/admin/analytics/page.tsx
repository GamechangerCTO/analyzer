'use client'

import React, { useEffect, useState } from 'react'
import Link from 'next/link'
import { 
  ArrowLeft, 
  RefreshCw, 
  Calendar, 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  Activity, 
  Zap, 
  Clock,
  BarChart3,
  PieChart,
  AlertCircle,
  CheckCircle
} from 'lucide-react'
import {
  DailyCostChart,
  DailyUsageChart,
  ModelBreakdownChart,
  CostBreakdownChart,
  RequestsTimelineChart
} from '@/components/ui/analytics-charts'

interface AnalyticsData {
  summary: {
    totalCosts: number
    totalRequests: number
    totalInputTokens: number
    totalOutputTokens: number
    totalAudioInputTokens: number
    totalAudioOutputTokens: number
    totalCachedTokens: number
    averageDailyCost: number
    averageRequestCost: number
    tokensPerRequest: number
  }
  trends: {
    costTrend: number
    requestsTrend: number
  }
  modelBreakdown: Array<{
    model: string
    requests: number
    inputTokens: number
    outputTokens: number
    totalTokens: number
    audioInputTokens: number
    audioOutputTokens: number
  }>
  costBreakdown: Array<{
    lineItem: string
    totalCost: number
    currency: string
  }>
  dailyBreakdown: Array<{
    date: string
    costs: number
    requests: number
    inputTokens: number
    outputTokens: number
    totalTokens: number
  }>
  insights: {
    mostExpensiveDay: { date: string; costs: number }
    mostActiveDay: { date: string; requests: number }
    topModel: { model: string; requests: number }
    efficiency: {
      cachedTokensRatio: number
      audioUsageRatio: number
    }
  }
  metadata: {
    dataPoints: number
    periodDays: number
    lastUpdated: string
    currency: string
    source?: string
    dataType?: string
  }
}

export default function AnalyticsPage() {
  const [analyticsData, setAnalyticsData] = useState<AnalyticsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [days, setDays] = useState(30)
  const [refreshing, setRefreshing] = useState(false)

  useEffect(() => {
    fetchAnalyticsData()
  }, [days])

  const fetchAnalyticsData = async (refresh = false) => {
    try {
      if (refresh) setRefreshing(true)
      else setLoading(true)
      
      setError(null)

      const url = `/api/admin/analytics?days=${days}${refresh ? '&refresh=true' : ''}`
      const response = await fetch(url)
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }

      const result = await response.json()
      
      if (!result.success) {
        throw new Error(result.message || 'Failed to fetch analytics data')
      }

      setAnalyticsData(result.data)

    } catch (error) {
      console.error('Error fetching analytics:', error)
      setError(error instanceof Error ? error.message : 'Unknown error occurred')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  const handleRefresh = () => {
    fetchAnalyticsData(true)
  }

  const getTrendIcon = (trend: number) => {
    if (trend > 0) return <TrendingUp className="w-4 h-4 text-green-600" />
    if (trend < 0) return <TrendingDown className="w-4 h-4 text-red-600" />
    return <Activity className="w-4 h-4 text-gray-600" />
  }

  const getTrendColor = (trend: number) => {
    if (trend > 0) return 'text-green-600'
    if (trend < 0) return 'text-red-600'
    return 'text-gray-600'
  }

  const formatNumber = (num: number, decimals = 0) => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`
    return num.toFixed(decimals)
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="text-center space-y-4">
          <div className="w-16 h-16 bg-indigo-night/20 rounded-2xl flex items-center justify-center mx-auto animate-lemon-pulse">
            <BarChart3 className="w-8 h-8 text-indigo-night animate-spin" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-indigo-night">טוען נתוני אנליטיקס...</h3>
            <p className="text-indigo-night/60">שואב נתונים מ-OpenAI Platform</p>
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="space-y-8">
        <div className="flex items-center justify-between">
          <Link 
            href="/dashboard/admin" 
            className="flex items-center space-x-3 text-indigo-night hover:text-indigo-night/80 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
            <span className="font-medium">חזרה לדשבורד</span>
          </Link>
        </div>

        <div className="replayme-card p-8 text-center">
          <div className="w-16 h-16 bg-red-500/20 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <AlertCircle className="w-8 h-8 text-red-600" />
          </div>
          <h3 className="text-xl font-bold text-indigo-night mb-2">שגיאה בטעינת נתונים</h3>
          <p className="text-indigo-night/60 mb-4">{error}</p>
          <button
            onClick={() => fetchAnalyticsData()}
            className="px-6 py-3 bg-indigo-night hover:bg-indigo-night/90 text-white rounded-xl transition-colors duration-200"
          >
            נסה שוב
          </button>
        </div>
      </div>
    )
  }

  if (!analyticsData) {
    return <div>אין נתונים</div>
  }

  return (
    <div className="space-y-8">
      {/* כותרת */}
      <div className="replayme-card p-6 bg-gradient-to-l from-indigo-night to-indigo-night/80 text-white">
        <div className="flex items-center justify-between mb-4">
          <Link 
            href="/dashboard/admin" 
            className="flex items-center space-x-3 text-white/80 hover:text-white transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
            <span className="font-medium">חזרה לדשבורד</span>
          </Link>

          <div className="flex items-center space-x-4">
            <select
              value={days}
              onChange={(e) => setDays(parseInt(e.target.value))}
              className="px-4 py-2 bg-white/20 text-white rounded-lg border border-white/30 focus:outline-none focus:ring-2 focus:ring-white/50"
            >
              <option value={7}>7 ימים</option>
              <option value={30}>30 ימים</option>
              <option value={90}>90 ימים</option>
            </select>

            <button
              onClick={handleRefresh}
              disabled={refreshing}
              className="px-4 py-2 bg-white/20 hover:bg-white/30 text-white rounded-lg transition-colors duration-200 flex items-center space-x-2"
            >
              <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
              <span>רענן</span>
            </button>
          </div>
        </div>

        <div>
          <h1 className="text-display text-3xl font-bold mb-2">
            אנליטיקס OpenAI 📊
          </h1>
          <p className="text-white/80 text-lg">
            דוח מפורט על צריכת API, עלויות וביצועים
          </p>
          
          {/* הודעת מקור נתונים */}
          {analyticsData.metadata.source && (
            <div className="mt-4 flex items-center space-x-3 bg-white/10 rounded-lg px-4 py-2 w-fit">
              {analyticsData.metadata.source === 'OpenAI API' ? (
                <CheckCircle className="w-4 h-4 text-green-400" />
              ) : (
                <AlertCircle className="w-4 h-4 text-yellow-400" />
              )}
              <div className="text-sm">
                <span className="font-medium">מקור נתונים: </span>
                <span>{analyticsData.metadata.source}</span>
                {analyticsData.metadata.dataType && (
                  <>
                    <span className="mx-2">•</span>
                    <span className="text-white/80">{analyticsData.metadata.dataType}</span>
                  </>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* סטטיסטיקות עיקריות */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="replayme-card p-6 border-r-4 border-purple-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-indigo-night/60 text-sm font-medium mb-1">עלות כוללת</p>
              <p className="text-3xl font-bold text-indigo-night">
                ${analyticsData.summary.totalCosts}
              </p>
              <div className="flex items-center space-x-2 mt-1">
                {getTrendIcon(analyticsData.trends.costTrend)}
                <span className={`text-sm font-medium ${getTrendColor(analyticsData.trends.costTrend)}`}>
                  {analyticsData.trends.costTrend > 0 ? '+' : ''}{analyticsData.trends.costTrend}%
                </span>
              </div>
            </div>
            <div className="w-12 h-12 bg-purple-500/20 rounded-xl flex items-center justify-center">
              <DollarSign className="w-6 h-6 text-purple-600" />
            </div>
          </div>
        </div>

        <div className="replayme-card p-6 border-r-4 border-blue-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-indigo-night/60 text-sm font-medium mb-1">בקשות API</p>
              <p className="text-3xl font-bold text-indigo-night">
                {formatNumber(analyticsData.summary.totalRequests)}
              </p>
              <div className="flex items-center space-x-2 mt-1">
                {getTrendIcon(analyticsData.trends.requestsTrend)}
                <span className={`text-sm font-medium ${getTrendColor(analyticsData.trends.requestsTrend)}`}>
                  {analyticsData.trends.requestsTrend > 0 ? '+' : ''}{analyticsData.trends.requestsTrend}%
                </span>
              </div>
            </div>
            <div className="w-12 h-12 bg-blue-500/20 rounded-xl flex items-center justify-center">
              <Activity className="w-6 h-6 text-blue-600" />
            </div>
          </div>
        </div>

        <div className="replayme-card p-6 border-r-4 border-green-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-indigo-night/60 text-sm font-medium mb-1">סה"כ טוקנים</p>
              <p className="text-3xl font-bold text-indigo-night">
                {formatNumber(analyticsData.summary.totalInputTokens + analyticsData.summary.totalOutputTokens)}
              </p>
              <p className="text-sm text-green-600 font-medium mt-1">
                {formatNumber(analyticsData.summary.tokensPerRequest)} לבקשה
              </p>
            </div>
            <div className="w-12 h-12 bg-green-500/20 rounded-xl flex items-center justify-center">
              <Zap className="w-6 h-6 text-green-600" />
            </div>
          </div>
        </div>

        <div className="replayme-card p-6 border-r-4 border-orange-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-indigo-night/60 text-sm font-medium mb-1">עלות ממוצעת</p>
              <p className="text-3xl font-bold text-indigo-night">
                ${analyticsData.summary.averageRequestCost}
              </p>
              <p className="text-sm text-orange-600 font-medium mt-1">
                לבקשה
              </p>
            </div>
            <div className="w-12 h-12 bg-orange-500/20 rounded-xl flex items-center justify-center">
              <Clock className="w-6 h-6 text-orange-600" />
            </div>
          </div>
        </div>
      </div>

      {/* תובנות מיוחדות */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="replayme-card p-6">
          <h3 className="text-xl font-bold text-indigo-night mb-4">תובנות מרכזיות 🔍</h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
              <div>
                <p className="font-medium text-indigo-night">היום הכי פעיל</p>
                <p className="text-sm text-indigo-night/60">
                  {new Date(analyticsData.insights.mostActiveDay.date).toLocaleDateString('he-IL')}
                </p>
              </div>
              <div className="text-left">
                <p className="font-bold text-blue-600">
                  {formatNumber(analyticsData.insights.mostActiveDay.requests)}
                </p>
                <p className="text-sm text-blue-600">בקשות</p>
              </div>
            </div>

            <div className="flex items-center justify-between p-3 bg-purple-50 rounded-lg">
              <div>
                <p className="font-medium text-indigo-night">היום הכי יקר</p>
                <p className="text-sm text-indigo-night/60">
                  {new Date(analyticsData.insights.mostExpensiveDay.date).toLocaleDateString('he-IL')}
                </p>
              </div>
              <div className="text-left">
                <p className="font-bold text-purple-600">
                  ${analyticsData.insights.mostExpensiveDay.costs}
                </p>
                <p className="text-sm text-purple-600">עלות</p>
              </div>
            </div>

            <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
              <div>
                <p className="font-medium text-indigo-night">מודל מוביל</p>
                <p className="text-sm text-indigo-night/60">
                  {analyticsData.insights.topModel.model}
                </p>
              </div>
              <div className="text-left">
                <p className="font-bold text-green-600">
                  {formatNumber(analyticsData.insights.topModel.requests)}
                </p>
                <p className="text-sm text-green-600">בקשות</p>
              </div>
            </div>
          </div>
        </div>

        <div className="replayme-card p-6">
          <h3 className="text-xl font-bold text-indigo-night mb-4">יעילות מערכת ⚡</h3>
          <div className="space-y-4">
            <div>
              <div className="flex justify-between items-center mb-2">
                <span className="text-indigo-night font-medium">שימוש בטוקנים מוכנים</span>
                <span className="text-indigo-night font-bold">
                  {analyticsData.insights.efficiency.cachedTokensRatio.toFixed(1)}%
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div 
                  className="bg-blue-600 h-2 rounded-full" 
                  style={{width: `${analyticsData.insights.efficiency.cachedTokensRatio}%`}}
                ></div>
              </div>
            </div>

            <div>
              <div className="flex justify-between items-center mb-2">
                <span className="text-indigo-night font-medium">שימוש באודיו</span>
                <span className="text-indigo-night font-bold">
                  {analyticsData.insights.efficiency.audioUsageRatio.toFixed(1)}%
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div 
                  className="bg-green-600 h-2 rounded-full" 
                  style={{width: `${analyticsData.insights.efficiency.audioUsageRatio}%`}}
                ></div>
              </div>
            </div>

            <div className="flex items-center space-x-3 mt-4 p-3 bg-gray-50 rounded-lg">
              <CheckCircle className="w-5 h-5 text-green-600" />
              <div>
                <p className="text-sm font-medium text-indigo-night">
                  נתונים עדכניים
                </p>
                <p className="text-xs text-indigo-night/60">
                  עודכן: {new Date(analyticsData.metadata.lastUpdated).toLocaleString('he-IL')}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* גרפים */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="replayme-card p-6">
          <h3 className="text-xl font-bold text-indigo-night mb-4">עלויות יומיות 💰</h3>
          <DailyCostChart data={analyticsData.dailyBreakdown} />
        </div>

        <div className="replayme-card p-6">
          <h3 className="text-xl font-bold text-indigo-night mb-4">בקשות לאורך זמן 📈</h3>
          <RequestsTimelineChart data={analyticsData.dailyBreakdown} />
        </div>

        <div className="replayme-card p-6">
          <h3 className="text-xl font-bold text-indigo-night mb-4">שימוש בטוקנים 🔢</h3>
          <DailyUsageChart data={analyticsData.dailyBreakdown} />
        </div>

        <div className="replayme-card p-6">
          <h3 className="text-xl font-bold text-indigo-night mb-4">פילוח לפי מודלים 🤖</h3>
          <ModelBreakdownChart data={analyticsData.modelBreakdown} />
        </div>
      </div>

      {/* פילוח עלויות */}
      <div className="replayme-card p-6">
        <h3 className="text-xl font-bold text-indigo-night mb-4">פילוח עלויות לפי שירות 📊</h3>
        <CostBreakdownChart data={analyticsData.costBreakdown} />
      </div>

      {/* מטאדטה */}
      <div className="replayme-card p-6 bg-gray-50">
        <h3 className="text-lg font-bold text-indigo-night mb-3">פרטי הדוח</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
          <div>
            <p className="text-indigo-night/60">תקופת דוח</p>
            <p className="font-medium text-indigo-night">{analyticsData.metadata.periodDays} ימים</p>
          </div>
          <div>
            <p className="text-indigo-night/60">נקודות נתונים</p>
            <p className="font-medium text-indigo-night">{analyticsData.metadata.dataPoints}</p>
          </div>
          <div>
            <p className="text-indigo-night/60">מטבע</p>
            <p className="font-medium text-indigo-night">{analyticsData.metadata.currency}</p>
          </div>
          <div>
            <p className="text-indigo-night/60">עודכן לאחרונה</p>
            <p className="font-medium text-indigo-night">
              {new Date(analyticsData.metadata.lastUpdated).toLocaleString('he-IL')}
            </p>
          </div>
        </div>
      </div>
    </div>
  )
} 