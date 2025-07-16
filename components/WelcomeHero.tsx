'use client'

import { Calendar, Sparkles } from 'lucide-react'

interface WelcomeHeroProps {
  agentInfo: {
    full_name: string | null
    email: string | null
    avatar_url?: string | null
  } | null
  targetUserInfo?: { 
    full_name: string | null
    email: string 
  } | null
  isViewingOtherAgent?: boolean
}

// פונקציה לברכה לפי שעה
const getTimeBasedGreeting = () => {
  const hour = new Date().getHours()
  
  if (hour >= 5 && hour < 12) {
    return 'בוקר טוב'
  } else if (hour >= 12 && hour < 17) {
    return 'צהריים טובים'
  } else if (hour >= 17 && hour < 22) {
    return 'ערב טוב'
  } else {
    return 'לילה טוב'
  }
}

export default function WelcomeHero({ agentInfo, targetUserInfo, isViewingOtherAgent }: WelcomeHeroProps) {
  const displayName = targetUserInfo?.full_name || agentInfo?.full_name || 'נציג'
  const isViewing = !!targetUserInfo
  const greeting = getTimeBasedGreeting()

  return (
    <div className="relative overflow-hidden bg-gradient-to-br from-glacier-primary-500 via-glacier-accent-500 to-glacier-secondary-500 rounded-3xl p-8 shadow-glacier-glow animate-in fade-in duration-700">
      {/* אפקטים מתקדמים ברקע */}
      <div className="absolute inset-0">
        <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent" />
        <div className="absolute -top-10 -right-10 w-40 h-40 bg-white/10 rounded-full blur-3xl animate-glacier-float" />
        <div className="absolute -bottom-10 -left-10 w-60 h-60 bg-glacier-accent-300/20 rounded-full blur-3xl animate-glacier-float-delayed" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-gradient-to-br from-glacier-primary-300/20 to-glacier-accent-300/20 rounded-full blur-3xl animate-glacier-pulse" />
      </div>
      
      <div className="relative">
        {/* כותרת פשוטה עם ברכה לפי שעה */}
        <div className="text-glacier-neutral-900 text-center">
          <div className="flex items-center justify-center gap-3 mb-2">
            <h1 className="text-4xl font-bold animate-in slide-in-from-bottom duration-500 delay-100 text-glacier-neutral-900">
              {isViewing ? `נתוני ביצועים של ${displayName}` : `${greeting}, ${displayName}!`}
            </h1>
            {!isViewing && (
              <Sparkles className="w-8 h-8 text-glacier-accent-600 animate-glacier-sparkle" />
            )}
          </div>
          
          <p className="text-glacier-neutral-700 text-xl mb-3 animate-in slide-in-from-bottom duration-500 delay-200">
            {isViewing 
              ? '📊 צפייה בדשבורד אג׳נט' 
              : '🚀 פלטפורמת Coachee - חדר הכושר המכירתי שלך'
            }
          </p>
          
          <div className="flex items-center justify-center gap-3 text-glacier-neutral-600 text-sm animate-in slide-in-from-bottom duration-500 delay-300">
            <Calendar className="w-4 h-4" />
            <span className="font-medium">
              {new Date().toLocaleDateString('he-IL', { 
                weekday: 'long', 
                year: 'numeric', 
                month: 'long', 
                day: 'numeric' 
              })}
            </span>
          </div>
        </div>
      </div>
    </div>
  )
} 