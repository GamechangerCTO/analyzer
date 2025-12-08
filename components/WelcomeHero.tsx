'use client'

import { Calendar } from 'lucide-react'

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
  isManagerDashboard?: boolean
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

export default function WelcomeHero({ agentInfo, targetUserInfo, isViewingOtherAgent, isManagerDashboard }: WelcomeHeroProps) {
  const displayName = targetUserInfo?.full_name || agentInfo?.full_name || (isManagerDashboard ? 'מנהל' : 'נציג')
  const isViewing = !!targetUserInfo
  const greeting = getTimeBasedGreeting()

  return (
    <div className="relative overflow-hidden bg-brand-primary rounded-tl-3xl rounded-br-3xl rounded-tr-xl rounded-bl-xl p-8 shadow-md">
      {/* רקע עדין */}
      <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent" />
      
      <div className="relative">
        {/* כותרת */}
        <div className="text-center">
          <h1 className="text-3xl md:text-4xl font-bold text-white mb-2">
            {isViewing ? `נתוני ביצועים של ${displayName}` : `${greeting}, ${displayName}!`}
          </h1>
          
          <p className="text-white/80 text-lg mb-4">
            {isViewing 
              ? 'צפייה בדשבורד אג׳נט' 
              : isManagerDashboard 
                ? 'דשבורד ניהול הצוות - סקירה מקיפה של ביצועי החברה'
                : 'פלטפורמת Coachee - חדר הכושר המכירתי שלך'
            }
          </p>
          
          <div className="inline-flex items-center gap-2 text-white/70 text-sm bg-white/10 px-4 py-2 rounded-lg">
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
