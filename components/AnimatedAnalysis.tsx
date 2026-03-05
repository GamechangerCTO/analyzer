'use client'

import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  Mic2, 
  Brain, 
  Search, 
  TrendingUp, 
  Sparkles, 
  Clock, 
  User, 
  MessageSquare,
  Volume2,
  Target,
  Lightbulb,
  Star,
  CheckCircle,
  Activity
} from 'lucide-react'

interface AnalysisStep {
  id: string
  icon: React.ComponentType<any>
  title: string
  description: string
  duration: number
  color: string
}

interface SalesTip {
  icon: React.ComponentType<any>
  text: string
  category: string
}

interface CallInsight {
  icon: React.ComponentType<any>
  label: string
  value: string
  color: string
}

const ANALYSIS_STEPS: AnalysisStep[] = [
  {
    id: 'transcription',
    icon: Mic2,
    title: 'מתמלל את השיחה',
    description: 'מפענח את הקול לטקסט עם דיוק גבוה',
    duration: 3000,
    color: 'from-brand-primary to-brand-primary-dark'
  },
  {
    id: 'tone',
    icon: Brain,
    title: 'מנתח טונציה ורגשות',
    description: 'זיהוי רגשות, טון דיבור ואנרגיה',
    duration: 4000,
    color: 'from-brand-info to-brand-info-dark'
  },
  {
    id: 'content',
    icon: Search,
    title: 'מזהה נקודות מפתח',
    description: 'חיפוש נושאים חשובים ומילות מפתח',
    duration: 3500,
    color: 'from-green-500 to-green-600'
  },
  {
    id: 'scoring',
    icon: TrendingUp,
    title: 'מחשב ציון ומשוב',
    description: 'הערכה מקצועית של הביצועים',
    duration: 3000,
    color: 'from-orange-500 to-orange-600'
  },
  {
    id: 'insights',
    icon: Sparkles,
    title: 'מכין תובנות מותאמות',
    description: 'יצירת המלצות אישיות לשיפור',
    duration: 2500,
    color: 'from-pink-500 to-pink-600'
  }
]

const SALES_TIPS: SalesTip[] = [
  {
    icon: MessageSquare,
    text: 'שאלות פתוחות יוצרות מעורבות גבוהה יותר מהלקוח',
    category: 'תקשורת'
  },
  {
    icon: User,
    text: 'לקוחות אוהבים כשמזכירים את השם שלהם במהלך השיחה',
    category: 'קשר אישי'
  },
  {
    icon: Clock,
    text: 'הקשבה פעילה חשובה יותר מדיבור מהיר',
    category: 'הקשבה'
  },
  {
    icon: Target,
    text: 'זיהוי צרכים לפני הצגת פתרונות מגביר סיכויי הצלחה',
    category: 'אסטרטגיה'
  },
  {
    icon: Star,
    text: 'סיפורי הצלחה של לקוחות אחרים בונים אמון',
    category: 'אמינות'
  },
  {
    icon: Volume2,
    text: 'טון דיבור חיובי משפיע יותר מהתוכן עצמו',
    category: 'טונציה'
  },
  {
    icon: Lightbulb,
    text: 'הדגמת ערך ברור עדיפה על פירוט תכונות',
    category: 'מכירה'
  },
  {
    icon: Activity,
    text: 'מעקב אחר אותות לא מילוליים יכול לחשוף התנגדויות',
    category: 'קריאת לקוח'
  }
]

interface AnimatedAnalysisProps {
  callId: string
  audioFile?: File
  onComplete?: () => void
}

