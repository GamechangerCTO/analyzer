'use client'

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { AlertTriangle, CheckCircle, Clock, DollarSign, Zap } from 'lucide-react'

interface UsageStats {
  limits: {
    max_simulation_duration_minutes: number
    max_simulations_per_day: number
    max_simulations_per_month: number
    max_cost_per_month: number
    current_month_usage: {
      simulations_count: number
      total_cost: number
    }
    company_size: string
    budget_tier: string
  }
  usage_percentages: {
    daily: number
    monthly_simulations: number
    monthly_cost: number
  }
  remaining: {
    simulations_today: number
    simulations_month: number
    budget: number
  }
}

interface SimulationLimitsWidgetProps {
  companyId: string
  showDetails?: boolean
}

export default function SimulationLimitsWidget({ companyId, showDetails = false }: SimulationLimitsWidgetProps) {
  const [stats, setStats] = useState<UsageStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchUsageStats()
  }, [companyId])

  const fetchUsageStats = async () => {
    try {
      setLoading(true)
      const response = await fetch(`/api/simulation-limits?action=usage-stats&company_id=${companyId}`)
      const data = await response.json()
      
      if (data.success) {
        setStats(data.stats)
      } else {
        setError(data.error || 'Failed to fetch usage stats')
      }
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const getStatusColor = (percentage: number) => {
    if (percentage >= 90) return 'text-red-600 bg-red-100'
    if (percentage >= 70) return 'text-yellow-600 bg-yellow-100'
    return 'text-green-600 bg-green-100'
  }

  const getProgressColor = (percentage: number) => {
    if (percentage >= 90) return 'bg-red-500'
    if (percentage >= 70) return 'bg-yellow-500'
    return 'bg-green-500'
  }

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="animate-pulse space-y-3">
            <div className="h-4 bg-gray-200 rounded w-3/4"></div>
            <div className="h-3 bg-gray-200 rounded w-1/2"></div>
            <div className="h-2 bg-gray-200 rounded"></div>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (error || !stats) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center gap-2 text-red-600">
            <AlertTriangle className="w-4 h-4" />
            <span className="text-sm">לא ניתן לטעון נתוני שימוש</span>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center gap-2">
          <Zap className="w-5 h-5" />
          מגבלות סימולציות
        </CardTitle>
        {showDetails && (
          <CardDescription>
            חברה {stats.limits.company_size} • תקציב {stats.limits.budget_tier}
          </CardDescription>
        )}
      </CardHeader>
      <CardContent className="space-y-4">
        {/* שימוש יומי */}
        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <span className="text-sm font-medium">סימולציות היום</span>
            <Badge variant="outline" className={getStatusColor(stats.usage_percentages.daily)}>
              {stats.remaining.simulations_today} נותרו
            </Badge>
          </div>
          <div className="space-y-1">
            <Progress 
              value={stats.usage_percentages.daily} 
              className="h-2"
            />
            <div className="flex justify-between text-xs text-gray-500">
              <span>{Math.round(stats.usage_percentages.daily)}% מהמותר</span>
              <span>מקסימום: {stats.limits.max_simulations_per_day}</span>
            </div>
          </div>
        </div>

        {/* שימוש חודשי */}
        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <span className="text-sm font-medium">סימולציות החודש</span>
            <Badge variant="outline" className={getStatusColor(stats.usage_percentages.monthly_simulations)}>
              {stats.remaining.simulations_month} נותרו
            </Badge>
          </div>
          <div className="space-y-1">
            <Progress 
              value={stats.usage_percentages.monthly_simulations} 
              className="h-2"
            />
            <div className="flex justify-between text-xs text-gray-500">
              <span>{Math.round(stats.usage_percentages.monthly_simulations)}% מהמותר</span>
              <span>מקסימום: {stats.limits.max_simulations_per_month}</span>
            </div>
          </div>
        </div>

        {/* תקציב */}
        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <span className="text-sm font-medium">תקציב החודש</span>
            <Badge variant="outline" className={getStatusColor(stats.usage_percentages.monthly_cost)}>
              ${stats.remaining.budget.toFixed(2)} נותרו
            </Badge>
          </div>
          <div className="space-y-1">
            <Progress 
              value={stats.usage_percentages.monthly_cost} 
              className="h-2"
            />
            <div className="flex justify-between text-xs text-gray-500">
              <span>{Math.round(stats.usage_percentages.monthly_cost)}% מהתקציב</span>
              <span>מקסימום: ${stats.limits.max_cost_per_month}</span>
            </div>
          </div>
        </div>

        {showDetails && (
          <div className="pt-3 border-t space-y-2">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-gray-500" />
                <span>מקסימום: {stats.limits.max_simulation_duration_minutes} דקות</span>
              </div>
              <div className="flex items-center gap-2">
                <DollarSign className="w-4 h-4 text-gray-500" />
                <span>נוצל: ${stats.limits.current_month_usage.total_cost.toFixed(2)}</span>
              </div>
            </div>
          </div>
        )}

        {/* אזהרות */}
        {(stats.usage_percentages.monthly_cost >= 80 || stats.usage_percentages.monthly_simulations >= 80) && (
          <div className="pt-3 border-t">
            <div className="flex items-start gap-2 p-3 bg-yellow-50 rounded-lg border border-yellow-200">
              <AlertTriangle className="w-4 h-4 text-yellow-600 mt-0.5" />
              <div className="text-sm">
                <div className="font-medium text-yellow-800">אזהרת שימוש</div>
                <div className="text-yellow-700">
                  {stats.usage_percentages.monthly_cost >= 80 && 'התקציב החודשי מתקרב לסיום. '}
                  {stats.usage_percentages.monthly_simulations >= 80 && 'מכסת הסימולציות מתקרבת לסיום.'}
                </div>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}



