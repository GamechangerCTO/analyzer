'use client'

import { useState, useEffect, useRef } from 'react'
import { createClient } from '@/utils/supabase/client'
import { Bell, CheckCircle, Clock, AlertTriangle, X } from 'lucide-react'
import { useRouter } from 'next/navigation'

interface Notification {
  id: string
  notification_type: string
  call_ids: string[]
  parameters_to_practice: any[]
  message: string
  created_at: string
  read_at: string | null
}

export default function SimulationNotificationBell() {
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [isOpen, setIsOpen] = useState(false)
  const [loading, setLoading] = useState(true)
  const menuRef = useRef<HTMLDivElement>(null)
  const router = useRouter()
  const supabase = createClient()
  
  // טעינת נוטיפיקציות
  useEffect(() => {
    loadNotifications()
    
    // פולינג כל 30 שניות
    const interval = setInterval(loadNotifications, 30000)
    return () => clearInterval(interval)
  }, [])

  // סגירה בלחיצה מחוץ לתפריט
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }
    
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isOpen])

  const loadNotifications = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      
      const { data, error } = await supabase
        .from('simulation_notifications')
        .select('*')
        .eq('agent_id', user.id)
        .order('created_at', { ascending: false })
        .limit(10)
      
      if (error) throw error
      
      setNotifications(data || [])
      setUnreadCount(data?.filter((n: any) => !n.read_at).length || 0)
    } catch (error) {
      console.error('Error loading notifications:', error)
    } finally {
      setLoading(false)
    }
  }

  const markAsRead = async (notificationId: string) => {
    try {
      await supabase
        .from('simulation_notifications')
        .update({ read_at: new Date().toISOString() })
        .eq('id', notificationId)
      
      setNotifications(prev => 
        prev.map(n => n.id === notificationId ? { ...n, read_at: new Date().toISOString() } : n)
      )
      setUnreadCount(prev => Math.max(0, prev - 1))
    } catch (error) {
      console.error('Error marking notification as read:', error)
    }
  }

  const markAllAsRead = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      
      await supabase
        .from('simulation_notifications')
        .update({ read_at: new Date().toISOString() })
        .eq('agent_id', user.id)
        .is('read_at', null)
      
      setNotifications(prev => 
        prev.map(n => ({ ...n, read_at: new Date().toISOString() }))
      )
      setUnreadCount(0)
    } catch (error) {
      console.error('Error marking all as read:', error)
    }
  }

  const handleNotificationClick = async (notification: Notification) => {
    await markAsRead(notification.id)
    
    if (notification.notification_type === 'auto_pending' && notification.call_ids.length > 0) {
      // יצירת סימולציה מהנוטיפיקציה
      const response = await fetch('/api/simulations/create-from-notification', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          notificationId: notification.id,
          callIds: notification.call_ids,
          weakParameters: notification.parameters_to_practice
        })
      })
      
      if (response.ok) {
        const { simulationId } = await response.json()
        
        // עדכון שהסימולציה נוצרה
        await supabase
          .from('simulation_notifications')
          .update({ simulation_created_at: new Date().toISOString() })
          .eq('id', notification.id)
        
        router.push(`/simulations/${simulationId}`)
        setIsOpen(false)
      }
    } else {
      // נוטיפיקציה אחרת - פשוט נווט לדשבורד
      router.push('/simulations')
      setIsOpen(false)
    }
  }

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'auto_pending':
        return <AlertTriangle className="w-5 h-5 text-orange-500" />
      case 'auto_overdue':
        return <Clock className="w-5 h-5 text-red-500" />
      default:
        return <Bell className="w-5 h-5 text-blue-500" />
    }
  }

  const getNotificationColor = (type: string, read: boolean) => {
    if (read) return 'bg-gray-50'
    
    switch (type) {
      case 'auto_pending':
        return 'bg-orange-50 border-r-2 border-orange-400'
      case 'auto_overdue':
        return 'bg-red-50 border-r-2 border-red-400'
      default:
        return 'bg-blue-50 border-r-2 border-blue-400'
    }
  }

  return (
    <div className="relative" ref={menuRef}>
      {/* כפתור פעמון */}
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 hover:bg-gray-100 rounded-lg transition-colors"
        aria-label="נוטיפיקציות"
      >
        <Bell className="w-6 h-6 text-gray-700" />
        {unreadCount > 0 && (
          <span className="absolute top-0 right-0 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center font-bold animate-pulse">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {/* תפריט נוטיפיקציות */}
      {isOpen && (
        <div className="absolute left-0 mt-2 w-96 bg-white rounded-xl shadow-2xl border z-50 max-h-[600px] flex flex-col">
          {/* כותרת */}
          <div className="p-4 border-b flex items-center justify-between bg-gradient-to-r from-blue-50 to-purple-50">
            <div>
              <h3 className="font-bold text-lg">🔔 נוטיפיקציות סימולציה</h3>
              {unreadCount > 0 && (
                <p className="text-sm text-gray-600">{unreadCount} חדשות</p>
              )}
            </div>
            {unreadCount > 0 && (
              <button
                onClick={markAllAsRead}
                className="text-xs text-blue-600 hover:text-blue-800 font-medium"
              >
                סמן הכל כנקרא
              </button>
            )}
          </div>

          {/* רשימת נוטיפיקציות */}
          <div className="overflow-y-auto flex-1">
            {loading ? (
              <div className="p-8 text-center text-gray-500">
                טוען...
              </div>
            ) : notifications.length === 0 ? (
              <div className="p-8 text-center">
                <div className="text-gray-400 text-5xl mb-4">🔕</div>
                <p className="text-gray-500">אין נוטיפיקציות חדשות</p>
                <p className="text-sm text-gray-400 mt-2">
                  כשיהיו המלצות לסימולציות, תראה אותן כאן
                </p>
              </div>
            ) : (
              <div className="divide-y">
                {notifications.map(notification => (
                  <button
                    key={notification.id}
                    onClick={() => handleNotificationClick(notification)}
                    className={`w-full text-right p-4 hover:bg-gray-50 transition-colors ${
                      getNotificationColor(notification.notification_type, !!notification.read_at)
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <div className="mt-1">
                        {getNotificationIcon(notification.notification_type)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className={`text-sm ${!notification.read_at ? 'font-semibold' : ''}`}>
                          {notification.message}
                        </p>
                        
                        {notification.parameters_to_practice && notification.parameters_to_practice.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-2">
                            {notification.parameters_to_practice.slice(0, 3).map((param: any, idx: number) => (
                              <span key={idx} className="px-2 py-0.5 bg-orange-200 text-orange-900 rounded-full text-xs">
                                {param.hebrewName || param.name}
                              </span>
                            ))}
                            {notification.parameters_to_practice.length > 3 && (
                              <span className="px-2 py-0.5 bg-orange-100 text-orange-700 rounded-full text-xs">
                                +{notification.parameters_to_practice.length - 3}
                              </span>
                            )}
                          </div>
                        )}
                        
                        <p className="text-xs text-gray-500 mt-2">
                          {new Date(notification.created_at).toLocaleDateString('he-IL', {
                            day: 'numeric',
                            month: 'short',
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </p>
                      </div>
                      
                      {!notification.read_at && (
                        <div className="w-2 h-2 bg-blue-500 rounded-full mt-2"></div>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* פוטר */}
          {notifications.length > 0 && (
            <div className="p-3 border-t bg-gray-50">
              <button
                onClick={() => {
                  router.push('/simulations')
                  setIsOpen(false)
                }}
                className="w-full text-center text-sm text-blue-600 hover:text-blue-800 font-medium"
              >
                צפה בכל הסימולציות →
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