export default function AnimatedAnalysis({ callId, audioFile, onComplete }: AnimatedAnalysisProps) {
  const [currentStep, setCurrentStep] = useState(0)
  const [progress, setProgress] = useState(0)
  const [currentTip, setCurrentTip] = useState(0)
  const [callInsights, setCallInsights] = useState<CallInsight[]>([])
  const [completedSteps, setCompletedSteps] = useState<string[]>([])
  const [callLogs, setCallLogs] = useState<Array<{timestamp: string; message: string; data?: any}>>([])
  const [callStatus, setCallStatus] = useState<string>('pending')
  const [realProgress, setRealProgress] = useState(0)

  // Fetch call logs and status
  useEffect(() => {
    const fetchCallLogs = async () => {
      try {
        const response = await fetch(`/api/call-logs/${callId}`)
        if (response.ok) {
          const { logs } = await response.json()
          setCallLogs(logs || [])
        }
      } catch (error) {
        console.error('Error fetching call logs:', error)
      }
    }

    // Initial fetch
    fetchCallLogs()

    // Poll for updates every 2 seconds
    const interval = setInterval(fetchCallLogs, 2000)
    return () => clearInterval(interval)
  }, [callId])

  // Analyze logs to determine current step and progress
  useEffect(() => {
    if (callLogs.length === 0) return

    const latestLog = callLogs[callLogs.length - 1]
    const logMessage = latestLog.message.toLowerCase()

    // Map log messages to steps
    let newStep = 0
    let newProgress = 0

    if (logMessage.includes('תמלול') || logMessage.includes('transcrib')) {
      newStep = 0
      newProgress = 20
    } else if (logMessage.includes('טונציה') || logMessage.includes('tone') || logMessage.includes('רגש')) {
      newStep = 1
      newProgress = 40
    } else if (logMessage.includes('תוכן') || logMessage.includes('content') || logMessage.includes('נקודות מפתח')) {
      newStep = 2
      newProgress = 60
    } else if (logMessage.includes('ציון') || logMessage.includes('משוב') || logMessage.includes('דוח')) {
      newStep = 3
      newProgress = 80
    } else if (logMessage.includes('תובנות') || logMessage.includes('הושלם') || logMessage.includes('סיום')) {
      newStep = 4
      newProgress = 100
    }

    // Update completed steps
    const newCompletedSteps = ANALYSIS_STEPS.slice(0, newStep).map(step => step.id)
    
    setCurrentStep(newStep)
    setRealProgress(newProgress)
    setCompletedSteps(newCompletedSteps)

    // Check if analysis is complete
    if (logMessage.includes('הושלם') || logMessage.includes('completed') || newProgress >= 100) {
      setCompletedSteps(ANALYSIS_STEPS.map(step => step.id))
      setTimeout(() => {
        onComplete?.()
      }, 2000)
    }
  }, [callLogs, onComplete])

  // Extract insights from call logs
  useEffect(() => {
    const extractInsightsFromLogs = () => {
      let duration = 'מזהה...'
      let wordsCount = 'מעבד...'
      let participants = '2 (נציג + לקוח)'

      // Look for duration in logs
      for (const log of callLogs) {
        if (log.data?.duration_seconds) {
          const seconds = log.data.duration_seconds
          const minutes = Math.floor(seconds / 60)
          const remainingSeconds = seconds % 60
          duration = `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`
        }

        // Look for word count or transcript info
        if (log.message.includes('מילים') || log.message.includes('תמלול')) {
          // Try to extract number from message
          const numbers = log.message.match(/\d+/g)
          if (numbers && numbers.length > 0) {
            wordsCount = `~${numbers[0]} מילים`
          } else if (log.message.includes('הושלם') || log.message.includes('completed')) {
            wordsCount = 'הושלם'
          }
        }

        // Look for transcript segments
        if (log.data?.segments_count) {
          wordsCount = `${log.data.segments_count} קטעים`
        }
      }

      setCallInsights([
        {
          icon: Clock,
          label: 'זמן השיחה',
          value: duration,
          color: 'text-brand-primary'
        },
        {
          icon: User,
          label: 'משתתפים',
          value: participants,
          color: 'text-green-600'
        },
        {
          icon: MessageSquare,
          label: 'תמלול',
          value: wordsCount,
          color: 'text-brand-info'
        }
      ])
    }

    extractInsightsFromLogs()
  }, [callLogs])

  // Update progress with smooth animation
  useEffect(() => {
    if (realProgress !== progress) {
      const diff = realProgress - progress
      const step = diff / 20 // Smooth transition over 20 steps
      
      const interval = setInterval(() => {
        setProgress(prev => {
          const newProgress = prev + step
          if (Math.abs(newProgress - realProgress) < 1) {
            clearInterval(interval)
            return realProgress
          }
          return newProgress
        })
      }, 50)

      return () => clearInterval(interval)
    }
  }, [realProgress, progress])

  // Rotate tips
  useEffect(() => {
    const tipInterval = setInterval(() => {
      setCurrentTip(prev => (prev + 1) % SALES_TIPS.length)
    }, 4000)

    return () => clearInterval(tipInterval)
  }, [])

  const CurrentStepIcon = ANALYSIS_STEPS[currentStep]?.icon || Sparkles

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-brand-info-light p-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: "spring", duration: 0.6 }}
            className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-brand-primary to-brand-info rounded-full mb-4"
          >
            <CurrentStepIcon className="w-10 h-10 text-white" />
          </motion.div>
          
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-3xl font-bold text-gray-900 mb-2"
          >
            מנתח את השיחה שלך
          </motion.h1>
          
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="text-gray-600"
          >
            המערכת מעבדת את השיחה ומכינה תובנות מותאמות אישית
          </motion.p>
        </div>

        {/* Progress Section */}
        <div className="bg-white rounded-2xl shadow-lg p-8 mb-8">
          {/* Overall Progress Bar */}
          <div className="mb-8">
            <div className="flex justify-between items-center mb-3">
              <span className="text-sm font-medium text-gray-700">התקדמות כללית</span>
              <span className="text-sm font-medium text-gray-700">{Math.round(progress)}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-3">
              <motion.div
                className="bg-gradient-to-r from-brand-primary to-brand-info h-3 rounded-full"
                initial={{ width: 0 }}
                animate={{ width: `${progress}%` }}
                transition={{ duration: 0.5 }}
              />
            </div>
          </div>

          {/* Steps */}
          <div className="space-y-4">
            {ANALYSIS_STEPS.map((step, index) => {
              const isCompleted = completedSteps.includes(step.id)
              const isCurrent = currentStep === index
              const StepIcon = step.icon

              return (
                <motion.div
                  key={step.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className={`flex items-center p-4 rounded-xl transition-all duration-300 ${
                    isCurrent 
                      ? 'bg-gradient-to-r ' + step.color + ' text-white' 
                      : isCompleted 
                        ? 'bg-green-50 text-green-800'
                        : 'bg-gray-50 text-gray-600'
                  }`}
                >
                  <div className={`flex-shrink-0 w-12 h-12 rounded-full flex items-center justify-center ${
                    isCurrent ? 'bg-white/20' : isCompleted ? 'bg-green-100' : 'bg-white'
                  }`}>
                    {isCompleted ? (
                      <CheckCircle className="w-6 h-6 text-green-600" />
                    ) : (
                      <StepIcon className={`w-6 h-6 ${isCurrent ? 'text-white' : 'text-gray-600'}`} />
                    )}
                  </div>
                  
                  <div className="mr-4 flex-1">
                    <h3 className="font-semibold">{step.title}</h3>
                    <p className={`text-sm ${isCurrent ? 'text-white/90' : isCompleted ? 'text-green-600' : 'text-gray-500'}`}>
                      {step.description}
                    </p>
                  </div>

                  {isCurrent && (
                    <motion.div
                      animate={{ rotate: 360 }}
                      transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                      className="w-6 h-6 border-2 border-white border-t-transparent rounded-full"
                    />
                  )}
                </motion.div>
              )
            })}
          </div>
        </div>

        {/* Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Call Insights */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="bg-white rounded-2xl shadow-lg p-6"
          >
            <h3 className="text-lg font-semibold text-gray-900 mb-6 flex items-center">
              <Activity className="w-5 h-5 text-brand-primary ml-2" />
              תובנות על השיחה
            </h3>
            
            <div className="space-y-4">
              {callInsights.map((insight, index) => {
                const InsightIcon = insight.icon
                return (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.7 + index * 0.1 }}
                    className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                  >
                    <div className="flex items-center">
                      <InsightIcon className={`w-5 h-5 ml-3 ${insight.color}`} />
                      <span className="text-gray-700">{insight.label}</span>
                    </div>
                    <span className="font-semibold text-gray-900">{insight.value}</span>
                  </motion.div>
                )
              })}
              
              {/* Real-time discovery */}
              <AnimatePresence>
                {currentStep >= 2 && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.8 }}
                    className="flex items-center justify-between p-3 bg-green-50 rounded-lg border border-green-200"
                  >
                    <div className="flex items-center">
                      <Sparkles className="w-5 h-5 ml-3 text-green-600" />
                      <span className="text-green-700">תובנות נמצאו</span>
                    </div>
                    <span className="font-semibold text-green-900">
                      {Math.min(currentStep + 2, 8)}
                    </span>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </motion.div>

          {/* Sales Tips */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
            className="bg-white rounded-2xl shadow-lg p-6"
          >
            <h3 className="text-lg font-semibold text-gray-900 mb-6 flex items-center">
              <Lightbulb className="w-5 h-5 text-yellow-600 ml-2" />
              טיפים למכירות
            </h3>
            
            <AnimatePresence mode="wait">
              <motion.div
                key={currentTip}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.5 }}
                className="p-4 bg-gradient-to-r from-yellow-50 to-orange-50 rounded-lg border border-yellow-200"
              >
                <div className="flex items-start">
                  {React.createElement(SALES_TIPS[currentTip].icon, {
                    className: "w-6 h-6 text-yellow-600 ml-3 mt-1 flex-shrink-0"
                  })}
                  <div>
                    <p className="text-gray-800 leading-relaxed">
                      {SALES_TIPS[currentTip].text}
                    </p>
                    <span className="inline-block mt-2 px-2 py-1 bg-yellow-200 text-yellow-800 text-xs font-medium rounded-full">
                      {SALES_TIPS[currentTip].category}
                    </span>
                  </div>
                </div>
              </motion.div>
            </AnimatePresence>

            {/* Tip Counter */}
            <div className="mt-6 flex justify-center">
              <div className="flex space-x-2">
                {SALES_TIPS.map((_, index) => (
                  <motion.div
                    key={index}
                    className={`w-2 h-2 rounded-full transition-colors duration-300 ${
                      index === currentTip ? 'bg-yellow-600' : 'bg-gray-300'
                    }`}
                    initial={{ scale: 0.8 }}
                    animate={{ scale: index === currentTip ? 1.2 : 0.8 }}
                  />
                ))}
              </div>
            </div>
          </motion.div>
        </div>

        {/* Real-time Activity Logs */}
        {callLogs.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.8 }}
            className="mt-8 bg-white rounded-2xl shadow-lg p-6"
          >
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
              <Activity className="w-5 h-5 text-brand-primary ml-2" />
              פעילות בזמן אמת
            </h3>
            
            <div className="max-h-40 overflow-y-auto space-y-3">
              {callLogs.slice(-6).map((log, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className="flex items-start p-3 bg-gray-50 rounded-lg border-r-4 border-brand-primary"
                >
                  <div className="flex-shrink-0 w-2 h-2 bg-brand-primary rounded-full mt-2 ml-3"></div>
                  <div className="flex-1">
                    <p className="text-sm text-gray-800 leading-relaxed">
                      {log.message.replace(/[🚀📝🎭📊✅🔄⬇️📡🏁❌]/g, '').trim()}
                    </p>
                    <span className="text-xs text-gray-500">
                      {new Date(log.timestamp).toLocaleTimeString('he-IL')}
                    </span>
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.div>
        )}

        {/* Bottom Animation */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1 }}
          className="mt-8 text-center"
        >
          <div className="inline-flex items-center px-4 py-2 bg-white rounded-full shadow-md">
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
              className="w-4 h-4 border-2 border-brand-primary border-t-transparent rounded-full ml-2"
            />
            <span className="text-gray-600 text-sm">
              {callLogs.length > 0 ? 'מעבד...' : 'מתחיל עיבוד...'}
            </span>
          </div>
        </motion.div>
      </div>
    </div>
  )
}