'use client'

import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'

export interface DashboardStats {
  totalAgents: number
  totalCalls: number
  avgScore: number
  successfulCalls: number
  pendingCalls: number
}

export interface MinutesQuota {
  total_minutes: number
  used_minutes: number
  available_minutes: number
  is_poc: boolean
  can_purchase_additional: boolean
  usage_percentage: number
}

export interface AgentPerformance {
  id: string
  name: string
  totalCalls: number
  avgScore: number
  successfulCalls: number
  trend: 'up' | 'down' | 'stable'
}

export interface ManagerInfo {
  full_name: string | null
  email: string | null
}

export interface UseManagerDataProps {
  userId: string
  companyId: string | null
}

export interface UseManagerDataReturn {
  loading: boolean
  stats: DashboardStats
  topAgents: AgentPerformance[]
  allAgents: AgentPerformance[]
  managerInfo: ManagerInfo | null
  minutesQuota: MinutesQuota | null
  quotaLoading: boolean
  refreshData: () => void
}

export function useManagerData({ userId, companyId }: UseManagerDataProps): UseManagerDataReturn {
  const supabase = createClient()
  
  const [loading, setLoading] = useState(true)
  const [quotaLoading, setQuotaLoading] = useState(true)
  const [stats, setStats] = useState<DashboardStats>({
    totalAgents: 0,
    totalCalls: 0,
    avgScore: 0,
    successfulCalls: 0,
    pendingCalls: 0
  })
  const [topAgents, setTopAgents] = useState<AgentPerformance[]>([])
  const [allAgents, setAllAgents] = useState<AgentPerformance[]>([])
  const [managerInfo, setManagerInfo] = useState<ManagerInfo | null>(null)
  const [minutesQuota, setMinutesQuota] = useState<MinutesQuota | null>(null)

  const fetchData = useCallback(async () => {
    if (!companyId) return

    try {
      setLoading(true)

      // שליפת פרטי המנהל
      const { data: userData } = await supabase
        .from('users')
        .select('full_name, email')
        .eq('id', userId)
        .single()
      
      setManagerInfo(userData)

      // שליפת כל הנציגים בחברה
      const { data: agentsData } = await supabase
        .from('users')
        .select('id, full_name')
        .eq('company_id', companyId)
        .eq('role', 'agent')

      if (!agentsData) return

      // שליפת שיחות של כל הנציגים
      const agentIds = agentsData.map(agent => agent.id)
      const { data: callsData } = await supabase
        .from('calls')
        .select('id, user_id, overall_score, processing_status, created_at')
        .in('user_id', agentIds)
        .order('created_at', { ascending: false })

      // חישוב סטטיסטיקות כלליות
      const totalCalls = callsData?.length || 0
      const completedCalls = callsData?.filter(call => call.overall_score !== null) || []
      const avgScore = completedCalls.length > 0
        ? completedCalls.reduce((sum, call) => sum + (call.overall_score || 0), 0) / completedCalls.length
        : 0
      const successfulCalls = completedCalls.filter(call => (call.overall_score || 0) >= 8).length
      const pendingCalls = callsData?.filter(call => call.processing_status === 'pending')?.length || 0

      setStats({
        totalAgents: agentsData.length,
        totalCalls,
        avgScore,
        successfulCalls,
        pendingCalls
      })

      // חישוב ביצועי נציגים
      const agentPerformances: AgentPerformance[] = agentsData.map(agent => {
        const agentCalls = callsData?.filter(call => call.user_id === agent.id) || []
        const agentCompletedCalls = agentCalls.filter(call => call.overall_score !== null)
        const agentAvgScore = agentCompletedCalls.length > 0
          ? agentCompletedCalls.reduce((sum, call) => sum + (call.overall_score || 0), 0) / agentCompletedCalls.length
          : 0
        const agentSuccessfulCalls = agentCompletedCalls.filter(call => (call.overall_score || 0) >= 8).length

        return {
          id: agent.id,
          name: agent.full_name || 'נציג',
          totalCalls: agentCalls.length,
          avgScore: agentAvgScore,
          successfulCalls: agentSuccessfulCalls,
          trend: 'stable' as const // ניתן להוסיף לוגיקה מתקדמת יותר
        }
      })

      // מיון לפי ביצועים
      const sortedAgents = agentPerformances.sort((a, b) => {
        if (b.avgScore !== a.avgScore) return b.avgScore - a.avgScore
        return b.totalCalls - a.totalCalls
      })

      setTopAgents(sortedAgents.slice(0, 5))
      setAllAgents(sortedAgents)

    } catch (error) {
      console.error('Error fetching manager dashboard data:', error)
    } finally {
      setLoading(false)
    }
  }, [supabase, userId, companyId])

  const fetchQuota = useCallback(async () => {
    if (!companyId) return

    try {
      setQuotaLoading(true)
      
      // שליפת מכסת דקות ישירות
      const { data: quotaData } = await supabase
        .from('company_minutes_quotas')
        .select('*')
        .eq('company_id', companyId)
        .single()

      if (quotaData) {
        const quota: MinutesQuota = {
          total_minutes: quotaData.total_minutes,
          used_minutes: quotaData.used_minutes,
          available_minutes: quotaData.available_minutes ?? 0,
          is_poc: quotaData.is_poc,
          can_purchase_additional: quotaData.can_purchase_additional ?? false,
          usage_percentage: quotaData.total_minutes > 0 ? (quotaData.used_minutes / quotaData.total_minutes) * 100 : 0
        }
        setMinutesQuota(quota)
      }
    } catch (error) {
      console.error('Error fetching quota:', error)
    } finally {
      setQuotaLoading(false)
    }
  }, [supabase, companyId])

  useEffect(() => {
    fetchData()
    fetchQuota()
  }, [fetchData, fetchQuota])

  const refreshData = useCallback(() => {
    fetchData()
    fetchQuota()
  }, [fetchData, fetchQuota])

  return {
    loading,
    stats,
    topAgents,
    allAgents,
    managerInfo,
    minutesQuota,
    quotaLoading,
    refreshData
  }
} 