'use client'

import React, { useState, useEffect } from 'react'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { Database } from '@/types/database.types'

type Company = Database['public']['Tables']['companies']['Row']
type UserQuota = Database['public']['Tables']['company_user_quotas']['Row']

interface CompanyWithQuota extends Company {
  company_user_quotas?: UserQuota
  user_count?: number
}

interface CompanyQuotaManagementProps {
  adminId: string
}

export default function CompanyQuotaManagement({ adminId }: CompanyQuotaManagementProps) {
  const [companies, setCompanies] = useState<CompanyWithQuota[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [editingCompany, setEditingCompany] = useState<string | null>(null)
  const [newQuota, setNewQuota] = useState<number>(0)
  const [updating, setUpdating] = useState(false)
  const [showSuccessNotification, setShowSuccessNotification] = useState<string | null>(null)

  const supabase = createClientComponentClient<Database>()

  useEffect(() => {
    fetchCompanies()
  }, [])

  const fetchCompanies = async () => {
    try {
      setLoading(true)

      // קבלת כל החברות עם נתוני המכסה ומספר המשתמשים
      const { data: companiesData, error } = await supabase
        .from('companies')
        .select(`
          *,
          company_user_quotas(*),
          users(count)
        `)
        .order('name')

      if (error) throw error

      // עיבוד הנתונים
      const processedCompanies = companiesData?.map(company => ({
        ...company,
        company_user_quotas: Array.isArray(company.company_user_quotas) 
          ? company.company_user_quotas[0] 
          : company.company_user_quotas,
        user_count: Array.isArray(company.users) 
          ? company.users.length 
          : 0
      })) || []

      setCompanies(processedCompanies)
    } catch (error) {
      console.error('Error fetching companies:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleUpdateQuota = async (companyId: string) => {
    if (!newQuota || newQuota < 1) {
      alert('יש להזין מספר משתמשים תקין (1 או יותר)')
      return
    }

    setUpdating(true)

    try {
      const response = await fetch('/api/admin/update-user-quota', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          companyId: companyId,
          totalUsers: newQuota,
          adminId: adminId
        })
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'שגיאה בעדכון המכסה')
      }

      setShowSuccessNotification(result.message)
      setEditingCompany(null)
      setNewQuota(0)
      await fetchCompanies()

      setTimeout(() => setShowSuccessNotification(null), 5000)

    } catch (error) {
      console.error('Error updating quota:', error)
      alert('שגיאה בעדכון המכסה: ' + (error as Error).message)
    } finally {
      setUpdating(false)
    }
  }

  const startEditing = (company: CompanyWithQuota) => {
    setEditingCompany(company.id)
    setNewQuota(company.company_user_quotas?.total_users || 5)
  }

  const cancelEditing = () => {
    setEditingCompany(null)
    setNewQuota(0)
  }

  const filteredCompanies = companies.filter(company =>
    company.name.toLowerCase().includes(searchTerm.toLowerCase())
  )

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* הודעת הצלחה */}
      {showSuccessNotification && (
        <div className="fixed top-4 left-4 right-4 bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded-lg shadow-lg z-50">
          <div className="flex justify-between items-center">
            <span>✅ {showSuccessNotification}</span>
            <button 
              onClick={() => setShowSuccessNotification(null)}
              className="text-green-700 hover:text-green-900"
            >
              ✕
            </button>
          </div>
        </div>
      )}

      {/* כותרת וחיפוש */}
      <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-6">
        <h2 className="text-xl font-semibold text-gray-800 mb-4">ניהול מכסות משתמשים</h2>
        
        <div className="flex flex-col md:flex-row gap-4 mb-6">
          <div className="flex-1">
            <input
              type="text"
              placeholder="חיפוש חברה..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
        </div>

        {/* טבלת חברות */}
        {filteredCompanies.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">שם החברה</th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">משתמשים נוכחיים</th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">מכסה מותרת</th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">זמינים</th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">סטטוס</th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">פעולות</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredCompanies.map((company) => {
                  const quota = company.company_user_quotas
                  const isEditing = editingCompany === company.id
                  const usedUsers = quota?.used_users || 0
                  const totalUsers = quota?.total_users || 5
                  const availableUsers = totalUsers - usedUsers
                  const isOverQuota = usedUsers > totalUsers

                  return (
                    <tr key={company.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {company.name}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-center text-sm text-gray-900">
                        {usedUsers}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-center text-sm text-gray-900">
                        {isEditing ? (
                          <input
                            type="number"
                            min="1"
                            value={newQuota}
                            onChange={(e) => setNewQuota(parseInt(e.target.value) || 0)}
                            className="w-20 px-2 py-1 border border-gray-300 rounded text-center focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          />
                        ) : (
                          totalUsers
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-center text-sm">
                        <span className={`font-medium ${availableUsers < 0 ? 'text-red-600' : 'text-green-600'}`}>
                          {availableUsers}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-center">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          isOverQuota 
                            ? 'bg-red-100 text-red-800' 
                            : availableUsers === 0
                            ? 'bg-yellow-100 text-yellow-800'
                            : 'bg-green-100 text-green-800'
                        }`}>
                          {isOverQuota ? 'חריגה ממכסה' : availableUsers === 0 ? 'מלא' : 'תקין'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-center">
                        {isEditing ? (
                          <div className="flex justify-center space-x-2">
                            <button
                              onClick={() => handleUpdateQuota(company.id)}
                              disabled={updating}
                              className="text-green-600 hover:text-green-800 text-sm font-medium disabled:opacity-50"
                            >
                              {updating ? 'שומר...' : 'שמור'}
                            </button>
                            <button
                              onClick={cancelEditing}
                              disabled={updating}
                              className="text-gray-600 hover:text-gray-800 text-sm font-medium disabled:opacity-50"
                            >
                              ביטול
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => startEditing(company)}
                            className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                          >
                            עדכן מכסה
                          </button>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center py-8">
            <p className="text-gray-500">לא נמצאו חברות</p>
          </div>
        )}
      </div>

      {/* הסבר על המערכת */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h3 className="text-lg font-medium text-blue-800 mb-2">איך פועלת מערכת המכסות?</h3>
        <ul className="text-sm text-blue-700 space-y-1">
          <li>• כל חברה מקבלת מכסה של משתמשים (ברירת מחדל: 5)</li>
          <li>• כאשר יש מקום במכסה, מנהלים יכולים להוסיף נציגים ישירות</li>
          <li>• כאשר המכסה מלאה, הוספת נציגים דורשת אישור אדמין</li>
          <li>• ניתן להגדיל את המכסה בכל עת דרך ממשק זה</li>
        </ul>
      </div>
    </div>
  )
} 