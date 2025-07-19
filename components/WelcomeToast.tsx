'use client'

import { useState, useEffect } from 'react'
import { X, Star, Clock, Users, Sparkles } from 'lucide-react'

interface WelcomeToastProps {
  userName: string
  userType?: 'agent' | 'manager' | 'owner' | 'admin'
  isNewSignup?: boolean
  planName?: string
  trialDays?: number
}

export default function WelcomeToast({ 
  userName, 
  userType = 'agent',
  isNewSignup = false,
  planName,
  trialDays 
}: WelcomeToastProps) {
  const [isVisible, setIsVisible] = useState(true)
  
  // אוטומטית נסגור את ההודעה אחרי זמן מתאים
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsVisible(false)
    }, isNewSignup ? 8000 : 5000) // הרשמה חדשה נשארת יותר זמן
    
    return () => clearTimeout(timer)
  }, [isNewSignup])
  
  if (!isVisible) return null

  const getMessage = () => {
    if (isNewSignup) {
      return {
        title: `🎉 ברוכים הבאים ${userName}!`,
        subtitle: `החשבון שלכם נוצר בהצלחה${planName ? ` עם חבילת ${planName}` : ''}`,
        details: trialDays ? `יש לכם ${trialDays} ימי ניסיון חינם!` : 'בואו נתחיל לאמן את הצוות!',
        icon: <Star className="w-6 h-6 text-yellow-500" />,
        bgColor: 'bg-gradient-to-r from-blue-50 to-green-50',
        borderColor: 'border-blue-500'
      }
    }

    switch (userType) {
      case 'agent':
        return {
          title: `שלום ${userName}!`,
          subtitle: 'ברוכים הבאים לפלטפורמת האימון',
          details: 'הזמן לשפר את כישורי המכירות! 🎯',
          icon: <Users className="w-6 h-6 text-blue-500" />,
          bgColor: 'bg-blue-50',
          borderColor: 'border-blue-500'
        }
      case 'manager':
        return {
          title: `שלום ${userName}!`,
          subtitle: 'דשבורד הניהול שלכם מוכן',
          details: 'עקבו אחר ההתקדמות של כל הצוות 📊',
          icon: <Clock className="w-6 h-6 text-green-500" />,
          bgColor: 'bg-green-50',
          borderColor: 'border-green-500'
        }
      case 'owner':
        return {
          title: `שלום ${userName}!`,
          subtitle: 'ברוכים הבאים לדשבורד הניהול',
          details: 'שליטה מלאה על המערכת 👑',
          icon: <Star className="w-6 h-6 text-purple-500" />,
          bgColor: 'bg-purple-50',
          borderColor: 'border-purple-500'
        }
      case 'admin':
        return {
          title: `שלום ${userName}!`,
          subtitle: 'גישת אדמין פעילה',
          details: 'כל הכלים זמינים לכם 🔧',
          icon: <Sparkles className="w-6 h-6 text-orange-500" />,
          bgColor: 'bg-orange-50',
          borderColor: 'border-orange-500'
        }
      default:
        return {
          title: `שלום ${userName}!`,
          subtitle: 'ברוכים הבאים!',
          details: 'בואו נתחיל! 🎉',
          icon: <Users className="w-6 h-6 text-blue-500" />,
          bgColor: 'bg-blue-50',
          borderColor: 'border-blue-500'
        }
    }
  }

  const messageData = getMessage()
  
  return (
    <div className={`fixed top-5 right-5 ${messageData.bgColor} border-r-4 ${messageData.borderColor} p-6 rounded-lg shadow-lg z-50 max-w-sm transition-all duration-300 hover:shadow-xl`}>
      <div className="flex justify-between items-start">
        <div className="flex items-start space-x-3 space-x-reverse">
          <div className="flex-shrink-0 mt-1">
            {messageData.icon}
          </div>
          <div className="flex-1">
            <h3 className="font-bold text-gray-800 text-lg mb-1">
              {messageData.title}
            </h3>
            <p className="text-gray-700 text-sm mb-2">
              {messageData.subtitle}
            </p>
            <p className="text-gray-600 text-sm">
              {messageData.details}
            </p>
          </div>
        </div>
        <button 
          onClick={() => setIsVisible(false)}
          className="text-gray-400 hover:text-gray-600 transition-colors ml-2"
        >
          <X className="w-5 h-5" />
        </button>
      </div>
    </div>
  )
} 