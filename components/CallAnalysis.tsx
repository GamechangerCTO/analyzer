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
  
  const audioRef = useRef<HTMLAudioElement>(null)
  
  // ייצוג של זמן בפורמט של דקות:שניות
  const formatTime = (timeInSeconds: number) => {
    const minutes = Math.floor(timeInSeconds / 60)
    const seconds = Math.floor(timeInSeconds % 60)
    return `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`
  }
  
  // טיפול בלחיצה על ציטוט כדי לנגן את החלק הרלוונטי בשמע
  const playQuote = (timeInSeconds: number) => {
    if (audioRef.current && audioUrl) {
      audioRef.current.currentTime = timeInSeconds
      audioRef.current.play()
      setIsPlaying(true)
    }
  }
  
  // עדכון זמן הניגון הנוכחי
  useEffect(() => {
    const audioElement = audioRef.current
    if (!audioElement) return
    
    const updateTime = () => {
      setCurrentTime(audioElement.currentTime)
    }
    
    audioElement.addEventListener('timeupdate', updateTime)
    
    return () => {
      audioElement.removeEventListener('timeupdate', updateTime)
    }
  }, [])
  
  // פולינג לבדיקת סטטוס העיבוד
  useEffect(() => {
    if (['pending', 'transcribing', 'analyzing_tone', 'analyzing_content'].includes(status)) {
      setIsPolling(true)
      const intervalId = setInterval(async () => {
        try {
          const statusInfo = await getCallStatus(call.id)
          setStatus(statusInfo.status)
          setErrorMessage(statusInfo.errorMessage)
          
          if (!statusInfo.isProcessing) {
            clearInterval(intervalId)
            setIsPolling(false)
            if (statusInfo.isComplete) {
              window.location.reload()
            }
          }
          
          const logsResponse = await fetch(`/api/call-logs/${call.id}`, {
            cache: 'no-store'
          })
          if (logsResponse.ok) {
            const logsData = await logsResponse.json()
            setCallLogs(logsData.logs || [])
          }
          
        } catch (error) {
          console.error('Error polling call status:', error)
        }
      }, 3000)
      
      return () => clearInterval(intervalId)
    }
  }, [status, call.id])
  
  // הצגת סטטוס העיבוד
  if (['pending', 'transcribing', 'analyzing_tone', 'analyzing_content'].includes(status) || isPolling) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-6">
        <div className="max-w-4xl mx-auto">
          <div className="bg-white rounded-xl shadow-lg p-8">
            <div className="flex flex-col items-center justify-center">
              <div className="mb-6">
                <CallStatusBadge status={status} />
              </div>
              
              <h2 className="text-2xl font-bold mb-3 text-center text-gray-800">
                השיחה נמצאת בתהליך עיבוד
              </h2>
              
              <p className="text-gray-600 mb-8 text-center max-w-md">
                אנו מנתחים את השיחה שלך באמצעות בינה מלאכותית מתקדמת. התהליך עשוי לקחת מספר דקות.
              </p>
              
              {/* מד התקדמות מעוצב */}
              <div className="w-full max-w-lg mx-auto mb-8">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-sm font-semibold text-blue-600">
                    {status === 'pending' ? '🔄 טוען משאבים' :
                     status === 'transcribing' ? '📝 תמלול השיחה' :
                     status === 'analyzing_tone' ? '🎭 ניתוח טונציה' :
                     status === 'analyzing_content' ? '📊 ניתוח תוכן' : 
                     'מעבד...'}
                  </span>
                  <span className="text-sm font-bold text-blue-600">
                    {status === 'pending' ? '10%' :
                     status === 'transcribing' ? '35%' :
                     status === 'analyzing_tone' ? '65%' :
                     status === 'analyzing_content' ? '90%' : 
                     '0%'}
                  </span>
                </div>
                <div className="overflow-hidden h-3 bg-blue-100 rounded-full">
                  <div 
                    style={{ 
                      width: status === 'pending' ? '10%' :
                            status === 'transcribing' ? '35%' :
                            status === 'analyzing_tone' ? '65%' :
                            status === 'analyzing_content' ? '90%' : '0%'
                    }} 
                    className="h-full bg-gradient-to-r from-blue-500 to-blue-600 rounded-full transition-all duration-500 ease-out"
                  />
                </div>
              </div>
              
              {/* אנימציית טעינה מעוצבת */}
              <div className="flex justify-center items-center mb-8">
                <div className="relative">
                  <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-blue-500"></div>
                  <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-2xl">
                    {status === 'transcribing' ? '📝' :
                     status === 'analyzing_tone' ? '🎭' :
                     status === 'analyzing_content' ? '📊' : '⚙️'}
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
            </div>
          </div>
        </div>
      </div>
    )
  }
  
  // רנדור במקרה של שגיאה
  if (status === 'error') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-50 to-pink-100 p-6">
        <div className="max-w-2xl mx-auto">
          <div className="bg-white rounded-xl shadow-lg p-8 text-center">
            <div className="mb-6">
              <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-red-100 mb-4">
                <svg className="h-8 w-8 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
              </div>
              <CallStatusBadge status={status} />
            </div>
            <h2 className="text-xl font-semibold mb-3 text-red-600">
              אירעה שגיאה בעיבוד השיחה
            </h2>
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
              <p className="text-red-700 text-sm">
                {errorMessage || 'לא ניתן היה להשלים את ניתוח השיחה. אנא נסה שוב מאוחר יותר.'}
              </p>
            </div>
            <button 
              onClick={() => window.location.href = '/upload'}
              className="px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors font-medium"
            >
              העלה שיחה חדשה
            </button>
          </div>
        </div>
      </div>
    )
  }
  
  // רנדור לשיחה שהושלמה
  const analysisReport = call.analysis_report || {};
  
  // פונקציה להתמודדות עם שמות שדות בפורמטים שונים
  const getFieldValue = (report: any, fieldNames: string[]) => {
    for (const name of fieldNames) {
      if (report[name] !== undefined) {
        return report[name];
      }
    }
    return undefined;
  };

  // חילוץ שדות מהדוח
  const overall_score_from_report = getFieldValue(analysisReport, ['ציון כללי', 'ציון_כללי', 'overall_score', 'score_overall']);
  const red_flag_from_report = getFieldValue(analysisReport, ['red_flag', 'דגל_אדום']);
  const tone_analysis_report = call.tone_analysis_report || getFieldValue(analysisReport, ['tone_analysis_report']) || {};
  const red_flags = getFieldValue(analysisReport, ['דגלים אדומים', 'דגלים_אדומים', 'red_flags']) || [];
  const improvement_points = getFieldValue(analysisReport, ['נקודות לשיפור', 'נקודות_לשיפור', 'improvement_points', 'המלצות_שיפור', 'המלצות_פרקטיות']) || [];
  const strengths_and_preservation_points = getFieldValue(analysisReport, ['נקודות חוזק לשימור', 'נקודות_חוזק', 'strengths_and_preservation_points', 'strengths']) || [];
  const detailed_scores = getFieldValue(analysisReport, ['ציונים מפורטים', 'ציונים_לפי_קטגוריות', 'פרמטרים', 'פירוט_ציונים', 'detailed_scores', 'category_scores']) || {};
  const practical_recommendations = getFieldValue(analysisReport, ['המלצות פרקטיות לשיפור', 'המלצות_פרקטיות_לשיפור', 'המלצות_פרקטיות', 'המלצות_מעשיות', 'practical_recommendations']) || [];
  const segment_quotes = getFieldValue(analysisReport, ['ציטוטים', 'קטעים_רלוונטיים', 'ציטוטים_או_קטעים_רלוונטיים', 'key_segments', 'segment_quotes']) || [];
  
  const finalOverallScore = overall_score_from_report || call.overall_score || 0;
  const finalRedFlag = typeof red_flag_from_report === 'boolean' ? red_flag_from_report : call.red_flag;
  
  // פונקציה לקביעת צבע הציון
  const getScoreColor = (score: number) => {
    if (score >= 8) return 'text-green-600'
    if (score >= 6) return 'text-yellow-600'
    return 'text-red-600'
  }
  
  const getScoreBg = (score: number) => {
    if (score >= 8) return 'bg-green-50 border-green-200'
    if (score >= 6) return 'bg-yellow-50 border-yellow-200'
    return 'bg-red-50 border-red-200'
  }

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
                <h1 className="text-2xl font-bold text-gray-900">{call.call_type}</h1>
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
              <CallStatusBadge status={status} />
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Navigation Tabs */}
        <div className="mb-8">
          <nav className="flex space-x-8 rtl:space-x-reverse">
            {['summary', 'tone', 'content', ...(userRole === 'admin' ? ['transcript'] : [])].map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`py-2 px-4 rounded-lg font-medium tab-button ${
                  activeTab === tab
                    ? 'bg-blue-500 text-white shadow-md active'
                    : 'text-gray-600 hover:text-blue-600 hover:bg-blue-50'
                }`}
              >
                {tab === 'summary' ? '📊 סיכום כללי' :
                 tab === 'tone' ? '🎭 ניתוח טונציה' :
                 tab === 'content' ? '📝 ניתוח מפורט' :
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
                       finalOverallScore >= 6 ? 'ביצועים טובים' :
                       'יש מקום לשיפור'}
                    </span>
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

            {/* ציונים מפורטים */}
            {detailed_scores && Object.keys(detailed_scores).length > 0 && (
              <div className="bg-white rounded-xl shadow-lg p-6">
                <h3 className="text-xl font-semibold mb-6 text-gray-800">ציונים לפי קטגוריות</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {Object.entries(detailed_scores).map(([category, score], idx) => {
                    const scoreValue = typeof score === 'object' && score !== null 
                      ? ((score as Record<string, any>).ציון || (score as Record<string, any>).score || 0) 
                      : Number(score);
                    
                    const displayCategory = category.replace(/_/g, ' ');
                    
                    return (
                      <div key={idx} className={`p-4 rounded-lg border-2 ${getScoreBg(scoreValue)}`}>
                        <div className="flex justify-between items-start mb-2">
                          <h4 className="font-medium text-gray-800">{displayCategory}</h4>
                          <span className={`text-2xl font-bold ${getScoreColor(scoreValue)}`}>
                            {scoreValue}
                          </span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div 
                            className={`h-2 rounded-full transition-all duration-300 ${
                              scoreValue >= 8 ? 'bg-green-500' :
                              scoreValue >= 6 ? 'bg-yellow-500' : 'bg-red-500'
                            }`}
                            style={{ width: `${(scoreValue / 10) * 100}%` }}
                          />
                        </div>
                        {typeof score === 'object' && score !== null && (score as Record<string, any>).הערה && (
                          <p className="mt-2 text-sm text-gray-600">
                            {String((score as Record<string, any>).הערה)}
                          </p>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* נגן אודיו */}
            {audioUrl && (
              <div className="bg-white rounded-xl shadow-lg p-6">
                <h3 className="text-lg font-semibold mb-4 text-gray-800">🎧 הקלטת השיחה</h3>
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
              </div>
            )}

            {/* פרמטרים מיוחדים לניתוח */}
            {call.analysis_notes && (
              <div className="bg-orange-50 border border-orange-200 rounded-xl shadow-lg p-6">
                <h3 className="text-lg font-semibold mb-4 text-orange-800 flex items-center">
                  <span className="mr-2">📋</span>
                  פרמטרים מיוחדים שהתבקשו לניתוח
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
            {/* הערה על אילוץ הציטוטים */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-center">
                <span className="text-blue-500 text-lg mr-2">💡</span>
                <p className="text-blue-800 text-sm">
                  <strong>ניתוח מפורט:</strong> כל פרמטר מציג את הציון, הערות והציטוטים הרלוונטיים יחד במקום נפרד
                </p>
              </div>
            </div>

            {/* ניתוח מפורט עם כל הפרמטרים וציטוטים משולבים */}
            {detailed_scores && Object.keys(detailed_scores).length > 0 && (
              <div className="space-y-6">
                {Object.entries(detailed_scores).map(([category, score], idx) => {
                  const scoreValue = typeof score === 'object' && score !== null 
                    ? ((score as Record<string, any>).ציון || (score as Record<string, any>).score || 0) 
                    : Number(score);
                  
                  const displayCategory = category.replace(/_/g, ' ');
                  const categoryData = (score as Record<string, any>);
                  
                  // חיפוש ציטוטים רלוונטיים לקטגוריה זו
                  const relevantQuotes = segment_quotes ? segment_quotes.filter((quote: any) => {
                    if (!quote || typeof quote !== 'object') return false;
                    const quoteCategory = quote.category || quote.קטגוריה || quote.title || '';
                    return quoteCategory.toLowerCase().includes(category.toLowerCase()) || 
                           category.toLowerCase().includes(quoteCategory.toLowerCase());
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
                            scoreValue >= 6 ? 'bg-yellow-500' : 'bg-red-500'
                          }`}
                          style={{ width: `${(scoreValue / 10) * 100}%` }}
                        />
                      </div>

                      {/* הערות והערכה */}
                      {categoryData && categoryData.הערה && (
                        <div className="mb-4 p-3 bg-gray-50 rounded-lg">
                          <h4 className="font-medium text-gray-700 mb-2">📝 הערכה מפורטת:</h4>
                          <p className="text-gray-700 leading-relaxed">
                            {String(categoryData.הערה)}
                          </p>
                        </div>
                      )}

                      {/* ציטוטים רלוונטיים */}
                      {relevantQuotes.length > 0 && (
                        <div className="space-y-3">
                          <h4 className="font-medium text-gray-700 flex items-center">
                            <span className="mr-2">💬</span>
                            ציטוטים רלוונטיים:
                          </h4>
                          {relevantQuotes.map((quote: any, quoteIdx: number) => {
                            const quoteText = quote.text || quote.quote || quote.ציטוט || quote.content || '';
                            const comment = quote.comment || quote.הערה || '';
                            
                            return (
                              <div key={quoteIdx} className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                                <div className="flex justify-between items-start mb-2">
                                  <div className="flex-1">
                                    <p className="text-gray-700 italic mb-2">
                                      "{typeof quoteText === 'string' ? quoteText : JSON.stringify(quoteText)}"
                                    </p>
                                    {comment && (
                                      <p className="text-sm text-blue-700">
                                        💭 {typeof comment === 'string' ? comment : JSON.stringify(comment)}
                                      </p>
                                    )}
                                  </div>
                                  {quote.timestamp_seconds && audioUrl && (
                                    <button 
                                      onClick={() => playQuote(quote.timestamp_seconds)}
                                      className="mr-3 flex items-center px-2 py-1 bg-blue-100 text-blue-700 rounded-full hover:bg-blue-200 transition-colors text-xs"
                                    >
                                      <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 mr-1" viewBox="0 0 20 20" fill="currentColor">
                                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd" />
                                      </svg>
                                      {formatTime(quote.timestamp_seconds)}
                                    </button>
                                  )}
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
                                  {flag.ציטוטים.map((quote: string, idx: number) => (
                                    <div key={idx} className="bg-white p-2 rounded border-r-4 border-red-400 mb-2">
                                      <p className="text-gray-700 text-sm">"{quote}"</p>
                                    </div>
                                  ))}
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
              {finalOverallScore < 7 && (
                <div className="mt-6 p-4 bg-purple-50 rounded-lg border border-purple-200">
                  <h4 className="font-semibold text-purple-700 mb-2 flex items-center">
                    <span className="mr-2">🏋️‍♂️</span>
                    המלצה לתרגול נוסף:
                  </h4>
                  <p className="text-purple-700">
                    בהתבסס על הציון שקיבלת, מומלץ לעבור לחדר הכושר ולבצע סימולציות תרגול 
                    כדי לשפר את הביצועים באזורים שזוהו לשיפור.
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