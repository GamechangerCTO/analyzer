'use client'

import React, { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import { getSupabaseClient } from '@/lib/supabase/client'
import { format } from 'date-fns'
import { he } from 'date-fns/locale'

interface Call {
  id: string
  call_type: string
  customer_name: string | null
  created_at: string
  overall_score: number | null
  red_flag: boolean | null
  processing_status: string | null
  audio_duration_seconds: number | null
  user_id: string | null
  agent_name?: string | null
  agent_email?: string | null
}

interface AllCallsClientProps {
  userId: string
  companyId: string
  companyName: string
}

export default function AllCallsClient({ userId, companyId, companyName }: AllCallsClientProps) {
  const [calls, setCalls] = useState<Call[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [filterStatus, setFilterStatus] = useState<string>('all') // all, completed, processing, failed
  const [filterScore, setFilterScore] = useState<string>('all') // all, high, medium, low
  const [filterRedFlag, setFilterRedFlag] = useState<string>('all') // all, true, false
  const [searchTerm, setSearchTerm] = useState('')
  const [dateFilter, setDateFilter] = useState('')
  const [callTypeFilter, setCallTypeFilter] = useState('')

  const supabase = getSupabaseClient()

  const fetchCalls = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)

      // קודם נמצא את כל המשתמשים בחברה
      const { data: users, error: usersError } = await supabase
        .from('users')
        .select('id, full_name, email')
        .eq('company_id', companyId)
        .eq('role', 'agent')

      if (usersError) throw new Error(usersError.message)

      if (!users || users.length === 0) {
        setCalls([])
        return
      }

      const userIds = users.map(user => user.id)

      // עכשיו נשלף את השיחות
      const { data: callsData, error: callsError } = await supabase
        .from('calls')
        .select('*')
        .in('user_id', userIds)
        .order('created_at', { ascending: false })

      if (callsError) throw new Error(callsError.message)

      // נוסיף את פרטי המשתמש לכל שיחה
      const callsWithUserInfo = callsData?.map(call => {
        const user = users.find(u => u.id === call.user_id)
        return {
          ...call,
          agent_name: user?.full_name || null,
          agent_email: user?.email || null
        }
      }) || []

      setCalls(callsWithUserInfo)
    } catch (err) {
      console.error('שגיאה בטעינת השיחות:', err)
      setError('שגיאה בטעינת השיחות')
    } finally {
      setLoading(false)
    }
  }, [companyId, supabase])

  useEffect(() => {
    fetchCalls()
  }, [fetchCalls])

  // פילטור השיחות עם חיפוש חכם משופר
  const filteredCalls = calls.filter(call => {
    const matchesSearch = searchTerm === '' || 
      call.agent_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      call.customer_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      call.call_type.toLowerCase().includes(searchTerm.toLowerCase()) ||
      call.id.toLowerCase().includes(searchTerm.toLowerCase())

    const matchesStatus = filterStatus === 'all' || call.processing_status === filterStatus

    const matchesScore = filterScore === 'all' || 
      (filterScore === 'high' && call.overall_score && call.overall_score >= 8) ||
      (filterScore === 'medium' && call.overall_score && call.overall_score >= 6 && call.overall_score < 8) ||
      (filterScore === 'low' && call.overall_score && call.overall_score >= 3 && call.overall_score < 6)

    const matchesRedFlag = filterRedFlag === 'all' || 
      (filterRedFlag === 'true' && call.red_flag === true) ||
      (filterRedFlag === 'false' && call.red_flag === false)

    // סינון לפי תאריך
    const matchesDate = dateFilter === '' || 
      new Date(call.created_at).toISOString().split('T')[0] === dateFilter

    // סינון לפי סוג שיחה
    const matchesCallType = callTypeFilter === '' || call.call_type === callTypeFilter

    return matchesSearch && matchesStatus && matchesScore && matchesRedFlag && matchesDate && matchesCallType
  })

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return <span className="px-2 py-1 bg-green-100 text-green-800 rounded-full text-xs font-medium">הושלם</span>
      case 'processing':
        return <span className="px-2 py-1 bg-yellow-100 text-yellow-800 rounded-full text-xs font-medium">בעיבוד</span>
      case 'failed':
        return <span className="px-2 py-1 bg-red-100 text-red-800 rounded-full text-xs font-medium">נכשל</span>
      default:
        return <span className="px-2 py-1 bg-gray-100 text-gray-800 rounded-full text-xs font-medium">{status}</span>
    }
  }

  const getScoreBadge = (score: number | null) => {
    if (!score) return <span className="px-2 py-1 bg-gray-100 text-gray-800 rounded-full text-xs font-medium">אין ציון</span>
    
    if (score >= 8) return <span className="px-2 py-1 bg-green-100 text-green-800 rounded-full text-xs font-medium">{score.toFixed(1)}</span>
    if (score >= 6) return <span className="px-2 py-1 bg-yellow-100 text-yellow-800 rounded-full text-xs font-medium">{score.toFixed(1)}</span>
    if (score >= 4) return <span className="px-2 py-1 bg-orange-100 text-orange-800 rounded-full text-xs font-medium">{score.toFixed(1)}</span>
    return <span className="px-2 py-1 bg-red-100 text-red-800 rounded-full text-xs font-medium">{score.toFixed(1)}</span>
  }

  const formatDuration = (seconds: number | null) => {
    if (!seconds) return 'לא ידוע'
    const minutes = Math.floor(seconds / 60)
    const remainingSeconds = seconds % 60
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`
  }

  // רשימת סוגי השיחות הייחודיים
  const uniqueCallTypes = React.useMemo(() => {
    const typeSet = new Set(calls.map(call => call.call_type).filter(Boolean))
    const types = Array.from(typeSet)
    return types.sort()
  }, [calls])

  // פונקציות ניקוי
  const clearAllFilters = () => {
    setSearchTerm('')
    setDateFilter('')
    setCallTypeFilter('')
    setFilterStatus('all')
    setFilterScore('all')
    setFilterRedFlag('all')
  }

  const hasActiveFilters = searchTerm || dateFilter || callTypeFilter || 
    filterStatus !== 'all' || filterScore !== 'all' || filterRedFlag !== 'all'

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-center">
            <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-500 mx-auto"></div>
            <p className="mt-4 text-lg text-gray-600">טוען שיחות...</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        {/* כותרת */}
        <div className="mb-8">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">כל השיחות - {companyName}</h1>
              <p className="mt-2 text-gray-600">ניהול וצפייה בכל שיחות הצוות</p>
            </div>
            <Link 
              href="/dashboard/manager" 
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
              חזרה לדשבורד
            </Link>
          </div>
        </div>

        {error && (
          <div className="mb-6 bg-red-100 text-red-700 p-4 rounded-md">
            {error}
          </div>
        )}

        {/* סטטיסטיקות מהירות */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="p-2 bg-blue-100 rounded-md">
                <svg className="w-6 h-6 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M2 3a1 1 0 011-1h2.153a1 1 0 01.986.836l.74 4.435a1 1 0 01-.54 1.06l-1.548.773a11.037 11.037 0 006.105 6.105l.774-1.548a1 1 0 011.059-.54l4.435.74a1 1 0 01.836.986V17a1 1 0 01-1 1h-2C7.82 18 2 12.18 2 5V3z" />
                </svg>
              </div>
              <div className="mr-4">
                <p className="text-sm font-medium text-gray-600">סה"כ שיחות</p>
                <p className="text-2xl font-bold text-gray-900">{calls.length}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="p-2 bg-green-100 rounded-md">
                <svg className="w-6 h-6 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="mr-4">
                <p className="text-sm font-medium text-gray-600">שיחות שהושלמו</p>
                <p className="text-2xl font-bold text-gray-900">
                  {calls.filter(call => call.processing_status === 'completed').length}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="p-2 bg-purple-100 rounded-md">
                <svg className="w-6 h-6 text-purple-600" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                </svg>
              </div>
              <div className="mr-4">
                <p className="text-sm font-medium text-gray-600">ציון ממוצע</p>
                <p className="text-2xl font-bold text-gray-900">
                  {calls.filter(call => call.overall_score).length > 0 
                    ? (calls.reduce((sum, call) => sum + (call.overall_score || 0), 0) / calls.filter(call => call.overall_score).length).toFixed(1)
                    : 'אין נתונים'
                  }
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="p-2 bg-red-100 rounded-md">
                <svg className="w-6 h-6 text-red-600" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="mr-4">
                <p className="text-sm font-medium text-gray-600">דגלים אדומים</p>
                <p className="text-2xl font-bold text-gray-900">
                  {calls.filter(call => call.red_flag === true).length}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* פילטרים וחיפוש */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-lg font-medium text-gray-900 mb-4">פילטרים וחיפוש</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-7 gap-4">
            {/* חיפוש כללי */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">חיפוש כללי</label>
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="נציג, לקוח, סוג שיחה..."
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            {/* סינון תאריך */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">תאריך</label>
              <input
                type="date"
                value={dateFilter}
                onChange={(e) => setDateFilter(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            {/* סינון סוג שיחה */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">סוג שיחה</label>
              <select
                value={callTypeFilter}
                onChange={(e) => setCallTypeFilter(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">כל הסוגים</option>
                {uniqueCallTypes.map(type => (
                  <option key={type} value={type}>{type}</option>
                ))}
              </select>
            </div>

            {/* סטטוס */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">סטטוס</label>
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="all">כל הסטטוסים</option>
                <option value="completed">הושלם</option>
                <option value="processing">בעיבוד</option>
                <option value="failed">נכשל</option>
              </select>
            </div>

            {/* ציון */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">ציון</label>
              <select
                value={filterScore}
                onChange={(e) => setFilterScore(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="all">כל הציונים</option>
                <option value="high">גבוה (8+)</option>
                <option value="medium">בינוני (6-8)</option>
                <option value="low">נמוך (&lt;6)</option>
              </select>
            </div>

            {/* דגל אדום */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">דגל אדום</label>
              <select
                value={filterRedFlag}
                onChange={(e) => setFilterRedFlag(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="all">הכל</option>
                <option value="true">יש דגל אדום</option>
                <option value="false">אין דגל אדום</option>
              </select>
            </div>

            {/* כפתור איפוס */}
            <div className="flex items-end">
              {hasActiveFilters && (
                <button
                  onClick={clearAllFilters}
                  className="w-full bg-gray-500 hover:bg-gray-600 text-white px-4 py-2 rounded-md flex items-center justify-center"
                >
                  <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1-1H8a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                  נקה הכל
                </button>
              )}
            </div>

            {/* הצגת סינונים פעילים */}
            {hasActiveFilters && (
              <div className="mt-4 flex flex-wrap items-center gap-2 text-xs">
                <span className="text-gray-600">סינונים פעילים:</span>
                {searchTerm && (
                  <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded-full">
                    חיפוש: {searchTerm}
                  </span>
                )}
                {dateFilter && (
                  <span className="px-2 py-1 bg-green-100 text-green-800 rounded-full">
                    תאריך: {new Date(dateFilter).toLocaleDateString('he-IL')}
                  </span>
                )}
                {callTypeFilter && (
                  <span className="px-2 py-1 bg-purple-100 text-purple-800 rounded-full">
                    סוג: {callTypeFilter}
                  </span>
                )}
                {filterStatus !== 'all' && (
                  <span className="px-2 py-1 bg-orange-100 text-orange-800 rounded-full">
                    סטטוס: {filterStatus}
                  </span>
                )}
                {filterScore !== 'all' && (
                  <span className="px-2 py-1 bg-red-100 text-red-800 rounded-full">
                    ציון: {filterScore}
                  </span>
                )}
                {filterRedFlag !== 'all' && (
                  <span className="px-2 py-1 bg-yellow-100 text-yellow-800 rounded-full">
                    דגל אדום: {filterRedFlag === 'true' ? 'יש' : 'אין'}
                  </span>
                )}
              </div>
            )}
          </div>
        </div>

        {/* טבלת השיחות */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-medium text-gray-900">
              שיחות ({filteredCalls.length} מתוך {calls.length})
            </h2>
          </div>
          
          {filteredCalls.length === 0 ? (
            <div className="text-center py-12">
              <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 009.586 13H7" />
              </svg>
              <h3 className="mt-2 text-sm font-medium text-gray-900">אין שיחות</h3>
              <p className="mt-1 text-sm text-gray-500">לא נמצאו שיחות העונות לקריטריונים שנבחרו</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">נציג</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">סוג שיחה</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">שם לקוח</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">תאריך</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">משך</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">ציון</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">דגל אדום</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">סטטוס</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">פעולות</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredCalls.map((call) => (
                    <tr key={call.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div>
                          <div className="text-sm font-medium text-gray-900">{call.agent_name || 'לא ידוע'}</div>
                          <div className="text-sm text-gray-500">{call.agent_email || 'לא ידוע'}</div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{call.call_type}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {call.customer_name || 'לא זמין'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {format(new Date(call.created_at), 'dd/MM/yyyy HH:mm', { locale: he })}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {formatDuration(call.audio_duration_seconds)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {getScoreBadge(call.overall_score)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {call.red_flag === true ? (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                            🚩 דגל אדום
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                            ✅ תקין
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {getStatusBadge(call.processing_status || 'לא ידוע')}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        {call.processing_status === 'completed' ? (
                          <Link
                            href={`/call/${call.id}`}
                            className="text-blue-600 hover:text-blue-900"
                          >
                            צפה בניתוח
                          </Link>
                        ) : (
                          <span className="text-gray-400">בהמתנה</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  )
} 