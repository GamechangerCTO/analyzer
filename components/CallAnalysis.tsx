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
  audio_file_path: string | null
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
  const [activeTab, setActiveTab] = useState('content')
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [status, setStatus] = useState<string>(call.processing_status || 'pending')
  const [errorMessage, setErrorMessage] = useState<string | null>(call.error_message || null)
  const [isPolling, setIsPolling] = useState(false)
  const [callLogs, setCallLogs] = useState<Array<{timestamp: string; message: string; data?: any}>>([])
  const [currentPlayingQuote, setCurrentPlayingQuote] = useState<string>('')
  const [audioError, setAudioError] = useState<string | null>(null)
  const [audioLoading, setAudioLoading] = useState(false)
  const [retryAttempts, setRetryAttempts] = useState(0)
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null)
  
  const audioRef = useRef<HTMLAudioElement>(null)
  
  // פונקציה לרענון URL חתום במקרה של פקיעה
  const refreshAudioUrl = async () => {
    if (!call.audio_file_path || audioLoading) return null;
    
    setAudioLoading(true);
    setAudioError(null);
    
    try {
      console.log('🔄 מרענן URL חתום לאודיו...');
      
      const { createClient } = require('@supabase/supabase-js');
      const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
      );
      
      const { data, error } = await supabase.storage
        .from('audio_files')
        .createSignedUrl(call.audio_file_path, 3600); // 1 שעה
        
      if (error) {
        console.error('שגיאה ברענון URL חתום:', error);
        setAudioError(`שגיאה ברענון קישור האודיו: ${error.message}`);
        return null;
      }
      
      if (data?.signedUrl) {
        console.log('✅ URL חתום חדש נוצר בהצלחה');
        
        // בדיקה שהקישור החדש עובד
        try {
          const testResponse = await fetch(data.signedUrl, { method: 'HEAD' });
          if (!testResponse.ok) {
            throw new Error(`קובץ האודיו לא נגיש (status: ${testResponse.status})`);
          }
          
          console.log('✅ קובץ האודיו נגיש בקישור החדש');
          setAudioError(null);
          return data.signedUrl;
          
        } catch (testError) {
          console.error('בדיקת הקישור החדש נכשלה:', testError);
          setAudioError('קובץ האודיו לא נגיש');
          return null;
        }
      }
      
      setAudioError('לא ניתן להשיג קישור לקובץ האודיו');
      return null;
      
    } catch (error) {
      console.error('שגיאה כללית ברענון URL חתום:', error);
      setAudioError('שגיאה טכנית ברענון קישור האודיו');
      return null;
    } finally {
      setAudioLoading(false);
    }
  };
  
  // פונקציה משופרת לטיפול בשגיאות אודיו
  const handleAudioError = async () => {
    console.error('שגיאה בנגן האודיו, מנסה לרענן URL חתום...');
    
    if (retryAttempts >= 2) {
      setAudioError('לא ניתן לנגן את קובץ האודיו לאחר מספר ניסיונות');
      return;
    }
    
    setRetryAttempts(prev => prev + 1);
    const newUrl = await refreshAudioUrl();
    
    if (newUrl && audioRef.current) {
      audioRef.current.src = newUrl;
      audioRef.current.load();
    }
  };
  
  // ייצוג של זמן בפורמט של דקות:שניות
  const formatTime = (timeInSeconds: number | null) => {
    if (timeInSeconds === null || timeInSeconds === undefined || isNaN(timeInSeconds)) {
      return 'לא זמין'
    }
    
    const totalSeconds = Math.round(timeInSeconds)
    const minutes = Math.floor(totalSeconds / 60)
    const seconds = totalSeconds % 60
    
    return `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`
  }
  
  // טיפול בלחיצה על ציטוט כדי לנגן את החלק הרלוונטי בשמע
  const playQuote = async (timeInSeconds: number, quoteText: string = '') => {
    if (!audioRef.current || !audioUrl) {
      console.error('נגן האודיו או ה-URL לא זמינים');
      setAudioError('נגן האודיו לא זמין כרגע');
      return;
    }
    
    try {
      // בדיקה שהאודיו טעון וזמין
      if (audioRef.current.readyState < 2) { // HAVE_CURRENT_DATA
        console.log('🔄 ממתין לטעינת האודיו...');
        setAudioLoading(true);
        
        // ממתין לטעינת האודיו
        const waitForAudio = new Promise<void>((resolve, reject) => {
          const audio = audioRef.current!;
          
          const onCanPlay = () => {
            audio.removeEventListener('canplay', onCanPlay);
            audio.removeEventListener('error', onError);
            setAudioLoading(false);
            resolve();
          };
          
          const onError = () => {
            audio.removeEventListener('canplay', onCanPlay);
            audio.removeEventListener('error', onError);
            setAudioLoading(false);
            reject(new Error('שגיאה בטעינת האודיו'));
          };
          
          audio.addEventListener('canplay', onCanPlay);
          audio.addEventListener('error', onError);
          
          // timeout
          setTimeout(() => {
            audio.removeEventListener('canplay', onCanPlay);
            audio.removeEventListener('error', onError);
            setAudioLoading(false);
            reject(new Error('timeout בטעינת האודיו'));
          }, 10000);
        });
        
        await waitForAudio;
      }
      
      // הגדרת הזמן והשמעה
      audioRef.current.currentTime = timeInSeconds;
      await audioRef.current.play();
      
      setIsPlaying(true);
      setCurrentPlayingQuote(quoteText);
      setAudioError(null);
      
      console.log(`▶️ מנגן ציטוט מזמן ${timeInSeconds} שניות: "${quoteText.substring(0, 50)}..."`);
      
      // הוספת אפקט ויזואלי קצר
      const quoteBtns = document.querySelectorAll(`[data-quote="${quoteText}"]`);
      quoteBtns.forEach(btn => {
        btn.classList.add('animate-pulse');
        setTimeout(() => btn.classList.remove('animate-pulse'), 2000);
      });
      
    } catch (error) {
      console.error('שגיאה בהשמעת ציטוט:', error);
      setIsPlaying(false);
      setCurrentPlayingQuote('');
      setAudioLoading(false);
      
      if (error instanceof Error && error.message.includes('play')) {
        setAudioError('לא ניתן להשמיע את האודיו - ייתכן שהקישור פג');
        
        // ניסיון לרענן את ה-URL
        const newUrl = await refreshAudioUrl();
        if (newUrl && audioRef.current) {
          audioRef.current.src = newUrl;
          audioRef.current.load();
          // ניסיון נוסף להשמיע
          setTimeout(() => playQuote(timeInSeconds, quoteText), 1000);
        }
      } else {
        setAudioError(`שגיאה בהשמעת הציטוט: ${error instanceof Error ? error.message : 'שגיאה לא ידועה'}`);
      }
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
      setAudioError(null) // איפוס שגיאה אם ההשמעה התחילה
    }
    
    const handleError = (event: Event) => {
      console.error('שגיאה בנגן האודיו:', event);
      setIsPlaying(false);
      setCurrentPlayingQuote('');
      handleAudioError();
    }
    
    const handleLoadStart = () => {
      setAudioLoading(true);
    }
    
    const handleCanPlay = () => {
      setAudioLoading(false);
      setAudioError(null);
      console.log('✅ נגן האודיו מוכן להשמעה');
    }
    
    const handleLoadError = () => {
      setAudioLoading(false);
      console.error('שגיאה בטעינת האודיו');
      handleAudioError();
    }
    
    audioElement.addEventListener('timeupdate', updateTime)
    audioElement.addEventListener('pause', handlePause)
    audioElement.addEventListener('ended', handleEnded)
    audioElement.addEventListener('play', handlePlay)
    audioElement.addEventListener('error', handleError)
    audioElement.addEventListener('loadstart', handleLoadStart)
    audioElement.addEventListener('canplay', handleCanPlay)
    audioElement.addEventListener('abort', handleLoadError)
    audioElement.addEventListener('stalled', handleLoadError)
    
    return () => {
      audioElement.removeEventListener('timeupdate', updateTime)
      audioElement.removeEventListener('pause', handlePause)
      audioElement.removeEventListener('ended', handleEnded)
      audioElement.removeEventListener('play', handlePlay)
      audioElement.removeEventListener('error', handleError)
      audioElement.removeEventListener('loadstart', handleLoadStart)
      audioElement.removeEventListener('canplay', handleCanPlay)
      audioElement.removeEventListener('abort', handleLoadError)
      audioElement.removeEventListener('stalled', handleLoadError)
    }
  }, [])
  
  // ניקוי הציטוט הנוכחי כשמשנים טאב
  useEffect(() => {
    setCurrentPlayingQuote('')
  }, [activeTab])

  // פונקציה למעבר לטאב ניתוח מפורט עם פוקוס על קטגוריה ספציפית
  const navigateToDetailedCategory = (categoryName: string) => {
    setSelectedCategory(categoryName)
    setActiveTab('content')
    
    // גלילה לקטגוריה אחרי מעבר קצר
    setTimeout(() => {
      const element = document.getElementById(`category-${categoryName.replace(/\s+/g, '-')}`)
      if (element) {
        element.scrollIntoView({ 
          behavior: 'smooth', 
          block: 'start',
          inline: 'nearest'
        })
        // הוסף הדגשה זמנית
        element.classList.add('ring-4', 'ring-blue-300', 'ring-opacity-75')
        setTimeout(() => {
          element.classList.remove('ring-4', 'ring-blue-300', 'ring-opacity-75')
        }, 3000)
      }
    }, 100)
  }

  // איפוס הקטגוריה הנבחרת כשעוברים לטאב אחר
  useEffect(() => {
    if (activeTab !== 'content') {
      setSelectedCategory(null)
    }
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
      
      return () => {
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

  // מערכת ריענון לוגים בזמן אמת - אופטימיזציה לפרודקשן
  useEffect(() => {
    if (['pending', 'processing', 'transcribing', 'analyzing_tone', 'analyzing_content'].includes(status)) {
      let logFetchCount = 0
      const maxLogFetches = 30 // מקסימום 30 בקשות (= 15 דקות)
      
      const fetchLogs = async () => {
        // הגבלת מספר בקשות
        if (logFetchCount >= maxLogFetches) {
          console.log('⏰ הגעתי למקסימום בקשות לוגים - עוצר')
          return
        }
        
        logFetchCount++
        
        try {
          const logsResponse = await fetch(`/api/call-logs/${call.id}`)
          const logsData = await logsResponse.json()
          
          if (logsData.logs && logsData.logs.length > 0) {
            // עדכון רק אם יש לוגים חדשים
            if (logsData.logs.length > lastProcessedLogIndex) {
              const newLogs = logsData.logs.slice(lastProcessedLogIndex)
              console.log(`📊 לוגים חדשים זוהו: ${newLogs.length} (בקשה #${logFetchCount})`)
              
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
                console.log('✅ זוהה השלמת ניתוח מהלוגים - מעדכן סטטוס ומרענן דף')
                setStatus('completed')
                setCurrentLogStatus('🏁 ניתוח השיחה הושלם! מעבר לתוצאות...')
                setLogBasedProgress(100)
                setDynamicProgress(100)
                setShowSuccessAnimation(true)
                
                // רענון הדף אחרי 2 שניות כדי לתת זמן להצגת ההודעה
                setTimeout(() => {
                  console.log('🔄 מרענן את הדף לטעינת התוצאות החדשות')
                  window.location.reload()
                }, 2000)
                
                return // עצור polling של לוגים
              }
            } else {
              console.log(`📊 אין לוגים חדשים (בקשה #${logFetchCount})`)
            }
          }
        } catch (error) {
          console.error('שגיאה בקריאת לוגים:', error)
          logFetchCount-- // לא נספור שגיאות
        }
      }
      
      // קריאה ראשונית
      fetchLogs()
      
      // קריאה כל 5 שניות (במקום 2) - פחות אגרסיבי
      const logsInterval = setInterval(() => {
        if (logFetchCount < maxLogFetches && 
            ['pending', 'processing', 'transcribing', 'analyzing_tone', 'analyzing_content'].includes(status)) {
          fetchLogs()
        } else {
          clearInterval(logsInterval)
          console.log('🔌 עצרתי polling של לוגים')
        }
      }, 5000)
      
      return () => {
        clearInterval(logsInterval)
        console.log('🧹 ניקיתי interval של לוגים')
      }
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

  // State לprogress הדינמי - עכשיו מחושב לפי לוגים
  const [dynamicProgress, setDynamicProgress] = useState(calculateDynamicProgress())

  // עדכון progress בזמן אמת - רק כשיש שינוי אמיתי
  useEffect(() => {
    const newProgress = calculateDynamicProgress()
    if (newProgress !== dynamicProgress) {
      setDynamicProgress(newProgress)
    }
  }, [logBasedProgress, status])

  // State נוסף לאנימציית הצלחה
  const [showSuccessAnimation, setShowSuccessAnimation] = useState(false)
  const [countdown, setCountdown] = useState(3)
  const [hasCompletedOnce, setHasCompletedOnce] = useState(false) // למניעת לופ
  const [shouldShowAnalysis, setShouldShowAnalysis] = useState(false)

  // בדיקה אם יש ניתוח קיים
  const hasAnalysisData = call.analysis_report || call.tone_analysis_report
  
  // בדיקה ראשונית - אם יש ניתוח קיים, הצג ניתוח מיד
  useEffect(() => {
    if (hasAnalysisData) {
      console.log('🎯 יש נתוני ניתוח קיימים - מציג ניתוח מיד')
      setShouldShowAnalysis(true)
      setDynamicProgress(100)
      setIsPolling(false)
      // אם הסטטוס לא completed אבל יש ניתוח, עדכן את הסטטוס
      if (status !== 'completed') {
        setStatus('completed')
      }
    }
  }, [hasAnalysisData])
  
  // טיפול מיוחד בסטטוס completed - מעבר לניתוח אוטומטית
  useEffect(() => {
    // אם הסטטוס הוא completed ויש נתוני ניתוח - הצג את הניתוח מיד
    if (status === 'completed' && hasAnalysisData) {
      console.log('✅ ניתוח הושלם ויש נתונים - מציג ניתוח')
      setShouldShowAnalysis(true)
      setDynamicProgress(100)
      setIsPolling(false)
      return
    }
    
    // אם הסטטוס הוא completed אבל אין נתונים - נסה לטעון מחדש
    if (status === 'completed' && !hasAnalysisData && !hasCompletedOnce) {
      console.log('✅ ניתוח השיחה הושלם אבל אין נתונים - טוען מחדש לקבלת הניתוח')
      setHasCompletedOnce(true) // מונע לופ
      setDynamicProgress(100)
      setShowSuccessAnimation(true)
      
      console.log('🔄 המתנה של 3 שניות ואז טעינה מחדש לקבלת הניתוח')
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
  }, [status, hasCompletedOnce, hasAnalysisData])
  
  // הצגת סטטוס העיבוד - רק אם אין ניתוח קיים או אם המעמד אינו completed
  if (!shouldShowAnalysis && (['pending', 'processing', 'transcribing', 'analyzing_tone', 'analyzing_content'].includes(status) || (status === 'completed' && !hasAnalysisData) || isPolling)) {
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
                  : 'אנו מנתחים את השיחה שלך באמצעות טכנולוגיות ניתוח מתקדמות. התהליך עשוי לקחת מספר דקות.'
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
          { name: 'יחס דיבור - הקשבה', key: 'יחס_דיבור_הקשבה' },
          { name: 'זרימה ושטף', key: 'זרימה_ושטף' },
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
          { name: 'ערך הפתרון', key: 'ערך_הפתרון' },
          { name: 'מומחיות מקצועית', key: 'מומחיות_מקצועית' }
        ]
      },
      {
        category: 'טיפול בהתנגדויות',
        key: 'טיפול_בהתנגדויות',
        subcategories: [
          { name: 'זיהוי התנגדות אמיתית/מזויפת', key: 'זיהוי_התנגדות_אמיתית_מזויפת' },
          { name: 'צריך לחשוב', key: 'צריך_לחשוב' },
          { name: 'אין זמן', key: 'אין_זמן' },
          { name: 'זה לא רלוונטי', key: 'זה_לא_רלוונטי' }
        ]
      },
      {
        category: 'הנעה לפעולה וסגירה',
        key: 'הנעה_לפעולה_וסגירה',
        subcategories: [
          { name: 'הנעה לפעולה', key: 'הנעה_לפעולה' },
          { name: 'פתרון מוצלח', key: 'פתרון_מוצלח' },
          { name: 'סיכום ברור', key: 'סיכום_ברור' },
          { name: 'מתן מעקב', key: 'מתן_מעקב' }
        ]
      },
      {
        category: 'שפת תקשורת',
        key: 'שפת_תקשורת',
        subcategories: [
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
      },
      {
        category: '3 למה',
        key: 'שלושת_הלמה',
        subcategories: [
          { name: 'למה דווקא הפתרון שלנו', key: 'למה_דווקא_הפתרון_שלנו' },
          { name: 'למה דווקא עכשיו', key: 'למה_דווקא_עכשיו' },
          { name: 'למה דווקא איתנו', key: 'למה_דווקא_איתנו' }
        ]
      }
    ];

    // סנן קטגוריות לפי סוג השיחה - הסר "שלושת הלמה" משיחות שירות
    const filteredCategories = categories.filter(category => {
      if (category.key === 'שלושת_הלמה' && call.call_type === 'customer_service') {
        return false;
      }
      return true;
    });

    return filteredCategories.map(category => {
      const categoryData = analysis_report[category.key] || {};
      

      
      const subcategories = category.subcategories.map(sub => {
        // נסה מפתחות שונים כי יש מפתחות עם גרשיים מוזרים
        const possibleKeys = [
          sub.key,
          `"${sub.key}"`,
          `"\\${sub.key}"`,
          sub.key.replace(/_/g, ' '),
          // מפתחות נוספים שאפשר שיופיעו מ-OpenAI
          sub.key.replace('התנגדות_אמיתית_מזויפת', 'אמת_תירוץ'),
          sub.key.replace('יחס_דיבור_הקשבה', 'דיבור_מאוזן'),
          sub.key.replace('זרימה_ושטף', 'זרימה_וסדר'),
          sub.key.replace('ערך_הפתרון', 'יתרון_על_המחיר'),
          sub.key.replace('זה_לא_רלוונטי', 'לא_רלוונטי')
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
          improvements: subData.איך_משפרים || subData.improvements || 'לא זמין',
          // הוסף את כל הנתונים המקוריים לשימוש בתצוגה
          rawData: subData
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

  // פונקציה לחילוץ 3 נקודות עיקריות לשיפור
  const getTop3ImprovementPoints = () => {
    const allImprovements: string[] = [];
    
    // נקודות משיפור מהניתוח הכללי
    if (improvement_points && improvement_points.length > 0) {
      allImprovements.push(...improvement_points.slice(0, 2));
    }
    
    // חילוץ נקודות מהניתוח המפורט - פרמטרים עם ציונים נמוכים
    const detailedScores = getDetailedScores();
    const lowScoringParams = detailedScores
      .flatMap(category => category.subcategories || [])
      .filter(param => param.score <= 6)
      .sort((a, b) => a.score - b.score)
      .slice(0, 3);
    
    lowScoringParams.forEach(param => {
      if (param.improvements && allImprovements.length < 3) {
        allImprovements.push(`${param.name}: ${param.improvements}`);
      }
    });
    
    // אם עדיין חסרות נקודות, נוסיף מהמלצות דחופות
    if (allImprovements.length < 3 && analysis_report.המלצות_דחופות_ביותר) {
      const urgent = analysis_report.המלצות_דחופות_ביותר.slice(0, 3 - allImprovements.length);
      allImprovements.push(...urgent);
    }
    
    return allImprovements.slice(0, 3);
  };

  // פונקציה לחילוץ 3 נקודות עיקריות לשימור
  const getTop3StrengthPoints = () => {
    const allStrengths: string[] = [];
    
    // נקודות חוזק מהניתוח הכללי
    if (strengths_and_preservation_points && strengths_and_preservation_points.length > 0) {
      allStrengths.push(...strengths_and_preservation_points.slice(0, 2));
    }
    
    // חילוץ נקודות מהניתוח המפורט - פרמטרים עם ציונים גבוהים
    const detailedScores = getDetailedScores();
    const highScoringParams = detailedScores
      .flatMap(category => category.subcategories || [])
      .filter(param => param.score >= 8)
      .sort((a, b) => b.score - a.score)
      .slice(0, 3);
    
    highScoringParams.forEach(param => {
      if (param.insights && allStrengths.length < 3) {
        allStrengths.push(`${param.name}: ${param.insights}`);
      }
    });
    
    // אם עדיין חסרות נקודות, נוסיף נקודות חוזק כלליות
    if (allStrengths.length < 3 && analysis_report.נקודות_חוזקה) {
      const generalStrengths = analysis_report.נקודות_חוזקה.slice(0, 3 - allStrengths.length);
      allStrengths.push(...generalStrengths);
    }
    
    return allStrengths.slice(0, 3);
  };
  
  const detailed_analysis = analysisReport.detailed_analysis || {};
  const overall_score_from_report = getFieldValue(analysisReport, ['ציון_כללי', 'ממוצע_משוקלל_כללי', 'ציון כללי', 'overall_score', 'score_overall']) || 
                                   (detailed_analysis.overall_score || detailed_analysis.ציון_כללי);
  const red_flag_from_report = getFieldValue(analysisReport, ['red_flag', 'דגל_אדום']);
  const red_flags = getFieldValue(analysisReport, ['דגלים אדומים', 'דגלים_אדומים', 'red_flags']) || [];
  const improvement_points = getFieldValue(analysisReport, ['נקודות לשיפור', 'נקודות_לשיפור', 'improvement_points', 'המלצות_שיפור', 'המלצות_פרקטיות', 'המלצות_דחופות_ביותר']) || [];
  const strengths_and_preservation_points = getFieldValue(analysisReport, ['נקודות חוזק לשימור', 'נקודות_חוזק', 'strengths_and_preservation_points', 'strengths', 'חוזקות', 'נקודות_חוזקה']) || [];
  
  // לא צריך ציטוטים יותר
  

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
        <td className="px-6 py-4 text-sm text-gray-700 max-w-xs">
          {insights}
          
          {/* תוספת לשדות מיוחדים */}
          {name === 'פתיח אנרגטי' && param.rawData?.שימוש_בשם_פרטי && (
            <div className="mt-2 inline-flex items-center px-2 py-1 bg-blue-50 text-blue-700 rounded text-xs">
              {param.rawData.שימוש_בשם_פרטי === 'כן' ? '✅ השתמש בשם פרטי' : '❌ לא השתמש בשם פרטי'}
            </div>
          )}
          
          {name === 'הנעה לפעולה' && param.rawData?.שימוש_בטכניקות_סגירה && (
            <div className="mt-2 inline-flex items-center px-2 py-1 bg-purple-50 text-purple-700 rounded text-xs">
              {param.rawData.שימוש_בטכניקות_סגירה === 'כן' ? '✅ השתמש בטכניקות סגירה' : '❌ לא השתמש בטכניקות סגירה'}
            </div>
          )}
        </td>
        <td className="px-6 py-4 text-sm text-gray-700 max-w-xs">
          {improvements}
        </td>
      </tr>
    );
  };

  // Cleanup כשהמשתמש עוזב את הדף - אופטימיזציה לפרודקשן
  useEffect(() => {
    const handleBeforeUnload = () => {
      console.log('🧹 המשתמש עוזב את הדף - מנקה את כל ה-intervals')
    }
    
    const handleVisibilityChange = () => {
      if (document.hidden) {
        console.log('📱 הדף הפך ללא פעיל - מקטין polling')
      } else {
        console.log('👁️ הדף חזר להיות פעיל')
      }
    }
    
    window.addEventListener('beforeunload', handleBeforeUnload)
    document.addEventListener('visibilitychange', handleVisibilityChange)
    
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload)
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [])

  return (
    <div className="p-6">
      {/* Header פנימי עם גלס מורפיזם */}
      <div className="relative mb-8">
        {/* Background gradient */}
        <div className="absolute inset-0 bg-gradient-to-r from-blue-500/10 to-indigo-500/10 rounded-2xl"></div>
        
        {/* Header content */}
        <div className="relative backdrop-blur-sm bg-white/50 border border-white/30 rounded-2xl shadow-xl p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4 rtl:space-x-reverse">
              <div className={`flex items-center justify-center w-14 h-14 rounded-2xl shadow-xl border border-white/30 backdrop-blur-sm ${
                finalOverallScore >= 8 ? 'bg-gradient-to-br from-green-400/20 to-emerald-500/20' :
                finalOverallScore >= 6 ? 'bg-gradient-to-br from-yellow-400/20 to-orange-500/20' :
                'bg-gradient-to-br from-red-400/20 to-pink-500/20'
              }`}>
                <span className={`text-2xl font-bold ${getScoreColor(finalOverallScore)}`}>
                  {finalOverallScore}
                </span>
              </div>
              <div>
                <h2 className="text-2xl font-bold bg-gradient-to-r from-slate-800 to-blue-600 bg-clip-text text-transparent">
                  {call.call_type === 'sales' ? 'שיחת מכירות' : 
                   call.call_type === 'customer_service' ? 'שיחת שירות' : 
                   'ניתוח שיחה מקצועי'}
                </h2>
                <p className="text-slate-600 text-sm">תוצאות מפורטות מבוססות AI מתקדם</p>
              </div>
            </div>
            <div className="flex items-center space-x-3 rtl:space-x-reverse">
              {finalRedFlag && (
                <div className="flex items-center px-4 py-2 bg-gradient-to-r from-red-500/20 to-pink-500/20 backdrop-blur-sm border border-red-300/30 text-red-700 rounded-xl text-sm font-medium shadow-lg animate-pulse">
                  🚨 דגל אדום
                </div>
              )}
              {/* כפתור שאלון חברה למנהלים */}
              {userRole === 'manager' && (
                <a
                  href="/company-questionnaire"
                  className="flex items-center px-4 py-2 bg-gradient-to-r from-purple-500 to-indigo-600 hover:from-purple-600 hover:to-indigo-700 text-white rounded-xl font-medium transition-all duration-300 shadow-xl hover:shadow-2xl hover:scale-105 backdrop-blur-sm border border-white/20"
                  title="עריכת שאלון החברה"
                >
                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                  שאלון חברה
                </a>
              )}
              <div className="px-3 py-1 bg-white/50 backdrop-blur-sm rounded-xl border border-white/30 shadow-lg">
                <CallStatusBadge status={status} />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Navigation Tabs עם גלס מורפיזם */}
      <div className="mb-8">
        <div className="backdrop-blur-xl bg-white/30 border border-white/30 rounded-2xl shadow-xl p-2">
          <nav className="flex flex-wrap gap-2">
            {['content', 'tone', 'summary', ...(userRole === 'admin' ? ['transcript'] : [])].map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`relative py-3 px-6 rounded-xl font-medium transition-all duration-300 overflow-hidden group ${
                  activeTab === tab
                    ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-xl border border-white/20'
                    : 'text-slate-600 bg-white/50 hover:bg-white/70 hover:text-blue-600 border border-white/30 hover:border-blue-300/50'
                }`}
              >
                {activeTab === tab && (
                  <div className="absolute inset-0 bg-gradient-to-r from-blue-400/20 to-indigo-400/20 animate-pulse"></div>
                )}
                <span className="relative z-10">
                  {tab === 'summary' ? '📊 סיכום כללי' :
                   tab === 'tone' ? '🎭 ניתוח טונציה' :
                   tab === 'content' ? '📝 ניתוח מפורט' :
                   '📄 תמליל'}
                </span>
              </button>
            ))}
          </nav>
        </div>
      </div>

      {/* Tab Content עם גלס מורפיזם */}
      <div className="space-y-6">
        {activeTab === 'summary' && (
          <div className="space-y-6">
            {/* סיכום כללי */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* ציון כללי */}
              <div className="lg:col-span-1">
                <div className="relative">
                  <div className="absolute inset-0 bg-gradient-to-br from-blue-500/10 to-indigo-500/10 rounded-2xl"></div>
                  <div className="relative backdrop-blur-xl bg-white/80 border border-white/30 rounded-2xl shadow-xl p-6 text-center hover:shadow-2xl transition-all duration-300">
                    <h3 className="text-lg font-semibold mb-4 bg-gradient-to-r from-slate-700 to-blue-600 bg-clip-text text-transparent">ציון כללי</h3>
                    <div className={`text-6xl font-bold mb-4 ${getScoreColor(finalOverallScore)} transition-all duration-500 hover:scale-110`}>
                      {finalOverallScore}
                    </div>
                    <div className="text-slate-600 text-lg font-medium">מתוך 10</div>
                    <div className={`mt-4 p-4 rounded-xl backdrop-blur-sm border shadow-inner ${
                      finalOverallScore >= 8 ? 'bg-gradient-to-br from-green-500/20 to-emerald-500/20 border-green-300/30' :
                      finalOverallScore >= 6 ? 'bg-gradient-to-br from-yellow-500/20 to-orange-500/20 border-yellow-300/30' :
                      'bg-gradient-to-br from-red-500/20 to-pink-500/20 border-red-300/30'
                    }`}>
                      <span className={`text-sm font-medium ${getScoreColor(finalOverallScore)}`}>
                        {finalOverallScore >= 8 ? 'ביצועים מעולים! 🏆' :
                         finalOverallScore >= 6 ? 'ביצועים סבירים - יש מקום לשיפור 📈' :
                         finalOverallScore >= 4 ? 'דרוש שיפור משמעותי 💪' :
                         'ביצועים מתחת לסטנדרט 🎯'}
                      </span>
                      {finalOverallScore < 8 && (
                        <div className="mt-3 text-xs text-slate-600 bg-white/50 rounded-lg p-2 border border-white/30">
                          💡 <strong>זכור:</strong> הסטנדרטים שלנו גבוהים - רק 8+ נחשב לטוב מאוד
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* נתוני שיחה */}
              <div className="lg:col-span-2">
                <div className="relative">
                  <div className="absolute inset-0 bg-gradient-to-br from-slate-500/10 to-blue-500/10 rounded-2xl"></div>
                  <div className="relative backdrop-blur-xl bg-white/80 border border-white/30 rounded-2xl shadow-xl p-6 hover:shadow-2xl transition-all duration-300">
                    <h3 className="text-lg font-semibold mb-4 bg-gradient-to-r from-slate-700 to-blue-600 bg-clip-text text-transparent">פרטי השיחה</h3>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="backdrop-blur-sm bg-blue-500/10 border border-blue-300/30 p-4 rounded-xl shadow-inner hover:bg-blue-500/20 transition-all duration-300">
                        <div className="text-sm text-blue-700 font-medium">סוג ניתוח</div>
                        <div className="text-lg font-semibold text-blue-800">
                          {call.analysis_type === 'full' ? 'ניתוח מלא 🎯' : 'ניתוח טונציה 🎭'}
                        </div>
                      </div>
                      <div className="backdrop-blur-sm bg-green-500/10 border border-green-300/30 p-4 rounded-xl shadow-inner hover:bg-green-500/20 transition-all duration-300">
                        <div className="text-sm text-green-700 font-medium">משך השיחה</div>
                        <div className="text-lg font-semibold text-green-800">
                          {formatTime(call.audio_duration_seconds)} ⏱️
                          {call.audio_duration_seconds && (
                            <div className="text-xs text-green-600 mt-1">
                              ({call.audio_duration_seconds} שניות)
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="backdrop-blur-sm bg-purple-500/10 border border-purple-300/30 p-4 rounded-xl shadow-inner hover:bg-purple-500/20 transition-all duration-300">
                        <div className="text-sm text-purple-700 font-medium">תאריך ניתוח</div>
                        <div className="text-lg font-semibold text-purple-800">
                          {call.analyzed_at ? new Date(call.analyzed_at).toLocaleDateString('he-IL') : 'טרם נותח'} 📅
                        </div>
                      </div>
                      <div className="backdrop-blur-sm bg-orange-500/10 border border-orange-300/30 p-4 rounded-xl shadow-inner hover:bg-orange-500/20 transition-all duration-300">
                        <div className="text-sm text-orange-700 font-medium">סטטוס</div>
                        <div className="text-lg font-semibold text-orange-800">
                          {status === 'completed' ? 'הושלם ✅' : status}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* הסבר על הפרמטרים */}
            <div className="relative mb-6">
              <div className="absolute inset-0 bg-gradient-to-br from-blue-500/10 to-indigo-500/10 rounded-2xl"></div>
              <div className="relative backdrop-blur-xl bg-white/70 border border-white/30 rounded-2xl shadow-xl p-6">
                <div className="flex items-center mb-4">
                  <div className="flex items-center justify-center w-12 h-12 bg-gradient-to-br from-blue-500/20 to-indigo-500/20 backdrop-blur-sm border border-blue-300/30 rounded-xl mr-4">
                    <span className="text-2xl">📊</span>
                  </div>
                  <h3 className="text-xl font-semibold bg-gradient-to-r from-blue-700 to-indigo-600 bg-clip-text text-transparent">8 קטגוריות ניתוח מקצועיות</h3>
                </div>
                <p className="text-blue-700 mb-6 text-lg">
                  השיחה נותחה לפי 8 קטגוריות מקצועיות המכילות 32 פרמטרים מפורטים:
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 text-sm">
                  <div className="backdrop-blur-sm bg-white/60 border border-white/40 p-4 rounded-xl shadow-inner hover:bg-white/80 transition-all duration-300">
                    <div className="font-semibold text-blue-800 mb-1">1. פתיחת שיחה ובניית אמון</div>
                    <div className="text-blue-600 text-xs font-medium">7 פרמטרים מקצועיים</div>
                  </div>
                  <div className="backdrop-blur-sm bg-white/60 border border-white/40 p-4 rounded-xl shadow-inner hover:bg-white/80 transition-all duration-300">
                    <div className="font-semibold text-blue-800 mb-1">2. איתור צרכים וזיהוי כאב</div>
                    <div className="text-blue-600 text-xs font-medium">4 פרמטרים מקצועיים</div>
                  </div>
                  <div className="backdrop-blur-sm bg-white/60 border border-white/40 p-4 rounded-xl shadow-inner hover:bg-white/80 transition-all duration-300">
                    <div className="font-semibold text-blue-800 mb-1">3. הקשבה ואינטראקציה</div>
                    <div className="text-blue-600 text-xs font-medium">4 פרמטרים מקצועיים</div>
                  </div>
                  <div className="backdrop-blur-sm bg-white/60 border border-white/40 p-4 rounded-xl shadow-inner hover:bg-white/80 transition-all duration-300">
                    <div className="font-semibold text-blue-800 mb-1">4. הצגת פתרון והדגשת ערך</div>
                    <div className="text-blue-600 text-xs font-medium">6 פרמטרים מקצועיים</div>
                  </div>
                  <div className="backdrop-blur-sm bg-white/60 border border-white/40 p-4 rounded-xl shadow-inner hover:bg-white/80 transition-all duration-300">
                    <div className="font-semibold text-blue-800 mb-1">5. טיפול בהתנגדויות</div>
                    <div className="text-blue-600 text-xs font-medium">3 פרמטרים מקצועיים</div>
                  </div>
                  <div className="backdrop-blur-sm bg-white/60 border border-white/40 p-4 rounded-xl shadow-inner hover:bg-white/80 transition-all duration-300">
                    <div className="font-semibold text-blue-800 mb-1">6. הנעה לפעולה וסגירה</div>
                    <div className="text-blue-600 text-xs font-medium">3 פרמטרים מקצועיים</div>
                  </div>
                  <div className="backdrop-blur-sm bg-white/60 border border-white/40 p-4 rounded-xl shadow-inner hover:bg-white/80 transition-all duration-300">
                    <div className="font-semibold text-blue-800 mb-1">7. שפת תקשורת ודינמיקה קולית</div>
                    <div className="text-blue-600 text-xs font-medium">3 פרמטרים מקצועיים</div>
                  </div>
                  <div className="backdrop-blur-sm bg-white/60 border border-white/40 p-4 rounded-xl shadow-inner hover:bg-white/80 transition-all duration-300">
                    <div className="font-semibold text-blue-800 mb-1">8. סיכום שיחה</div>
                    <div className="text-blue-600 text-xs font-medium">2 פרמטרים מקצועיים</div>
                  </div>
                </div>
              </div>
            </div>

            {/* הסבר על קליקאביליות הקטגוריות */}
            {detailed_scores && detailed_scores.length > 0 && (
              <div className="bg-gradient-to-r from-blue-50 to-purple-50 border border-blue-200 rounded-lg p-4 mb-6">
                <div className="flex items-center">
                  <span className="text-blue-500 text-lg mr-2">👆</span>
                  <p className="text-blue-800 text-sm">
                    <strong>טיפ:</strong> לחץ על כל קטגוריה להעברה ישירה לפירוט המלא שלה בטאב "ניתוח מפורט"
                  </p>
                </div>
              </div>
            )}

            {/* ציונים מפורטים */}
            {detailed_scores && detailed_scores.length > 0 && (
              <div className="space-y-6">
                {detailed_scores.map((categoryData, idx) => {
                  const scoreValue = categoryData.score || 0;
                  const displayCategory = categoryData.category;
                  
                  // לא צריך ציטוטים במצב זה

                  return (
                    <div 
                      key={idx} 
                      className="bg-white rounded-xl shadow-lg p-6 border-l-4 cursor-pointer hover:shadow-xl transition-all duration-200 hover:scale-[1.02] group" 
                      style={{ borderLeftColor: scoreValue >= 8 ? '#10b981' : scoreValue >= 6 ? '#f59e0b' : '#ef4444' }}
                      onClick={() => navigateToDetailedCategory(displayCategory)}
                      title={`לחץ לצפייה בפירוט המלא של ${displayCategory}`}
                    >
                      
                      {/* כותרת הפרמטר עם ציון */}
                      <div className="flex justify-between items-start mb-4">
                        <h3 className="text-xl font-semibold text-gray-800 group-hover:text-blue-600 transition-colors duration-200 flex items-center">
                          {displayCategory}
                          <svg className="w-5 h-5 mr-2 text-gray-400 group-hover:text-blue-500 transition-colors duration-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                          </svg>
                        </h3>
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
                              <div className="mt-3 p-2 bg-blue-50 rounded border border-blue-200">
                                <p className="text-blue-700 text-xs flex items-center">
                                  <svg className="w-3 h-3 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                                  </svg>
                                  לחץ לצפייה בפירוט המלא בטאב "ניתוח מפורט"
                                </p>
                              </div>
                            </div>
                          )}


                    </div>
                  );
                })}
              </div>
            )}

            {/* 3 נקודות עיקריות לשיפור */}
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-br from-orange-500/10 to-red-500/10 rounded-2xl"></div>
              <div className="relative backdrop-blur-xl bg-white/80 border border-white/30 rounded-2xl shadow-xl p-6 hover:shadow-2xl transition-all duration-300">
                <div className="flex items-center mb-6">
                  <div className="flex items-center justify-center w-12 h-12 bg-gradient-to-br from-orange-500/20 to-red-500/20 backdrop-blur-sm border border-orange-300/30 rounded-xl mr-4">
                    <span className="text-2xl">🎯</span>
                  </div>
                  <h3 className="text-xl font-semibold bg-gradient-to-r from-orange-700 to-red-600 bg-clip-text text-transparent">
                    3 נקודות עיקריות לשיפור
                  </h3>
                </div>
                <div className="space-y-4">
                  {getTop3ImprovementPoints().map((improvement, index) => (
                    <div key={index} className="group flex items-start backdrop-blur-sm bg-orange-500/10 border border-orange-300/30 p-5 rounded-xl shadow-inner hover:bg-orange-500/20 transition-all duration-300">
                      <div className="flex items-center justify-center w-10 h-10 bg-gradient-to-br from-orange-500 to-red-500 text-white rounded-xl font-bold text-lg mr-4 mt-0.5 shadow-lg group-hover:scale-110 transition-transform duration-300">
                        {index + 1}
                      </div>
                      <div className="flex-1">
                        <p className="text-slate-700 leading-relaxed font-medium">
                          {typeof improvement === 'string' ? improvement : JSON.stringify(improvement)}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* 3 נקודות עיקריות לשימור */}
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-br from-green-500/10 to-emerald-500/10 rounded-2xl"></div>
              <div className="relative backdrop-blur-xl bg-white/80 border border-white/30 rounded-2xl shadow-xl p-6 hover:shadow-2xl transition-all duration-300">
                <div className="flex items-center mb-6">
                  <div className="flex items-center justify-center w-12 h-12 bg-gradient-to-br from-green-500/20 to-emerald-500/20 backdrop-blur-sm border border-green-300/30 rounded-xl mr-4">
                    <span className="text-2xl">✅</span>
                  </div>
                  <h3 className="text-xl font-semibold bg-gradient-to-r from-green-700 to-emerald-600 bg-clip-text text-transparent">
                    3 נקודות עיקריות לשימור
                  </h3>
                </div>
                <div className="space-y-4">
                  {getTop3StrengthPoints().map((strength, index) => (
                    <div key={index} className="group flex items-start backdrop-blur-sm bg-green-500/10 border border-green-300/30 p-5 rounded-xl shadow-inner hover:bg-green-500/20 transition-all duration-300">
                      <div className="flex items-center justify-center w-10 h-10 bg-gradient-to-br from-green-500 to-emerald-500 text-white rounded-xl font-bold text-lg mr-4 mt-0.5 shadow-lg group-hover:scale-110 transition-transform duration-300">
                        {index + 1}
                      </div>
                      <div className="flex-1">
                        <p className="text-slate-700 leading-relaxed font-medium">
                          {typeof strength === 'string' ? strength : JSON.stringify(strength)}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* נגן אודיו */}
            {audioUrl && (
              <div className="bg-white rounded-xl shadow-lg p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-gray-800">🎧 הקלטת השיחה</h3>
                  <div className="flex items-center space-x-3 rtl:space-x-reverse">
                    {audioLoading && (
                      <div className="flex items-center text-blue-600">
                        <svg className="animate-spin h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        <span className="text-sm">טוען אודיו...</span>
                      </div>
                    )}
                    {audioError && (
                      <button 
                        onClick={refreshAudioUrl}
                        className="flex items-center px-3 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors text-sm font-medium"
                        title="נסה לטעון את האודיו שוב"
                        disabled={audioLoading}
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                        </svg>
                        רענן אודיו
                      </button>
                    )}
                    {currentPlayingQuote && (
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
                    )}
                    {currentPlayingQuote && (
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
                    )}
                  </div>
                </div>
                
                {/* הצגת שגיאות אודיו */}
                {audioError && (
                  <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                    <div className="flex items-center">
                      <svg className="w-5 h-5 text-red-500 mr-2" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                      </svg>
                      <div className="flex-1">
                        <p className="text-sm font-medium text-red-800">שגיאה בנגן האודיו</p>
                        <p className="text-sm text-red-600">{audioError}</p>
                      </div>
                    </div>
                  </div>
                )}
                
                <audio 
                  ref={audioRef}
                  controls 
                  className={`w-full h-12 rounded-lg transition-opacity ${
                    audioError ? 'bg-red-100 opacity-50' : 'bg-gray-100'
                  }`}
                  onPlay={() => setIsPlaying(true)}
                  onPause={() => setIsPlaying(false)}
                  preload="metadata"
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
                                ? (value ? 'כן' : 'לא')
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
            {/* הודעה על קטגוריה שנבחרה */}
            {selectedCategory && (
              <div className="bg-gradient-to-r from-green-50 to-blue-50 border border-green-300 rounded-lg p-4 mb-6">
                <div className="flex items-center">
                  <span className="text-green-500 text-lg mr-2">🎯</span>
                  <p className="text-green-800 text-sm">
                    <strong>הגעת לכאן מקטגוריה:</strong> "{selectedCategory}" - גלול למטה לקטגוריה המודגשת
                  </p>
                  <button
                    onClick={() => setSelectedCategory(null)}
                    className="mr-auto text-green-600 hover:text-green-800 transition-colors"
                    title="סגור הודעה"
                  >
                    ✕
                  </button>
                </div>
              </div>
            )}
            
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
                <div 
                  key={categoryIndex} 
                  id={`category-${categoryData.category.replace(/\s+/g, '-')}`}
                  className={`bg-white rounded-xl shadow-lg overflow-hidden transition-all duration-300 ${
                    selectedCategory === categoryData.category 
                      ? 'ring-4 ring-blue-300 ring-opacity-75 shadow-2xl' 
                      : ''
                  }`}
                >
                  <div className={`bg-gradient-to-r px-6 py-4 ${
                    selectedCategory === categoryData.category 
                      ? 'from-blue-700 to-blue-800' 
                      : 'from-blue-600 to-blue-700'
                  }`}>
                    <h3 className="text-xl font-semibold text-white flex items-center justify-between">
                      <span className="flex items-center">
                        {selectedCategory === categoryData.category && (
                          <svg className="w-5 h-5 ml-2 animate-pulse" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                          </svg>
                        )}
                        {categoryData.category}
                      </span>
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
                              
                              {/* תוספת לשדות מיוחדים */}
                              {param.name === 'פתיח אנרגטי' && param.rawData?.שימוש_בשם_פרטי && (
                                <div className="mt-2 inline-flex items-center px-2 py-1 bg-blue-50 text-blue-700 rounded text-xs">
                                  {param.rawData.שימוש_בשם_פרטי === 'כן' ? '✅ השתמש בשם פרטי' : '❌ לא השתמש בשם פרטי'}
                                </div>
                              )}
                              
                              {param.name === 'הנעה לפעולה' && param.rawData?.שימוש_בטכניקות_סגירה && (
                                <div className="mt-2 inline-flex items-center px-2 py-1 bg-purple-50 text-purple-700 rounded text-xs">
                                  {param.rawData.שימוש_בטכניקות_סגירה === 'כן' ? '✅ השתמש בטכניקות סגירה' : '❌ לא השתמש בטכניקות סגירה'}
                                </div>
                              )}
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
          <div className="mt-8 backdrop-blur-sm bg-yellow-50/80 border border-yellow-200/50 rounded-2xl shadow-xl p-6">
            <h3 className="text-lg font-semibold mb-4 text-yellow-800 flex items-center">
              <span className="mr-2">📝</span>
              הערות הנציג
            </h3>
            <div className="bg-white/70 backdrop-blur-sm p-4 rounded-xl border border-yellow-100/30 shadow-inner">
              <p className="text-gray-700 leading-relaxed">{call.agent_notes}</p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
} 