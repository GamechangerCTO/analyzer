'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Progress } from '@/components/ui/progress'
import { Clock, AlertCircle, CheckCircle } from 'lucide-react'

interface SimulationQuota {
  total_minutes: number
  used_minutes: number
  available_minutes: number
  usage_percentage: number
}

interface SimulationMinutesWidgetProps {
  companyId?: string
  showDetails?: boolean
}

export default function SimulationMinutesWidget({ 
  companyId, 
  showDetails = true 
}: SimulationMinutesWidgetProps) {
  const [quota, setQuota] = useState<SimulationQuota | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    loadQuota()
  }, [companyId])

  const loadQuota = async () => {
    try {
      setLoading(true)
      setError(null)
      
      const supabase = createClient()
      
      // אם לא סיפקו company_id, נקבל מהמשתמש
      let targetCompanyId = companyId
      if (!targetCompanyId) {
        const { data: userData } = await supabase
          .from('users')
          .select('company_id')
          .single()
        
        targetCompanyId = userData?.company_id
      }
      
      if (!targetCompanyId) {
        throw new Error('לא נמצא מזהה חברה')
      }
      
      // שליפת מכסת הדקות
      const { data, error: quotaError } = await supabase
        .rpc('get_simulation_minutes_quota', {
          p_company_id: targetCompanyId
        })
        .single()
      
      if (quotaError) {
        throw quotaError
      }
      
      setQuota(data as SimulationQuota)
    } catch (err) {
      console.error('Error loading simulation quota:', err)
      setError(err instanceof Error ? err.message : 'שגיאה בטעינת מכסת דקות')
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow p-4 animate-pulse">
        <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
        <div className="h-2 bg-gray-200 rounded w-full"></div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <div className="flex items-center gap-2 text-red-700">
          <AlertCircle className="w-5 h-5" />
          <span className="text-sm">{error}</span>
        </div>
      </div>
    )
  }

  if (!quota) {
    return null
  }

  const usagePercent = quota.usage_percentage || 0
  const isLowQuota = usagePercent > 80
  const isCriticalQuota = usagePercent > 90

  return (
    <div className={`bg-white rounded-lg shadow-lg p-4 border-r-4 ${
      isCriticalQuota ? 'border-red-500' : 
      isLowQuota ? 'border-orange-500' : 
      'border-green-500'
    }`}>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Clock className={`w-5 h-5 ${
            isCriticalQuota ? 'text-red-600' : 
            isLowQuota ? 'text-orange-600' : 
            'text-green-600'
          }`} />
          <h3 className="font-semibold text-gray-800">דקות סימולציה</h3>
        </div>
        
        {usagePercent < 50 && (
          <CheckCircle className="w-5 h-5 text-green-500" />
        )}
        {usagePercent >= 50 && usagePercent < 80 && (
          <AlertCircle className="w-5 h-5 text-yellow-500" />
        )}
        {isLowQuota && (
          <AlertCircle className={`w-5 h-5 ${
            isCriticalQuota ? 'text-red-500' : 'text-orange-500'
          }`} />
        )}
      </div>

      <div className="space-y-2">
        <div className="flex justify-between text-sm">
          <span className="text-gray-600">שימוש החודש:</span>
          <span className="font-bold">
            {quota.used_minutes} / {quota.total_minutes} דק'
          </span>
        </div>

        <Progress value={usagePercent} className="h-2" />

        <div className="flex justify-between items-center text-sm">
          <span className={`font-medium ${
            isCriticalQuota ? 'text-red-600' : 
            isLowQuota ? 'text-orange-600' : 
            'text-green-600'
          }`}>
            נותרו: {quota.available_minutes} דק'
          </span>
          <span className="text-gray-500">
            {usagePercent.toFixed(1)}%
          </span>
        </div>

        {showDetails && (
          <>
            {isCriticalQuota && (
              <div className="mt-3 p-2 bg-red-50 border border-red-200 rounded text-xs text-red-700">
                ⚠️ מכסת הדקות כמעט אזלה! פנה למנהל להגדלת המכסה.
              </div>
            )}
            {isLowQuota && !isCriticalQuota && (
              <div className="mt-3 p-2 bg-orange-50 border border-orange-200 rounded text-xs text-orange-700">
                💡 מכסת הדקות מתקרבת לסיום. שקול להגדיל את המכסה.
              </div>
            )}
            {!isLowQuota && quota.available_minutes > 60 && (
              <div className="mt-3 p-2 bg-brand-success-light border border-brand-success-light rounded text-xs text-brand-success-dark flex items-center gap-1">
                <CheckCircle className="w-4 h-4" />
                <span>מכסה מספקת לסימולציות רבות!</span>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}

