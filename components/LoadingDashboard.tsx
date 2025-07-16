'use client'

import { useState, useEffect } from 'react'
import { TrendingUp, BarChart3, Users, Target } from 'lucide-react'

const loadingSteps = [
  { icon: TrendingUp, text: 'טוען נתוני ביצועים', delay: 0 },
  { icon: BarChart3, text: 'מחשב סטטיסטיקות', delay: 500 },
  { icon: Users, text: 'מכין המלצות אישיות', delay: 1000 },
  { icon: Target, text: 'מגדיר יעדים חכמים', delay: 1500 }
]

export default function LoadingDashboard() {
  const [currentStep, setCurrentStep] = useState(0)
  const [completedSteps, setCompletedSteps] = useState<number[]>([])

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentStep(prev => {
        const next = (prev + 1) % loadingSteps.length
        if (next === 0) {
          // Reset completed steps when cycle restarts
          setCompletedSteps([])
        } else {
          setCompletedSteps(prevCompleted => [...prevCompleted, prev])
        }
        return next
      })
    }, 600)

    return () => clearInterval(timer)
  }, [])

  return (
    <div className="flex justify-center items-center min-h-screen bg-gradient-to-br from-glacier-neutral-50 via-white to-glacier-primary-50/30">
      <div className="text-center max-w-md animate-in fade-in duration-500">
        
        {/* לוגו ראשי */}
        <div className="relative mb-8">
          <div className="w-24 h-24 bg-gradient-to-br from-glacier-primary-400 to-glacier-accent-500 rounded-3xl flex items-center justify-center mx-auto shadow-glacier-glow animate-glacier-pulse">
            <TrendingUp className="w-12 h-12 text-white" />
          </div>
          {/* אפקטי זוהר */}
          <div className="absolute -inset-4 bg-gradient-to-br from-glacier-primary-200/50 to-glacier-accent-200/50 rounded-full blur-xl opacity-60 animate-glacier-glow"></div>
        </div>

        {/* כותרת */}
        <h1 className="text-3xl font-bold text-glacier-neutral-900 mb-2 animate-in slide-in-from-bottom duration-500 delay-200">
          מכין את דשבורד Coachee שלך
        </h1>
        <p className="text-glacier-neutral-600 mb-8 animate-in slide-in-from-bottom duration-500 delay-300">
          מעבד נתונים ומכין תובנות מותאמות אישית
        </p>

        {/* שלבי הטעינה */}
        <div className="space-y-4 mb-8">
          {loadingSteps.map((step, index) => {
            const isActive = currentStep === index
            const isCompleted = completedSteps.includes(index)
            const StepIcon = step.icon

            return (
              <div 
                key={index}
                className={`
                  flex items-center gap-4 p-4 rounded-2xl transition-all duration-500
                  ${isActive 
                    ? 'bg-glacier-primary-50 border-2 border-glacier-primary-200 scale-105' 
                    : isCompleted 
                    ? 'bg-green-50 border-2 border-green-200' 
                    : 'bg-white border-2 border-glacier-neutral-100'
                  }
                `}
                style={{ animationDelay: `${step.delay}ms` }}
              >
                <div className={`
                  w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-300
                  ${isActive 
                    ? 'bg-glacier-primary-500 text-white animate-glacier-pulse' 
                    : isCompleted 
                    ? 'bg-green-500 text-white' 
                    : 'bg-glacier-neutral-200 text-glacier-neutral-600'
                  }
                `}>
                  <StepIcon className="w-5 h-5" />
                </div>
                
                <span className={`
                  font-medium transition-colors duration-300
                  ${isActive 
                    ? 'text-glacier-primary-700' 
                    : isCompleted 
                    ? 'text-green-700' 
                    : 'text-glacier-neutral-600'
                  }
                `}>
                  {step.text}
                </span>

                {isActive && (
                  <div className="mr-auto">
                    <div className="flex gap-1">
                      {[...Array(3)].map((_, i) => (
                        <div 
                          key={i}
                          className="w-2 h-2 bg-glacier-primary-500 rounded-full animate-glacier-bounce"
                          style={{ animationDelay: `${i * 200}ms` }}
                        />
                      ))}
                    </div>
                  </div>
                )}

                {isCompleted && (
                  <div className="mr-auto">
                    <div className="w-5 h-5 bg-green-500 rounded-full flex items-center justify-center">
                      <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>

        {/* מד התקדמות */}
        <div className="relative">
          <div className="w-full bg-glacier-neutral-200 rounded-full h-3 overflow-hidden">
            <div 
              className="h-full bg-gradient-to-r from-glacier-primary-500 to-glacier-accent-500 rounded-full transition-all duration-500 animate-glacier-shimmer"
              style={{ 
                width: `${((currentStep + 1) / loadingSteps.length) * 100}%`,
                backgroundSize: '200% 100%'
              }}
            />
          </div>
          <p className="text-sm text-glacier-neutral-500 mt-2">
            {Math.round(((currentStep + 1) / loadingSteps.length) * 100)}% הושלם
          </p>
        </div>

        {/* טקסט עידוד */}
        <div className="mt-8 p-4 bg-glacier-accent-50 rounded-2xl border border-glacier-accent-200">
          <p className="text-sm text-glacier-accent-700 leading-relaxed">
            💡 <strong>טיפ מקצועי:</strong> השתמש בסימולטורים שלנו להתאמן על שיחות מאתגרות ושפר את הביצועים שלך
          </p>
        </div>

      </div>
    </div>
  )
} 