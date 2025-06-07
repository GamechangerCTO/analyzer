'use client'

import React, { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

interface CompanyQuota {
  id: string
  company_id: string
  company_name: string
  total_users: number
  used_users: number
  available_users: number
  created_at: string
  updated_at: string
}

interface CompanyQuotaManagementProps {
  adminId: string
}

export default function CompanyQuotaManagement({ adminId }: CompanyQuotaManagementProps) {
  const [quotas, setQuotas] = useState<CompanyQuota[]>([])
  const [loading, setLoading] = useState(true)
  const [editingQuota, setEditingQuota] = useState<string | null>(null)
  const [newQuotaValue, setNewQuotaValue] = useState<number>(0)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  // סטטיסטיקות
  const [stats, setStats] = useState({
    totalCompanies: 0,
    totalQuotaUsers: 0,
    totalUsedUsers: 0,
    totalAvailableUsers: 0,
    companiesNearLimit: 0,
    companiesAtLimit: 0
  })

  useEffect(() => {
    fetchQuotas()
  }, [])

  useEffect(() => {
    // חישוב סטטיסטיקות
    const totalCompanies = quotas.length
    const totalQuotaUsers = quotas.reduce((sum, q) => sum + q.total_users, 0)
    const totalUsedUsers = quotas.reduce((sum, q) => sum + q.used_users, 0)
    const totalAvailableUsers = quotas.reduce((sum, q) => sum + q.available_users, 0)
    const companiesNearLimit = quotas.filter(q => q.available_users <= 1 && q.available_users > 0).length
    const companiesAtLimit = quotas.filter(q => q.available_users === 0).length

    setStats({
      totalCompanies,
      totalQuotaUsers,
      totalUsedUsers,
      totalAvailableUsers,
      companiesNearLimit,
      companiesAtLimit
    })
  }, [quotas])

  const fetchQuotas = async () => {
    try {
      setLoading(true)
      setError(null)
      const supabase = createClient()

      const { data, error } = await supabase
        .from('company_user_quotas')
        .select(`
          *,
          companies!inner(name)
        `)
        .order('updated_at', { ascending: false })

      if (error) throw error

      const formattedQuotas = data.map((quota: any) => ({
        id: quota.id,
        company_id: quota.company_id,
        company_name: quota.companies.name,
        total_users: quota.total_users,
        used_users: quota.used_users,
        available_users: quota.available_users,
        created_at: quota.created_at,
        updated_at: quota.updated_at
      }))

      setQuotas(formattedQuotas)
    } catch (error) {
      console.error('שגיאה בטעינת מכסות:', error)
      setError('שגיאה בטעינת מכסות החברות')
    } finally {
      setLoading(false)
    }
  }

  const updateQuota = async (quotaId: string, newTotal: number) => {
    try {
      setError(null)
      setSuccess(null)
      
      const response = await fetch('/api/admin/update-user-quota', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          quotaId,
          newTotal,
          adminId
        }),
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'שגיאה בעדכון המכסה')
      }

      setSuccess(`המכסה עודכנה בהצלחה ל-${newTotal} משתמשים`)
      await fetchQuotas() // רענון הנתונים
      setEditingQuota(null)
    } catch (error) {
      console.error('שגיאה בעדכון מכסה:', error)
      setError(error instanceof Error ? error.message : 'שגיאה בעדכון המכסה')
    }
  }

  const getStatusColor = (quota: CompanyQuota) => {
    if (quota.available_users === 0) return 'text-red-600 bg-red-50'
    if (quota.available_users <= 1) return 'text-orange-600 bg-orange-50'
    return 'text-green-600 bg-green-50'
  }

  const getStatusText = (quota: CompanyQuota) => {
    if (quota.available_users === 0) return 'מלא'
    if (quota.available_users <= 1) return 'כמעט מלא'
    return 'זמין'
  }

  const getUsagePercentage = (quota: CompanyQuota) => {
    return Math.round((quota.used_users / quota.total_users) * 100)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      {/* סטטיסטיקות כלליות */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4">
        <div className="bg-white p-4 rounded-lg shadow border">
          <h3 className="text-sm font-medium text-gray-500 mb-1">חברות כ</h3>
          <p className="text-2xl font-bold text-blue-600">{stats.totalCompanies}</p>
        </div>
        
        <div className="bg-white p-4 rounded-lg shadow border">
          <h3 className="text-sm font-medium text-gray-500 mb-1">סך מכסת משתמשים</h3>
          <p className="text-2xl font-bold text-green-600">{stats.totalQuotaUsers}</p>
        </div>
        
        <div className="bg-white p-4 rounded-lg shadow border">
          <h3 className="text-sm font-medium text-gray-500 mb-1">משתמשים בשימוש</h3>
          <p className="text-2xl font-bold text-purple-600">{stats.totalUsedUsers}</p>
        </div>
        
        <div className="bg-white p-4 rounded-lg shadow border">
          <h3 className="text-sm font-medium text-gray-500 mb-1">משתמשים זמינים</h3>
          <p className="text-2xl font-bold text-indigo-600">{stats.totalAvailableUsers}</p>
        </div>
        
        <div className="bg-white p-4 rounded-lg shadow border">
          <h3 className="text-sm font-medium text-gray-500 mb-1">כמעט מלאות</h3>
          <p className="text-2xl font-bold text-orange-600">{stats.companiesNearLimit}</p>
        </div>
        
        <div className="bg-white p-4 rounded-lg shadow border">
          <h3 className="text-sm font-medium text-gray-500 mb-1">מלאות</h3>
          <p className="text-2xl font-bold text-red-600">{stats.companiesAtLimit}</p>
        </div>
      </div>

      {/* הודעות */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-800">{error}</p>
        </div>
      )}

      {success && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <p className="text-green-800">{success}</p>
        </div>
      )}

      {/* כותרת ופעולות */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">מכסות משתמשים לחברות</h2>
          <p className="text-gray-600 mt-1">נהל את מכסות המשתמשים עבור כל החברות במערכת</p>
        </div>
        <button
          onClick={fetchQuotas}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          🔄 רענן נתונים
        </button>
      </div>

      {/* טבלת מכסות */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  חברה
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  מכסה כוללת
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  משתמשים בשימוש
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  משתמשים זמינים
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  אחוז שימוש
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  סטטוס
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  פעולות
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {quotas.map((quota) => (
                <tr key={quota.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">
                      {quota.company_name}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {editingQuota === quota.id ? (
                      <div className="flex items-center space-x-2">
                        <input
                          type="number"
                          min="1"
                          max="100"
                          value={newQuotaValue}
                          onChange={(e) => setNewQuotaValue(parseInt(e.target.value) || 0)}
                          className="w-20 px-2 py-1 border border-gray-300 rounded text-sm"
                        />
                        <button
                          onClick={() => updateQuota(quota.id, newQuotaValue)}
                          className="px-2 py-1 bg-green-600 text-white text-xs rounded hover:bg-green-700"
                        >
                          שמור
                        </button>
                        <button
                          onClick={() => setEditingQuota(null)}
                          className="px-2 py-1 bg-gray-400 text-white text-xs rounded hover:bg-gray-500"
                        >
                          ביטול
                        </button>
                      </div>
                    ) : (
                      <div className="text-sm text-gray-900">{quota.total_users}</div>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">{quota.used_users}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">{quota.available_users}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="text-sm text-gray-900 mr-2">
                        {getUsagePercentage(quota)}%
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                          className={`h-2 rounded-full ${
                            getUsagePercentage(quota) >= 100 ? 'bg-red-500' :
                            getUsagePercentage(quota) >= 80 ? 'bg-orange-500' : 'bg-green-500'
                          }`}
                          style={{ width: `${Math.min(getUsagePercentage(quota), 100)}%` }}
                        ></div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(quota)}`}>
                      {getStatusText(quota)}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    {editingQuota !== quota.id && (
                      <button
                        onClick={() => {
                          setEditingQuota(quota.id)
                          setNewQuotaValue(quota.total_users)
                        }}
                        className="text-blue-600 hover:text-blue-900"
                      >
                        ערוך מכסה
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {quotas.length === 0 && (
        <div className="text-center py-12">
          <p className="text-gray-500">לא נמצאו מכסות משתמשים</p>
        </div>
      )}
    </div>
  )
} 