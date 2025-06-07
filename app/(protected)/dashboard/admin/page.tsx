'use client'

import React, { useEffect, useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

interface AdminStats {
  totalUsers: number
  pendingUsers: number
  approvedUsers: number
  totalCompanies: number
  totalAgentRequests: number
  pendingAgentRequests: number
  approvedAgentRequests: number
  rejectedAgentRequests: number
}

export default function AdminDashboardPage() {
  const [stats, setStats] = useState<AdminStats>({
    totalUsers: 0,
    pendingUsers: 0,
    approvedUsers: 0,
    totalCompanies: 0,
    totalAgentRequests: 0,
    pendingAgentRequests: 0,
    approvedAgentRequests: 0,
    rejectedAgentRequests: 0
  })
  const [loading, setLoading] = useState(true)
  const [showUrgentAlert, setShowUrgentAlert] = useState(false)

  useEffect(() => {
    fetchAdminStats()
  }, [])

  useEffect(() => {
    // הצגת התראה דחופה אם יש בקשות ממתינות
    if (stats.pendingAgentRequests > 0 || stats.pendingUsers > 0) {
      setShowUrgentAlert(true)
    }
  }, [stats])

  const fetchAdminStats = async () => {
    try {
      setLoading(true)
      const supabase = createClient()

      // סטטיסטיקות משתמשים
      const { data: allUsers, error: usersError } = await supabase
        .from('users')
        .select('id, is_approved')
      
      if (usersError) throw usersError

      const totalUsers = allUsers?.length || 0
      const pendingUsers = allUsers?.filter(u => !u.is_approved).length || 0
      const approvedUsers = allUsers?.filter(u => u.is_approved).length || 0

      // סטטיסטיקות חברות
      const { data: allCompanies, error: companiesError } = await supabase
        .from('companies')
        .select('id')
      
      if (companiesError) throw companiesError

      const totalCompanies = allCompanies?.length || 0

      // סטטיסטיקות בקשות נציגים
      const { data: allRequests, error: requestsError } = await supabase
        .from('agent_approval_requests')
        .select('id, status')
      
      if (requestsError) throw requestsError

      const totalAgentRequests = allRequests?.length || 0
      const pendingAgentRequests = allRequests?.filter(r => r.status === 'pending').length || 0
      const approvedAgentRequests = allRequests?.filter(r => r.status === 'approved').length || 0
      const rejectedAgentRequests = allRequests?.filter(r => r.status === 'rejected').length || 0

      setStats({
        totalUsers,
        pendingUsers,
        approvedUsers,
        totalCompanies,
        totalAgentRequests,
        pendingAgentRequests,
        approvedAgentRequests,
        rejectedAgentRequests
      })

    } catch (error) {
      console.error('שגיאה בטעינת סטטיסטיקות:', error)
    } finally {
      setLoading(false)
    }
  }

  const getTotalPendingItems = () => {
    return stats.pendingUsers + stats.pendingAgentRequests
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    )
  }

  return (
    <div className="container mx-auto p-6 space-y-8">
      {/* התראה דחופה */}
      {showUrgentAlert && getTotalPendingItems() > 0 && (
        <div className="bg-red-50 border-r-4 border-red-400 p-4 rounded-lg shadow-lg">
          <div className="flex justify-between items-start">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-red-400" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="mr-3">
                <h3 className="text-sm font-medium text-red-800">
                  🚨 יש לך {getTotalPendingItems()} פריטים הממתינים לטיפול דחוף!
                </h3>
                <div className="mt-2 text-sm text-red-700">
                  <ul className="list-disc list-inside space-y-1">
                    {stats.pendingAgentRequests > 0 && (
                      <li>
                        <Link href="/dashboard/admin/agent-requests" className="underline hover:text-red-900">
                          {stats.pendingAgentRequests} בקשות נציגים ממתינות לאישור
                        </Link>
                      </li>
                    )}
                    {stats.pendingUsers > 0 && (
                      <li>
                        <Link href="/dashboard/admin/users" className="underline hover:text-red-900">
                          {stats.pendingUsers} משתמשים ממתינים לאישור
                        </Link>
                      </li>
                    )}
                  </ul>
                </div>
              </div>
            </div>
            <button
              onClick={() => setShowUrgentAlert(false)}
              className="text-red-400 hover:text-red-600"
            >
              <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
              </svg>
            </button>
          </div>
        </div>
      )}

      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-gray-800">לוח בקרה למנהל מערכת</h1>
        <button 
          onClick={fetchAdminStats}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          🔄 רענן נתונים
        </button>
      </div>

      {/* סטטיסטיקות כלליות */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-xl shadow-lg border border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-gray-800 mb-1">משתמשים</h3>
              <p className="text-3xl font-bold text-blue-600">{stats.totalUsers}</p>
              <p className="text-sm text-gray-500">
                {stats.approvedUsers} מאושרים • {stats.pendingUsers} ממתינים
              </p>
            </div>
            <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
              <svg className="w-6 h-6 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                <path d="M13 6a3 3 0 11-6 0 3 3 0 016 0zM18 8a2 2 0 11-4 0 2 2 0 014 0zM14 15a4 4 0 00-8 0v3h8v-3z" />
              </svg>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-lg border border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-gray-800 mb-1">חברות</h3>
              <p className="text-3xl font-bold text-green-600">{stats.totalCompanies}</p>
              <p className="text-sm text-gray-500">
                חברות רשומות במערכת
              </p>
            </div>
            <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
              <svg className="w-6 h-6 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M4 4a2 2 0 00-2 2v8a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2H4zm12 12H4l4-8 3 6 2-4 3 6z" clipRule="evenodd" />
              </svg>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-lg border border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-gray-800 mb-1">בקשות נציגים</h3>
              <p className="text-3xl font-bold text-orange-600">{stats.totalAgentRequests}</p>
              <p className="text-sm text-gray-500">
                {stats.pendingAgentRequests} ממתינות • {stats.approvedAgentRequests} אושרו
              </p>
            </div>
            <div className="w-12 h-12 bg-orange-100 rounded-full flex items-center justify-center">
              <svg className="w-6 h-6 text-orange-600" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-6-3a2 2 0 11-4 0 2 2 0 014 0zm-2 4a5 5 0 00-4.546 2.916A5.986 5.986 0 0010 16a5.986 5.986 0 004.546-2.084A5 5 0 0010 11z" clipRule="evenodd" />
              </svg>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-lg border border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-gray-800 mb-1">פריטים ממתינים</h3>
              <p className="text-3xl font-bold text-red-600">{getTotalPendingItems()}</p>
              <p className="text-sm text-gray-500">דורשים טיפול דחוף</p>
            </div>
            <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
              <svg className="w-6 h-6 text-red-600" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
              </svg>
            </div>
          </div>
        </div>
      </div>

      {/* תפריט ניהול */}
      <div>
        <h2 className="text-2xl font-bold text-gray-800 mb-6">תפריט ניהול</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <Link href="/dashboard/admin/users" className={`block p-6 rounded-lg shadow-md hover:shadow-lg transition-all duration-200 ${
            stats.pendingUsers > 0 ? 'bg-yellow-50 border-2 border-yellow-300 ring-2 ring-yellow-200' : 'bg-white'
          }`}>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-xl font-semibold">ניהול משתמשים</h3>
              {stats.pendingUsers > 0 && (
                <span className="px-3 py-1 bg-yellow-500 text-white text-sm font-bold rounded-full animate-pulse">
                  {stats.pendingUsers}
                </span>
              )}
            </div>
            <p className="text-gray-600 mb-4">הוספה, עריכה ומחיקה של משתמשים במערכת</p>
            <div className="text-sm text-gray-500">
              <div>סה"כ: {stats.totalUsers} משתמשים</div>
              <div>מאושרים: {stats.approvedUsers}</div>
              {stats.pendingUsers > 0 && (
                <div className="text-yellow-600 font-medium">⚠️ ממתינים לאישור: {stats.pendingUsers}</div>
              )}
            </div>
          </Link>

          <Link href="/dashboard/admin/companies" className="block p-6 bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow">
            <h3 className="text-xl font-semibold mb-2">ניהול חברות</h3>
            <p className="text-gray-600 mb-4">הוספה, עריכה ומחיקה של חברות במערכת</p>
            <div className="text-sm text-gray-500">
              <div>סה"כ: {stats.totalCompanies} חברות</div>
            </div>
          </Link>

          <Link href="/dashboard/admin/company-quotas" className="block p-6 bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow">
            <h3 className="text-xl font-semibold mb-2">ניהול מכסות משתמשים</h3>
            <p className="text-gray-600 mb-4">קביעת מכסות משתמשים לחברות ובקרת השימוש</p>
            <div className="text-sm text-gray-500">
              <div>ניהול מכסות לכל החברות</div>
              <div>בקרת זמינות משתמשים</div>
            </div>
          </Link>

          <Link href="/dashboard/admin/agent-requests" className={`block p-6 rounded-lg shadow-md hover:shadow-lg transition-all duration-200 ${
            stats.pendingAgentRequests > 0 ? 'bg-red-50 border-2 border-red-300 ring-2 ring-red-200' : 'bg-white'
          }`}>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-xl font-semibold">בקשות נציגים</h3>
              {stats.pendingAgentRequests > 0 && (
                <span className="px-3 py-1 bg-red-500 text-white text-sm font-bold rounded-full animate-pulse">
                  {stats.pendingAgentRequests}
                </span>
              )}
            </div>
            <p className="text-gray-600 mb-4">אישור ודחיית בקשות להוספת נציגים חדשים</p>
            <div className="text-sm text-gray-500">
              <div>סה"כ בקשות: {stats.totalAgentRequests}</div>
              <div>אושרו: {stats.approvedAgentRequests}</div>
              <div>נדחו: {stats.rejectedAgentRequests}</div>
              {stats.pendingAgentRequests > 0 && (
                <div className="text-red-600 font-medium">🚨 ממתינות לטיפול: {stats.pendingAgentRequests}</div>
              )}
            </div>
          </Link>

          <div className="block p-6 bg-white rounded-lg shadow-md">
            <h3 className="text-xl font-semibold mb-2">ניהול מנויים</h3>
            <p className="text-gray-600">בקרוב - ניהול מנויים לחברות</p>
            <div className="text-sm text-gray-400 mt-4">
              בפיתוח...
            </div>
          </div>
        </div>
      </div>
    </div>
  )
} 