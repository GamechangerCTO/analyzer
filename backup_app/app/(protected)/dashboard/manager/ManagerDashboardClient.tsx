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
  user_id: string
}

interface User {
  id: string
  full_name: string | null
  email: string
  callsCount: number
  avgScore: number
  redFlagsCount: number
  successfulCallsCount: number
  callsByType: {
    [key: string]: number
  }
  simulationsCount: number
  improvedSimulationsCount: number
  callsToImproveCount: number
  avgDuration: number
}

interface TeamSummary {
  totalAgents: number
  totalCalls: number
  avgScore: number
  redFlagsCount: number
  successfulCallsCount: number
}

interface ManagerDashboardClientProps {
  userId: string
  companyId: string | null
}

export default function ManagerDashboardClient({ userId, companyId }: ManagerDashboardClientProps) {
  const [calls, setCalls] = useState<Call[]>([])
  const [users, setUsers] = useState<User[]>([])
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
  const [teamSummary, setTeamSummary] = useState<TeamSummary>({
    totalAgents: 0,
    totalCalls: 0,
    avgScore: 0,
    redFlagsCount: 0,
    successfulCallsCount: 0
  })
  const [progressData, setProgressData] = useState({
    labels: [] as string[],
    datasets: [
      {
        label: 'ציון ממוצע צוותי',
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
  
  // קבלת נתוני השיחות והמשתמשים בטווח התאריכים
  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true)
      
      if (!companyId) return
      
      const startDateStr = format(startDate, 'yyyy-MM-dd')
      const endDateStr = format(new Date(endDate.setHours(23, 59, 59)), 'yyyy-MM-dd HH:mm:ss')
      
      // קבלת כל השיחות של החברה בטווח התאריכים
      const { data: callsData, error: callsError } = await supabase
        .from('calls')
        .select('*')
        .eq('company_id', companyId)
        .gte('created_at', startDateStr)
        .lte('created_at', endDateStr)
        .order('created_at', { ascending: false })
      
      if (callsError) {
        console.error('Error fetching calls:', callsError)
        return
      }
      
      // קבלת הנציגים באותה חברה
      const { data: agentsData, error: agentsError } = await supabase
        .from('users')
        .select('id, full_name, email')
        .eq('company_id', companyId)
        .in('role', ['agent'])
      
      if (agentsError) {
        console.error('Error fetching agents:', agentsError)
        return
      }
      
      setCalls(callsData || [])
      
      // הפקת מידע סטטיסטי על כל נציג
      processAgentsData(agentsData || [], callsData || [])
      
      // חישוב סיכום צוותי
      processTeamSummary(agentsData || [], callsData || [])
      
      // יצירת גרף התקדמות
      generateProgressData(callsData || [])
      
      setIsLoading(false)
    }
    
    fetchData()
  }, [startDate, endDate, supabase, companyId])
  
  // עיבוד נתוני הנציגים
  const processAgentsData = (agentsData: any[], callsData: Call[]) => {
    const processedUsers: User[] = agentsData.map(agent => {
      // סינון השיחות של הנציג הנוכחי
      const agentCalls = callsData.filter(call => call.user_id === agent.id)
      
      // חישוב מספר שיחות לפי סוג
      const callsByType: {[key: string]: number} = {}
      
      agentCalls.forEach(call => {
        callsByType[call.call_type] = (callsByType[call.call_type] || 0) + 1
      })
      
      // חישוב מדדים נוספים
      const callsWithScore = agentCalls.filter(call => call.overall_score !== null)
      const avgScore = callsWithScore.length > 0 
        ? callsWithScore.reduce((sum, call) => sum + (call.overall_score || 0), 0) / callsWithScore.length
        : 0
      
      const redFlagsCount = agentCalls.filter(call => call.red_flag).length
      const successfulCallsCount = callsWithScore.filter(call => (call.overall_score || 0) >= 8).length
      const callsToImproveCount = callsWithScore.filter(call => (call.overall_score || 0) < 6).length
      
      const callsWithDuration = agentCalls.filter(call => call.audio_duration_seconds !== null)
      const avgDuration = callsWithDuration.length > 0
        ? callsWithDuration.reduce((sum, call) => sum + (call.audio_duration_seconds || 0), 0) / callsWithDuration.length
        : 0
      
      // סימולציות (מיוצג כאן באופן אקראי - יש להחליף עם המודל האמיתי)
      const simulationsCount = Math.floor(agentCalls.length * 0.3)
      const improvedSimulationsCount = Math.floor(simulationsCount * 0.7)
      
      return {
        id: agent.id,
        full_name: agent.full_name || 'ללא שם',
        email: agent.email,
        callsCount: agentCalls.length,
        avgScore,
        redFlagsCount,
        successfulCallsCount,
        callsByType,
        simulationsCount,
        improvedSimulationsCount,
        callsToImproveCount,
        avgDuration
      }
    })
    
    // מיון הנציגים לפי מספר שיחות (מהגבוה לנמוך)
    processedUsers.sort((a, b) => b.callsCount - a.callsCount)
    
    setUsers(processedUsers)
  }
  
  // עיבוד סיכום הצוות
  const processTeamSummary = (agentsData: any[], callsData: Call[]) => {
    const callsWithScore = callsData.filter(call => call.overall_score !== null)
    
    const summary: TeamSummary = {
      totalAgents: agentsData.length,
      totalCalls: callsData.length,
      avgScore: callsWithScore.length > 0 
        ? callsWithScore.reduce((sum, call) => sum + (call.overall_score || 0), 0) / callsWithScore.length
        : 0,
      redFlagsCount: callsData.filter(call => call.red_flag).length,
      successfulCallsCount: callsWithScore.filter(call => (call.overall_score || 0) >= 8).length
    }
    
    setTeamSummary(summary)
  }
  
  // יצירת נתוני גרף התקדמות
  const generateProgressData = (callsData: Call[]) => {
    // מיון השיחות לפי תאריך
    const sortedCalls = [...callsData].sort((a, b) => 
      new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
    )
    
    // קיבוץ לפי תאריכים
    const groupedByDate: {[key: string]: Call[]} = {}
    
    sortedCalls.forEach(call => {
      const dateKey = format(new Date(call.created_at), 'yyyy-MM-dd')
      if (!groupedByDate[dateKey]) {
        groupedByDate[dateKey] = []
      }
      groupedByDate[dateKey].push(call)
    })
    
    // יצירת מערכי נתונים לגרף
    const labels: string[] = []
    const avgScores: number[] = []
    
    Object.entries(groupedByDate).forEach(([dateKey, calls]) => {
      const callsWithScore = calls.filter(call => call.overall_score !== null)
      
      if (callsWithScore.length > 0) {
        const avgScore = callsWithScore.reduce((sum, call) => sum + (call.overall_score || 0), 0) / callsWithScore.length
        
        labels.push(format(new Date(dateKey), 'dd/MM'))
        avgScores.push(Number(avgScore.toFixed(1)))
      }
    })
    
    // שימוש רק ב-10 הנקודות האחרונות אם יש יותר מדי
    const maxPoints = 10
    const sliceStart = Math.max(0, labels.length - maxPoints)
    
    setProgressData({
      labels: labels.slice(sliceStart),
      datasets: [
        {
          label: 'ציון ממוצע יומי',
          data: avgScores.slice(sliceStart)
        }
      ]
    })
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
      <h1 className="text-3xl font-bold mb-6">דשבורד מנהל</h1>
      
      {/* בחירת טווח תאריכים */}
      <DateRangePicker onDateRangeChange={handleDateRangeChange} />
      
      {/* סיכום צוותי */}
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <h2 className="text-xl font-semibold mb-4">סיכום צוותי</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <div className="bg-blue-50 p-4 rounded-lg">
            <p className="text-sm text-blue-900">סה"כ נציגים</p>
            <p className="text-2xl font-bold text-blue-700">{teamSummary.totalAgents}</p>
          </div>
          <div className="bg-green-50 p-4 rounded-lg">
            <p className="text-sm text-green-900">סה"כ שיחות</p>
            <p className="text-2xl font-bold text-green-700">{teamSummary.totalCalls}</p>
          </div>
          <div className="bg-purple-50 p-4 rounded-lg">
            <p className="text-sm text-purple-900">ציון ממוצע</p>
            <p className="text-2xl font-bold text-purple-700">{teamSummary.avgScore.toFixed(1)}</p>
          </div>
          <div className="bg-red-50 p-4 rounded-lg">
            <p className="text-sm text-red-900">דגלים אדומים</p>
            <p className="text-2xl font-bold text-red-700">{teamSummary.redFlagsCount}</p>
          </div>
          <div className="bg-teal-50 p-4 rounded-lg">
            <p className="text-sm text-teal-900">שיחות מוצלחות</p>
            <p className="text-2xl font-bold text-teal-700">{teamSummary.successfulCallsCount}</p>
          </div>
        </div>
      </div>
      
      {/* גרף התקדמות */}
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <h2 className="text-xl font-semibold mb-4">מגמת הציון הצוותי</h2>
        <ProgressLineChart data={progressData} title="ציון ממוצע לאורך זמן" height={300} />
      </div>
      
      {/* טבלת נציגים */}
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <h2 className="text-xl font-semibold mb-4">פירוט לפי נציגים</h2>
        
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-3 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  נציג
                </th>
                <th className="px-3 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                  כלל שיחות
                </th>
                <th className="px-3 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                  מכירה טלפונית
                </th>
                <th className="px-3 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                  פולו אפ לפני הצעה
                </th>
                <th className="px-3 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                  פולו אפ לאחר הצעה
                </th>
                <th className="px-3 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                  תאום פגישה
                </th>
                <th className="px-3 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                  מכירה חוזרת/שדרוג
                </th>
                <th className="px-3 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                  שירות
                </th>
                <th className="px-3 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                  ציון ממוצע
                </th>
                <th className="px-3 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                  דגלים אדומים
                </th>
                <th className="px-3 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                  שיחות מוצלחות
                </th>
                <th className="px-3 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                  זמן שיחה ממוצע
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
              {users.map((user) => (
                <tr key={user.id} className="hover:bg-gray-50">
                  <td className="px-3 py-3 whitespace-nowrap">
                    <Link href={`/dashboard/agent?user=${user.id}`} className="text-blue-600 hover:text-blue-900 font-medium">
                      {user.full_name}
                    </Link>
                  </td>
                  <td className="px-3 py-3 text-center whitespace-nowrap">
                    {user.callsCount}
                  </td>
                  <td className="px-3 py-3 text-center whitespace-nowrap">
                    {user.callsByType['מכירה טלפונית'] || 0}
                  </td>
                  <td className="px-3 py-3 text-center whitespace-nowrap">
                    {user.callsByType['פולו אפ מכירה טלפונית לפניי הצעה'] || 0}
                  </td>
                  <td className="px-3 py-3 text-center whitespace-nowrap">
                    {user.callsByType['פולו אפ מכירה טלפונית –לאחר הצעה'] || 0}
                  </td>
                  <td className="px-3 py-3 text-center whitespace-nowrap">
                    {user.callsByType['תאום פגישה'] || 0}
                  </td>
                  <td className="px-3 py-3 text-center whitespace-nowrap">
                    {user.callsByType['מכירה טלפונית חוזרת /שדרוג'] || 0}
                  </td>
                  <td className="px-3 py-3 text-center whitespace-nowrap">
                    {user.callsByType['שירות'] || 0}
                  </td>
                  <td className="px-3 py-3 text-center whitespace-nowrap">
                    <span 
                      className={`px-2 py-1 rounded text-xs font-bold ${
                        user.avgScore >= 7 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-red-100 text-red-800'
                      }`}
                    >
                      {user.avgScore.toFixed(1)}
                    </span>
                  </td>
                  <td className="px-3 py-3 text-center whitespace-nowrap">
                    {user.redFlagsCount > 0 ? (
                      <span className="text-red-600 font-bold">{user.redFlagsCount}</span>
                    ) : (
                      <span>{user.redFlagsCount}</span>
                    )}
                  </td>
                  <td className="px-3 py-3 text-center whitespace-nowrap">
                    {user.successfulCallsCount}
                  </td>
                  <td className="px-3 py-3 text-center whitespace-nowrap">
                    {Math.floor(user.avgDuration / 60)}:{(Math.floor(user.avgDuration % 60)).toString().padStart(2, '0')}
                  </td>
                  <td className="px-3 py-3 text-center whitespace-nowrap">
                    {user.callsToImproveCount}
                  </td>
                  <td className="px-3 py-3 text-center whitespace-nowrap">
                    {user.simulationsCount}
                  </td>
                  <td className="px-3 py-3 text-center whitespace-nowrap">
                    {user.improvedSimulationsCount}
                  </td>
                </tr>
              ))}
              {users.length === 0 && (
                <tr>
                  <td colSpan={15} className="px-4 py-4 text-center text-gray-500">
                    לא נמצאו נציגים
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
      
      {/* גרף השוואה בין נציגים */}
      {users.length > 0 && (
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-4">ביצועי נציגים - השוואה</h2>
          <CallsBarChart 
            data={{
              labels: users.map(user => user.full_name || 'ללא שם'),
              values: users.map(user => user.avgScore)
            }} 
            title="ציון ממוצע לנציג" 
            height={300} 
          />
        </div>
      )}
    </div>
  )
} 