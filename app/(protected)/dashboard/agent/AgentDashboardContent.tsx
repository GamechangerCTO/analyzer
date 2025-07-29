'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { TrendingUp, Calendar, Clock, CheckCircle, AlertTriangle, ArrowRight, Phone, Target, User } from 'lucide-react'
import Link from 'next/link'

// קומפוננטים חדשים מאורגנים
import WelcomeHero from '@/components/WelcomeHero'
import DashboardStats from '@/components/DashboardStats'
import ModernChart from '@/components/ModernChart'
import DashboardRecommendation from '@/components/DashboardRecommendation'
import AgentSummary from '@/components/AgentSummary'
import LoadingDashboard from '@/components/LoadingDashboard'

interface AgentDashboardContentProps {
  userId: string
  companyId: string | null
  targetUserInfo?: { full_name: string | null; email: string } | null
}

interface DashboardStats {
  totalCalls: number
  avgScore: number
  successfulCalls: number
  weekCalls: number
}

interface Call {
  id: string
  call_type: string
  customer_name: string | null
  created_at: string
  overall_score: number | null
  processing_status: string | null
  red_flag: boolean | null
  audio_duration_seconds?: number | null
}

export default function AgentDashboardContent({ userId, companyId, targetUserInfo }: AgentDashboardContentProps) {
  const supabase = createClient()
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState<DashboardStats>({
    totalCalls: 0,
    avgScore: 0,
    successfulCalls: 0,
    weekCalls: 0
  })
  const [calls, setCalls] = useState<Call[]>([])
  const [agentInfo, setAgentInfo] = useState<{
    full_name: string | null
    email: string | null
    avatar_url?: string | null
  } | null>(null)

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage] = useState(10)

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        // שליפת נתוני הנציג
        const { data: userData } = await supabase
          .from('users')
          .select('full_name, email, avatar_url')
          .eq('id', userId)
          .single()
        
        setAgentInfo(userData)

        // שליפת נתוני השיחות המלאים
        const { data: callsData, error: callsError } = await supabase
          .from('calls')
          .select('id, call_type, overall_score, processing_status, created_at, red_flag, customer_name, audio_duration_seconds')
          .eq('user_id', userId)
          .order('created_at', { ascending: false })

        if (callsError) {
          console.error('Error fetching calls:', callsError)
          return
        }

        setCalls(callsData || [])

        // חישוב סטטיסטיקות
        const totalCalls = callsData?.length || 0
        const callsWithScore = callsData?.filter(call => call.overall_score !== null) || []
        const avgScore = callsWithScore.length > 0 
          ? callsWithScore.reduce((sum, call) => sum + (call.overall_score || 0), 0) / callsWithScore.length
          : 0
        const successfulCalls = callsWithScore.filter(call => (call.overall_score || 0) >= 8).length
        
        // שיחות השבוע
        const oneWeekAgo = new Date()
        oneWeekAgo.setDate(oneWeekAgo.getDate() - 7)
        const weekCalls = callsData?.filter(call => new Date(call.created_at) >= oneWeekAgo).length || 0

        setStats({
          totalCalls,
          avgScore,
          successfulCalls,
          weekCalls
        })

      } catch (error) {
        console.error('Error fetching dashboard data:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchDashboardData()
  }, [userId, supabase])

  // פונקציות עזר לטבלת השיחות
  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('he-IL', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const getCallTypeIcon = (callType: string) => {
    const icons: { [key: string]: JSX.Element } = {
      'sales_call': <Phone className="w-4 h-4" />,
      'follow_up_before_offer': <Target className="w-4 h-4" />,
      'follow_up_after_offer': <CheckCircle className="w-4 h-4" />,
      'appointment_scheduling': <Calendar className="w-4 h-4" />,
      'follow_up_appointment': <Clock className="w-4 h-4" />,
      'customer_service': <User className="w-4 h-4" />
    }
    return icons[callType] || <Phone className="w-4 h-4" />
  }

  const getCallTypeName = (callType: string) => {
    const names: { [key: string]: string } = {
      'sales_call': 'מכירה טלפונית',
      'follow_up_before_offer': 'פולו אפ לפני הצעה',
      'follow_up_after_offer': 'פולו אפ אחרי הצעה',
      'appointment_scheduling': 'תאום פגישה',
      'follow_up_appointment': 'פולו אפ תאום',
      'customer_service': 'שירות לקוחות'
    }
    return names[callType] || callType
  }

  const getScoreColor = (score: number | null) => {
    if (!score) return 'bg-gray-100 text-gray-600'
    if (score >= 8.5) return 'bg-green-100 text-green-700'
    if (score >= 7) return 'bg-amber-100 text-amber-700'
    return 'bg-red-100 text-red-700'
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-700'
      case 'pending':
        return 'bg-amber-100 text-amber-700'
      case 'error':
        return 'bg-red-100 text-red-700'
      default:
        return 'bg-gray-100 text-gray-600'
    }
  }

  const getStatusText = (status: string) => {
    switch (status) {
      case 'completed':
        return 'הושלם'
      case 'pending':
        return 'בתהליך'
      case 'error':
        return 'שגיאה'
      default:
        return status
    }
  }

  // Pagination calculations
  const totalItems = calls.length
  const totalPages = Math.ceil(totalItems / itemsPerPage)
  const startIndex = (currentPage - 1) * itemsPerPage
  const endIndex = startIndex + itemsPerPage
  const paginatedCalls = calls.slice(startIndex, endIndex)

  // Pagination controls
  const handlePageChange = (page: number) => {
    setCurrentPage(page)
  }

  const handlePrevious = () => {
    if (currentPage > 1) {
      setCurrentPage(currentPage - 1)
    }
  }

  const handleNext = () => {
    if (currentPage < totalPages) {
      setCurrentPage(currentPage + 1)
    }
  }

  // Generate page numbers for pagination
  const getPageNumbers = () => {
    const pages = []
    const maxPages = 5
    let startPage = Math.max(1, currentPage - Math.floor(maxPages / 2))
    let endPage = Math.min(totalPages, startPage + maxPages - 1)
    
    if (endPage - startPage + 1 < maxPages) {
      startPage = Math.max(1, endPage - maxPages + 1)
    }
    
    for (let i = startPage; i <= endPage; i++) {
      pages.push(i)
    }
    
    return pages
  }

  if (loading) {
    return <LoadingDashboard />
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-glacier-neutral-50 via-white to-glacier-primary-50/30 p-6">
      <div className="max-w-7xl mx-auto space-y-8 animate-in fade-in duration-700">
        
        {/* כותרת */}
        <WelcomeHero 
          agentInfo={agentInfo}
          targetUserInfo={targetUserInfo}
          isViewingOtherAgent={!!targetUserInfo}
        />

        {/* שורה עליונה: סטטיסטיקות מצומצמות + גרפים */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* סטטיסטיקות מצומצמות - 1/3 */}
          <div className="space-y-4">
            {/* סטטיסטיקה מרכזית */}
            <div className="bg-gradient-to-br from-blue-500 to-purple-600 rounded-tl-3xl rounded-br-3xl rounded-tr-lg rounded-bl-lg p-8 text-white shadow-lg">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-blue-100 text-sm font-medium">ציון ממוצע</p>
                  <p className="text-4xl font-bold">{stats.avgScore.toFixed(1)}</p>
                  <div className="mt-3 w-full bg-white/20 rounded-full h-2">
                    <div 
                      className="h-full bg-white rounded-full transition-all duration-1000"
                      style={{width: `${Math.min((stats.avgScore / 10) * 100, 100)}%`}}
                    ></div>
                  </div>
                </div>
                <div className="w-16 h-16 bg-white/20 rounded-xl flex items-center justify-center">
                  <TrendingUp className="w-8 h-8" />
                </div>
              </div>
            </div>
            
            {/* סטטיסטיקות נוספות בפריסה מורחבת */}
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-white/90 backdrop-blur-md border border-glacier-neutral-200/50 rounded-tr-3xl rounded-bl-3xl rounded-tl-lg rounded-br-lg p-6 shadow-sm">
                <div className="text-center">
                  <p className="text-3xl font-bold text-glacier-neutral-900">{stats.totalCalls}</p>
                  <p className="text-sm text-glacier-neutral-600 mt-2">סה״כ שיחות</p>
                </div>
              </div>
              <div className="bg-white/90 backdrop-blur-md border border-glacier-neutral-200/50 rounded-tl-3xl rounded-br-3xl rounded-tr-lg rounded-bl-lg p-6 shadow-sm">
                <div className="text-center">
                  <p className="text-3xl font-bold text-green-600">{stats.successfulCalls}</p>
                  <p className="text-sm text-glacier-neutral-600 mt-2">מוצלחות</p>
                </div>
              </div>
            </div>



            {/* נתונים נוספים */}
            <div className="bg-white/90 backdrop-blur-md border border-glacier-neutral-200/50 rounded-tr-3xl rounded-bl-3xl rounded-tl-lg rounded-br-lg p-6 shadow-sm">
              <div className="flex items-center justify-between">
                                 <div>
                   <p className="text-sm text-glacier-neutral-600">זמן ממוצע</p>
                   <p className="text-2xl font-bold text-glacier-neutral-900">
                     {(() => {
                       // סינון שיחות עם זמן תקין
                       const validCalls = calls.filter(call => 
                         call.audio_duration_seconds && 
                         call.audio_duration_seconds > 0 && 
                         call.audio_duration_seconds < 7200 // מקסימום 2 שעות
                       );
                       
                       if (validCalls.length === 0) {
                         return calls.length > 0 ? '0:00' : 'אין נתונים';
                       }
                       
                       const avgSeconds = validCalls.reduce((sum, call) => sum + (call.audio_duration_seconds || 0), 0) / validCalls.length;
                       const minutes = Math.floor(avgSeconds / 60);
                       const seconds = Math.round(avgSeconds % 60);
                       return `${minutes}:${seconds.toString().padStart(2, '0')}`;
                     })()}
                   </p>
                   <p className="text-xs text-glacier-neutral-500 mt-1">
                     {(() => {
                       const validCalls = calls.filter(call => 
                         call.audio_duration_seconds && 
                         call.audio_duration_seconds > 0 && 
                         call.audio_duration_seconds < 7200
                       );
                       return validCalls.length > 0 ? `מבוסס על ${validCalls.length} שיחות` : '';
                     })()}
                   </p>
                 </div>
                <div className="text-right">
                  <p className="text-sm text-glacier-neutral-600">דגלים אדומים</p>
                  <p className="text-2xl font-bold text-red-600">
                    {calls.filter(call => call.red_flag).length}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* גרפים - 2/3 */}
          <div className="lg:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-4">
            {calls.length > 0 && (
              <>
                {/* גרף מגמת ציונים */}
                <ModernChart
                  data={{
                    labels: calls.slice(-10).map((call, index) => `${index + 1}`),
                    values: calls.slice(-10).map(call => call.overall_score || 0)
                  }}
                  title="מגמת ביצועים"
                  type="line"
                  height={200}
                  showTrend={true}
                />

                {/* גרף פיזור סוגי שיחות */}
                <ModernChart
                  data={{
                    labels: Array.from(new Set(calls.map(call => {
                      const names: { [key: string]: string } = {
                        'sales_call': 'מכירה',
                        'follow_up_before_offer': 'פולו אפ לפני',
                        'follow_up_after_offer': 'פולו אפ אחרי',
                        'appointment_scheduling': 'תאום פגישה',
                        'follow_up_appointment': 'פולו אפ תאום',
                        'customer_service': 'שירות לקוחות'
                      }
                      return names[call.call_type] || call.call_type
                    }))),
                    values: Array.from(new Set(calls.map(call => call.call_type))).map(type => 
                      calls.filter(call => call.call_type === type).length
                    )
                  }}
                  title="סוגי שיחות"
                  type="doughnut"
                  height={200}
                  showTrend={false}
                />
              </>
            )}
          </div>
        </div>

        {/* טבלת שיחות עם pagination - רוחב מלא */}
        <div className="bg-white/90 backdrop-blur-md border border-glacier-neutral-200/50 rounded-tl-3xl rounded-br-3xl rounded-tr-lg rounded-bl-lg shadow-glacier-soft overflow-hidden">
          {/* כותרת הטבלה */}
          <div className="px-6 py-4 border-b border-glacier-neutral-200/50 bg-gradient-to-r from-glacier-primary-50 to-glacier-accent-50">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold text-glacier-neutral-900">כל השיחות</h2>
              <div className="flex items-center gap-4">
                <span className="text-sm text-gray-500">
                  מציג {Math.min(startIndex + 1, totalItems)} עד {Math.min(endIndex, totalItems)} מתוך {totalItems} שיחות
                </span>
                <Link 
                  href="/dashboard/calls"
                  className="text-sm font-medium text-glacier-primary-600 hover:text-glacier-primary-700 transition-colors"
                >
                  פתח בדף נפרד
                </Link>
              </div>
            </div>
          </div>

          {/* תוכן הטבלה */}
          {calls.length === 0 ? (
            <div className="text-center py-12">
              <div className="w-16 h-16 bg-gradient-to-br from-glacier-primary-100 to-glacier-accent-100 rounded-tr-3xl rounded-bl-3xl rounded-tl-lg rounded-br-lg flex items-center justify-center mx-auto mb-4">
                <Phone className="w-8 h-8 text-glacier-primary-600" />
              </div>
              <h3 className="text-lg font-semibold text-glacier-neutral-900 mb-2">אין עדיין שיחות</h3>
              <p className="text-glacier-neutral-600 mb-6">התחל את מסע האימון שלך על ידי העלאת השיחה הראשונה</p>
              {!targetUserInfo && (
                <Link 
                  href="/upload" 
                  className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-glacier-primary-500 to-glacier-accent-500 text-white rounded-tl-3xl rounded-br-3xl rounded-tr-lg rounded-bl-lg hover:from-glacier-primary-600 hover:to-glacier-accent-600 transition-all duration-300 font-medium"
                >
                  <Phone className="w-5 h-5" />
                  <span>העלה שיחה ראשונה</span>
                </Link>
              )}
            </div>
          ) : (
            <>
              {/* טבלה רספונסיבית */}
              <div className="overflow-hidden">
                <table className="min-w-full divide-y divide-glacier-neutral-200/30">
                  <thead className="bg-glacier-neutral-50/50">
                    <tr>
                      <th className="px-3 lg:px-4 py-3 text-right text-xs font-medium text-glacier-neutral-500 uppercase tracking-wider">
                        תאריך
                      </th>
                      <th className="px-3 lg:px-4 py-3 text-right text-xs font-medium text-glacier-neutral-500 uppercase tracking-wider hidden lg:table-cell">
                        סוג שיחה
                      </th>
                      <th className="px-3 lg:px-4 py-3 text-right text-xs font-medium text-glacier-neutral-500 uppercase tracking-wider">
                        לקוח
                      </th>
                      <th className="px-3 lg:px-4 py-3 text-center text-xs font-medium text-glacier-neutral-500 uppercase tracking-wider">
                        ציון
                      </th>
                      <th className="px-3 lg:px-4 py-3 text-center text-xs font-medium text-glacier-neutral-500 uppercase tracking-wider hidden md:table-cell">
                        סטטוס
                      </th>
                      <th className="px-3 lg:px-4 py-3 text-center text-xs font-medium text-glacier-neutral-500 uppercase tracking-wider">
                        פעולות
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-glacier-neutral-200/30">
                    {paginatedCalls.map((call, index) => (
                      <tr 
                        key={call.id} 
                        className="hover:bg-glacier-primary-50/30 transition-colors duration-200"
                        style={{ animationDelay: `${index * 30}ms` }}
                      >
                        <td className="px-3 lg:px-4 py-4 whitespace-nowrap text-sm text-glacier-neutral-900">
                          <div className="space-y-1">
                            <div className="font-medium text-xs lg:text-sm">{formatDate(call.created_at)}</div>
                            {/* Mobile: Show call type under date */}
                            <div className="lg:hidden">
                              <div className="flex items-center gap-2">
                                <div className="w-6 h-6 rounded-tl-lg rounded-br-lg rounded-tr-sm rounded-bl-sm bg-gradient-to-br from-glacier-accent-400 to-glacier-accent-600 flex items-center justify-center text-white">
                                  {getCallTypeIcon(call.call_type)}
                                </div>
                                <span className="text-xs font-medium text-glacier-neutral-700 truncate max-w-[120px]" title={getCallTypeName(call.call_type)}>
                                  {getCallTypeName(call.call_type)}
                                </span>
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="px-3 lg:px-4 py-4 whitespace-nowrap hidden lg:table-cell">
                          <div className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded-tr-lg rounded-bl-lg rounded-tl-sm rounded-br-sm bg-gradient-to-br from-glacier-accent-400 to-glacier-accent-600 flex items-center justify-center text-white">
                              {getCallTypeIcon(call.call_type)}
                            </div>
                            <span className="text-sm font-medium text-glacier-neutral-900 max-w-xs truncate" title={getCallTypeName(call.call_type)}>
                              {getCallTypeName(call.call_type)}
                            </span>
                          </div>
                        </td>
                        <td className="px-3 lg:px-4 py-4 whitespace-nowrap text-sm text-glacier-neutral-900">
                          <div className="flex items-center gap-2">
                            <span className="max-w-[100px] lg:max-w-xs truncate" title={call.customer_name || 'לקוח ללא שם'}>
                              {call.customer_name || 'לקוח ללא שם'}
                            </span>
                            {call.red_flag && (
                              <AlertTriangle className="w-4 h-4 text-red-500" />
                            )}
                          </div>
                        </td>
                        <td className="px-3 lg:px-4 py-4 whitespace-nowrap text-center">
                          {call.overall_score ? (
                            <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getScoreColor(call.overall_score)}`}>
                              {call.overall_score.toFixed(1)}
                            </span>
                          ) : (
                            <span className="text-gray-400 text-xs">-</span>
                          )}
                        </td>
                        <td className="px-3 lg:px-4 py-4 whitespace-nowrap text-center hidden md:table-cell">
                          <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(call.processing_status || 'pending')}`}>
                            {getStatusText(call.processing_status || 'pending')}
                          </span>
                        </td>
                        <td className="px-3 lg:px-4 py-4 whitespace-nowrap text-center">
                          {call.processing_status === 'completed' && (
                            <Link 
                              href={`/call/${call.id}`}
                              className="inline-flex items-center gap-1 px-3 py-1.5 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white rounded-lg transition-all duration-200 shadow-sm hover:shadow-md transform hover:scale-105 text-xs font-medium"
                            >
                              <span className="hidden sm:inline">צפה</span>
                              <span className="sm:hidden">דוח</span>
                              <ArrowRight className="w-3 h-3" />
                            </Link>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Pagination Controls */}
              {totalItems > 0 && (
                <div className="px-4 lg:px-6 py-4 border-t border-glacier-neutral-200/50 flex flex-col sm:flex-row items-center justify-between gap-4">
                  <div className="flex items-center gap-4 text-sm text-gray-600">
                    <span>
                      מציג {startIndex + 1} עד {Math.min(endIndex, totalItems)} מתוך {totalItems} שיחות
                    </span>
                  </div>
                  
                  {totalPages > 1 && (
                    <div className="flex items-center gap-2">
                      <button
                        onClick={handlePrevious}
                        disabled={currentPage === 1}
                        className="px-3 py-2 text-sm border border-gray-300 rounded-tl-lg rounded-br-lg rounded-tr-sm rounded-bl-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 transition-colors"
                      >
                        קודם
                      </button>
                      
                      <div className="flex items-center gap-1">
                        {getPageNumbers().map(pageNum => (
                          <button
                            key={pageNum}
                            onClick={() => handlePageChange(pageNum)}
                            className={`px-3 py-2 text-sm rounded-tl-md rounded-br-md rounded-tr-sm rounded-bl-sm transition-colors ${
                              currentPage === pageNum
                                ? 'bg-blue-600 text-white shadow-sm'
                                : 'border border-gray-300 hover:bg-gray-50'
                            }`}
                          >
                            {pageNum}
                          </button>
                        ))}
                      </div>
                      
                      <button
                        onClick={handleNext}
                        disabled={currentPage === totalPages}
                        className="px-3 py-2 text-sm border border-gray-300 rounded-tr-lg rounded-bl-lg rounded-tl-sm rounded-br-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 transition-colors"
                      >
                        הבא
                      </button>
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>

        {/* המלצה חכמה */}
        <DashboardRecommendation
          avgScore={stats.avgScore}
          successfulCalls={stats.successfulCalls}
          totalCalls={stats.totalCalls}
          isViewingOtherAgent={!!targetUserInfo}
        />

        {/* ניתוח ביצועים מתקדם - 5 השיחות האחרונות */}
        <div className="space-y-6">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-tl-xl rounded-br-xl rounded-tr-md rounded-bl-md bg-gradient-to-br from-glacier-accent-400 to-glacier-accent-600 flex items-center justify-center text-white shadow-glacier-soft">
              <TrendingUp className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-glacier-neutral-900">ניתוח ביצועים מתקדם</h2>
              <p className="text-glacier-neutral-600">תובנות מבוססות נתונים מ-5 השיחות האחרונות</p>
            </div>
          </div>

          {/* הסרה זמנית של AgentSummary כדי לחסוך quota */}
          <div className="bg-gradient-to-br from-blue-50 to-purple-50 rounded-tr-3xl rounded-bl-3xl rounded-tl-lg rounded-br-lg p-6 border border-blue-200">
            <div className="text-center">
              <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <TrendingUp className="w-8 h-8 text-blue-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">ניתוח ביצועים זמנית מושבת</h3>
              <p className="text-gray-600">התכונה תחזור בקרוב - אנחנו עובדים על שיפורים</p>
            </div>
          </div>
        </div>

      </div>
    </div>
  )
} 