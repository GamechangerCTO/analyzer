'use client'

import { useEffect, useState, useMemo, useCallback } from 'react'
import { getSupabaseClient } from '@/lib/supabase/client'
// הסרת ייבוא של DateRangePicker שלא נדרש יותר
// import DateRangePicker from '@/components/DateRangePicker'
import CallsBarChart from '@/components/CallsBarChart'
import ProgressLineChart from '@/components/ProgressLineChart'
import Link from 'next/link'
import { format } from 'date-fns'

// טיפוסים
interface Call {
  id: string
  call_type: string
  customer_name: string | null
  created_at: string
  overall_score: number | null
  red_flag: boolean | null
  processing_status: string | null
  audio_duration_seconds: number | null
  has_simulation?: boolean | null
  simulation_improved?: boolean | null
  tone_analysis_report?: any
  user_id?: string | null
}

interface CallTypeSummary {
  [key: string]: {
    totalCalls: number
    avgScore: number
    avgDuration: number
    successfulCalls: number
    needImprovementCalls: number
    simulationsCount: number
    improvedSimulationsCount: number
  }
}

interface AgentDashboardClientProps {
  userId: string
  companyId: string | null
}

type FilterType = 'all' | 'successful' | 'needImprovement'

export default function AgentDashboardClient({ userId, companyId }: AgentDashboardClientProps) {
  console.log('AgentDashboardClient rendered/re-rendered');
  const [calls, setCalls] = useState<Call[]>([])
  // הסרת שורות State של תאריכים
  const [isLoading, setIsLoading] = useState(true)
  const [summaryData, setSummaryData] = useState<CallTypeSummary>({})
  const [progressData, setProgressData] = useState({
    labels: [] as string[],
    datasets: [
      {
        label: 'ציון ממוצע',
        data: [] as number[]
      }
    ]
  })
  const [currentFilter, setCurrentFilter] = useState<FilterType>('all')
  
  // State לחיפוש חכם
  const [searchTerm, setSearchTerm] = useState('')
  const [dateFilter, setDateFilter] = useState('')
  const [callTypeFilter, setCallTypeFilter] = useState('')
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage] = useState(10)
  
  const supabase = useMemo(() => getSupabaseClient(), [])
  
  // הסרת לוגים ו-useMemo של שאילתות תאריכים

  // הסרת פונקציית handleDateRangeChange
  
  const processCallsData = useCallback((callsData: Call[]) => {
    const summary: CallTypeSummary = {
      'כלל שיחות': { totalCalls: 0, avgScore: 0, avgDuration: 0, successfulCalls: 0, needImprovementCalls: 0, simulationsCount: 0, improvedSimulationsCount: 0 },
      'מכירה טלפונית': { totalCalls: 0, avgScore: 0, avgDuration: 0, successfulCalls: 0, needImprovementCalls: 0, simulationsCount: 0, improvedSimulationsCount: 0 },
      'פולו אפ מכירה טלפונית – לאחר שיחה ראשונית לפניי הצעה': { totalCalls: 0, avgScore: 0, avgDuration: 0, successfulCalls: 0, needImprovementCalls: 0, simulationsCount: 0, improvedSimulationsCount: 0 },
      'שירות לקוחות': { totalCalls: 0, avgScore: 0, avgDuration: 0, successfulCalls: 0, needImprovementCalls: 0, simulationsCount: 0, improvedSimulationsCount: 0 }
    }
    
    callsData.forEach(call => {
      summary['כלל שיחות'].totalCalls++
      if (call.overall_score !== null && call.overall_score !== undefined) {
        summary['כלל שיחות'].avgScore += call.overall_score
        if (call.overall_score >= 8) summary['כלל שיחות'].successfulCalls++
        if (call.overall_score > 0 && call.overall_score < 7) summary['כלל שיחות'].needImprovementCalls++
      }
      if (call.audio_duration_seconds) summary['כלל שיחות'].avgDuration += call.audio_duration_seconds
      if (call.has_simulation) {
        summary['כלל שיחות'].simulationsCount++
        if (call.simulation_improved) summary['כלל שיחות'].improvedSimulationsCount++
      }
      
      const callType = call.call_type
      if (summary[callType]) {
        summary[callType].totalCalls++
        if (call.overall_score !== null && call.overall_score !== undefined) {
          summary[callType].avgScore += call.overall_score
          if (call.overall_score >= 8) summary[callType].successfulCalls++
          if (call.overall_score > 0 && call.overall_score < 7) summary[callType].needImprovementCalls++
        }
        if (call.audio_duration_seconds) summary[callType].avgDuration += call.audio_duration_seconds
        if (call.has_simulation) {
          summary[callType].simulationsCount++
          if (call.simulation_improved) summary[callType].improvedSimulationsCount++
        }
      } else {
        // אם סוג השיחה לא קיים, נוסיף אותו דינמית
        summary[callType] = { totalCalls: 1, avgScore: 0, avgDuration: 0, successfulCalls: 0, needImprovementCalls: 0, simulationsCount: 0, improvedSimulationsCount: 0 }
        if (call.overall_score !== null && call.overall_score !== undefined) {
          summary[callType].avgScore += call.overall_score
          if (call.overall_score >= 8) summary[callType].successfulCalls++
          if (call.overall_score > 0 && call.overall_score < 7) summary[callType].needImprovementCalls++
        }
        if (call.audio_duration_seconds) summary[callType].avgDuration += call.audio_duration_seconds
        if (call.has_simulation) {
          summary[callType].simulationsCount++
          if (call.simulation_improved) summary[callType].improvedSimulationsCount++
        }
      }
    })
    
    Object.keys(summary).forEach(key => {
      const category = summary[key]
      const callsWithScore = callsData.filter(c => (key === 'כלל שיחות' || c.call_type === key) && c.overall_score !== null && c.overall_score !== undefined).length
      const callsWithDuration = callsData.filter(c => (key === 'כלל שיחות' || c.call_type === key) && c.audio_duration_seconds).length
      category.avgScore = callsWithScore > 0 ? category.avgScore / callsWithScore : 0
      category.avgDuration = callsWithDuration > 0 ? category.avgDuration / callsWithDuration : 0
    })
    
    setSummaryData(summary)
  }, [])
  
  const generateProgressData = useCallback((callsData: Call[]) => {
    const sortedCalls = [...callsData].sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
    const timeLabels: string[] = []
    const avgScores: number[] = []
    const groupSize = 5
    
    for (let i = 0; i < sortedCalls.length; i += groupSize) {
      const group = sortedCalls.slice(i, i + groupSize)
      const callsWithScore = group.filter(call => call.overall_score !== null && call.overall_score !== undefined)
      if (callsWithScore.length > 0) {
        const avgScore = callsWithScore.reduce((sum, call) => sum + (call.overall_score || 0), 0) / callsWithScore.length
        avgScores.push(Number(avgScore.toFixed(1)))
        const lastDate = new Date(group[group.length - 1].created_at)
        timeLabels.push(format(lastDate, 'dd/MM/yyyy'))
      }
    }
    
    setProgressData({ labels: timeLabels, datasets: [{ label: 'ציון ממוצע', data: avgScores }] })
  }, [])

  const fetchCallsLogic = useCallback(async (isMountedCheck: () => boolean) => {
    console.log('fetchCallsLogic CALLED');
    if (!userId) {
      setCalls([])
      setIsLoading(false)
      return
    }

    setIsLoading(true)
    try {
      console.log('Querying all calls for user:', userId);

      const { data, error } = await supabase
        .from('calls')
        .select('*, tone_analysis_report, customer_name')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })

      if (!isMountedCheck()) return

      if (error) {
        console.error('Error fetching calls:', error)
        setCalls([])
      } else {
        setCalls(data as Call[]);
        processCallsData(data as Call[]);
        generateProgressData(data as Call[]);
      }
    } catch (err) {
      if (!isMountedCheck()) return
      console.error('Unexpected error fetching calls:', err)
      setCalls([])
    } finally {
      if (isMountedCheck()) {
        setIsLoading(false)
      }
    }
  }, [userId, supabase, processCallsData, generateProgressData])
  
  console.log('fetchCallsLogic CREATED/RECREATED');

  useEffect(() => {
    console.log('useEffect for fetchCallsLogic RUNNING');
    let isMounted = true
    const isMountedCheck = () => isMounted
    
    fetchCallsLogic(isMountedCheck)
    
    return () => {
      isMounted = false
    }
  }, [fetchCallsLogic])
  
  const getChartData = useCallback(() => {
    if (Object.keys(summaryData).length === 0) return { labels: [], values: [] }
    const types = Object.keys(summaryData).filter(key => key !== 'כלל שיחות')
    
    // קיצור שמות סוגי השיחות לתצוגה בגרף
    const shortLabels = types.map(type => {
      switch (type) {
        case 'פולו אפ מכירה טלפונית – לאחר שיחה ראשונית לפניי הצעה':
          return 'פולו אפ לפני הצעה'
        case 'מכירה טלפונית':
          return 'מכירה טלפונית'
        case 'שירות לקוחות':
          return 'שירות לקוחות'
        default:
          return type.length > 20 ? type.substring(0, 20) + '...' : type
      }
    })
    
    return { labels: shortLabels, values: types.map(type => summaryData[type].totalCalls) }
  }, [summaryData])
  
  const refreshData = useCallback(() => {
    fetchCallsLogic(() => true);
  }, [fetchCallsLogic])

  // פונקציות לסינון שיחות עם חיפוש חכם
  const getFilteredCalls = useCallback(() => {
    let filteredCalls = calls;
    
    // סינון לפי ציון (המנגנון הקיים)
    switch (currentFilter) {
      case 'successful':
        filteredCalls = filteredCalls.filter(call => call.overall_score !== null && call.overall_score >= 8)
        break;
      case 'needImprovement':
        filteredCalls = filteredCalls.filter(call => call.overall_score !== null && call.overall_score > 0 && call.overall_score < 7)
        break;
      default:
        // כל השיחות
        break;
    }
    
    // סינון לפי שם לקוח (חיפוש חכם)
    if (searchTerm.trim()) {
      const searchLower = searchTerm.toLowerCase().trim();
      filteredCalls = filteredCalls.filter(call => 
        call.customer_name?.toLowerCase().includes(searchLower) ||
        call.id.toLowerCase().includes(searchLower)
      );
    }
    
    // סינון לפי תאריך
    if (dateFilter) {
      filteredCalls = filteredCalls.filter(call => {
        const callDate = new Date(call.created_at).toISOString().split('T')[0];
        return callDate === dateFilter;
      });
    }
    
    // סינון לפי סוג שיחה
    if (callTypeFilter) {
      filteredCalls = filteredCalls.filter(call => call.call_type === callTypeFilter);
    }
    
    return filteredCalls;
  }, [calls, currentFilter, searchTerm, dateFilter, callTypeFilter])

  const handleFilterClick = (filterType: FilterType) => {
    setCurrentFilter(filterType)
    setCurrentPage(1) // Reset to first page when filtering
  }

  // פונקציות חיפוש
  const clearAllFilters = () => {
    setSearchTerm('')
    setDateFilter('')
    setCallTypeFilter('')
    setCurrentFilter('all')
    setCurrentPage(1)
  }

  const hasActiveFilters = searchTerm || dateFilter || callTypeFilter || currentFilter !== 'all'

  // רשימת סוגי השיחות הייחודיים
  const uniqueCallTypes = useMemo(() => {
    const typeSet = new Set(calls.map(call => call.call_type).filter(Boolean))
    const types = Array.from(typeSet)
    return types.sort()
  }, [calls])

  const getFilterTitle = () => {
    switch (currentFilter) {
      case 'successful':
        return 'שיחות מוצלחות (ציון 8+)'
      case 'needImprovement':
        return 'שיחות לשיפור (ציון פחות מ-7)'
      default:
        return 'כל השיחות'
    }
  }

  // Pagination calculations
  const filteredCalls = getFilteredCalls()
  const totalItems = filteredCalls.length
  const totalPages = Math.ceil(totalItems / itemsPerPage)
  const startIndex = (currentPage - 1) * itemsPerPage
  const endIndex = startIndex + itemsPerPage
  const paginatedCalls = filteredCalls.slice(startIndex, endIndex)

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
  
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex flex-col items-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary mb-4"></div>
          <p className="text-gray-600">טוען את הנתונים...</p>
        </div>
      </div>
    )
  }

  const totalCalls = summaryData['כלל שיחות']?.totalCalls || 0
  const avgScore = summaryData['כלל שיחות']?.avgScore || 0
  const successfulCalls = summaryData['כלל שיחות']?.successfulCalls || 0
  const needImprovementCalls = summaryData['כלל שיחות']?.needImprovementCalls || 0
  
  return (
    <div className="min-h-screen bg-gray-50">
      {/* כותרת עליונה */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">הדשבורד שלי</h1>
              <p className="text-gray-600 mt-1">סקירה כללית של הביצועים שלך</p>
            </div>
            <button 
              onClick={refreshData}
              className="bg-primary hover:bg-primary-dark text-white px-6 py-3 rounded-lg flex items-center space-x-2 transition-all duration-200 shadow-md hover:shadow-lg"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 ml-2" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 010 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z" clipRule="evenodd" />
              </svg>
              רענן נתונים
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* כרטיסי סטטיסטיקה עם אנימציות מתקדמות - Mobile Responsive */}
        <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-4 gap-3 md:gap-6 mb-6 md:mb-8 px-4 md:px-0">
                      <div 
              onClick={() => handleFilterClick('all')}
              className={`group relative overflow-hidden bg-white rounded-tl-3xl rounded-br-3xl rounded-tr-lg rounded-bl-lg shadow-lg p-3 md:p-6 border-2 transition-all duration-500 ease-out cursor-pointer transform hover:scale-105 hover:shadow-2xl touch-action-manipulation ${
                currentFilter === 'all' 
                  ? 'border-glacier-primary bg-gradient-to-br from-glacier-primary-light/20 to-white scale-105 shadow-2xl' 
                  : 'border-neutral-200 hover:border-glacier-primary'
              }`}
            >
              {/* Background shimmer effect */}
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-glacier-primary/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000 ease-out"></div>
              
              {/* Floating particles */}
              {currentFilter === 'all' && (
                <>
                  <div className="absolute -top-1 -right-1 w-2 h-2 md:w-3 md:h-3 bg-glacier-primary rounded-full animate-ping opacity-75"></div>
                  <div className="absolute -bottom-1 -left-1 w-1 h-1 md:w-2 md:h-2 bg-glacier-accent rounded-full animate-bounce opacity-75"></div>
                </>
              )}
              
              <div className="flex flex-col md:flex-row md:items-center relative z-10 space-y-2 md:space-y-0">
                <div className="flex-shrink-0 self-center md:self-auto">
                  <div className={`w-8 h-8 md:w-12 md:h-12 rounded-xl md:rounded-2xl flex items-center justify-center transition-all duration-300 group-hover:scale-110 group-hover:rotate-6 transform-gpu ${
                    currentFilter === 'all' 
                      ? 'bg-gradient-to-br from-glacier-primary to-glacier-accent shadow-lg' 
                      : 'bg-gradient-to-br from-glacier-primary-light to-glacier-accent-light group-hover:from-glacier-primary group-hover:to-glacier-accent'
                  }`}>
                    <svg className={`w-4 h-4 md:w-6 md:h-6 transition-colors duration-300 ${
                      currentFilter === 'all' ? 'text-white' : 'text-glacier-primary group-hover:text-white'
                    }`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                    </svg>
                  </div>
                </div>
                <div className="md:mr-4 flex-1 text-center md:text-right">
                  <p className={`text-xs md:text-sm font-medium transition-colors duration-300 ${
                    currentFilter === 'all' ? 'text-glacier-primary' : 'text-neutral-600 group-hover:text-glacier-primary'
                  }`}>
                    <span className="hidden md:inline">סה״כ שיחות</span>
                    <span className="md:hidden">שיחות</span>
                  </p>
                  <p className={`text-lg md:text-2xl font-bold transition-all duration-300 ${
                    currentFilter === 'all' ? 'text-neutral-900 animate-pulse' : 'text-neutral-900 group-hover:scale-110'
                  }`}>{totalCalls}</p>
                  <p className={`text-xs mt-1 transition-colors duration-300 hidden md:block ${
                    currentFilter === 'all' ? 'text-glacier-accent' : 'text-neutral-500 group-hover:text-glacier-accent'
                  }`}>לחץ לצפייה</p>
                </div>
              </div>
            </div>

          <div className="group relative overflow-hidden bg-white rounded-tr-3xl rounded-bl-3xl rounded-tl-lg rounded-br-lg shadow-lg p-6 border-2 border-neutral-200 transition-all duration-500 ease-out hover:scale-105 hover:shadow-2xl hover:border-glacier-success transform-gpu">
            {/* Background shimmer effect */}
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-glacier-success/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000 ease-out"></div>
            
            <div className="flex items-center relative z-10">
              <div className="flex-shrink-0">
                <div className="w-12 h-12 bg-gradient-to-br from-glacier-success-light to-glacier-success rounded-2xl flex items-center justify-center transition-all duration-300 group-hover:scale-110 group-hover:rotate-6 transform-gpu group-hover:shadow-lg">
                  <svg className="w-6 h-6 text-white transition-transform duration-300 group-hover:scale-110" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
              </div>
              <div className="mr-4 flex-1">
                <p className="text-sm font-medium text-neutral-600 group-hover:text-glacier-success transition-colors duration-300">ציון ממוצע</p>
                <p className="text-2xl font-bold text-neutral-900 group-hover:scale-110 transition-all duration-300">{avgScore.toFixed(1)}</p>
                
                {/* Animated progress bar */}
                <div className="mt-2 w-full bg-neutral-200 rounded-full h-1 overflow-hidden">
                  <div 
                    className="h-full bg-gradient-to-r from-glacier-success to-glacier-success-dark transition-all duration-1000 ease-out"
                    style={{width: `${Math.min((avgScore / 10) * 100, 100)}%`}}
                  ></div>
                </div>
              </div>
            </div>
          </div>

          <div 
            onClick={() => handleFilterClick('successful')}
            className={`group relative overflow-hidden bg-white rounded-tl-3xl rounded-br-3xl rounded-tr-lg rounded-bl-lg shadow-lg p-6 border-2 transition-all duration-500 ease-out cursor-pointer transform hover:scale-105 hover:shadow-2xl ${
              currentFilter === 'successful' 
                ? 'border-glacier-success bg-gradient-to-br from-glacier-success-light/20 to-white scale-105 shadow-2xl' 
                : 'border-neutral-200 hover:border-glacier-success'
            }`}
          >
            {/* Background shimmer effect */}
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-glacier-success/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000 ease-out"></div>
            
            {/* Floating particles */}
            {currentFilter === 'successful' && (
              <>
                <div className="absolute -top-1 -right-1 w-3 h-3 bg-glacier-success rounded-full animate-ping opacity-75"></div>
                <div className="absolute -bottom-1 -left-1 w-2 h-2 bg-glacier-success-dark rounded-full animate-bounce opacity-75"></div>
              </>
            )}
            
            <div className="flex items-center relative z-10">
              <div className="flex-shrink-0">
                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all duration-300 group-hover:scale-110 group-hover:rotate-6 transform-gpu ${
                  currentFilter === 'successful' 
                    ? 'bg-gradient-to-br from-glacier-success to-glacier-success-dark shadow-lg' 
                    : 'bg-gradient-to-br from-glacier-success-light to-glacier-success group-hover:from-glacier-success group-hover:to-glacier-success-dark'
                }`}>
                  <svg className={`w-6 h-6 transition-colors duration-300 ${
                    currentFilter === 'successful' ? 'text-white' : 'text-white'
                  }`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                  </svg>
                </div>
              </div>
              <div className="mr-4 flex-1">
                <p className={`text-sm font-medium transition-colors duration-300 ${
                  currentFilter === 'successful' ? 'text-glacier-success' : 'text-neutral-600 group-hover:text-glacier-success'
                }`}>שיחות מוצלחות</p>
                <p className={`text-2xl font-bold transition-all duration-300 ${
                  currentFilter === 'successful' ? 'text-neutral-900 animate-pulse' : 'text-neutral-900 group-hover:scale-110'
                }`}>{successfulCalls}</p>
                <p className={`text-xs mt-1 transition-colors duration-300 ${
                  currentFilter === 'successful' ? 'text-glacier-success-dark' : 'text-neutral-500 group-hover:text-glacier-success-dark'
                }`}>לחץ לצפייה</p>
              </div>
            </div>
          </div>

          <div 
            onClick={() => handleFilterClick('needImprovement')}
            className={`group relative overflow-hidden bg-white rounded-tr-3xl rounded-bl-3xl rounded-tl-lg rounded-br-lg shadow-lg p-6 border-2 transition-all duration-500 ease-out cursor-pointer transform hover:scale-105 hover:shadow-2xl ${
              currentFilter === 'needImprovement' 
                ? 'border-red-500 bg-gradient-to-br from-red-50 to-white scale-105 shadow-2xl' 
                : 'border-neutral-200 hover:border-red-400'
            }`}
          >
            {/* Background shimmer effect */}
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-red-500/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000 ease-out"></div>
            
            {/* Floating particles */}
            {currentFilter === 'needImprovement' && (
              <>
                <div className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full animate-ping opacity-75"></div>
                <div className="absolute -bottom-1 -left-1 w-2 h-2 bg-red-600 rounded-full animate-bounce opacity-75"></div>
              </>
            )}
            
            <div className="flex items-center relative z-10">
              <div className="flex-shrink-0">
                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all duration-300 group-hover:scale-110 group-hover:rotate-6 transform-gpu ${
                  currentFilter === 'needImprovement' 
                    ? 'bg-gradient-to-br from-red-500 to-red-600 shadow-lg' 
                    : 'bg-gradient-to-br from-red-400 to-red-500 group-hover:from-red-500 group-hover:to-red-600'
                }`}>
                  <svg className="w-6 h-6 text-white transition-transform duration-300 group-hover:scale-110" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 17h8m0 0V9m0 8l-8-8-4 4-6-6" />
                  </svg>
                </div>
              </div>
              <div className="mr-4 flex-1">
                <p className={`text-sm font-medium transition-colors duration-300 ${
                  currentFilter === 'needImprovement' ? 'text-red-600' : 'text-neutral-600 group-hover:text-red-600'
                }`}>לשיפור</p>
                <p className={`text-2xl font-bold transition-all duration-300 ${
                  currentFilter === 'needImprovement' ? 'text-neutral-900 animate-pulse' : 'text-neutral-900 group-hover:scale-110'
                }`}>{needImprovementCalls}</p>
                <p className={`text-xs mt-1 transition-colors duration-300 ${
                  currentFilter === 'needImprovement' ? 'text-red-500' : 'text-neutral-500 group-hover:text-red-500'
                }`}>לחץ לצפייה</p>
              </div>
            </div>
          </div>
        </div>

        {/* גרפים - מועבר למעלה */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold text-gray-900">התפלגות שיחות לפי קטגוריה</h2>
              <div className="w-3 h-3 bg-primary rounded-full"></div>
            </div>
            <CallsBarChart data={getChartData()} title="כמות שיחות לפי סוג" height={300} />
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold text-gray-900">מגמת התקדמות</h2>
              <div className="w-3 h-3 bg-green-500 rounded-full"></div>
            </div>
            <ProgressLineChart data={progressData} title="התפתחות הציון לאורך זמן" height={300} />
          </div>
        </div>

        {/* טבלת שיחות עם עיצוב רספונסיבי ו-pagination */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100">
          <div className="px-6 py-4 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <h2 className="text-xl font-semibold text-gray-900">{getFilterTitle()}</h2>
                {currentFilter !== 'all' && (
                  <button
                    onClick={() => setCurrentFilter('all')}
                    className="text-sm text-primary hover:text-primary-dark"
                  >
                    חזור לכל השיחות
                  </button>
                )}
              </div>
              <div className="flex items-center justify-center">
                <span className="text-sm text-gray-500">
                  מציג {Math.min(startIndex + 1, totalItems)} עד {Math.min(endIndex, totalItems)} מתוך {totalItems} שיחות
                </span>
              </div>
            </div>
          </div>

          {/* שדות חיפוש חכם */}
          <div className="px-6 py-4 bg-gray-50 border-b border-gray-200">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
              {/* שדה חיפוש שם לקוח */}
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  חיפוש שם לקוח
                </label>
                <div className="relative">
                  <input
                    type="text"
                    placeholder="הקלד שם לקוח..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                  {searchTerm && (
                    <button
                      onClick={() => setSearchTerm('')}
                      className="absolute left-2 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                      ✕
                    </button>
                  )}
                </div>
              </div>

              {/* סינון תאריך */}
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  תאריך
                </label>
                <input
                  type="date"
                  value={dateFilter}
                  onChange={(e) => setDateFilter(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              {/* סינון סוג שיחה */}
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  סוג שיחה
                </label>
                <select
                  value={callTypeFilter}
                  onChange={(e) => setCallTypeFilter(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">כל הסוגים</option>
                  {uniqueCallTypes.map(type => (
                    <option key={type} value={type}>{type}</option>
                  ))}
                </select>
              </div>

              {/* כפתור ניקוי */}
              <div className="flex items-end">
                {hasActiveFilters && (
                  <button
                    onClick={clearAllFilters}
                    className="w-full px-4 py-2 text-sm bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors flex items-center justify-center"
                  >
                    <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1-1H8a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                    נקה הכל
                  </button>
                )}
              </div>
            </div>

            {/* הצגת מספר התוצאות והסינונים הפעילים */}
            {hasActiveFilters && (
              <div className="flex flex-wrap items-center gap-2 text-xs">
                <span className="text-gray-600">סינונים פעילים:</span>
                {searchTerm && (
                  <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded-full">
                    שם: {searchTerm}
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
                {currentFilter !== 'all' && (
                  <span className="px-2 py-1 bg-orange-100 text-orange-800 rounded-full">
                    ציון: {getFilterTitle()}
                  </span>
                )}
              </div>
            )}
          </div>
          
          <div className="overflow-hidden">
            <div className="overflow-x-auto">
                              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-3 lg:px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">תאריך</th>
                    <th className="px-3 lg:px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider hidden lg:table-cell">סוג שיחה</th>
                    <th className="px-3 lg:px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">לקוח</th>
                    <th className="px-3 lg:px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">ציון</th>
                    <th className="px-3 lg:px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider hidden md:table-cell">טונציה</th>
                    <th className="px-3 lg:px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider hidden sm:table-cell">דגל</th>
                    <th className="px-3 lg:px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider hidden md:table-cell">זמן</th>
                    <th className="px-3 lg:px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">פעולות</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {paginatedCalls.map((call) => (
                                          <tr key={call.id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-3 lg:px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          <div className="space-y-1">
                            <div className="font-medium text-xs lg:text-sm">{new Date(call.created_at).toLocaleDateString('he-IL')}</div>
                            <div className="text-gray-500 text-xs">{new Date(call.created_at).toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' })}</div>
                            {/* Mobile: Show call type under date */}
                            <div className="lg:hidden text-xs text-gray-600 truncate max-w-[120px]" title={call.call_type}>
                              {call.call_type}
                            </div>
                          </div>
                        </td>
                        <td className="px-3 lg:px-6 py-4 whitespace-nowrap text-sm text-gray-900 hidden lg:table-cell">
                          <div className="max-w-xs truncate" title={call.call_type}>{call.call_type}</div>
                        </td>
                        <td className="px-3 lg:px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          <div className="max-w-[100px] lg:max-w-xs truncate" title={call.customer_name || 'לא זמין'}>
                            {call.customer_name || 'לא זמין'}
                          </div>
                        </td>
                                              <td className="px-3 lg:px-6 py-4 whitespace-nowrap text-center">
                          {call.overall_score ? (
                            <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                              call.overall_score >= 8 
                                ? 'bg-green-100 text-green-800' 
                                : call.overall_score >= 7
                                ? 'bg-yellow-100 text-yellow-800'
                                : 'bg-red-100 text-red-800'
                            }`}>
                              {call.overall_score.toFixed(1)}
                            </span>
                          ) : (
                            <span className="text-gray-400 text-sm">-</span>
                          )}
                        </td>
                        <td className="px-3 lg:px-6 py-4 whitespace-nowrap text-center hidden md:table-cell">
                          {call.tone_analysis_report && call.tone_analysis_report.ציון_טונציה ? (
                            <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                              call.tone_analysis_report.ציון_טונציה >= 6 
                                ? 'bg-blue-100 text-blue-800' 
                                : call.tone_analysis_report.ציון_טונציה >= 4
                                ? 'bg-yellow-100 text-yellow-800'
                                : 'bg-red-100 text-red-800'
                            }`}>
                              {call.tone_analysis_report.ציון_טונציה}/10
                            </span>
                          ) : (
                            <span className="text-gray-400 text-sm">-</span>
                          )}
                        </td>
                        <td className="px-3 lg:px-6 py-4 whitespace-nowrap text-center hidden sm:table-cell">
                          {call.red_flag ? (
                            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">
                              ⚠️
                            </span>
                          ) : (
                            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                              ✓
                            </span>
                          )}
                        </td>
                        <td className="px-3 lg:px-6 py-4 whitespace-nowrap text-center text-sm text-gray-900 hidden md:table-cell">
                          {call.audio_duration_seconds ? (() => {
                            const totalSeconds = Math.round(call.audio_duration_seconds);
                            const minutes = Math.floor(totalSeconds / 60);
                            const seconds = totalSeconds % 60;
                            return `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
                          })() : <span className="text-gray-400">-</span>}
                        </td>
                        <td className="px-3 lg:px-6 py-4 whitespace-nowrap text-center">
                          <Link 
                            href={`/dashboard/calls/${call.id}`} 
                            className="inline-flex items-center px-3 py-1.5 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white text-xs lg:text-sm font-medium rounded-lg transition-all duration-200 shadow-sm hover:shadow-md transform hover:scale-105"
                          >
                            <span className="hidden sm:inline">צפה בדוח</span>
                            <span className="sm:hidden">דוח</span>
                          </Link>
                        </td>
                    </tr>
                  ))}
                  {paginatedCalls.length === 0 && (
                    <tr>
                      <td colSpan={8} className="px-6 py-12 text-center">
                        <div className="flex flex-col items-center">
                          <svg className="w-12 h-12 text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                          </svg>
                          <h3 className="text-lg font-medium text-gray-900 mb-2">
                            {currentFilter === 'successful' ? 'אין שיחות מוצלחות עדיין' : 
                             currentFilter === 'needImprovement' ? 'אין שיחות לשיפור' : 
                             'אין שיחות עדיין'}
                          </h3>
                          <p className="text-gray-500">
                            {currentFilter === 'all' ? 'התחל על ידי העלאת השיחה הראשונה שלך דרך התפריט הצדדי' : 
                             'נסה לחזור לכל השיחות או להעלות שיחות חדשות דרך התפריט הצדדי'}
                          </p>
                        </div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
          
          {/* Pagination Controls */}
          {totalItems > 0 && (
            <div className="px-4 lg:px-6 py-4 border-t border-gray-200 flex flex-col sm:flex-row items-center justify-between gap-4">
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
                    className="px-3 py-2 text-sm border border-gray-300 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 transition-colors"
                  >
                    קודם
                  </button>
                  
                  <div className="flex items-center gap-1">
                    {getPageNumbers().map(pageNum => (
                      <button
                        key={pageNum}
                        onClick={() => handlePageChange(pageNum)}
                        className={`px-3 py-2 text-sm rounded-lg transition-colors ${
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
                    className="px-3 py-2 text-sm border border-gray-300 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 transition-colors"
                  >
                    הבא
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
} 