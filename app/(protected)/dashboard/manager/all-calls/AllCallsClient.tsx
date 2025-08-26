'use client'

import React, { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import { getSupabaseClient } from '@/lib/supabase/client'
import { format } from 'date-fns'
import { he } from 'date-fns/locale'
import { 
  Calendar, 
  Clock, 
  CheckCircle, 
  AlertTriangle, 
  Phone, 
  Target, 
  User,
  Eye,
  ArrowRight
} from 'lucide-react'
import AdvancedDataTable from '@/components/AdvancedDataTable'

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
  agent_role?: string | null
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

  const supabase = getSupabaseClient()

  const fetchCalls = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)

      // קודם נמצא את כל המשתמשים בחברה (נציגים בלבד)
      const { data: users, error: usersError } = await supabase
        .from('users')
        .select('id, full_name, email, role')
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
          agent_email: user?.email || null,
          agent_role: user?.role || null
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

  // Helper functions
  const formatDate = (dateString: string) => {
    return format(new Date(dateString), 'dd/MM/yyyy HH:mm', { locale: he })
  }

  const formatDuration = (seconds: number | null) => {
    if (!seconds) return 'לא ידוע'
    const minutes = Math.floor(seconds / 60)
    const remainingSeconds = seconds % 60
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`
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

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      'completed': { color: 'bg-green-100 text-green-800', text: 'הושלם' },
      'processing': { color: 'bg-yellow-100 text-yellow-800', text: 'בעיבוד' },
      'failed': { color: 'bg-red-100 text-red-800', text: 'נכשל' },
      'pending': { color: 'bg-blue-100 text-blue-800', text: 'ממתין' }
    }
    
    const config = statusConfig[status as keyof typeof statusConfig] || { 
      color: 'bg-gray-100 text-gray-800', 
      text: status 
    }
    
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${config.color}`}>
        {config.text}
      </span>
    )
  }

  const getScoreBadge = (score: number | null) => {
    if (!score) {
      return <span className="px-2 py-1 bg-gray-100 text-gray-800 rounded-full text-xs font-medium">אין ציון</span>
    }
    
    let colorClass = ''
    if (score >= 8) colorClass = 'bg-green-100 text-green-800'
    else if (score >= 6) colorClass = 'bg-yellow-100 text-yellow-800'
    else if (score >= 4) colorClass = 'bg-orange-100 text-orange-800'
    else colorClass = 'bg-red-100 text-red-800'
    
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${colorClass}`}>
        {score.toFixed(1)}
      </span>
    )
  }

  // Get unique values for filters
  const uniqueAgents = React.useMemo(() => {
    const agentSet = new Set(calls.map(call => call.agent_name).filter(Boolean))
    return Array.from(agentSet).sort().map(name => ({ value: name as string, label: name as string }))
  }, [calls])

  const uniqueCallTypes = React.useMemo(() => {
    const typeSet = new Set(calls.map(call => call.call_type).filter(Boolean))
    return Array.from(typeSet).sort().map(type => ({ 
      value: type as string, 
      label: getCallTypeName(type) as string
    }))
  }, [calls])

  const statusOptions = [
    { value: 'completed', label: 'הושלם' },
    { value: 'processing', label: 'בעיבוד' },
    { value: 'failed', label: 'נכשל' },
    { value: 'pending', label: 'ממתין' }
  ]

  const scoreRangeOptions = [
    { value: 'high', label: 'גבוה (8+)' },
    { value: 'medium', label: 'בינוני (6-8)' },
    { value: 'low', label: 'נמוך (4-6)' },
    { value: 'very_low', label: 'נמוך מאוד (<4)' }
  ]

  // Define table columns
  const columns = [
    {
      key: 'created_at',
      title: 'תאריך ושעה',
      sortable: true,
      filterable: true,
      filterType: 'date' as const,
      width: 'w-[15%]',
      render: (value: string) => (
        <div className="flex items-center gap-2">
          <Calendar className="w-4 h-4 text-gray-400" />
          <span className="font-medium">{formatDate(value)}</span>
        </div>
      )
    },
    {
      key: 'agent_name',
      title: 'נציג',
      sortable: true,
      filterable: true,
      filterType: 'select' as const,
      filterOptions: uniqueAgents,
      width: 'w-[15%]',
      render: (value: string) => (
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center text-white font-bold text-sm">
            {value?.charAt(0) || '?'}
          </div>
          <span className="font-medium">{value || 'לא ידוע'}</span>
        </div>
      )
    },
    {
      key: 'call_type',
      title: 'סוג שיחה',
      sortable: true,
      filterable: true,
      filterType: 'select' as const,
      filterOptions: uniqueCallTypes,
      width: 'w-[12%]',
      render: (value: string) => (
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center text-white">
            {getCallTypeIcon(value)}
          </div>
          <span className="font-medium">{getCallTypeName(value)}</span>
        </div>
      )
    },
    {
      key: 'customer_name',
      title: 'שם לקוח',
      sortable: true,
      filterable: true,
      width: 'w-[20%]',
      render: (value: string, row: Call) => (
        <div className="flex items-center gap-2">
          <span className="font-medium">{value || 'לקוח ללא שם'}</span>
          {row.red_flag && (
            <div className="flex items-center gap-1">
              <AlertTriangle className="w-4 h-4 text-red-500" />
              <span className="text-xs text-red-600 font-medium">דגל אדום</span>
            </div>
          )}
        </div>
      )
    },
    {
      key: 'overall_score',
      title: 'ציון',
      sortable: true,
      filterable: true,
      filterType: 'select' as const,
      filterOptions: scoreRangeOptions,
      width: 'w-[8%]',
      render: (value: number | null) => getScoreBadge(value)
    },
    {
      key: 'audio_duration_seconds',
      title: 'משך שיחה',
      sortable: true,
      filterable: true,
      filterType: 'number' as const,
      width: 'w-[10%]',
      render: (value: number | null) => (
        <div className="flex items-center gap-2">
          <Clock className="w-4 h-4 text-gray-400" />
          <span>{formatDuration(value)}</span>
        </div>
      )
    },
    {
      key: 'processing_status',
      title: 'סטטוס',
      sortable: true,
      filterable: true,
      filterType: 'select' as const,
      filterOptions: statusOptions,
      width: 'w-[8%]',
      render: (value: string) => getStatusBadge(value || 'pending')
    },
    {
      key: 'id',
      title: 'פעולות',
      sortable: false,
      filterable: false,
      searchable: false,
      width: 'w-[12%]',
      render: (value: string, row: Call) => (
        <div className="flex items-center gap-2">
          {row.processing_status === 'completed' && (
            <Link 
              href={`/call/${value}`}
              className="inline-flex items-center gap-1 px-3 py-1 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-xs font-medium"
            >
              <Eye className="w-3 h-3" />
              <span>צפה</span>
            </Link>
          )}
          {row.agent_role === 'agent' && (
            <Link 
              href={`/dashboard/agent?user=${row.user_id}`}
              className="inline-flex items-center gap-1 px-3 py-1 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors text-xs font-medium"
              title="עבור לדשבורד הנציג"
            >
              <User className="w-3 h-3" />
              <span>נציג</span>
            </Link>
          )}
        </div>
      )
    }
  ]

  // Custom export function
  const handleExport = () => {
    const headers = [
      'תאריך ושעה',
      'נציג',
      'סוג שיחה', 
      'שם לקוח',
      'ציון',
      'משך שיחה',
      'סטטוס',
      'דגל אדום',
      'מזהה שיחה'
    ].join(',')
    
    const rows = calls.map(call => [
      formatDate(call.created_at),
      call.agent_name || '',
      getCallTypeName(call.call_type),
      call.customer_name || '',
      call.overall_score || '',
      formatDuration(call.audio_duration_seconds),
      call.processing_status || '',
      call.red_flag ? 'כן' : 'לא',
      call.id
    ].map(field => `"${String(field).replace(/"/g, '""')}"`).join(',')).join('\n')
    
    const csv = `${headers}\n${rows}`
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${companyName}_calls_export_${new Date().toISOString().split('T')[0]}.csv`
    a.click()
    window.URL.revokeObjectURL(url)
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="bg-red-100 text-red-700 p-4 rounded-lg">
            <h2 className="text-lg font-semibold mb-2">שגיאה בטעינת הנתונים</h2>
            <p>{error}</p>
            <button 
              onClick={fetchCalls}
              className="mt-4 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
            >
              נסה שוב
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        
        {/* Header */}
        <div className="mb-8">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">כל השיחות - {companyName}</h1>
              <p className="mt-2 text-gray-600">ניהול וצפייה בכל שיחות הצוות עם פילטרים מתקדמים</p>
            </div>
            <Link 
              href="/dashboard/manager" 
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors"
            >
              <ArrowRight className="w-4 h-4" />
              חזרה לדשבורד
            </Link>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
            <div className="flex items-center">
              <div className="p-3 bg-blue-100 rounded-xl">
                <Phone className="w-6 h-6 text-blue-600" />
              </div>
              <div className="mr-4">
                <p className="text-sm font-medium text-gray-600">סה"כ שיחות</p>
                <p className="text-2xl font-bold text-gray-900">{calls.length}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
            <div className="flex items-center">
              <div className="p-3 bg-green-100 rounded-xl">
                <CheckCircle className="w-6 h-6 text-green-600" />
              </div>
              <div className="mr-4">
                <p className="text-sm font-medium text-gray-600">שיחות שהושלמו</p>
                <p className="text-2xl font-bold text-gray-900">
                  {calls.filter(call => call.processing_status === 'completed').length}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
            <div className="flex items-center">
              <div className="p-3 bg-purple-100 rounded-xl">
                <Target className="w-6 h-6 text-purple-600" />
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

          <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
            <div className="flex items-center">
              <div className="p-3 bg-red-100 rounded-xl">
                <AlertTriangle className="w-6 h-6 text-red-600" />
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

        {/* Advanced Data Table */}
        <AdvancedDataTable
          data={calls}
          columns={columns}
          loading={loading}
          title="טבלת שיחות מתקדמת"
          subtitle={`${calls.length} שיחות עם אפשרויות סינון, מיון וחיפוש מתקדמות`}
          onRefresh={fetchCalls}
          onExport={handleExport}
          globalSearch={true}
          pagination={true}
          pageSize={20}
          className="shadow-xl"
        />

      </div>
    </div>
  )
} 