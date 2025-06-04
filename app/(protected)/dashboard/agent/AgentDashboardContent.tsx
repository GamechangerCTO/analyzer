'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

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
  created_at: string
  overall_score: number | null
  processing_status: string | null
  red_flag: boolean | null
}

export default function AgentDashboardContent({ userId, companyId, targetUserInfo }: AgentDashboardContentProps) {
  const router = useRouter()
  const supabase = createClient()
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState<DashboardStats>({
    totalCalls: 0,
    avgScore: 0,
    successfulCalls: 0,
    weekCalls: 0
  })
  const [calls, setCalls] = useState<Call[]>([])
  const [isSideMenuOpen, setIsSideMenuOpen] = useState(false)
  const [isNotificationsMenuOpen, setIsNotificationsMenuOpen] = useState(false)
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false)
  const [agentInfo, setAgentInfo] = useState<{
    full_name: string | null
    email: string | null
  } | null>(null)

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        // שליפת נתוני הנציג
        const { data: userData } = await supabase
          .from('users')
          .select('full_name, email')
          .eq('id', userId)
          .single()
        
        setAgentInfo(userData)

        // שליפת נתוני השיחות המלאים
        const { data: callsData, error: callsError } = await supabase
          .from('calls')
          .select('id, call_type, overall_score, processing_status, created_at, red_flag')
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

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">הושלם</span>
      case 'pending':
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">בתהליך</span>
      case 'error':
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">שגיאה</span>
      default:
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">{status}</span>
    }
  }

  const getScoreBadge = (score: number | null, redFlag: boolean | null) => {
    if (score === null) return null
    
    let colorClass = ''
    if (redFlag) colorClass = 'bg-red-100 text-red-800'
    else if (score >= 8) colorClass = 'bg-green-100 text-green-800'
    else if (score >= 6) colorClass = 'bg-yellow-100 text-yellow-800'
    else colorClass = 'bg-red-100 text-red-800'
    
    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${colorClass}`}>
        {score.toFixed(1)}
        {redFlag && <span className="mr-1">🚩</span>}
      </span>
    )
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">טוען נתונים...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex h-screen bg-gray-50" style={{ overflow: isSideMenuOpen ? 'hidden' : 'auto' }}>
      {/* Desktop sidebar */}
      <aside className="z-20 flex-shrink-0 hidden w-60 pl-2 overflow-y-auto bg-white shadow-lg md:block">
        <div>
          <div className="text-gray-800">
            <div className="flex p-2 bg-white border-b border-gray-200">
              <div className="flex py-3 px-2 items-center">
                <p className="text-2xl text-blue-600 font-semibold">KA</p>
                <p className="ml-2 font-semibold italic text-gray-700">אנליזר</p>
              </div>
            </div>
            <div className="flex justify-center py-6">
              <div className="">
                <div className="h-24 w-24 rounded-full bg-gradient-to-br from-purple-400 to-purple-600 flex items-center justify-center border-4 border-purple-200">
                  <span className="text-white text-2xl font-bold">נצ</span>
                </div>
                <p className="font-bold text-base text-gray-600 pt-2 text-center w-24">
                  {targetUserInfo?.full_name || agentInfo?.full_name || 'נציג'}
                </p>
              </div>
            </div>
            <div>
              <ul className="mt-6 leading-10">
                <li className="relative px-2 py-1">
                  <Link className="inline-flex items-center w-full text-sm font-semibold text-gray-700 transition-colors duration-150 cursor-pointer hover:text-blue-600 bg-blue-50 rounded-md px-3 py-2" 
                        href={targetUserInfo ? `/dashboard/agent?user=${userId}` : "/dashboard/agent"}>
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none"
                         viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
                            d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                    </svg>
                    <span className="ml-4">דשבורד</span>
                  </Link>
                </li>
                {!targetUserInfo && (
                  <>
                    <li className="relative px-2 py-1">
                      <Link className="inline-flex items-center w-full text-sm font-semibold text-gray-700 transition-colors duration-150 cursor-pointer hover:text-blue-600 px-3 py-2" 
                            href="/upload">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none"
                             viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
                                d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                        </svg>
                        <span className="ml-4">העלאת שיחה</span>
                      </Link>
                    </li>
                    <li className="relative px-2 py-1">
                      <Link className="inline-flex items-center w-full text-sm font-semibold text-gray-700 transition-colors duration-150 cursor-pointer hover:text-blue-600 px-3 py-2" 
                            href="/simulations">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none"
                             viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
                                d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                        </svg>
                        <span className="ml-4">סימולציות</span>
                      </Link>
                    </li>
                  </>
                )}
                {targetUserInfo && (
                  <li className="relative px-2 py-1">
                    <Link className="inline-flex items-center w-full text-sm font-semibold text-gray-700 transition-colors duration-150 cursor-pointer hover:text-blue-600 px-3 py-2" 
                          href="/dashboard/manager">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none"
                           viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
                              d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                      </svg>
                      <span className="ml-4">חזרה לדשבורד מנהל</span>
                    </Link>
                  </li>
                )}
              </ul>
            </div>
          </div>
        </div>
      </aside>

      {/* Mobile sidebar backdrop */}
      {isSideMenuOpen && (
        <div 
          className="fixed inset-0 z-10 flex items-end bg-black bg-opacity-50 sm:items-center sm:justify-center"
          onClick={() => setIsSideMenuOpen(false)}
        ></div>
      )}

      {/* Mobile sidebar */}
      {isSideMenuOpen && (
        <aside className="fixed inset-y-0 z-20 flex-shrink-0 w-64 mt-16 overflow-y-auto bg-white shadow-lg md:hidden">
          <div>
            <div className="text-gray-800">
              <div className="flex p-2 bg-white border-b border-gray-200">
                <div className="flex py-3 px-2 items-center">
                  <p className="text-2xl text-blue-600 font-semibold">KA</p>
                  <p className="ml-2 font-semibold italic text-gray-700">אנליזר</p>
                </div>
              </div>
              <div>
                <ul className="mt-6 leading-10">
                  <li className="relative px-2 py-1">
                    <Link className="inline-flex items-center w-full text-sm font-semibold text-gray-700 transition-colors duration-150 cursor-pointer hover:text-blue-600"
                          href={targetUserInfo ? `/dashboard/agent?user=${userId}` : "/dashboard/agent"}>
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none"
                           viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
                              d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                      </svg>
                      <span className="ml-4">דשבורד</span>
                    </Link>
                  </li>
                  {!targetUserInfo && (
                    <>
                      <li className="relative px-2 py-1">
                        <Link className="inline-flex items-center w-full text-sm font-semibold text-gray-700 transition-colors duration-150 cursor-pointer hover:text-blue-600"
                              href="/upload">
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none"
                               viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
                                  d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                          </svg>
                          <span className="ml-4">העלאת שיחה</span>
                        </Link>
                      </li>
                      <li className="relative px-2 py-1">
                        <Link className="inline-flex items-center w-full text-sm font-semibold text-gray-700 transition-colors duration-150 cursor-pointer hover:text-blue-600"
                              href="/simulations">
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none"
                               viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
                                  d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                          </svg>
                          <span className="ml-4">סימולציות</span>
                        </Link>
                      </li>
                    </>
                  )}
                </ul>
              </div>
            </div>
          </div>
        </aside>
      )}

      <div className="flex flex-col flex-1 w-full overflow-y-auto">
        <header className="z-40 py-4 bg-white shadow-sm border-b border-gray-200">
          <div className="flex items-center justify-between h-8 px-6 mx-auto">
            {/* Mobile hamburger */}
            <button className="p-1 mr-5 -ml-1 rounded-md md:hidden focus:outline-none focus:shadow-outline-blue"
                    onClick={() => setIsSideMenuOpen(!isSideMenuOpen)}>
              <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6 text-gray-600" fill="none"
                   viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
                      d="M4 6h16M4 12h16M4 18h7" />
              </svg>
            </button>

            {/* Search Input */}
            <div className="flex justify-center mt-2 mr-4">
              <div className="relative flex w-full flex-wrap items-stretch mb-3">
                <input type="search" placeholder="חיפוש..."
                       className="form-input px-3 py-2 placeholder-gray-400 text-gray-700 relative bg-white rounded-lg text-sm border border-gray-300 shadow-sm outline-none focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 w-full pr-10" />
                <span className="z-10 h-full leading-snug font-normal text-center text-gray-400 absolute bg-transparent rounded text-base items-center justify-center w-8 right-0 pr-3 py-3">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 -mt-1" fill="none"
                       viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
                          d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </span>
              </div>
            </div>

            <ul className="flex items-center flex-shrink-0 space-x-6">
              {/* Notifications menu */}
              <li className="relative">
                <button
                  className="p-2 bg-gray-100 text-blue-600 align-middle rounded-full hover:text-white hover:bg-blue-600 focus:outline-none transition-colors duration-200"
                  onClick={() => setIsNotificationsMenuOpen(!isNotificationsMenuOpen)}>
                  <div className="flex items-center">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none"
                         viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
                            d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                    </svg>
                  </div>
                  <span className="absolute top-0 right-0 inline-block w-3 h-3 transform translate-x-1 -translate-y-1 bg-red-500 border-2 border-white rounded-full"></span>
                </button>
                {isNotificationsMenuOpen && (
                  <ul className="absolute right-0 w-56 p-2 mt-2 space-y-2 text-gray-600 bg-white border border-gray-200 rounded-md shadow-lg">
                    <li className="flex">
                      <a className="text-gray-700 inline-flex items-center justify-between w-full px-2 py-1 text-sm font-semibold transition-colors duration-150 rounded-md hover:bg-gray-100"
                         href="#">
                        <span>הודעות</span>
                        <span className="inline-flex items-center justify-center px-2 py-1 text-xs font-bold leading-none text-red-600 bg-red-100 rounded-full">
                          2
                        </span>
                      </a>
                    </li>
                  </ul>
                )}
              </li>

              {/* Profile menu */}
              <li className="relative">
                <button
                  className="p-2 bg-gray-100 text-blue-600 align-middle rounded-full hover:text-white hover:bg-blue-600 focus:outline-none transition-colors duration-200"
                  onClick={() => setIsProfileMenuOpen(!isProfileMenuOpen)}>
                  <div className="flex items-center">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none"
                         viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
                            d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
                            d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                  </div>
                </button>
                {isProfileMenuOpen && (
                  <ul className="absolute right-0 w-56 p-2 mt-2 space-y-2 text-gray-600 bg-white border border-gray-200 rounded-md shadow-lg">
                    <li className="flex">
                      <Link className="text-gray-700 inline-flex items-center w-full px-2 py-1 text-sm font-semibold transition-colors duration-150 rounded-md hover:bg-gray-100"
                            href="/profile">
                        <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 mr-2" fill="none"
                             viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
                                d="M5.121 17.804A13.937 13.937 0 0112 16c2.5 0 4.847.655 6.879 1.804M15 10a3 3 0 11-6 0 3 3 0 016 0zm6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <span>פרופיל</span>
                      </Link>
                    </li>
                    <li className="flex">
                      <button 
                        onClick={() => {
                          supabase.auth.signOut()
                          router.push('/login')
                        }}
                        className="text-gray-700 inline-flex items-center w-full px-2 py-1 text-sm font-semibold transition-colors duration-150 rounded-md hover:bg-gray-100">
                        <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 mr-2" fill="none"
                             viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
                                d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                        </svg>
                        <span>התנתקות</span>
                      </button>
                    </li>
                  </ul>
                )}
              </li>
            </ul>
          </div>
        </header>

        <main className="flex-1 pb-16">
          <div className="grid mb-4 pb-10 px-8 mx-4 rounded-3xl bg-white border border-gray-200 shadow-lg mt-6">
            <div className="grid grid-cols-12 gap-6">
              <div className="grid grid-cols-12 col-span-12 gap-6">
                <div className="col-span-12 mt-8">
                  <div className="flex items-center h-10 intro-y">
                    <h2 className="mr-5 text-lg font-medium truncate text-gray-800">
                      {targetUserInfo ? `דשבורד נציג - ${targetUserInfo.full_name || targetUserInfo.email}` : 'דשבורד נציג'}
                    </h2>
                  </div>
                  {(agentInfo || targetUserInfo) && (
                    <div className="mb-6 p-3 bg-purple-50 rounded-md border border-purple-200">
                      <p className="text-purple-800">
                        {targetUserInfo 
                          ? `צופה בנתוני: ${targetUserInfo.full_name || targetUserInfo.email}`
                          : `ברוך הבא, ${agentInfo?.full_name || agentInfo?.email}`
                        }
                      </p>
                    </div>
                  )}
                  
                  {/* כרטיסיות מידע */}
                  <div className="grid grid-cols-12 gap-6 mt-5">
                    <div className="transform hover:scale-105 transition duration-300 shadow-xl rounded-lg col-span-12 sm:col-span-6 xl:col-span-3 intro-y bg-white border border-gray-200">
                      <div className="p-5">
                        <div className="flex justify-between">
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-7 w-7 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                          </svg>
                          <div className="bg-blue-100 text-blue-600 rounded-full h-6 px-2 flex justify-items-center font-semibold text-sm">
                            <span className="flex items-center">כללי</span>
                          </div>
                        </div>
                        <div className="ml-2 w-full flex-1">
                          <div>
                            <div className="mt-3 text-3xl font-bold leading-8 text-gray-800">{stats.totalCalls}</div>
                            <div className="mt-1 text-base text-gray-600">סה"כ שיחות</div>
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    <div className="transform hover:scale-105 transition duration-300 shadow-xl rounded-lg col-span-12 sm:col-span-6 xl:col-span-3 intro-y bg-white border border-gray-200">
                      <div className="p-5">
                        <div className="flex justify-between">
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-7 w-7 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                          </svg>
                          <div className="bg-green-100 text-green-600 rounded-full h-6 px-2 flex justify-items-center font-semibold text-sm">
                            <span className="flex items-center">{Math.round(stats.avgScore * 10) / 10}</span>
                          </div>
                        </div>
                        <div className="ml-2 w-full flex-1">
                          <div>
                            <div className="mt-3 text-3xl font-bold leading-8 text-gray-800">{Math.round(stats.avgScore * 10) / 10}</div>
                            <div className="mt-1 text-base text-gray-600">ציון ממוצע</div>
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    <div className="transform hover:scale-105 transition duration-300 shadow-xl rounded-lg col-span-12 sm:col-span-6 xl:col-span-3 intro-y bg-white border border-gray-200">
                      <div className="p-5">
                        <div className="flex justify-between">
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-7 w-7 text-purple-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          <div className="bg-purple-100 text-purple-600 rounded-full h-6 px-2 flex justify-items-center font-semibold text-sm">
                            <span className="flex items-center">מצוין</span>
                          </div>
                        </div>
                        <div className="ml-2 w-full flex-1">
                          <div>
                            <div className="mt-3 text-3xl font-bold leading-8 text-gray-800">{stats.successfulCalls}</div>
                            <div className="mt-1 text-base text-gray-600">שיחות מוצלחות</div>
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    <div className="transform hover:scale-105 transition duration-300 shadow-xl rounded-lg col-span-12 sm:col-span-6 xl:col-span-3 intro-y bg-white border border-gray-200">
                      <div className="p-5">
                        <div className="flex justify-between">
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-7 w-7 text-orange-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3a1 1 0 011-1h6a1 1 0 011 1v4m-7 0h7m-7 0H8m7 0h1M5 12h2m8 0h2M5 16h2m8 0h2M5 20h2m8 0h2" />
                          </svg>
                          <div className="bg-orange-100 text-orange-600 rounded-full h-6 px-2 flex justify-items-center font-semibold text-sm">
                            <span className="flex items-center">שבוע</span>
                          </div>
                        </div>
                        <div className="ml-2 w-full flex-1">
                          <div>
                            <div className="mt-3 text-3xl font-bold leading-8 text-gray-800">{stats.weekCalls}</div>
                            <div className="mt-1 text-base text-gray-600">שיחות השבוע</div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
                
                {/* פעולות מהירות ומדדים */}
                <div className="col-span-12 mt-5">
                  <div className="grid gap-6 grid-cols-1 lg:grid-cols-2">
                    <div className="bg-white shadow-lg border border-gray-200 rounded-lg p-6">
                      <h3 className="text-lg font-semibold text-gray-800 mb-4">פעולות מהירות</h3>
                      <div className="space-y-3">
                        {!targetUserInfo && (
                          <>
                            <Link href="/upload" className="block p-3 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors duration-200">
                              <div className="flex items-center">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-blue-600 mr-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                                </svg>
                                <span className="font-medium text-gray-800">העלאת שיחה חדשה</span>
                              </div>
                            </Link>
                            <Link href="/simulations" className="block p-3 bg-green-50 hover:bg-green-100 rounded-lg transition-colors duration-200">
                              <div className="flex items-center">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-green-600 mr-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                                </svg>
                                <span className="font-medium text-gray-800">תרגול סימולציות</span>
                              </div>
                            </Link>
                          </>
                        )}
                        <Link href={targetUserInfo ? `/dashboard/manager` : `/dashboard/calls?user=${userId}`} className="block p-3 bg-purple-50 hover:bg-purple-100 rounded-lg transition-colors duration-200">
                          <div className="flex items-center">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-purple-600 mr-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                            </svg>
                            <span className="font-medium text-gray-800">{targetUserInfo ? 'חזרה לדשבורד מנהל' : 'צפייה בכל השיחות'}</span>
                          </div>
                        </Link>
                      </div>
                    </div>
                    
                    <div className="bg-white shadow-lg border border-gray-200 rounded-lg p-6">
                      <h3 className="text-lg font-semibold text-gray-800 mb-4">מדדי ביצועים אישיים</h3>
                      <div className="space-y-4">
                        <div className="flex justify-between items-center">
                          <span className="text-gray-600">סה"כ שיחות</span>
                          <span className="text-blue-600 font-semibold">{stats.totalCalls}</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-gray-600">ציון ממוצע</span>
                          <span className="text-green-600 font-semibold">{Math.round(stats.avgScore * 10) / 10}</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-gray-600">שיחות מוצלחות</span>
                          <span className="text-purple-600 font-semibold">{stats.successfulCalls}</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-gray-600">שיחות השבוע</span>
                          <span className="text-orange-600 font-semibold">{stats.weekCalls}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
                
                {/* טבלת שיחות */}
                <div className="col-span-12 mt-5">
                  <div className="bg-white shadow-lg border border-gray-200 rounded-lg overflow-hidden">
                    <div className="px-6 py-4 border-b border-gray-200">
                      <h3 className="text-lg font-semibold text-gray-800">השיחות שלי</h3>
                      <p className="text-sm text-gray-600 mt-1">כל השיחות שביצעתי לאחרונה</p>
                    </div>
                    
                    <div className="overflow-x-auto">
                      <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                              תאריך ושעה
                            </th>
                            <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                              סוג שיחה
                            </th>
                            <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                              ציון
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
                          {calls.length === 0 ? (
                            <tr>
                              <td colSpan={5} className="px-6 py-12 text-center text-gray-500">
                                <svg xmlns="http://www.w3.org/2000/svg" className="mx-auto h-12 w-12 text-gray-400 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                                </svg>
                                <p>עדיין לא בוצעו שיחות</p>
                                {!targetUserInfo && (
                                  <Link href="/upload" className="text-blue-600 hover:text-blue-800 font-medium">
                                    העלה את השיחה הראשונה שלך →
                                  </Link>
                                )}
                              </td>
                            </tr>
                          ) : (
                            calls.map((call) => (
                              <tr key={call.id} className="hover:bg-gray-50">
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                  {formatDate(call.created_at)}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                                    {call.call_type || 'כללי'}
                                  </span>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                  {call.overall_score !== null ? (
                                    getScoreBadge(call.overall_score, call.red_flag)
                                  ) : (
                                    <span className="text-gray-400">טרם ניתוח</span>
                                  )}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                  {getStatusBadge(call.processing_status || 'unknown')}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                                  {call.processing_status === 'completed' ? (
                                    <Link
                                      href={`/call/${call.id}`}
                                      className="text-blue-600 hover:text-blue-900 flex items-center"
                                    >
                                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                      </svg>
                                      צפייה
                                    </Link>
                                  ) : (
                                    <span className="text-gray-400">
                                      {call.processing_status === 'pending' ? 'מתאמן...' : 'שגיאה'}
                                    </span>
                                  )}
                                </td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>
                    
                    {calls.length > 0 && (
                      <div className="bg-gray-50 px-6 py-3 border-t border-gray-200">
                        <div className="flex items-center justify-between">
                          <p className="text-sm text-gray-700">
                            מציג {calls.length} שיחות
                          </p>
                          {!targetUserInfo && (
                            <Link 
                              href={`/dashboard/calls?user=${userId}`}
                              className="text-sm text-blue-600 hover:text-blue-900 font-medium"
                            >
                              צפייה בכל השיחות →
                            </Link>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  )
} 