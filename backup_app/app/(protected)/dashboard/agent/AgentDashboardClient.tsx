'use client'

import { useEffect, useState } from 'react'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import DateRangePicker from '@/components/DateRangePicker'
import CallsBarChart from '@/components/CallsBarChart'
import ProgressLineChart from '@/components/ProgressLineChart'
import Link from 'next/link'
import { format } from 'date-fns'

// טיפוסים
interface Call {
  id: string
  call_type: string
  created_at: string
  overall_score: number | null
  red_flag: boolean | null
  processing_status: string
  audio_duration_seconds: number | null
  has_simulation: boolean
  simulation_improved: boolean
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
}

export default function AgentDashboardClient({ userId }: AgentDashboardClientProps) {
  const [calls, setCalls] = useState<Call[]>([])
  const [startDate, setStartDate] = useState<Date>(() => {
    const today = new Date()
    const firstDayOfLastMonth = new Date(today.getFullYear(), today.getMonth() - 1, 1)
    return firstDayOfLastMonth
  })
  const [endDate, setEndDate] = useState<Date>(() => {
    const today = new Date()
    const lastDayOfLastMonth = new Date(today.getFullYear(), today.getMonth(), 0)
    return lastDayOfLastMonth
  })
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
  
  const supabase = createClientComponentClient()
  
  // עדכון טווח התאריכים
  const handleDateRangeChange = (start: Date, end: Date) => {
    setStartDate(start)
    setEndDate(end)
  }
  
  // קבלת נתוני השיחות בטווח התאריכים
  useEffect(() => {
    const fetchCalls = async () => {
      setIsLoading(true)
      
      if (!userId) return
      
      const startDateStr = format(startDate, 'yyyy-MM-dd')
      const endDateStr = format(new Date(endDate.setHours(23, 59, 59)), 'yyyy-MM-dd HH:mm:ss')
      
      const { data, error } = await supabase
        .from('calls')
        .select('*')
        .eq('user_id', userId)
        .gte('created_at', startDateStr)
        .lte('created_at', endDateStr)
        .order('created_at', { ascending: false })
      
      if (error) {
        console.error('Error fetching calls:', error)
        return
      }
      
      // הוספת שדות לסימולציות (לצורך הדגמה בלבד, יש להחליף עם המודל האמיתי)
      const callsWithSimulation = data.map(call => ({
        ...call,
        has_simulation: Math.random() > 0.7, // לצורך הדגמה בלבד
        simulation_improved: Math.random() > 0.5 // לצורך הדגמה בלבד
      }))
      
      setCalls(callsWithSimulation)
      processCallsData(callsWithSimulation)
      generateProgressData(callsWithSimulation)
      setIsLoading(false)
    }
    
    fetchCalls()
  }, [startDate, endDate, supabase, userId])
  
  // עיבוד נתוני השיחות לטבלת הסיכום
  const processCallsData = (callsData: Call[]) => {
    const summary: CallTypeSummary = {
      'כלל שיחות': {
        totalCalls: 0,
        avgScore: 0,
        avgDuration: 0,
        successfulCalls: 0,
        needImprovementCalls: 0,
        simulationsCount: 0,
        improvedSimulationsCount: 0
      },
      'מכירה טלפונית': {
        totalCalls: 0,
        avgScore: 0,
        avgDuration: 0,
        successfulCalls: 0,
        needImprovementCalls: 0,
        simulationsCount: 0,
        improvedSimulationsCount: 0
      },
      'פולו אפ מכירה טלפונית לפניי הצעה': {
        totalCalls: 0,
        avgScore: 0,
        avgDuration: 0,
        successfulCalls: 0,
        needImprovementCalls: 0,
        simulationsCount: 0,
        improvedSimulationsCount: 0
      },
      'פולו אפ מכירה טלפונית –לאחר הצעה': {
        totalCalls: 0,
        avgScore: 0,
        avgDuration: 0,
        successfulCalls: 0,
        needImprovementCalls: 0,
        simulationsCount: 0,
        improvedSimulationsCount: 0
      },
      'תאום פגישה': {
        totalCalls: 0,
        avgScore: 0,
        avgDuration: 0,
        successfulCalls: 0,
        needImprovementCalls: 0,
        simulationsCount: 0,
        improvedSimulationsCount: 0
      },
      'מכירה טלפונית חוזרת /שדרוג': {
        totalCalls: 0,
        avgScore: 0,
        avgDuration: 0,
        successfulCalls: 0,
        needImprovementCalls: 0,
        simulationsCount: 0,
        improvedSimulationsCount: 0
      },
      'שירות': {
        totalCalls: 0,
        avgScore: 0,
        avgDuration: 0,
        successfulCalls: 0,
        needImprovementCalls: 0,
        simulationsCount: 0,
        improvedSimulationsCount: 0
      }
    }
    
    // עדכון סיכום לכל סוגי השיחות
    callsData.forEach(call => {
      // הוספה לסיכום הכללי
      summary['כלל שיחות'].totalCalls++
      
      if (call.overall_score) {
        summary['כלל שיחות'].avgScore += call.overall_score
        
        if (call.overall_score >= 8) {
          summary['כלל שיחות'].successfulCalls++
        }
        
        if (call.overall_score < 7) {
          summary['כלל שיחות'].needImprovementCalls++
        }
      }
      
      if (call.audio_duration_seconds) {
        summary['כלל שיחות'].avgDuration += call.audio_duration_seconds
      }
      
      if (call.has_simulation) {
        summary['כלל שיחות'].simulationsCount++
        
        if (call.simulation_improved) {
          summary['כלל שיחות'].improvedSimulationsCount++
        }
      }
      
      // הוספה לסיכום לפי סוג שיחה אם קיים
      const callType = call.call_type
      if (summary[callType]) {
        summary[callType].totalCalls++
        
        if (call.overall_score) {
          summary[callType].avgScore += call.overall_score
          
          if (call.overall_score >= 8) {
            summary[callType].successfulCalls++
          }
          
          if (call.overall_score < 7) {
            summary[callType].needImprovementCalls++
          }
        }
        
        if (call.audio_duration_seconds) {
          summary[callType].avgDuration += call.audio_duration_seconds
        }
        
        if (call.has_simulation) {
          summary[callType].simulationsCount++
          
          if (call.simulation_improved) {
            summary[callType].improvedSimulationsCount++
          }
        }
      }
    })
    
    // חישוב ממוצעים
    Object.keys(summary).forEach(key => {
      const category = summary[key]
      const callsWithScore = callsData.filter(call => 
        (key === 'כלל שיחות' || call.call_type === key) && call.overall_score
      ).length
      
      const callsWithDuration = callsData.filter(call => 
        (key === 'כלל שיחות' || call.call_type === key) && call.audio_duration_seconds
      ).length
      
      category.avgScore = callsWithScore ? category.avgScore / callsWithScore : 0
      category.avgDuration = callsWithDuration ? category.avgDuration / callsWithDuration : 0
    })
    
    setSummaryData(summary)
  }
  
  // יצירת נתונים לגרף מגמת השיפור
  const generateProgressData = (callsData: Call[]) => {
    // מיון השיחות לפי תאריך
    const sortedCalls = [...callsData].sort((a, b) => 
      new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
    )
    
    // קיבוץ לפי שבועות או חודשים (בהתאם לטווח)
    const timeLabels: string[] = []
    const avgScores: number[] = []
    
    // קיבוץ פשוט לפי קבוצות
    const groupSize = 5 // מספר שיחות בכל קבוצה
    
    for (let i = 0; i < sortedCalls.length; i += groupSize) {
      const group = sortedCalls.slice(i, i + groupSize)
      const callsWithScore = group.filter(call => call.overall_score)
      
      if (callsWithScore.length > 0) {
        const avgScore = callsWithScore.reduce((sum, call) => sum + (call.overall_score || 0), 0) / callsWithScore.length
        avgScores.push(Number(avgScore.toFixed(1)))
        
        // שימוש בתאריך האחרון בקבוצה עבור התווית
        const lastDate = new Date(group[group.length - 1].created_at)
        timeLabels.push(format(lastDate, 'dd/MM/yyyy'))
      }
    }
    
    setProgressData({
      labels: timeLabels,
      datasets: [
        {
          label: 'ציון ממוצע',
          data: avgScores
        }
      ]
    })
  }
  
  // נתונים לגרף העמודות
  const getChartData = () => {
    if (Object.keys(summaryData).length === 0) return { labels: [], values: [] }
    
    const types = Object.keys(summaryData).filter(key => key !== 'כלל שיחות')
    
    return {
      labels: types,
      values: types.map(type => summaryData[type].totalCalls)
    }
  }
  
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    )
  }
  
  return (
    <div>
      <h1 className="text-3xl font-bold mb-6">דשבורד נציג</h1>
      
      {/* בחירת טווח תאריכים */}
      <DateRangePicker onDateRangeChange={handleDateRangeChange} />
      
      {/* טבלת סיכום */}
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <h2 className="text-xl font-semibold mb-4">סיכום שיחות</h2>
        
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-3 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  סוג שיחה
                </th>
                <th className="px-3 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                  סה"כ שיחות
                </th>
                <th className="px-3 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                  ציון ממוצע
                </th>
                <th className="px-3 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                  משך זמן ממוצע
                </th>
                <th className="px-3 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                  שיחות מוצלחות
                </th>
                <th className="px-3 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                  שיחות לשיפור
                </th>
                <th className="px-3 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                  סימולציות שבוצעו
                </th>
                <th className="px-3 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                  סימולציות שהשתפרו
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {Object.keys(summaryData).map(callType => (
                <tr key={callType} className={callType === 'כלל שיחות' ? 'bg-blue-50 font-bold' : ''}>
                  <td className="px-3 py-3 whitespace-nowrap">
                    {callType}
                  </td>
                  <td className="px-3 py-3 text-center whitespace-nowrap">
                    {summaryData[callType].totalCalls}
                  </td>
                  <td className="px-3 py-3 text-center whitespace-nowrap">
                    {summaryData[callType].avgScore.toFixed(1)}
                  </td>
                  <td className="px-3 py-3 text-center whitespace-nowrap">
                    {Math.floor(summaryData[callType].avgDuration / 60)}:{(Math.floor(summaryData[callType].avgDuration % 60)).toString().padStart(2, '0')}
                  </td>
                  <td className="px-3 py-3 text-center whitespace-nowrap">
                    {summaryData[callType].successfulCalls}
                  </td>
                  <td className="px-3 py-3 text-center whitespace-nowrap">
                    {summaryData[callType].needImprovementCalls}
                  </td>
                  <td className="px-3 py-3 text-center whitespace-nowrap">
                    {summaryData[callType].simulationsCount}
                  </td>
                  <td className="px-3 py-3 text-center whitespace-nowrap">
                    {summaryData[callType].improvedSimulationsCount}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      
      {/* גרף ראשי וגרף מגמות */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-4">התפלגות שיחות לפי סוג</h2>
          <CallsBarChart data={getChartData()} title="כמות שיחות לפי סוג" height={300} />
        </div>
        
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-4">מגמת שיפור</h2>
          <ProgressLineChart data={progressData} title="התפתחות הציון לאורך זמן" height={300} />
        </div>
      </div>
      
      {/* טבלת השיחות המפורטת */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-semibold mb-4">פירוט שיחות</h2>
        
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  מועד ושעה
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  סוג שיחה
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  ציון ממוצע
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  דגל אדום
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  משך זמן
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  בוצעה סימולציה
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  פעולות
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {calls.map((call) => (
                <tr key={call.id}>
                  <td className="px-4 py-3 whitespace-nowrap">
                    {new Date(call.created_at).toLocaleDateString('he-IL')} {new Date(call.created_at).toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' })}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    {call.call_type}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <span 
                      className={`px-2 py-1 rounded text-xs font-bold ${
                        call.overall_score && call.overall_score >= 7 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-red-100 text-red-800'
                      }`}
                    >
                      {call.overall_score ? call.overall_score.toFixed(1) : '-'}
                    </span>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-center">
                    {call.red_flag ? 
                      <span className="text-red-600 font-bold">כן</span> : 
                      <span className="text-green-600">לא</span>
                    }
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    {call.audio_duration_seconds ? 
                      `${Math.floor(call.audio_duration_seconds / 60)}:${(Math.floor(call.audio_duration_seconds % 60)).toString().padStart(2, '0')}` : 
                      '-'
                    }
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-center">
                    {call.has_simulation ? 
                      <span className="text-blue-600 font-bold">כן</span> : 
                      <span className="text-gray-500">לא</span>
                    }
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <Link href={`/dashboard/calls/${call.id}`} className="text-blue-600 hover:text-blue-900">
                      דוח שיחה
                    </Link>
                  </td>
                </tr>
              ))}
              {calls.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-4 text-center text-gray-500">
                    לא נמצאו שיחות בטווח התאריכים המבוקש
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
} 