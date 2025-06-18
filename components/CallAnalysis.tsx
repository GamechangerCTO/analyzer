'use client'

import { useState, useRef, useEffect } from 'react'
import CallStatusBadge from './CallStatusBadge'
import { getCallStatus } from '@/lib/getCallStatus'

interface CallData {
  id: string
  call_type: string
  created_at: string
  analysis_report: any
  transcript: string | null
  overall_score: number | null
  processing_status: string | null
  red_flag: boolean | null
  agent_notes: string | null
  analysis_notes: string | null
  audio_duration_seconds: number | null
  analysis_type: string | null
  error_message: string | null
  analyzed_at: string | null
  users: {
    id: string
    full_name: string | null
    email: string | null
  } | null
  companies: {
    id: string
    name: string
  } | null
  tone_analysis_report: any
  transcript_segments?: Array<{ text: string; start: number }> | null
  transcript_words?: Array<{ word: string; start: number }> | null
}

interface CallAnalysisProps {
  call: CallData
  audioUrl: string | null
  userRole?: string | null
}

export default function CallAnalysis({ call, audioUrl, userRole }: CallAnalysisProps) {
  const [activeTab, setActiveTab] = useState('summary')
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [status, setStatus] = useState<string>(call.processing_status || 'pending')
  const [errorMessage, setErrorMessage] = useState<string | null>(call.error_message || null)
  const [isPolling, setIsPolling] = useState(false)
  const [callLogs, setCallLogs] = useState<Array<{timestamp: string; message: string; data?: any}>>([])
  const [currentPlayingQuote, setCurrentPlayingQuote] = useState<string>('')
  
  const audioRef = useRef<HTMLAudioElement>(null)
  
  // ייצוג של זמן בפורמט של דקות:שניות
  const formatTime = (timeInSeconds: number) => {
    const minutes = Math.floor(timeInSeconds / 60)
    const seconds = Math.floor(timeInSeconds % 60)
    return `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`
  }
  
  // טיפול בלחיצה על ציטוט כדי לנגן את החלק הרלוונטי בשמע
  const playQuote = (timeInSeconds: number, quoteText: string = '') => {
    if (audioRef.current && audioUrl) {
      audioRef.current.currentTime = timeInSeconds
      audioRef.current.play()
      setIsPlaying(true)
      setCurrentPlayingQuote(quoteText)
      
      // הוספת אפקט ויזואלי קצר
      const quoteBtns = document.querySelectorAll(`[data-quote="${quoteText}"]`)
      quoteBtns.forEach(btn => {
        btn.classList.add('animate-pulse')
        setTimeout(() => btn.classList.remove('animate-pulse'), 2000)
      })
    }
  }
  
  // עצירת ניגון הציטוט הנוכחי
  const stopQuote = () => {
    if (audioRef.current) {
      audioRef.current.pause()
      setIsPlaying(false)
      setCurrentPlayingQuote('')
    }
  }
  
  // בדיקה אם ציטוט מסוים מנגן כרגע
  const isQuotePlaying = (quoteText: string) => {
    return isPlaying && currentPlayingQuote === quoteText
  }
  
  // פונקציה חכמה משופרת למציאת timestamp מדויק לציטוט
  const findTimestampForQuote = (quoteText: string): number | null => {
    if (!call.transcript_segments || !quoteText) return null;
    
    // ניקוי הציטוט מסימני פיסוק וטקסט מיותר
    const cleanQuote = quoteText.replace(/[.,!?;"'()[\]{}]/g, '').toLowerCase().trim();
    const quoteWords = cleanQuote.split(/\s+/).filter(word => word.length > 2);
    
    if (quoteWords.length === 0) return null;
    
    let bestMatch: { segment: any; score: number; timestamp: number | null } = { segment: null, score: 0, timestamp: null };
    
    // חיפוש מתקדם בsegments
    for (const segment of call.transcript_segments) {
      if (!segment.text || !segment.start) continue;
      
      const segmentText = segment.text.replace(/[.,!?;"'()[\]{}]/g, '').toLowerCase();
      let matchScore = 0;
      
      // בדיקה מדויקת - הציטוט המלא מופיע בsegment
      if (segmentText.includes(cleanQuote)) {
        return segment.start;
      }
      
      // בדיקת התאמה חלקית עם ניקוד
      const segmentWords = segmentText.split(/\s+/);
      const matchedWords = quoteWords.filter(word => 
        segmentWords.some(segWord => 
          segWord.includes(word) || word.includes(segWord) || 
          (word.length > 3 && segWord.length > 3 && levenshteinDistance(word, segWord) <= 1)
        )
      );
      
      matchScore = matchedWords.length / quoteWords.length;
      
      // אם זה ההתאמה הטובה ביותר עד כה
      if (matchScore > bestMatch.score && matchScore >= 0.6) {
        bestMatch = { segment: segment, score: matchScore, timestamp: segment.start };
      }
    }
    
    // אם מצאנו התאמה סבירה
    if (bestMatch.timestamp && bestMatch.score >= 0.6) {
      return bestMatch.timestamp;
    }
    
    // גיבוי - חיפוש במילים בודדות
    if (call.transcript_words && call.transcript_words.length > 0) {
      const firstQuoteWord = quoteWords[0];
      const matchingWord = call.transcript_words.find((word: any) => 
        word.word && (
          word.word.toLowerCase().includes(firstQuoteWord) ||
          firstQuoteWord.includes(word.word.toLowerCase()) ||
          (firstQuoteWord.length > 3 && word.word.length > 3 && 
           levenshteinDistance(firstQuoteWord, word.word.toLowerCase()) <= 1)
        )
      );
      
      if (matchingWord && matchingWord.start !== undefined) {
        return matchingWord.start;
      }
    }
    
    return null;
  }
  
  // פונקציה עזר לחישוב מרחק Levenshtein (דמיון בין מילים)
  const levenshteinDistance = (str1: string, str2: string): number => {
    const matrix = Array(str2.length + 1).fill(null).map(() => Array(str1.length + 1).fill(null));
    
    for (let i = 0; i <= str1.length; i++) matrix[0][i] = i;
    for (let j = 0; j <= str2.length; j++) matrix[j][0] = j;
    
    for (let j = 1; j <= str2.length; j++) {
      for (let i = 1; i <= str1.length; i++) {
        const indicator = str1[i - 1] === str2[j - 1] ? 0 : 1;
        matrix[j][i] = Math.min(
          matrix[j][i - 1] + 1,
          matrix[j - 1][i] + 1,
          matrix[j - 1][i - 1] + indicator,
        );
      }
    }
    
    return matrix[str2.length][str1.length];
  }
  
  // עדכון זמן הניגון הנוכחי ומעקב אחר אירועי אודיו
  useEffect(() => {
    const audioElement = audioRef.current
    if (!audioElement) return
    
    const updateTime = () => {
      setCurrentTime(audioElement.currentTime)
    }
    
    const handlePause = () => {
      setIsPlaying(false)
      setCurrentPlayingQuote('')
    }
    
    const handleEnded = () => {
      setIsPlaying(false)
      setCurrentPlayingQuote('')
    }
    
    const handlePlay = () => {
      setIsPlaying(true)
    }
    
    audioElement.addEventListener('timeupdate', updateTime)
    audioElement.addEventListener('pause', handlePause)
    audioElement.addEventListener('ended', handleEnded)
    audioElement.addEventListener('play', handlePlay)
    
    return () => {
      audioElement.removeEventListener('timeupdate', updateTime)
      audioElement.removeEventListener('pause', handlePause)
      audioElement.removeEventListener('ended', handleEnded)
      audioElement.removeEventListener('play', handlePlay)
    }
  }, [])
  
  // ניקוי הציטוט הנוכחי כשמשנים טאב
  useEffect(() => {
    setCurrentPlayingQuote('')
  }, [activeTab])
  
  // Real-time subscription לעדכוני סטטוס (ללא פולינג מטורף!)
  useEffect(() => {
    if (['pending', 'processing', 'transcribing', 'analyzing_tone', 'analyzing_content'].includes(status)) {
      setIsPolling(true)
      
      // הוספת real-time subscription לטבלת calls - זה המנגנון העיקרי!
      const { createClient } = require('@supabase/supabase-js')
      const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
      )
      
      // יצירת subscription לשינויים בשיחה הספציפית
      const subscription = supabase
        .channel(`call-${call.id}`)
        .on('postgres_changes', {
          event: 'UPDATE',
          schema: 'public',
          table: 'calls',
          filter: `id=eq.${call.id}`
        }, (payload: any) => {
          console.log('🔄 Real-time update received:', payload.new)
          
          const newStatus = payload.new.processing_status
          if (newStatus && newStatus !== status) {
            console.log(`📊 Status changed from ${status} to ${newStatus}`)
            setStatus(newStatus)
            
            // אם הסטטוס השתנה ל-completed, עצור פולינג
            if (newStatus === 'completed') {
              setIsPolling(false)
              console.log('✅ Analysis completed via real-time subscription')
            }
          }
        })
        .subscribe()
      
      console.log('🔗 Real-time subscription created for call:', call.id)
      
      // פולינג נדיר בלבד כגיבוי (כל 30 שניות, מקסימום 10 פעמים = 5 דקות)
      let pollCount = 0
      const maxPolls = 10 // מקסימום 10 בדיקות
      const pollInterval = 30000 // כל 30 שניות
      
      const intervalId = setInterval(async () => {
        pollCount++
        console.log(`🔍 Backup polling check #${pollCount} (every 30s)`)
        
        try {
          const response = await fetch(`/api/call-status/${call.id}`)
          const data = await response.json()
          
          if (data.status && data.status !== status) {
            console.log(`📈 Backup poll found status update: ${status} → ${data.status}`)
            setStatus(data.status)
            
            if (data.status === 'completed') {
              setIsPolling(false)
              clearInterval(intervalId)
              console.log('✅ Analysis completed via backup polling')
            }
          }
        } catch (error) {
          console.error('Error in backup polling:', error)
        }
        
        if (pollCount >= maxPolls) {
          console.log('⏰ Max backup polls reached - stopping')
          clearInterval(intervalId)
          setIsPolling(false)
        }
        
        if (status === 'completed') {
          console.log('🎯 Status is completed - stopping backup polling')
          clearInterval(intervalId)
          setIsPolling(false)
        }
      }, pollInterval)
      
      return () => {
        clearInterval(intervalId)
        subscription.unsubscribe()
        console.log('🔌 Real-time subscription cleaned up for call:', call.id)
      }
    }
  }, [status, call.id])

  // State לניהול התקדמות בהתבסס על לוגים אמיתיים
  const [logBasedProgress, setLogBasedProgress] = useState(0)
  const [currentLogStatus, setCurrentLogStatus] = useState('')
  const [lastProcessedLogIndex, setLastProcessedLogIndex] = useState(0)

  // פונקציה לחישוב progress מדויק לפי לוגים של Vercel
  const calculateProgressFromLogs = (logs: any[]) => {
    if (!logs || logs.length === 0) return 0
    
    // מפת התקדמות לפי הודעות לוג ספציפיות מ-Vercel
    const logProgressMap: Record<string, number> = {
      // התחלה
      '🚀 התחלת תהליך ניתוח שיחה': 5,
      '✅ קישור האודיו נוצר בהצלחה': 10,
      
      // תמלול
      '📝 מתחיל תהליך תמלול שיחה': 15,
      '⬇️ מוריד קובץ אודיו מהשרת': 20,
      '✅ קובץ אודיו הורד בהצלחה': 25,
      '📡 תשובת Whisper API התקבלה': 35,
      '✅ תמלול הושלם בהצלחה': 45,
      
      // ניתוח טונציה
      '🎭 מתחיל ניתוח טונציה': 50,
      '🔄 מכין בקשה לניתוח טונציה עם GPT-4o-audio': 55,
      '✅ תשובת OpenAI התקבלה לניתוח טונציה': 65,
      '✅ ניתוח טונציה הושלם בהצלחה': 70,
      
      // ניתוח תוכן
      '📊 מתחיל ניתוח תוכן': 75,
      '🔄 שולח בקשה לניתוח תוכן ל-gpt-4.1-2025-04-14': 80,
      '✅ תשובת OpenAI התקבלה לניתוח תוכן': 90,
      '✅ ניתוח תוכן הושלם בהצלחה': 95,
      
      // השלמה
      '✅ טבלת calls עודכנה בהצלחה': 98,
      '🏁 ניתוח השיחה הושלם': 100,
      '🏁 ניתוח טונציה הושלם': 100
    }
    
    let maxProgress = 0
    let latestMessage = ''
    
    // חיפוש ההתקדמות המקסימלית והודעה האחרונה
    for (const log of logs) {
      const message = log.message
      
      // חיפוש התאמה מדויקת
      if (logProgressMap[message]) {
        if (logProgressMap[message] > maxProgress) {
          maxProgress = logProgressMap[message]
          latestMessage = message
        }
      } else {
        // חיפוש התאמה חלקית
        for (const [logKey, progress] of Object.entries(logProgressMap)) {
          if (message.includes(logKey.split(' ')[0]) || logKey.includes(message.split(' ')[0])) {
            if (progress > maxProgress) {
              maxProgress = progress
              latestMessage = message
            }
          }
        }
      }
      
      // זיהוי שגיאות
      if (message.includes('❌') || message.includes('שגיאה')) {
        // אם יש שגיאה, נשמור על ההתקדמות האחרונה אבל נעדכן את ההודעה
        latestMessage = message
      }
    }
    
    setCurrentLogStatus(latestMessage)
    return maxProgress
  }

  // מערכת ריענון לוגים בזמן אמת
  useEffect(() => {
    if (['pending', 'processing', 'transcribing', 'analyzing_tone', 'analyzing_content'].includes(status)) {
      const fetchLogs = async () => {
        try {
          const logsResponse = await fetch(`/api/call-logs/${call.id}`)
          const logsData = await logsResponse.json()
          
          if (logsData.logs && logsData.logs.length > 0) {
            // עדכון רק אם יש לוגים חדשים
            if (logsData.logs.length > lastProcessedLogIndex) {
              const newLogs = logsData.logs.slice(lastProcessedLogIndex)
              console.log('📊 לוגים חדשים זוהו:', newLogs.length)
              
              // חישוב התקדמות מעודכנת
              const newProgress = calculateProgressFromLogs(logsData.logs)
              
              if (newProgress > logBasedProgress) {
                setLogBasedProgress(newProgress)
                console.log(`📈 התקדמות עודכנה ללוגים: ${newProgress}%`)
              }
              
              setLastProcessedLogIndex(logsData.logs.length)
              
              // עדכון הלוגים המוצגים
              setCallLogs(logsData.logs)
              
                             // בדיקה אם הושלם
               const hasCompletionLog = logsData.logs.some((log: any) => 
                 log.message.includes('🏁 ניתוח') && log.message.includes('הושלם')
               )
              
              if (hasCompletionLog && status !== 'completed') {
                console.log('✅ זוהה השלמת ניתוח מהלוגים - מעדכן סטטוס')
                setStatus('completed')
              }
            }
          }
        } catch (error) {
          console.error('שגיאה בקריאת לוגים:', error)
        }
      }
      
      // קריאה ראשונית
      fetchLogs()
      
      // קריאה כל 2 שניות
      const logsInterval = setInterval(fetchLogs, 2000)
      
      return () => clearInterval(logsInterval)
    }
  }, [status, call.id, lastProcessedLogIndex, logBasedProgress])

  // פונקציה לחישוב progress דינמי - עכשיו משתמשת בלוגים אמיתיים
  const calculateDynamicProgress = () => {
    // אם יש לנו progress מהלוגים, נשתמש בו
    if (logBasedProgress > 0) {
      return logBasedProgress
    }
    
    // fallback למיפוי הישן אם אין לוגים
    const statusMapping = {
      'pending': 5,
      'processing': 10,
      'transcribing': 25,
      'analyzing_tone': 55,
      'analyzing_content': 85,
      'completed': 100,
      'error': 0
    }

    return statusMapping[status as keyof typeof statusMapping] || 0
  }

  // State לprogreaa הדינמי
  const [dynamicProgress, setDynamicProgress] = useState(calculateDynamicProgress())

  // עדכון progress בזמן אמת
  useEffect(() => {
    if (['pending', 'processing', 'transcribing', 'analyzing_tone', 'analyzing_content'].includes(status)) {
      const progressInterval = setInterval(() => {
        setDynamicProgress(calculateDynamicProgress())
      }, 500) // עדכון כל חצי שנייה לאנימציה חלקה

      return () => clearInterval(progressInterval)
    } else if (status === 'completed') {
      // וודא שהprogress הוא 100% כשהסטטוס completed
      setDynamicProgress(100)
    }
  }, [status, call.created_at])

  // State נוסף לאנימציית הצלחה
  const [showSuccessAnimation, setShowSuccessAnimation] = useState(false)
  const [countdown, setCountdown] = useState(3)
  const [hasCompletedOnce, setHasCompletedOnce] = useState(false) // למניעת לופ
  const [shouldShowAnalysis, setShouldShowAnalysis] = useState(false)

  // טיפול מיוחד בסטטוס completed - מעבר לניתוח אוטומטית
  useEffect(() => {
    if (status === 'completed' && !hasCompletedOnce) {
      console.log('✅ ניתוח השיחה הושלם - בודק אם יש ניתוח קיים')
      setHasCompletedOnce(true) // מונע לופ
      setDynamicProgress(100)
      setShowSuccessAnimation(true)
      
      // בדיקה אם יש כבר ניתוח במסד הנתונים
      const hasExistingAnalysis = call.analysis_report && call.tone_analysis_report && 
                                  Object.keys(call.analysis_report).length > 0 && 
                                  Object.keys(call.tone_analysis_report).length > 0
      
      if (hasExistingAnalysis) {
        console.log('✅ הניתוח כבר קיים במסד הנתונים - מציג אותו')
        setCountdown(0)
        // נתן זמן קצר לאנימציה ואז נעבור לניתוח
        setTimeout(() => {
          setShouldShowAnalysis(true)
        }, 2000)
      } else {
        console.log('🔄 אין ניתוח במסד הנתונים - טוען מחדש לקבלת הניתוח')
        // ספירה לאחור ואז טעינה מחודשת
        const countdownInterval = setInterval(() => {
          setCountdown(prev => {
            if (prev <= 1) {
              clearInterval(countdownInterval)
              console.log('🔄 טוען את הניתוח המושלם')
              window.location.reload()
              return 0
            }
            return prev - 1
          })
        }, 1000)

        return () => clearInterval(countdownInterval)
      }
    }
  }, [status, hasCompletedOnce, call.analysis_report, call.tone_analysis_report])
  
  // הצגת סטטוס העיבוד עם הודעה מיוחדת לcompleted
  // אבל רק אם עדיין לא אמורים להציג את הניתוח
  if ((['pending', 'processing', 'transcribing', 'analyzing_tone', 'analyzing_content', 'completed'].includes(status) || isPolling) && !shouldShowAnalysis) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-6">
        <div className="max-w-4xl mx-auto">
          <div className="bg-white rounded-xl shadow-lg p-8">
            <div className="flex flex-col items-center justify-center">
              <div className="mb-6">
                <CallStatusBadge status={status} />
              </div>
              
              <h2 className="text-2xl font-bold mb-3 text-center text-gray-800">
                {status === 'completed' 
                  ? 'ניתוח השיחה הושלם! 🎉' 
                  : 'השיחה נמצאת בתהליך עיבוד'
                }
              </h2>
              
              <p className="text-gray-600 mb-4 text-center max-w-md">
                {status === 'completed' 
                  ? 'הניתוח הושלם בהצלחה! טוען את התוצאות...'
                  : 'אנו מנתחים את השיחה שלך באמצעות בינה מלאכותית מתקדמת. התהליך עשוי לקחת מספר דקות.'
                }
              </p>
              
              {status === 'analyzing_tone' && (
                <div className="mb-6 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <p className="text-sm text-yellow-800 text-center">
                    🎭 מבצע ניתוח טונציה מתקדם - הדף יתעדכן אוטומטיקית ברגע השלמת הניתוח
                  </p>
                </div>
              )}

              {status === 'completed' && countdown > 0 && (
                <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg">
                  <p className="text-sm text-green-800 text-center font-medium mb-3">
                    ✅ הניתוח הושלם בהצלחה! טוען את התוצאות בעוד {countdown} שניות...
                  </p>
                  <div className="flex justify-center">
                    <button
                      onClick={() => window.location.reload()}
                      className="px-4 py-2 bg-green-600 text-white text-sm rounded-lg hover:bg-green-700 transition-colors font-medium"
                    >
                      🚀 טען עכשיו
                    </button>
                  </div>
                </div>
              )}

              {status === 'completed' && countdown === 0 && (
                <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg">
                  <p className="text-sm text-green-800 text-center font-medium">
                    ✅ הניתוח הושלם! מעבר לתוצאות...
                  </p>
                </div>
              )}
              
              {/* מד התקדמות מעוצב - עם progress דינמי */}
              <div className="w-full max-w-lg mx-auto mb-8">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-sm font-semibold text-blue-600">
                    {status === 'pending' ? '🔄 טוען משאבים' :
                     status === 'processing' ? '⚙️ מכין לעיבוד' :
                     status === 'transcribing' ? '📝 תמלול השיחה' :
                     status === 'analyzing_tone' ? '🎭 ניתוח טונציה' :
                     status === 'analyzing_content' ? '📊 ניתוח תוכן' :
                     status === 'completed' ? '✅ הושלם' :
                     'מעבד...'}
                  </span>
                  <span className="text-sm font-bold text-blue-600 transition-all duration-500">
                    {dynamicProgress}%
                  </span>
                </div>
                                 <div className="overflow-hidden h-3 bg-blue-100 rounded-full relative">
                   <div 
                     style={{ width: `${dynamicProgress}%` }} 
                     className={`h-full rounded-full transition-all duration-500 ease-out ${
                       status === 'completed' 
                         ? 'bg-gradient-to-r from-green-500 to-green-600' 
                         : 'bg-gradient-to-r from-blue-500 to-blue-600'
                     } ${showSuccessAnimation ? 'animate-pulse' : ''}`}
                   />
                   {/* אפקט זוהר מתקדם */}
                   <div 
                     style={{ width: `${dynamicProgress}%` }} 
                     className={`h-full rounded-full opacity-60 absolute top-0 ${
                       status === 'completed' 
                         ? 'bg-gradient-to-r from-green-400 to-green-500 animate-ping' 
                         : 'bg-gradient-to-r from-blue-400 to-blue-500 animate-pulse'
                     }`}
                   />
                   {/* אפקט כוכבים מיוחד ל-completed */}
                   {status === 'completed' && showSuccessAnimation && (
                     <div className="absolute inset-0 flex justify-center items-center">
                       <span className="text-xs text-white font-bold animate-bounce">✨</span>
                     </div>
                   )}
                 </div>
                
                {/* מחוון מילולי מתקדם - מבוסס על לוגים אמיתיים */}
                <div className="mt-2 text-xs text-gray-500 text-center">
                  {currentLogStatus ? (
                    <span className="font-medium text-blue-600">
                      {currentLogStatus.replace(/[🚀📝🎭📊✅🔄⬇️📡🏁❌]/g, '').trim()}
                    </span>
                  ) : (
                    <>
                      {status === 'pending' && dynamicProgress < 10 && 'מכין את המערכת לעיבוד...'}
                      {status === 'pending' && dynamicProgress >= 10 && 'טוען את קובץ האודיו...'}
                      {status === 'processing' && 'מתחיל תהליך ניתוח השיחה...'}
                      {status === 'transcribing' && dynamicProgress < 30 && 'מתחיל תמלול השיחה...'}
                      {status === 'transcribing' && dynamicProgress >= 30 && 'ממשיך בתמלול מדויק...'}
                      {status === 'analyzing_tone' && dynamicProgress < 60 && 'מנתח טון ורגש...'}
                      {status === 'analyzing_tone' && dynamicProgress >= 60 && 'מסיים ניתוח טונציה...'}
                      {status === 'analyzing_content' && dynamicProgress < 85 && 'מנתח תוכן מקצועי...'}
                      {status === 'analyzing_content' && dynamicProgress >= 85 && 'מכין דוח סופי...'}
                      {status === 'completed' && 'הניתוח הושלם! טוען תוצאות...'}
                    </>
                  )}
                </div>
              </div>
              
              {/* אנימציית טעינה מעוצבת */}
              <div className="flex justify-center items-center mb-8">
                <div className="relative">
                  <div className={`animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 ${
                    status === 'completed' ? 'border-green-500' : 'border-blue-500'
                  }`}></div>
                  <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-2xl">
                    {status === 'processing' ? '🔄' :
                     status === 'transcribing' ? '📝' :
                     status === 'analyzing_tone' ? '🎭' :
                     status === 'analyzing_content' ? '📊' :
                     status === 'completed' ? '✅' : '⚙️'}
                  </div>
                </div>
              </div>
              
              {/* לוגים במעוצב */}
              {callLogs.length > 0 && (
                <div className="w-full max-w-2xl mx-auto bg-gray-50 rounded-lg border border-gray-200 p-4">
                  <h3 className="text-sm font-semibold mb-3 text-gray-700 text-center">🔍 סטטוס עיבוד נוכחי</h3>
                  <div className="max-h-32 overflow-y-auto space-y-2">
                    {callLogs.slice(-4).map((log, index) => (
                      <div key={index} className="flex items-start text-sm bg-white p-2 rounded shadow-sm">
                        <span className="text-gray-500 ml-2 whitespace-nowrap text-xs">
                          {new Date(log.timestamp).toLocaleTimeString('he-IL')}
                        </span>
                        <span className="text-gray-700 flex-1">{log.message}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              
              {/* כפתור חירום */}
              <div className="mt-6">
                <button 
                  onClick={() => {
                    setIsPolling(false)
                    window.location.reload()
                  }}
                  className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  🔄 רענן דף וטען ניתוח
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }
  
  // רנדור לשיחה שהושלמה
  const analysisReport = call.analysis_report || {};
  const tone_analysis_report = call.tone_analysis_report || {};
  const analysis_report = analysisReport; // נוסיף alias לתאימות
  
  // פונקציה להתמודדות עם שמות שדות בפורמטים שונים
  const getFieldValue = (report: any, fieldNames: string[]) => {
    if (!report) return null;
    
    for (const fieldName of fieldNames) {
      if (fieldName.includes('.')) {
        const parts = fieldName.split('.');
        let value: any = report;
        for (const part of parts) {
          value = value?.[part];
          if (!value) break;
        }
        if (value) return value;
      } else if (report[fieldName] !== undefined && report[fieldName] !== null) {
        return report[fieldName];
      }
    }
    return null;
  };
  


  // פונקציה לחילוץ הניתוח המפורט החדש
  const getDetailedScores = () => {
    const categories = [
      {
        category: 'פתיחת שיחה ובניית אמון',
        key: 'פתיחת_שיחה_ובניית_אמון',
        subcategories: [
          { name: 'פתיח אנרגטי', key: 'פתיח_אנרגטי' },
          { name: 'הצגת נציג וחברה', key: 'הצגת_נציג_וחברה' },
          { name: 'בניית כימיה', key: 'בניית_כימיה' },
          { name: 'הצגת תועלת מהירה', key: 'הצגת_תועלת_מהירה' },
          { name: 'בניית אמון', key: 'בניית_אמון' },
          { name: 'שימוש בשם פרטי', key: 'שימוש_בשם_פרטי' },
          { name: 'שאלת סיבת הפנייה', key: 'שאלת_סיבת_הפנייה' }
        ]
      },
      {
        category: 'איתור צרכים וזיהוי כאב',
        key: 'איתור_צרכים_וזיהוי_כאב',
        subcategories: [
          { name: 'שאילת שאלות', key: 'שאילת_שאלות' },
          { name: 'איתור כאב/צורך', key: 'איתור_כאב_צורך' },
          { name: 'זיהוי סגנון תקשורת', key: 'זיהוי_סגנון_תקשורת' },
          { name: 'זיהוי איתותי קנייה', key: 'זיהוי_איתותי_קנייה' }
        ]
      },
      {
        category: 'הקשבה ואינטראקציה',
        key: 'הקשבה_ואינטראקציה',
        subcategories: [
          { name: 'הקשבה פעילה', key: 'הקשבה_פעילה' },
          { name: 'דיבור מאוזן', key: 'דיבור_מאוזן' },
          { name: 'זרימה וסדר', key: 'זרימה_וסדר' },
          { name: 'הצפת יתר', key: 'הצפת_יתר' }
        ]
      },
      {
        category: 'הצגת פתרון והדגשת ערך',
        key: 'הצגת_פתרון_והדגשת_ערך',
        subcategories: [
          { name: 'פתרון מותאם', key: 'פתרון_מותאם' },
          { name: 'תועלות וערכים', key: 'תועלות_וערכים' },
          { name: 'תועלות רגשיות', key: 'תועלות_רגשיות' },
          { name: 'עדויות/הוכחות', key: 'עדויות_הוכחות' },
          { name: 'יתרון על המחיר', key: 'יתרון_על_המחיר' },
          { name: 'מומחיות מקצועית', key: 'מומחיות_מקצועית' }
        ]
      },
      {
        category: 'טיפול בהתנגדויות',
        key: 'טיפול_בהתנגדויות',
        subcategories: [
          { name: 'זיהוי אמת/תירוץ', key: 'זיהוי_אמת_תירוץ' },
          { name: 'צריך לחשוב', key: 'צריך_לחשוב' },
          { name: 'יקר לי', key: 'יקר_לי' }
        ]
      },
      {
        category: 'הנעה לפעולה וסגירה',
        key: 'הנעה_לפעולה_וסגירה',
        subcategories: [
          { name: 'הנעה לפעולה', key: 'הנעה_לפעולה' },
          { name: 'סיכום ברור', key: 'סיכום_ברור' },
          { name: 'סירוב מכבד', key: 'סירוב_מכבד' }
        ]
      },
      {
        category: 'שפת תקשורת ודינמיקה קולית',
        key: 'שפת_תקשורת_ודינמיקה_קולית',
        subcategories: [
          { name: 'אינטונציה', key: 'אינטונציה' },
          { name: 'התלהבות/אנרגיה', key: 'התלהבות_אנרגיה' },
          { name: 'שפה חיובית ונחרצת', key: 'שפה_חיובית_ונחרצת' }
        ]
      },
      {
        category: 'סיכום שיחה',
        key: 'סיכום_שיחה',
        subcategories: [
          { name: 'סיכום שיחה ברור', key: 'סיכום_שיחה_ברור' },
          { name: 'צידה לדרך', key: 'צידה_לדרך' }
        ]
      }
    ];

    return categories.map(category => {
      const categoryData = analysis_report[category.key] || {};
      

      
      const subcategories = category.subcategories.map(sub => {
        // נסה מפתחות שונים כי יש מפתחות עם גרשיים מוזרים
        const possibleKeys = [
          sub.key,
          `"${sub.key}"`,
          `"\\${sub.key}"`,
          sub.key.replace(/_/g, ' ')
        ];
        
        let subData: any = {};
        for (const key of possibleKeys) {
          if (categoryData[key]) {
            subData = categoryData[key];
            break;
          }
        }
        
        return {
          name: sub.name,
          score: subData.ציון || subData.score || 0,
          insights: subData.תובנות || subData.הסבר || subData.insights || 'לא זמין',
          improvements: subData.איך_משפרים || subData.improvements || 'לא זמין'
        };
      });

      // חישוב ממוצע הקטגוריה
      const avgScore = subcategories.length > 0 
        ? subcategories.reduce((sum, sub) => sum + sub.score, 0) / subcategories.length 
        : 0;

      return {
        category: category.category,
        score: Math.round(avgScore * 10) / 10,
        subcategories
      };
    });
  };

  // פונקציה לקבלת צבע רקע לפי ציון
  const getScoreBg = (score: number) => {
    if (score >= 8) return 'bg-green-100 text-green-800';
    if (score >= 6) return 'bg-yellow-100 text-yellow-800';
    if (score >= 4) return 'bg-orange-100 text-orange-800';
    return 'bg-red-100 text-red-800';
  };

  // פונקציה לקביעת צבע הציון
  const getScoreColor = (score: number) => {
    if (score >= 8) return 'text-green-600';
    if (score >= 6) return 'text-yellow-600';
    if (score >= 4) return 'text-orange-600';
    return 'text-red-600';
  };
  
  const detailed_analysis = analysisReport.detailed_analysis || {};
  const overall_score_from_report = getFieldValue(analysisReport, ['ציון_כללי', 'ממוצע_משוקלל_כללי', 'ציון כללי', 'overall_score', 'score_overall']) || 
                                   (detailed_analysis.overall_score || detailed_analysis.ציון_כללי);
  const red_flag_from_report = getFieldValue(analysisReport, ['red_flag', 'דגל_אדום']);
  const red_flags = getFieldValue(analysisReport, ['דגלים אדומים', 'דגלים_אדומים', 'red_flags']) || [];
  const improvement_points = getFieldValue(analysisReport, ['נקודות לשיפור', 'נקודות_לשיפור', 'improvement_points', 'המלצות_שיפור', 'המלצות_פרקטיות', 'המלצות_דחופות_ביותר']) || [];
  const strengths_and_preservation_points = getFieldValue(analysisReport, ['נקודות חוזק לשימור', 'נקודות_חוזק', 'strengths_and_preservation_points', 'strengths', 'חוזקות', 'נקודות_חוזקה']) || [];
  
  // משתנים נוספים שהקומפוננטה מחפשת
  const all_quotes = getFieldValue(analysisReport, ['ציטוטים_רלוונטיים', 'ציטוטים', 'quotes', 'all_quotes']) || [];
  const segment_quotes = all_quotes; // alias
  

  const practical_recommendations = getFieldValue(analysisReport, ['המלצות_פרקטיות', 'practical_recommendations']) || [];
  const detailed_scores = getDetailedScores();
  const finalOverallScore = overall_score_from_report || call.overall_score || 0;
  const finalRedFlag = red_flag_from_report || call.red_flag || false;
  
  // הצגת ניתוח מפורט בסגנון טבלאי
  const renderDetailedParameter = (param: any, name: string) => {
    if (!param || typeof param !== 'object') return null;
    
    const score = param.ציון;
    const insights = param.תובנות || '';
    const improvements = param.איך_משפרים || '';
    
    return (
      <tr key={name} className="hover:bg-gray-50">
        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
          {name.replace(/_/g, ' ')}
        </td>
        <td className="px-6 py-4 whitespace-nowrap text-center">
          <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-bold ${getScoreBg(score)}`}>
                                  {score}/10
          </span>
        </td>
        <td className="px-6 py-4 text-sm text-gray-700">
          {insights}
        </td>
        <td className="px-6 py-4 text-sm text-gray-700">
          {improvements}
        </td>
      </tr>
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4 rtl:space-x-reverse">
              <div className={`flex items-center justify-center w-12 h-12 rounded-full ${getScoreBg(finalOverallScore)}`}>
                <span className={`text-xl font-bold ${getScoreColor(finalOverallScore)}`}>
                  {finalOverallScore}
                </span>
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">ניתוח שיחה מקצועי - {call.call_type}</h1>
                <div className="flex items-center space-x-4 rtl:space-x-reverse text-sm text-gray-600">
                  <span>📅 {new Date(call.created_at).toLocaleDateString('he-IL')}</span>
                  <span>👤 {call.users?.full_name || call.users?.email}</span>
                  {call.companies?.name && <span>🏢 {call.companies.name}</span>}
                </div>
              </div>
            </div>
            <div className="flex items-center space-x-3 rtl:space-x-reverse">
              {finalRedFlag && (
                <div className="flex items-center px-3 py-1 bg-red-100 text-red-800 rounded-full text-sm font-medium red-flag-pulse">
                  🚨 דגל אדום
                </div>
              )}
              {/* כפתור שאלון חברה למנהלים */}
              {userRole === 'manager' && (
                <a
                  href="/company-questionnaire"
                  className="flex items-center px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-medium transition-colors shadow-md"
                  title="עריכת שאלון החברה"
                >
                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                  שאלון חברה
                </a>
              )}
              <CallStatusBadge status={status} />
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Navigation Tabs */}
        <div className="bg-white rounded-xl shadow-lg p-6 mb-8">
          <nav className="flex flex-wrap gap-4">
            {['summary', 'tone', 'content', 'quotes', ...(userRole === 'admin' ? ['transcript'] : [])].map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`py-3 px-6 rounded-lg font-medium transition-all duration-200 ${
                  activeTab === tab
                    ? 'bg-blue-600 text-white shadow-lg hover:bg-blue-700'
                    : 'text-gray-600 bg-gray-50 hover:text-blue-600 hover:bg-blue-50'
                }`}
              >
                {tab === 'summary' ? '📊 סיכום כללי' :
                 tab === 'tone' ? '🎭 ניתוח טונציה' :
                 tab === 'content' ? '📝 ניתוח מפורט' :
                 tab === 'quotes' ? '💬 ציטוטים' :
                 '📄 תמליל'}
              </button>
            ))}
          </nav>
        </div>

        {/* Tab Content */}
        {activeTab === 'summary' && (
          <div className="space-y-6">
            {/* סיכום כללי */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* ציון כללי */}
              <div className="lg:col-span-1">
                <div className="bg-white rounded-xl shadow-lg p-6 text-center smooth-appear">
                  <h3 className="text-lg font-semibold mb-4 text-gray-800">ציון כללי</h3>
                  <div className={`text-6xl font-bold mb-4 score-animation ${getScoreColor(finalOverallScore)}`}>
                    {finalOverallScore}
                  </div>
                  <div className="text-gray-600">מתוך 10</div>
                  <div className={`mt-4 p-3 rounded-lg ${getScoreBg(finalOverallScore)}`}>
                    <span className={`text-sm font-medium ${getScoreColor(finalOverallScore)}`}>
                      {finalOverallScore >= 8 ? 'ביצועים מעולים!' :
                       finalOverallScore >= 6 ? 'ביצועים סבירים - יש מקום לשיפור' :
                       finalOverallScore >= 4 ? 'דרוש שיפור משמעותי' :
                       'ביצועים מתחת לסטנדרט'}
                    </span>
                    {finalOverallScore < 8 && (
                      <div className="mt-2 text-xs text-gray-600">
                        💡 <strong>זכור:</strong> הסטנדרטים שלנו גבוהים - רק 8+ נחשב מעולה
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* נתוני שיחה */}
              <div className="lg:col-span-2">
                <div className="bg-white rounded-xl shadow-lg p-6 smooth-appear">
                  <h3 className="text-lg font-semibold mb-4 text-gray-800">פרטי השיחה</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-blue-50 p-4 rounded-lg card-hover">
                      <div className="text-sm text-blue-600 font-medium">סוג ניתוח</div>
                      <div className="text-lg font-semibold text-blue-800">
                        {call.analysis_type === 'full' ? 'ניתוח מלא' : 'ניתוח טונציה'}
                      </div>
                    </div>
                    <div className="bg-green-50 p-4 rounded-lg card-hover">
                      <div className="text-sm text-green-600 font-medium">משך השיחה</div>
                      <div className="text-lg font-semibold text-green-800">
                        {call.audio_duration_seconds ? formatTime(call.audio_duration_seconds) : 'לא זמין'}
                      </div>
                    </div>
                    <div className="bg-purple-50 p-4 rounded-lg card-hover">
                      <div className="text-sm text-purple-600 font-medium">תאריך ניתוח</div>
                      <div className="text-lg font-semibold text-purple-800">
                        {call.analyzed_at ? new Date(call.analyzed_at).toLocaleDateString('he-IL') : 'טרם נותח'}
                      </div>
                    </div>
                    <div className="bg-orange-50 p-4 rounded-lg card-hover">
                      <div className="text-sm text-orange-600 font-medium">סטטוס</div>
                      <div className="text-lg font-semibold text-orange-800">
                        {status === 'completed' ? 'הושלם' : status}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* הסבר על הפרמטרים */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mb-6">
              <div className="flex items-center mb-4">
                <span className="text-blue-500 text-2xl mr-3">📊</span>
                <h3 className="text-xl font-semibold text-blue-800">8 קטגוריות ניתוח מקצועיות</h3>
              </div>
              <p className="text-blue-700 mb-4">
                השיחה נותחה לפי 8 קטגוריות מקצועיות המכילות 32 פרמטרים מפורטים:
              </p>
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 text-sm">
                <div className="bg-white p-3 rounded border border-blue-200">
                  <div className="font-medium text-blue-800">1. פתיחת שיחה ובניית אמון</div>
                  <div className="text-blue-600 text-xs">7 פרמטרים</div>
                </div>
                <div className="bg-white p-3 rounded border border-blue-200">
                  <div className="font-medium text-blue-800">2. איתור צרכים וזיהוי כאב</div>
                  <div className="text-blue-600 text-xs">4 פרמטרים</div>
                </div>
                <div className="bg-white p-3 rounded border border-blue-200">
                  <div className="font-medium text-blue-800">3. הקשבה ואינטראקציה</div>
                  <div className="text-blue-600 text-xs">4 פרמטרים</div>
                </div>
                <div className="bg-white p-3 rounded border border-blue-200">
                  <div className="font-medium text-blue-800">4. הצגת פתרון והדגשת ערך</div>
                  <div className="text-blue-600 text-xs">6 פרמטרים</div>
                </div>
                <div className="bg-white p-3 rounded border border-blue-200">
                  <div className="font-medium text-blue-800">5. טיפול בהתנגדויות</div>
                  <div className="text-blue-600 text-xs">3 פרמטרים</div>
                </div>
                <div className="bg-white p-3 rounded border border-blue-200">
                  <div className="font-medium text-blue-800">6. הנעה לפעולה וסגירה</div>
                  <div className="text-blue-600 text-xs">3 פרמטרים</div>
                </div>
                <div className="bg-white p-3 rounded border border-blue-200">
                  <div className="font-medium text-blue-800">7. שפת תקשורת ודינמיקה קולית</div>
                  <div className="text-blue-600 text-xs">3 פרמטרים</div>
                </div>
                <div className="bg-white p-3 rounded border border-blue-200">
                  <div className="font-medium text-blue-800">8. סיכום שיחה</div>
                  <div className="text-blue-600 text-xs">2 פרמטרים</div>
                </div>
              </div>
              <div className="mt-4 text-center">
                <span className="text-blue-700 text-sm font-medium">
                  💡 לצפייה בפירוט המלא של כל פרמטר עבור לטאב "תוכן"
                </span>
              </div>
            </div>

            {/* ציונים מפורטים */}
            {detailed_scores && detailed_scores.length > 0 && (
              <div className="space-y-6">
                {detailed_scores.map((categoryData, idx) => {
                  const scoreValue = categoryData.score || 0;
                  const displayCategory = categoryData.category;
                  
                  // חיפוש ציטוטים רלוונטיים לקטגוריה זו
                  let relevantQuotes = segment_quotes ? segment_quotes.filter((quote: any) => {
                    if (!quote || typeof quote !== 'object') return false;
                    const quoteCategory = quote.category || quote.קטגוריה || quote.title || '';
                    return quoteCategory.toLowerCase().includes(displayCategory.toLowerCase()) || 
                           displayCategory.toLowerCase().includes(quoteCategory.toLowerCase());
                  }) : [];

                  return (
                    <div key={idx} className="bg-white rounded-xl shadow-lg p-6 border-l-4" 
                         style={{ borderLeftColor: scoreValue >= 8 ? '#10b981' : scoreValue >= 6 ? '#f59e0b' : '#ef4444' }}>
                      
                      {/* כותרת הפרמטר עם ציון */}
                      <div className="flex justify-between items-start mb-4">
                        <h3 className="text-xl font-semibold text-gray-800">{displayCategory}</h3>
                        <div className="text-left">
                          <span className={`text-3xl font-bold ${getScoreColor(scoreValue)}`}>
                            {scoreValue}
                          </span>
                          <span className="text-gray-500 text-sm">/10</span>
                        </div>
                      </div>

                      {/* מד התקדמות */}
                      <div className="w-full bg-gray-200 rounded-full h-3 mb-4">
                        <div 
                          className={`h-3 rounded-full transition-all duration-300 ${
                            scoreValue >= 8 ? 'bg-green-500' :
                            scoreValue >= 6 ? 'bg-orange-500' : 'bg-red-500'
                          }`}
                          style={{ width: `${(scoreValue / 10) * 100}%` }}
                        />
                      </div>

                      {/* הערות והערכה - בצורת קצרה אבל שימושית */}
                      {categoryData.subcategories && categoryData.subcategories.length > 0 && (
                        <div className="mb-4 p-3 bg-gray-50 rounded-lg">
                          <h4 className="font-medium text-gray-700 mb-2">📝 סיכום מהיר:</h4>
                          <p className="text-gray-700 leading-relaxed text-sm">
                            {categoryData.subcategories.length} פרמטרים בקטגוריה זו - 
                            ציון ממוצע: <span className="font-bold">{scoreValue}/10</span>
                          </p>
                        </div>
                      )}

                      {/* ציטוטים רלוונטיים לקטגוריה */}
                      {relevantQuotes.length > 0 && (
                        <div className="space-y-3">
                          <h4 className="font-medium text-gray-700 flex items-center">
                            <span className="mr-2">💬</span>
                            ציטוטים רלוונטיים ({relevantQuotes.length}):
                          </h4>
                          {relevantQuotes.map((quote: any, quoteIdx: number) => {
                            const quoteText = quote.text || quote.quote || quote.ציטוט || quote.content || '';
                            const comment = quote.comment || quote.הערה || '';
                            
                            // חיפוש timestamp - קודם מהדוח, אחר כך מהפונקציה החכמה
                            let timestampSeconds = quote.timestamp_seconds;
                            
                            // טיפול בפורמט החדש של timestamp
                            if (!timestampSeconds && quote.timestamp) {
                              const timestamp = quote.timestamp;
                              if (timestamp && timestamp.includes(':')) {
                                const parts = timestamp.split('-')[0].split(':'); // לוקחים את החלק הראשון של הטווח
                                if (parts.length === 2) {
                                  timestampSeconds = parseInt(parts[0]) * 60 + parseInt(parts[1]);
                                }
                              }
                            }
                            
                            if (!timestampSeconds && quoteText) {
                              timestampSeconds = findTimestampForQuote(quoteText);
                            }
                            
                            const isCurrentlyPlaying = isQuotePlaying(quoteText);
                            
                            return (
                              <div 
                                key={quoteIdx} 
                                className={`transition-all duration-300 border rounded-lg p-3 ${
                                  isCurrentlyPlaying 
                                    ? 'bg-blue-100 border-blue-400 shadow-lg ring-2 ring-blue-300' 
                                    : 'bg-blue-50 border-blue-200 hover:bg-blue-100'
                                }`}
                              >
                                <div className="flex justify-between items-start">
                                  <div className="flex-1">
                                    <p className={`italic mb-2 transition-colors ${
                                      isCurrentlyPlaying ? 'text-blue-800 font-medium' : 'text-gray-700'
                                    }`}>
                                      "{quoteText}"
                                    </p>
                                    {comment && (
                                      <p className="text-sm text-blue-700">
                                        💭 {comment}
                                      </p>
                                    )}
                                  </div>
                                  
                                  <div className="flex items-center space-x-2 rtl:space-x-reverse mr-3">
                                    {timestampSeconds !== undefined && timestampSeconds !== null && audioUrl && (
                                      <>
                                        {isCurrentlyPlaying ? (
                                          <button 
                                            onClick={stopQuote}
                                            className="flex items-center px-2 py-1 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors text-xs font-medium"
                                            title="עצור השמעה"
                                          >
                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 mr-1" viewBox="0 0 20 20" fill="currentColor">
                                              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8 7a1 1 0 00-1 1v4a1 1 0 001 1h4a1 1 0 001-1V8a1 1 0 00-1-1H8z" clipRule="evenodd" />
                                            </svg>
                                            עצור
                                          </button>
                                        ) : (
                                          <button 
                                            onClick={() => playQuote(timestampSeconds, quoteText)}
                                            className="flex items-center px-2 py-1 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors text-xs font-medium"
                                            title="השמע את הציטוט באודיו"
                                          >
                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 mr-1" viewBox="0 0 20 20" fill="currentColor">
                                              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd" />
                                            </svg>
                                            {formatTime(timestampSeconds)}
                                          </button>
                                        )}
                                      </>
                                    )}
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            {/* נגן אודיו */}
            {audioUrl && (
              <div className="bg-white rounded-xl shadow-lg p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-gray-800">🎧 הקלטת השיחה</h3>
                  {currentPlayingQuote && (
                    <div className="flex items-center space-x-3 rtl:space-x-reverse">
                      <div className="flex items-center text-blue-600 bg-blue-50 px-3 py-2 rounded-lg border border-blue-200">
                        <svg className="w-4 h-4 mr-2 animate-pulse" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M9.383 3.076A1 1 0 0110 4v12a1 1 0 01-1.617.817L4.906 14H2a1 1 0 01-1-1V7a1 1 0 011-1h2.906l3.477-2.817z" clipRule="evenodd"/>
                          <path fillRule="evenodd" d="M12.146 6.146a.5.5 0 01.708 0 4 4 0 010 5.708.5.5 0 01-.708-.708 3 3 0 000-4.292.5.5 0 010-.708z" clipRule="evenodd"/>
                        </svg>
                        <div className="text-sm">
                          <div className="font-medium">מנגן ציטוט:</div>
                          <div className="text-xs text-blue-700 max-w-xs truncate">
                            "{currentPlayingQuote.substring(0, 50)}{currentPlayingQuote.length > 50 ? '...' : ''}"
                          </div>
                        </div>
                      </div>
                      <button 
                        onClick={stopQuote}
                        className="flex items-center px-3 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors text-sm font-medium"
                        title="עצור השמעת הציטוט"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8 7a1 1 0 00-1 1v4a1 1 0 001 1h4a1 1 0 001-1V8a1 1 0 00-1-1H8z" clipRule="evenodd" />
                        </svg>
                        עצור ציטוט
                      </button>
                    </div>
                  )}
                </div>
                
                <audio 
                  ref={audioRef}
                  controls 
                  className="w-full h-12 bg-gray-100 rounded-lg"
                  onPlay={() => setIsPlaying(true)}
                  onPause={() => setIsPlaying(false)}
                >
                  <source src={audioUrl} />
                  הדפדפן שלך אינו תומך בנגן האודיו.
                </audio>
                
                {currentPlayingQuote && (
                  <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                    <div className="flex items-start space-x-2 rtl:space-x-reverse">
                      <svg className="w-5 h-5 text-blue-600 mt-0.5 animate-pulse" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M18 10c0 3.866-3.582 7-8 7a8.841 8.841 0 01-4.083-.98L2 17l1.338-3.123C2.493 12.767 2 11.434 2 10c0-3.866 3.582-7 8-7s8 3.134 8 7zM7 9H5v2h2V9zm8 0h-2v2h2V9zM9 9h2v2H9V9z" clipRule="evenodd"/>
                      </svg>
                      <div className="flex-1">
                        <p className="text-sm font-medium text-blue-800 mb-1">ציטוט שמנגן כעת:</p>
                        <p className="text-sm text-blue-700 italic">"{currentPlayingQuote}"</p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* הערות/דגשים מיוחדים לניתוח */}
            {call.analysis_notes && (
              <div className="bg-orange-50 border border-orange-200 rounded-xl shadow-lg p-6">
                <h3 className="text-lg font-semibold mb-4 text-orange-800 flex items-center">
                  <span className="mr-2">📋</span>
                  הערות/דגשים מיוחדים שהתבקשו לניתוח
                </h3>
                <div className="bg-white p-4 rounded-lg border border-orange-100">
                  <p className="text-gray-700 leading-relaxed">{call.analysis_notes}</p>
                </div>
                <p className="text-sm text-orange-600 mt-3 italic">
                  🔍 הפרמטרים הללו הועברו למערכת הניתוח והשפיעו על התוצאות המוצגות
                </p>
              </div>
            )}
          </div>
        )}

        {activeTab === 'tone' && (
          <div className="space-y-6">
            {/* ניתוח טונציה */}
            {tone_analysis_report && Object.keys(tone_analysis_report).length > 0 && (
              <>
                {/* ציון טונציה */}
                {getFieldValue(tone_analysis_report, ['ציון_טונציה']) && (
                  <div className="bg-white rounded-xl shadow-lg p-6 text-center">
                    <h3 className="text-xl font-semibold mb-4 text-gray-800">ציון טונציה כללי</h3>
                    <div className="text-5xl font-bold text-blue-600 mb-2">
                      {getFieldValue(tone_analysis_report, ['ציון_טונציה'])}
                    </div>
                    <div className="text-gray-600">מתוך 10</div>
                  </div>
                )}

                {/* מאפייני טונציה */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  {getFieldValue(tone_analysis_report, ['טון_כללי', 'טון', 'overall_tone_assessment']) && (
                    <div className="bg-white rounded-xl shadow-lg p-6 border-l-4 border-blue-500">
                      <h4 className="font-semibold text-blue-800 mb-2">🎭 טון כללי</h4>
                      <p className="text-gray-700">{String(getFieldValue(tone_analysis_report, ['טון_כללי', 'טון', 'overall_tone_assessment']))}</p>
                    </div>
                  )}
                  
                  {getFieldValue(tone_analysis_report, ['רמת_אנרגיה', 'רמת אנרגיה', 'energy_level']) && (
                    <div className="bg-white rounded-xl shadow-lg p-6 border-l-4 border-green-500">
                      <h4 className="font-semibold text-green-800 mb-2">⚡ רמת אנרגיה</h4>
                      <p className="text-gray-700">{String(getFieldValue(tone_analysis_report, ['רמת_אנרגיה', 'רמת אנרגיה', 'energy_level']))}</p>
                    </div>
                  )}
                  
                  {getFieldValue(tone_analysis_report, ['מקצועיות', 'professionalism']) && (
                    <div className="bg-white rounded-xl shadow-lg p-6 border-l-4 border-purple-500">
                      <h4 className="font-semibold text-purple-800 mb-2">💼 מקצועיות</h4>
                      <p className="text-gray-700">{String(getFieldValue(tone_analysis_report, ['מקצועיות', 'professionalism']))}</p>
                    </div>
                  )}
                  
                  {getFieldValue(tone_analysis_report, ['חיוביות', 'positivity']) && (
                    <div className="bg-white rounded-xl shadow-lg p-6 border-l-4 border-yellow-500">
                      <h4 className="font-semibold text-yellow-800 mb-2">😊 חיוביות</h4>
                      <p className="text-gray-700">{String(getFieldValue(tone_analysis_report, ['חיוביות', 'positivity']))}</p>
                    </div>
                  )}
                </div>

                {/* דגלים אדומים טונאליים */}
                {getFieldValue(tone_analysis_report, ['דגלים_אדומים', 'דגלים אדומים', 'red_flags']) && (
                  <div className="bg-white rounded-xl shadow-lg p-6">
                    <h3 className="text-xl font-semibold mb-4 text-red-700">🚨 דגלים אדומים טונאליים</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {Object.entries(getFieldValue(tone_analysis_report, ['דגלים_אדומים', 'דגלים אדומים', 'red_flags']))
                        .map(([key, value]) => (
                          <div key={key} className={`p-4 rounded-lg border-2 ${
                            value === true || value === 'true' || (typeof value === 'string' && value.includes('זוהה'))
                              ? 'bg-red-50 border-red-200' 
                              : 'bg-green-50 border-green-200'
                          }`}>
                            <div className="flex items-center justify-between mb-2">
                              <h4 className="font-medium">{key.replace(/_/g, ' ')}</h4>
                              <span className="text-2xl">
                                {value === true || value === 'true' || (typeof value === 'string' && value.includes('זוהה')) ? '❌' : '✅'}
                              </span>
                            </div>
                            <p className={`text-sm ${
                              value === true || value === 'true' || (typeof value === 'string' && value.includes('זוהה'))
                                ? 'text-red-700' 
                                : 'text-green-700'
                            }`}>
                              {typeof value === 'boolean' 
                                ? (value ? 'זוהה' : 'לא זוהה')
                                : String(value)}
                            </p>
                          </div>
                        ))}
                    </div>
                  </div>
                )}

                {/* ניתוח פרוזודי */}
                {getFieldValue(tone_analysis_report, ['ניתוח_פרוזודי', 'סיכום פרוזודי', 'prosodic_summary']) && (
                  <div className="bg-white rounded-xl shadow-lg p-6">
                    <h3 className="text-xl font-semibold mb-4 text-gray-800">🎵 ניתוח פרוזודי מפורט</h3>
                    <div className="bg-gray-50 p-4 rounded-lg">
                      <p className="text-gray-700 leading-relaxed">
                        {String(getFieldValue(tone_analysis_report, ['ניתוח_פרוזודי', 'סיכום פרוזודי', 'prosodic_summary']))}
                      </p>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {activeTab === 'content' && call.analysis_type === 'full' && (
          <div className="space-y-6">
            {/* הערה על הניתוח המקצועי */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-center">
                <span className="text-blue-500 text-lg mr-2">💡</span>
                <p className="text-blue-800 text-sm">
                  <strong>ניתוח מקצועי מפורט:</strong> 32 פרמטרים מקצועיים בסגנון טבלאי עם ציונים, תובנות והמלצות לשיפור
                </p>
              </div>
            </div>



            {/* נקודות כשל מרכזיות */}
            {analysis_report.נקודות_כשל_מרכזיות && analysis_report.נקודות_כשל_מרכזיות.length > 0 && (
              <div className="bg-red-50 border border-red-200 rounded-xl shadow-lg p-6">
                <h3 className="text-xl font-semibold mb-4 text-red-700 flex items-center">
                  <span className="mr-2">🚨</span>
                  נקודות כשל מרכזיות
                </h3>
                <ul className="space-y-2">
                  {analysis_report.נקודות_כשל_מרכזיות.map((item: string, index: number) => (
                    <li key={index} className="flex items-start">
                      <span className="text-red-500 mr-2">•</span>
                      <span className="text-red-700">{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* נקודות חוזק */}
            {analysis_report.נקודות_חוזקה && analysis_report.נקודות_חוזקה.length > 0 && (
              <div className="bg-green-50 border border-green-200 rounded-xl shadow-lg p-6">
                <h3 className="text-xl font-semibold mb-4 text-green-700 flex items-center">
                  <span className="mr-2">✅</span>
                  נקודות חוזק
                </h3>
                <ul className="space-y-2">
                  {analysis_report.נקודות_חוזקה.map((item: string, index: number) => (
                    <li key={index} className="flex items-start">
                      <span className="text-green-500 mr-2">•</span>
                      <span className="text-green-700">{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* המלצות דחופות ביותר */}
            {analysis_report.המלצות_דחופות_ביותר && analysis_report.המלצות_דחופות_ביותר.length > 0 && (
              <div className="bg-orange-50 border border-orange-200 rounded-xl shadow-lg p-6">
                <h3 className="text-xl font-semibold mb-4 text-orange-700 flex items-center">
                  <span className="mr-2">🎯</span>
                  המלצות דחופות ביותר
                </h3>
                <ul className="space-y-2">
                  {analysis_report.המלצות_דחופות_ביותר.map((item: string, index: number) => (
                    <li key={index} className="flex items-start">
                      <span className="text-orange-500 mr-2">•</span>
                      <span className="text-orange-700">{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* ניתוח מפורט בטבלאות */}
            {getDetailedScores().map((categoryData, categoryIndex) => {
              if (!categoryData.subcategories || categoryData.subcategories.length === 0) return null;
              
              return (
                <div key={categoryIndex} className="bg-white rounded-xl shadow-lg overflow-hidden">
                  <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-6 py-4">
                    <h3 className="text-xl font-semibold text-white flex items-center justify-between">
                      <span>{categoryData.category}</span>
                      <span className={`px-3 py-1 rounded-full text-sm font-bold ${getScoreBg(categoryData.score)}`}>
                        {categoryData.score}/10
                      </span>
                    </h3>
                  </div>
                  
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                            פרמטר
                          </th>
                          <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                            ציון
                          </th>
                          <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                            תובנות
                          </th>
                          <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                            איך משפרים
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {categoryData.subcategories.map((param, paramIndex) => (
                          <tr key={paramIndex} className="hover:bg-gray-50">
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                              {param.name}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-center">
                                                    <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-bold ${getScoreBg(param.score)}`}>
                                                          {param.score}/10
                              </span>
                            </td>
                            <td className="px-6 py-4 text-sm text-gray-700 max-w-xs">
                              {param.insights}
                            </td>
                            <td className="px-6 py-4 text-sm text-gray-700 max-w-xs">
                              {param.improvements}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              );
            })}



            {/* דגלים אדומים */}
            {red_flags && red_flags.length > 0 && (
              <div className="bg-white rounded-xl shadow-lg p-6">
                <h3 className="text-xl font-semibold mb-4 text-red-700">🚨 דגלים אדומים</h3>
                <div className="space-y-4">
                  {red_flags.map((flag: any, index: number) => {
                    if (typeof flag === 'object' && flag !== null) {
                      return (
                        <div key={index} className="bg-red-50 border border-red-200 p-4 rounded-lg">
                          <div className="flex items-start space-x-3 rtl:space-x-reverse">
                            <span className="text-red-500 text-xl">⚠️</span>
                            <div className="flex-1">
                              <h4 className="font-semibold text-red-800 mb-2">{flag.קטגוריה || 'דגל אדום'}</h4>
                              <p className="text-red-700 mb-2">{flag.הערה}</p>
                              {flag.ציון && (
                                <div className="text-sm text-red-600">ציון: {flag.ציון}/10</div>
                              )}
                              {flag.ציטוטים && flag.ציטוטים.length > 0 && (
                                <div className="mt-3">
                                  <h5 className="font-medium text-red-800 mb-2">ציטוטים:</h5>
                                  {flag.ציטוטים.map((quote: any, idx: number) => {
                                    // וידוא שהציטוט הוא מחרוזת
                                    const quoteText = typeof quote === 'string' ? quote : 
                                                     quote?.text || quote?.ציטוט || 
                                                     (typeof quote === 'object' ? JSON.stringify(quote) : String(quote));
                                    
                                    const timestampSeconds = typeof quoteText === 'string' ? findTimestampForQuote(quoteText) : null;
                                    const isCurrentlyPlaying = typeof quoteText === 'string' ? isQuotePlaying(quoteText) : false;
                                    
                                    return (
                                      <div 
                                        key={idx} 
                                        className={`p-3 rounded border-r-4 border-red-400 mb-2 transition-all ${
                                          isCurrentlyPlaying 
                                            ? 'bg-red-100 shadow-md ring-2 ring-red-300' 
                                            : 'bg-white hover:bg-red-50'
                                        }`}
                                        data-quote={quoteText}
                                      >
                                        <div className="flex justify-between items-start">
                                          <div className="flex-1">
                                            {isCurrentlyPlaying && (
                                              <div className="flex items-center text-red-600 animate-pulse mb-1">
                                                <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                                                  <path fillRule="evenodd" d="M9.383 3.076A1 1 0 0110 4v12a1 1 0 01-1.617.817L4.906 14H2a1 1 0 01-1-1V7a1 1 0 011-1h2.906l3.477-2.817z" clipRule="evenodd"/>
                                                </svg>
                                                <span className="text-xs font-medium">מנגן</span>
                                              </div>
                                            )}
                                            <p className={`text-sm transition-colors ${
                                              isCurrentlyPlaying ? 'text-red-800 font-medium' : 'text-gray-700'
                                            }`}>
                                              "{quoteText}"
                                            </p>
                                          </div>
                                          
                                          {timestampSeconds !== undefined && timestampSeconds !== null && audioUrl && (
                                            <div className="mr-2 flex items-center space-x-1">
                                              {isCurrentlyPlaying ? (
                                                <button 
                                                  onClick={stopQuote}
                                                  className="flex items-center px-2 py-1 bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors text-xs"
                                                  title="עצור השמעה"
                                                >
                                                  <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" viewBox="0 0 20 20" fill="currentColor">
                                                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8 7a1 1 0 00-1 1v4a1 1 0 001 1h4a1 1 0 001-1V8a1 1 0 00-1-1H8z" clipRule="evenodd" />
                                                  </svg>
                                                </button>
                                              ) : (
                                                <button 
                                                  onClick={() => playQuote(timestampSeconds, quoteText)}
                                                  className="flex items-center px-2 py-1 bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors text-xs"
                                                  title="השמע ציטוט זה"
                                                  data-quote={quoteText}
                                                >
                                                  <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" viewBox="0 0 20 20" fill="currentColor">
                                                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd" />
                                                  </svg>
                                                </button>
                                              )}
                                            </div>
                                          )}
                                        </div>
                                      </div>
                                    );
                                  })}
                                </div>
                              )}
                              {flag.חלופות_מילוליות && flag.חלופות_מילוליות.length > 0 && (
                                <div className="mt-3">
                                  <h5 className="font-medium text-green-800 mb-2">חלופות מומלצות:</h5>
                                  {flag.חלופות_מילוליות.map((alternative: string, idx: number) => (
                                    <div key={idx} className="bg-green-50 p-2 rounded border-r-4 border-green-400 mb-2">
                                      <p className="text-green-700 text-sm">✨ {alternative}</p>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      )
                    }
                    return (
                      <div key={index} className="bg-red-50 border border-red-200 p-4 rounded-lg">
                        <div className="flex items-start space-x-3 rtl:space-x-reverse">
                          <span className="text-red-500 text-xl">⚠️</span>
                          <p className="text-red-700 flex-1">
                            {typeof flag === 'string' ? flag : JSON.stringify(flag)}
                          </p>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            {/* סיכום כללי עם המלצות פרקטיות */}
            <div className="bg-gradient-to-br from-blue-50 to-purple-50 rounded-xl shadow-lg p-6 border border-blue-200">
              <h3 className="text-xl font-semibold mb-4 text-blue-800 flex items-center">
                <span className="mr-2">🎯</span>
                סיכום כללי והמלצות פרקטיות
              </h3>
              
              {/* נקודות חוזק לשימור */}
              {strengths_and_preservation_points && strengths_and_preservation_points.length > 0 && (
                <div className="mb-6">
                  <h4 className="font-semibold text-green-700 mb-3 flex items-center">
                    <span className="mr-2">✅</span>
                    נקודות חוזק לשימור:
                  </h4>
                  <div className="space-y-2">
                    {strengths_and_preservation_points.map((point: any, index: number) => (
                      <div key={index} className="flex items-start bg-green-50 p-3 rounded-lg border border-green-200">
                        <span className="text-green-500 text-lg mr-2 mt-0.5">💪</span>
                        <p className="text-gray-700 flex-1">
                          {typeof point === 'string' ? point : JSON.stringify(point)}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* נקודות לשיפור */}
              {improvement_points && improvement_points.length > 0 && (
                <div className="mb-6">
                  <h4 className="font-semibold text-orange-700 mb-3 flex items-center">
                    <span className="mr-2">🎯</span>
                    נקודות עיקריות לשיפור:
                  </h4>
                  <div className="space-y-2">
                    {improvement_points.map((point: any, index: number) => (
                      <div key={index} className="flex items-start bg-orange-50 p-3 rounded-lg border border-orange-200">
                        <span className="text-orange-500 text-lg mr-2 mt-0.5">📈</span>
                        <p className="text-gray-700 flex-1">
                          {typeof point === 'string' ? point : JSON.stringify(point)}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* המלצות פרקטיות */}
              {practical_recommendations && practical_recommendations.length > 0 && (
                <div>
                  <h4 className="font-semibold text-blue-700 mb-3 flex items-center">
                    <span className="mr-2">💡</span>
                    המלצות פרקטיות ליישום מיידי:
                  </h4>
                  <div className="space-y-2">
                    {practical_recommendations.map((rec: any, index: number) => (
                      <div key={index} className="flex items-start bg-blue-50 p-4 rounded-lg border border-blue-200">
                        <span className="text-blue-500 text-lg mr-2 mt-0.5">💡</span>
                        <p className="text-gray-700 flex-1 font-medium">
                          {typeof rec === 'string' ? rec : JSON.stringify(rec)}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* הוספת המלצה לתרגול אם הציון נמוך */}
              {finalOverallScore < 8 && (
                <div className="mt-6 p-4 bg-purple-50 rounded-lg border border-purple-200">
                  <h4 className="font-semibold text-purple-700 mb-2 flex items-center">
                    <span className="mr-2">🏋️‍♂️</span>
                    המלצה לתרגול נוסף:
                  </h4>
                  <p className="text-purple-700">
                    {finalOverallScore >= 7 
                      ? 'הביצועים סבירים, אך עדיין יש מקום לשיפור. מומלץ לעבור לחדר הכושר ולבצע סימולציות תרגול כדי להגיע לרמה מעולה.'
                      : 'בהתבסס על הציון שקיבלת, דרוש שיפור משמעותי. מומלץ בחום לעבור לחדר הכושר ולבצע סימולציות תרגול מרובות כדי לשפר את הביצועים באזורים שזוהו לשיפור.'
                    }
                  </p>
                  <div className="mt-3">
                    <a 
                      href="/simulations" 
                      className="inline-flex items-center px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors text-sm font-medium"
                    >
                      🏋️‍♂️ עבור לחדר הכושר
                    </a>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'quotes' && (
          <div className="space-y-6">
            {/* כותרת הציטוטים */}
            <div className="bg-white rounded-xl shadow-lg p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-semibold text-gray-800 flex items-center">
                  <span className="mr-2">💬</span>
                  ציטוטים רלוונטיים
                </h3>
                <div className="text-sm text-gray-600">
                  {all_quotes && all_quotes.length > 0 ? `${all_quotes.length} ציטוטים` : 'אין ציטוטים'}
                </div>
              </div>
              
              {all_quotes && all_quotes.length > 0 ? (
                <div className="space-y-4">
                  {all_quotes.map((quote: any, idx: number) => {
                    const quoteText = quote.text || quote.quote || quote.ציטוט || quote.content || '';
                    const comment = quote.comment || quote.הערה || quote.impact || quote.analysis || '';
                    const category = quote.category || quote.קטגוריה || 'כללי';
                    const alternative = quote.alternative || '';
                    
                                         // החלפת שמות לנציג/לקוח - פונקציה משופרת
                     const anonymizedQuote = quoteText.replace(/([א-ת]+)(\s*:)/g, (match: string, name: string, colon: string) => {
                       // בדיקה אם זה שם נציג או לקוח לפי הקשר
                       const lowerName = name.toLowerCase();
                       if (lowerName.includes('נציג') || lowerName.includes('מוכר') || lowerName.includes('שירות') || 
                           lowerName.includes('agent') || lowerName.includes('sales')) {
                         return 'הנציג' + colon;
                       }
                       return 'הלקוח' + colon;
                     });
                    
                    // חיפוש timestamp
                    let timestampSeconds = quote.timestamp_seconds;
                    if (!timestampSeconds && quote.timestamp) {
                      const timestamp = quote.timestamp;
                      if (timestamp && timestamp.includes(':')) {
                        const parts = timestamp.split('-')[0].split(':');
                        if (parts.length === 2) {
                          timestampSeconds = parseInt(parts[0]) * 60 + parseInt(parts[1]);
                        }
                      }
                    }
                    if (!timestampSeconds && quoteText) {
                      timestampSeconds = findTimestampForQuote(quoteText);
                    }
                    
                    const isCurrentlyPlaying = isQuotePlaying(quoteText);
                    
                    return (
                      <div 
                        key={idx} 
                        className={`transition-all duration-300 border rounded-lg p-4 ${
                          isCurrentlyPlaying 
                            ? 'bg-gradient-to-r from-blue-100 to-blue-50 border-blue-400 shadow-lg ring-2 ring-blue-300' 
                            : 'bg-gray-50 border-gray-200 hover:bg-blue-50 hover:border-blue-300'
                        }`}
                      >
                        <div className="flex justify-between items-start">
                          <div className="flex-1">
                            <div className="flex items-center mb-2">
                              <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded-full text-xs font-medium mr-2">
                                {category}
                              </span>
                              {isCurrentlyPlaying && (
                                <div className="flex items-center text-blue-600 animate-pulse">
                                  <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                                    <path fillRule="evenodd" d="M9.383 3.076A1 1 0 0110 4v12a1 1 0 01-1.617.817L4.906 14H2a1 1 0 01-1-1V7a1 1 0 011-1h2.906l3.477-2.817z" clipRule="evenodd"/>
                                  </svg>
                                  <span className="text-sm font-medium">מנגן כעת</span>
                                </div>
                              )}
                            </div>
                            
                            <p className={`italic mb-2 text-lg transition-colors ${
                              isCurrentlyPlaying ? 'text-blue-800 font-medium' : 'text-gray-700'
                            }`}>
                              "{anonymizedQuote}"
                            </p>
                            
                            {comment && (
                              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mt-2">
                                <p className="text-sm text-blue-800">
                                  💭 <strong>הערה:</strong> {comment}
                                </p>
                              </div>
                            )}
                            
                            {alternative && (
                              <div className="bg-green-50 border border-green-200 rounded-lg p-3 mt-2">
                                <p className="text-sm text-green-800">
                                  ✨ <strong>איך צריך היה לנסח:</strong> "{alternative}"
                                </p>
                              </div>
                            )}
                          </div>
                          
                          <div className="flex items-center space-x-2 rtl:space-x-reverse mr-4">
                            {timestampSeconds !== undefined && timestampSeconds !== null && audioUrl && (
                              <>
                                {isCurrentlyPlaying ? (
                                  <button 
                                    onClick={stopQuote}
                                    className="flex items-center px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors font-medium shadow-md"
                                    title="עצור השמעה"
                                  >
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-1" viewBox="0 0 20 20" fill="currentColor">
                                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8 7a1 1 0 00-1 1v4a1 1 0 001 1h4a1 1 0 001-1V8a1 1 0 00-1-1H8z" clipRule="evenodd" />
                                    </svg>
                                    עצור
                                  </button>
                                ) : (
                                  <button 
                                    onClick={() => playQuote(timestampSeconds, quoteText)}
                                    className="flex items-center px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors font-medium shadow-md"
                                    title="השמע את הציטוט באודיו"
                                  >
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-1" viewBox="0 0 20 20" fill="currentColor">
                                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd" />
                                    </svg>
                                    השמע ב-{formatTime(timestampSeconds)}
                                  </button>
                                )}
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <span className="text-4xl mb-2 block">📝</span>
                  <p>לא נמצאו ציטוטים רלוונטיים</p>
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'transcript' && (
          <div className="space-y-6">
            {call.transcript ? (
              <div className="bg-white rounded-xl shadow-lg p-6">
                <h3 className="text-xl font-semibold mb-6 text-gray-800">📄 תמליל השיחה</h3>
                <div className="bg-gray-50 p-6 rounded-lg border">
                  <p className="text-gray-700 whitespace-pre-wrap leading-relaxed text-lg">
                    {call.transcript}
                  </p>
                </div>
              </div>
            ) : (
              <div className="bg-white rounded-xl shadow-lg p-8 text-center">
                <div className="text-gray-400 text-6xl mb-4">📄</div>
                <h3 className="text-xl font-semibold text-gray-600 mb-2">תמליל לא זמין</h3>
                <p className="text-gray-500">
                  {call.analysis_type === 'tone' 
                    ? 'תמליל לא נוצר עבור ניתוח טונציה בלבד' 
                    : 'תמליל השיחה לא זמין כרגע'}
                </p>
              </div>
            )}
          </div>
        )}

        {/* הערות נציג */}
        {call.agent_notes && (
          <div className="mt-8 bg-yellow-50 border border-yellow-200 rounded-xl shadow-lg p-6">
            <h3 className="text-lg font-semibold mb-4 text-yellow-800 flex items-center">
              <span className="mr-2">📝</span>
              הערות הנציג
            </h3>
            <div className="bg-white p-4 rounded-lg border border-yellow-100">
              <p className="text-gray-700 leading-relaxed">{call.agent_notes}</p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
} 