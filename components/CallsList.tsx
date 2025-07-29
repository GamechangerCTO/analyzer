'use client'

import Link from 'next/link'
import { 
  Upload, 
  Clock, 
  CheckCircle, 
  AlertTriangle, 
  ArrowRight,
  Calendar,
  User,
  Phone,
  Target
} from 'lucide-react'

interface Call {
  id: string
  call_type: string
  customer_name: string | null
  created_at: string
  overall_score: number | null
  processing_status: string | null
  red_flag: boolean | null
}

interface CallsListProps {
  calls: Call[]
  targetUserInfo?: { full_name: string | null; email: string } | null
  userId: string
}

export default function CallsList({ calls, targetUserInfo, userId }: CallsListProps) {
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
      'sales_call': <Phone className="w-5 h-5" />,
      'follow_up_before_offer': <Target className="w-5 h-5" />,
      'follow_up_after_offer': <CheckCircle className="w-5 h-5" />,
      'appointment_scheduling': <Calendar className="w-5 h-5" />,
      'follow_up_appointment': <Clock className="w-5 h-5" />,
      'customer_service': <User className="w-5 h-5" />
    }
    return icons[callType] || <Phone className="w-5 h-5" />
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
    if (!score) return 'bg-glacier-neutral-100 text-glacier-neutral-600'
    if (score >= 8.5) return 'bg-green-100 text-green-700 border-green-200'
    if (score >= 7) return 'bg-amber-100 text-amber-700 border-amber-200'
    return 'bg-red-100 text-red-700 border-red-200'
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-700 border-green-200'
      case 'pending':
        return 'bg-amber-100 text-amber-700 border-amber-200'
      case 'error':
        return 'bg-red-100 text-red-700 border-red-200'
      default:
        return 'bg-glacier-neutral-100 text-glacier-neutral-600 border-glacier-neutral-200'
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="w-3 h-3" />
      case 'pending':
        return <Clock className="w-3 h-3" />
      case 'error':
        return <AlertTriangle className="w-3 h-3" />
      default:
        return <Clock className="w-3 h-3" />
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

  return (
    <div className="bg-white/90 backdrop-blur-md border border-glacier-neutral-200/50 rounded-3xl shadow-glacier-soft overflow-hidden">
      {/* כותרת */}
      <div className="flex items-center justify-center p-6 border-b border-glacier-neutral-200/50 bg-gradient-to-r from-glacier-primary-50 to-glacier-accent-50">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-glacier-primary-400 to-glacier-primary-600 flex items-center justify-center text-white shadow-glacier-soft">
            <Clock className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-glacier-neutral-900">שיחות אחרונות</h2>
            <p className="text-glacier-neutral-600 text-sm">מיון לפי תאריך יצירה</p>
          </div>
        </div>
      </div>

      {/* תוכן */}
      {calls.length === 0 ? (
        <div className="text-center py-16">
          <div className="w-24 h-24 bg-gradient-to-br from-glacier-primary-100 to-glacier-accent-100 rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-glacier-soft">
            <Upload className="w-12 h-12 text-glacier-primary-600" />
          </div>
          <h3 className="text-2xl font-bold text-glacier-neutral-900 mb-3">אין עדיין שיחות</h3>
          <p className="text-glacier-neutral-600 mb-8 max-w-md mx-auto leading-relaxed">
            התחל את מסע האימון שלך על ידי העלאת השיחה הראשונה וקבל ניתוח מקצועי מיידי
          </p>
          {!targetUserInfo && (
            <Link 
              href="/upload" 
              className="inline-flex items-center gap-3 px-8 py-4 bg-gradient-to-r from-glacier-primary-500 to-glacier-accent-500 text-white rounded-2xl hover:from-glacier-primary-600 hover:to-glacier-accent-600 transition-all duration-300 hover:scale-105 shadow-glacier-soft font-semibold text-lg"
            >
              <Upload className="w-6 h-6" />
              <span>העלה שיחה ראשונה</span>
            </Link>
          )}
        </div>
      ) : (
        <div className="divide-y divide-glacier-neutral-200/30">
          {calls.slice(0, 10).map((call, index) => (
            <div 
              key={call.id} 
              className="group p-6 hover:bg-glacier-primary-50/30 transition-all duration-300 animate-in fade-in slide-in-from-bottom"
              style={{ animationDelay: `${index * 50}ms` }}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="relative">
                    <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-glacier-accent-400 to-glacier-accent-600 flex items-center justify-center text-white shadow-glacier-soft group-hover:scale-110 transition-transform duration-300">
                      {getCallTypeIcon(call.call_type)}
                    </div>
                    {call.red_flag && (
                      <div className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full flex items-center justify-center">
                        <AlertTriangle className="w-2 h-2 text-white" />
                      </div>
                    )}
                  </div>
                  <div>
                    <h4 className="font-semibold text-lg text-glacier-neutral-900 group-hover:text-glacier-primary-700 transition-colors">
                      {call.customer_name || 'לקוח ללא שם'}
                    </h4>
                    <div className="flex items-center gap-3 mt-1">
                      <span className="text-sm text-glacier-neutral-600 font-medium">
                        {getCallTypeName(call.call_type)}
                      </span>
                      <div className="w-1 h-1 bg-glacier-neutral-400 rounded-full"></div>
                      <span className="text-sm text-glacier-neutral-500">
                        {formatDate(call.created_at)}
                      </span>
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center gap-3">
                  {/* ציון */}
                  {call.overall_score && (
                    <div className={`
                      px-3 py-2 rounded-xl text-sm font-bold flex items-center gap-1 border
                      ${getScoreColor(call.overall_score)}
                    `}>
                      <span>{call.overall_score.toFixed(1)}</span>
                      {call.red_flag && <AlertTriangle className="w-3 h-3" />}
                    </div>
                  )}
                  
                  {/* סטטוס */}
                  <div className={`
                    px-3 py-2 rounded-xl text-xs font-medium flex items-center gap-1 border
                    ${getStatusColor(call.processing_status || 'pending')}
                  `}>
                    {getStatusIcon(call.processing_status || 'pending')}
                    <span>{getStatusText(call.processing_status || 'pending')}</span>
                  </div>
                  
                  {/* כפתור צפייה */}
                  {call.processing_status === 'completed' && (
                    <Link 
                      href={`/call/${call.id}`}
                      className="group/link flex items-center gap-2 px-4 py-2 bg-glacier-primary-500 text-white rounded-xl hover:bg-glacier-primary-600 transition-all duration-300 hover:scale-105 shadow-glacier-soft text-sm font-medium"
                    >
                      <span>צפה בניתוח</span>
                      <ArrowRight className="w-4 h-4 group-hover/link:translate-x-1 transition-transform" />
                    </Link>
                  )}
                </div>
              </div>
            </div>
          ))}
          
          {/* קישורים נוספים */}
          <div className="p-6 bg-glacier-neutral-50/50">
            <div className="flex items-center justify-between">
              <p className="text-sm text-glacier-neutral-600">
                מציג {Math.min(calls.length, 10)} מתוך {calls.length} שיחות
              </p>
              <Link 
                href={targetUserInfo ? `/dashboard/calls?agent=${userId}` : '/dashboard/calls'}
                className="flex items-center gap-2 text-sm font-medium text-glacier-primary-600 hover:text-glacier-primary-700 transition-colors"
              >
                <span>צפה בכל השיחות</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
        </div>
      )}
    </div>
  )
} 