'use client'

import Link from 'next/link'
import { 
  Lightbulb, 
  TrendingUp, 
  Target, 
  Star,
  ArrowRight,
  Zap,
  Upload
} from 'lucide-react'

interface DashboardRecommendationProps {
  avgScore: number
  successfulCalls: number
  totalCalls: number
  isViewingOtherAgent?: boolean
}

export default function DashboardRecommendation({ 
  avgScore, 
  successfulCalls, 
  totalCalls,
  isViewingOtherAgent 
}: DashboardRecommendationProps) {
  
  if (isViewingOtherAgent) return null

  const getRecommendation = () => {
    if (totalCalls === 0) {
      return {
        title: 'מוכן להתחיל?',
        message: 'העלה את השיחה הראשונה שלך וקבל ניתוח מקצועי מיידי עם המלצות מותאמות אישית.',
        icon: <Upload className="w-6 h-6" />,
        actionText: 'העלה שיחה ראשונה',
        actionHref: '/upload',
        color: 'primary'
      }
    }
    
    if (avgScore < 60) {
      return {
        title: 'בואו נשפר יחד',
        message: 'זהו הזמן המושלם להתמקד ביסודות: שיפור טכניקות הקשבה, בניית אמפתיה ועבודה על זיהוי צרכים של הלקוח.',
        icon: <Target className="w-6 h-6" />,
        actionText: 'התחל אימון מתקדם',
        actionHref: '/simulations',
        color: 'accent'
      }
    }
    
    if (avgScore < 75) {
      return {
        title: 'אתה בדרך הנכונה!',
        message: 'הביצועים שלך משתפרים. כעת נתמקד בחידוד טכניקות מתקדמות והעלאת רמת הביטחון במהלך השיחה.',
        icon: <TrendingUp className="w-6 h-6" />,
        actionText: 'חדד את הכישורים',
        actionHref: '/simulations',
        color: 'success'
      }
    }
    
    if (successfulCalls < 5) {
      return {
        title: 'בואו נגדיל את ההצלחות',
        message: 'יש לך בסיס מעולה! עכשיו הזמן להגדיל את מספר השיחות המצוינות ולהפוך לאלוף מכירות.',
        icon: <Star className="w-6 h-6" />,
        actionText: 'אימון להצלחות',
        actionHref: '/simulations',
        color: 'warning'
      }
    }
    
    return {
      title: 'ביצועים מעולים!',
      message: 'אתה בשיא הביצועים! המשך לתרגל טכניקות מתקדמות וחדש את הידע שלך כדי להישאר בחזית המכירות.',
      icon: <Star className="w-6 h-6" />,
      actionText: 'אימון מתקדם',
      actionHref: '/simulations',
      color: 'success'
    }
  }

  const recommendation = getRecommendation()
  
  const colorClasses = {
    primary: {
      bg: 'from-glacier-primary-50 to-glacier-primary-100',
      border: 'border-glacier-primary-200',
      icon: 'from-glacier-primary-400 to-glacier-primary-600',
      button: 'from-glacier-primary-500 to-glacier-primary-600 hover:from-glacier-primary-600 hover:to-glacier-primary-700'
    },
    accent: {
      bg: 'from-glacier-accent-50 to-glacier-accent-100',
      border: 'border-glacier-accent-200',
      icon: 'from-glacier-accent-400 to-glacier-accent-600',
      button: 'from-glacier-accent-500 to-glacier-accent-600 hover:from-glacier-accent-600 hover:to-glacier-accent-700'
    },
    success: {
      bg: 'from-green-50 to-green-100',
      border: 'border-green-200',
      icon: 'from-green-400 to-green-600',
      button: 'from-green-500 to-green-600 hover:from-green-600 hover:to-green-700'
    },
    warning: {
      bg: 'from-amber-50 to-amber-100',
      border: 'border-amber-200',
      icon: 'from-amber-400 to-amber-600',
      button: 'from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700'
    }
  }

  const colors = colorClasses[recommendation.color as keyof typeof colorClasses]

  return (
    <div className={`
      group relative overflow-hidden rounded-3xl p-6 
      bg-gradient-to-br ${colors.bg} border ${colors.border}
      shadow-glacier-soft hover:shadow-glacier-hover
      hover:-translate-y-1 coachee-smooth-appear
      transition-all duration-500
    `}>
      {/* אפקטים ברקע */}
      <div className="absolute inset-0 bg-gradient-to-br from-white/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
      <div className="absolute -top-4 -right-4 w-24 h-24 bg-gradient-to-br from-white/20 to-transparent rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
      
      <div className="relative flex items-start gap-4">
        {/* אייקון מעוצב */}
        <div className={`
          w-14 h-14 rounded-2xl bg-gradient-to-br ${colors.icon} 
          flex items-center justify-center text-white shadow-glacier-soft
          transform transition-transform duration-300 group-hover:rotate-6 group-hover:scale-110
          flex-shrink-0
        `}>
          {recommendation.icon}
          <div className="absolute inset-0 rounded-2xl bg-white/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
        </div>
        
        {/* תוכן */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-4 mb-3">
            <h3 className="text-xl font-bold text-glacier-neutral-900 group-hover:text-glacier-primary-700 transition-colors">
              {recommendation.title}
            </h3>
            <Zap className="w-5 h-5 text-glacier-accent-500 animate-glacier-sparkle flex-shrink-0" />
          </div>
          
          <p className="text-glacier-neutral-700 leading-relaxed mb-5">
            {recommendation.message}
          </p>
          
          <Link 
            href={recommendation.actionHref}
            className={`
              group/btn inline-flex items-center gap-3 px-6 py-3 
              bg-gradient-to-r ${colors.button}
              text-white rounded-2xl font-semibold shadow-glacier-soft
              transition-all duration-300 hover:scale-105 hover:-translate-y-1
              hover:shadow-glacier-hover
            `}
          >
            <span>{recommendation.actionText}</span>
            <ArrowRight className="w-4 h-4 group-hover/btn:translate-x-1 transition-transform" />
          </Link>
        </div>
      </div>
    </div>
  )
} 