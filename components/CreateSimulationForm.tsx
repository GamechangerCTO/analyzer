'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

interface CreateSimulationFormProps {
  user: any
  recentCalls: any[]
  company: any
  existingPersonas: any[]
}

export default function CreateSimulationForm({ 
  user, 
  recentCalls, 
  company, 
  existingPersonas 
}: CreateSimulationFormProps) {
  const router = useRouter()
  const [isGenerating, setIsGenerating] = useState(false)
  
  // שלב נוכחי בתהליך
  const [creationMode, setCreationMode] = useState<'select' | 'call-based' | 'topic-based' | null>(null)
  
  // נתונים לאופציה 1 - על בסיס שיחה
  const [selectedCallId, setSelectedCallId] = useState('')
  
  // נתונים לאופציה 2 - על בסיס נושאים
  const [selectedTopics, setSelectedTopics] = useState<string[]>(['פתיחת_שיחה_ובניית_אמון'])

  // רשימת 8 הנושאים לאימון
  const simulationTopics = [
    { id: 'פתיחת_שיחה_ובניית_אמון', label: 'פתיחת שיחה ובניית אמון', icon: '👋', desc: 'יצירת רושם ראשוני חיובי וחיבור עם הלקוח' },
    { id: 'איתור_צרכים_וזיהוי_כאב', label: 'איתור צרכים וזיהוי כאב', icon: '🔍', desc: 'שאלות פתוחות והבנת הבעיה האמיתית' },
    { id: 'הקשבה_ואינטראקציה', label: 'הקשבה ואינטראקציה', icon: '👂', desc: 'הקשבה אקטיבית ושיקוף' },
    { id: 'הצגת_פתרון_והדגשת_ערך', label: 'הצגת פתרון והדגשת ערך', icon: '💡', desc: 'הצגת המוצר כפתרון לבעיה' },
    { id: 'טיפול_בהתנגדויות', label: 'טיפול בהתנגדויות', icon: '🛡️', desc: 'התמודדות עם התנגדויות מחיר, זמן ואמון' },
    { id: 'הנעה_לפעולה_וסגירה', label: 'הנעה לפעולה וסגירה', icon: '🎯', desc: 'טכניקות סגירה ויצירת דחיפות' },
    { id: 'שפת_תקשורת', label: 'שפת תקשורת', icon: '💬', desc: 'בהירות, מקצועיות ושפה חיובית' },
    { id: 'שלושת_הלמה', label: 'שלושת הלמה', icon: '❓', desc: 'למה דווקא אנחנו, למה עכשיו, למה איתנו' }
  ]

  // פונקציה להחלפת מצב נושא (toggle)
  const toggleTopic = (topicId: string) => {
    setSelectedTopics(prev => {
      if (prev.includes(topicId)) {
        if (prev.length === 1) {
          return prev // חובה לבחור לפחות נושא אחד
        }
        return prev.filter(t => t !== topicId)
      } else {
        return [...prev, topicId]
      }
    })
  }

  // בחירת כל הנושאים
  const selectAllTopics = () => {
    setSelectedTopics(simulationTopics.map(t => t.id))
  }

  // ניקוי כל הנושאים (חוץ מאחד)
  const clearTopics = () => {
    setSelectedTopics([simulationTopics[0].id])
  }

  // יצירת הסימולציה
  const handleSubmit = async () => {
    setIsGenerating(true)
    
    try {
      // חילוץ נתוני השיחה הנבחרת (אם יש)
        let selectedCallAnalysis = null
      if (selectedCallId && creationMode === 'call-based') {
        const selectedCall = recentCalls.find(call => call.id === selectedCallId)
          if (selectedCall) {
            selectedCallAnalysis = {
              call_type: selectedCall.call_type,
              overall_score: selectedCall.overall_score,
              content_analysis: selectedCall.content_analysis,
              tone_analysis: selectedCall.tone_analysis,
              red_flags: selectedCall.red_flags || [],
              improvement_areas: selectedCall.improvement_areas || [],
              duration_seconds: selectedCall.duration_seconds,
              created_at: selectedCall.created_at
            }
          }
        }

      // יצירת פרסונה
        const personaResponse = await fetch('/api/simulations/generate-persona', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            agentId: user.id,
            companyId: user.company_id,
          targetWeaknesses: [], // נקבע אוטומטית מהניתוח
          difficulty: 'אוטומטי', // נקבע לפי ניתוח השיחות
          callAnalysis: selectedCallAnalysis,
          selectedTopics: creationMode === 'topic-based' ? selectedTopics : []
          })
        })
        
        if (!personaResponse.ok) {
          throw new Error('Failed to generate persona')
        }
        
        const personaData = await personaResponse.json()
      const personaId = personaData.persona.id
      
      // יצירת תרחיש
      const scenarioResponse = await fetch('/api/simulations/generate-scenario', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          personaId,
          companyId: user.company_id,
          difficulty: 'אוטומטי',
          focusArea: '',
          estimatedDuration: 10 // 10 דקות מקסימום
        })
      })
      
      if (!scenarioResponse.ok) {
        throw new Error('Failed to generate scenario')
      }
      
      // יצירת הסימולציה עצמה  
      const simulationResponse = await fetch('/api/simulations/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          simulation_type: creationMode === 'call-based' ? 'אימון מבוסס שיחה' : 'אימון לפי נושאים',
          customer_persona: 'לקוח ווירטואלי',
          persona_id: personaId,
          difficulty_level: 'אוטומטי',
          triggered_by_call_id: selectedCallId || null,
          selectedTopics: creationMode === 'topic-based' ? selectedTopics : [],
          source_call_id: selectedCallId || null,
          max_duration_seconds: 600 // 10 דקות
        })
      })
      
      if (!simulationResponse.ok) {
        throw new Error('Failed to create simulation')
      }
      
      const simulation = await simulationResponse.json()
      router.push(`/simulations/${simulation.simulation.id}`)
      
    } catch (error) {
      console.error('Error creating simulation:', error)
      alert('שגיאה ביצירת הסימולציה. אנא נסה שוב.')
    } finally {
      setIsGenerating(false)
    }
  }

  // מסך בחירת אופציה
  if (!creationMode || creationMode === 'select') {
  return (
      <div className="bg-white rounded-xl shadow-lg p-8">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-3">
            🎯 יצירת סימולציה חדשה
          </h1>
          <p className="text-gray-600 text-lg">
            בחר איך תרצה לבנות את הסימולציה שלך
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl mx-auto">
          {/* אופציה 1: על בסיס שיחה */}
          <button
            onClick={() => setCreationMode('call-based')}
            disabled={recentCalls.length === 0}
            className={`p-8 border-3 rounded-2xl text-right transition-all transform hover:scale-102 ${
              recentCalls.length === 0 
                ? 'border-gray-200 bg-gray-50 cursor-not-allowed opacity-60' 
                : 'border-blue-200 bg-blue-50 hover:border-blue-500 hover:shadow-lg'
            }`}
          >
            <div className="text-5xl mb-4">📊</div>
            <h3 className="text-xl font-bold text-gray-900 mb-3">
              על בסיס שיחה קיימת
            </h3>
            <p className="text-gray-600 mb-4">
              הפרסונה והתרחיש ייבנו מניתוח שיחה אמיתית שלך - 
              <span className="font-medium text-blue-700"> תתרגל בדיוק את מה שצריך לשפר!</span>
            </p>
            <div className="flex items-center text-sm text-blue-600">
              <span className="bg-blue-100 px-3 py-1 rounded-full">
                {recentCalls.length} שיחות זמינות
              </span>
              </div>
          </button>

          {/* אופציה 2: על בסיס נושאים */}
          <button
            onClick={() => setCreationMode('topic-based')}
            className="p-8 border-3 border-green-200 bg-green-50 rounded-2xl text-right transition-all transform hover:scale-102 hover:border-green-500 hover:shadow-lg"
          >
            <div className="text-5xl mb-4">📚</div>
            <h3 className="text-xl font-bold text-gray-900 mb-3">
              בחירת נושאים לאימון
            </h3>
            <p className="text-gray-600 mb-4">
              בחר מתוך 8 נושאי ליבה של מכירות ושירות -
              <span className="font-medium text-green-700"> אימון ממוקד לפי הצרכים שלך!</span>
            </p>
            <div className="flex items-center text-sm text-green-600">
              <span className="bg-green-100 px-3 py-1 rounded-full">
                8 נושאים לבחירה
              </span>
            </div>
          </button>
        </div>
        
        {recentCalls.length === 0 && (
          <div className="mt-6 text-center">
            <p className="text-gray-500 text-sm">
              💡 העלה שיחות לניתוח כדי לאפשר סימולציות מבוססות שיחה
            </p>
        </div>
        )}
      </div>
    )
  }

  // אופציה 1: בחירת שיחה
  if (creationMode === 'call-based') {
    return (
      <div className="bg-white rounded-xl shadow-lg">
        {/* Header */}
        <div className="p-6 border-b border-gray-200">
              <button
            onClick={() => setCreationMode('select')}
            className="text-gray-500 hover:text-gray-700 mb-4 flex items-center gap-2"
          >
            ← חזרה לבחירת אופציה
              </button>
          <h2 className="text-2xl font-bold text-gray-900">
            📊 בחר שיחה לבסס עליה את הסימולציה
          </h2>
          <p className="text-gray-600 mt-2">
            הפרסונה תאתגר אותך בדיוק בנקודות החולשה שזוהו בשיחה
          </p>
            </div>

        <div className="p-6">
          <div className="space-y-4">
            {recentCalls.map((call) => {
                    // חילוץ נקודות שיפור מהניתוח
              let improvementAreas: string[] = []
              let strengths: string[] = []
                    try {
                      if (call.content_analysis) {
                        const content = typeof call.content_analysis === 'string' ? 
                          JSON.parse(call.content_analysis) : call.content_analysis
                  if (content.improvement_points || content.איך_משפרים) {
                    improvementAreas = Array.isArray(content.improvement_points) ? 
                      content.improvement_points : 
                      (Array.isArray(content.איך_משפרים) ? content.איך_משפרים : [])
                  }
                  if (content.strengths_and_preservation_points || content.נקודות_חוזק) {
                    strengths = Array.isArray(content.strengths_and_preservation_points) ? 
                      content.strengths_and_preservation_points : 
                      (Array.isArray(content.נקודות_חוזק) ? content.נקודות_חוזק : [])
                  }
                }
              } catch (e) {}

                    return (
                      <button
                        key={call.id}
                  onClick={() => setSelectedCallId(call.id)}
                  className={`w-full text-right p-5 border-2 rounded-xl transition-all ${
                    selectedCallId === call.id
                      ? 'border-blue-600 bg-blue-50 shadow-md'
                      : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                  }`}
                >
                          <div className="flex justify-between items-start">
                            <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <span className="font-bold text-gray-900 text-lg">{call.call_type}</span>
                        <span className="text-sm text-gray-500">
                          {new Date(call.created_at).toLocaleDateString('he-IL')}
                        </span>
                      </div>
                      
                      {improvementAreas.length > 0 && (
                        <div className="mb-2">
                          <span className="text-sm text-red-600 font-medium">📍 לשיפור: </span>
                          <span className="text-sm text-gray-600">
                            {improvementAreas.slice(0, 2).join(', ')}
                            {improvementAreas.length > 2 && ` +${improvementAreas.length - 2}`}
                          </span>
                        </div>
                      )}
                      
                      {strengths.length > 0 && (
                        <div>
                          <span className="text-sm text-green-600 font-medium">✓ חוזקות: </span>
                          <span className="text-sm text-gray-600">
                            {strengths.slice(0, 2).join(', ')}
                          </span>
                              </div>
                      )}
                            </div>
                    
                    <div className="text-center mr-4">
                      <div className={`text-2xl font-bold ${
                                call.overall_score >= 8 ? 'text-green-600' :
                                call.overall_score >= 6 ? 'text-yellow-600' :
                                'text-red-600'
                              }`}>
                                {call.overall_score}/10
                              </div>
                              </div>
                        </div>
                      </button>
                    )
                  })}
                </div>

          {selectedCallId && (
            <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-xl">
              <div className="flex items-center gap-3 mb-4">
                <span className="text-2xl">🎯</span>
                      <div>
                  <h4 className="font-bold text-blue-900">מוכן לסימולציה!</h4>
                  <p className="text-blue-700 text-sm">
                    הלקוח הווירטואלי יאתגר אותך בנקודות החולשה שזוהו
                  </p>
                </div>
              </div>
              
                        <button
                          onClick={handleSubmit}
                          disabled={isGenerating}
                className="w-full bg-blue-600 text-white py-4 rounded-xl font-bold text-lg hover:bg-blue-700 disabled:opacity-50 flex items-center justify-center gap-3"
                        >
                          {isGenerating ? (
                            <>
                    <div className="animate-spin w-6 h-6 border-3 border-white border-t-transparent rounded-full" />
                              יוצר סימולציה...
                            </>
                          ) : (
                            <>
                    🚀 התחל סימולציה
                            </>
                          )}
                        </button>
                  </div>
                )}
              </div>
          </div>
    )
  }

  // אופציה 2: בחירת נושאים
  if (creationMode === 'topic-based') {
    return (
      <div className="bg-white rounded-xl shadow-lg">
        {/* Header */}
        <div className="p-6 border-b border-gray-200">
          <button
            onClick={() => setCreationMode('select')}
            className="text-gray-500 hover:text-gray-700 mb-4 flex items-center gap-2"
          >
            ← חזרה לבחירת אופציה
          </button>
          <h2 className="text-2xl font-bold text-gray-900">
            📚 בחר נושאים לאימון
          </h2>
          <p className="text-gray-600 mt-2">
            הלקוח הווירטואלי יאתגר אותך בנושאים שתבחר
          </p>
              </div>

        <div className="p-6">
          {/* כפתורי בחירה מהירה */}
          <div className="flex gap-3 mb-6">
            <button
              onClick={selectAllTopics}
              className="px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg text-sm font-medium transition-colors"
            >
              ✓ בחר הכל
            </button>
            <button
              onClick={clearTopics}
              className="px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg text-sm font-medium transition-colors"
            >
              ✕ נקה בחירה
            </button>
            <span className="mr-auto px-4 py-2 bg-blue-100 text-blue-800 rounded-lg text-sm font-medium">
              נבחרו {selectedTopics.length} מתוך {simulationTopics.length}
            </span>
          </div>

          {/* רשימת נושאים */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {simulationTopics.map(topic => (
              <button
                key={topic.id}
                onClick={() => toggleTopic(topic.id)}
                className={`p-4 border-2 rounded-xl text-right transition-all ${
                  selectedTopics.includes(topic.id)
                    ? 'border-green-500 bg-green-50 shadow-md'
                    : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                }`}
              >
                <div className="flex items-start gap-3">
                  <span className="text-2xl">{topic.icon}</span>
                          <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-gray-900">{topic.label}</span>
                      {selectedTopics.includes(topic.id) && (
                        <span className="text-green-600">✓</span>
                )}
              </div>
                    <p className="text-sm text-gray-600 mt-1">{topic.desc}</p>
                  </div>
                </div>
              </button>
            ))}
          </div>

          {/* כפתור התחלה */}
          <div className="mt-8 p-4 bg-green-50 border border-green-200 rounded-xl">
            <div className="flex items-center gap-3 mb-4">
              <span className="text-2xl">🎯</span>
                <div>
                <h4 className="font-bold text-green-900">מוכן לסימולציה!</h4>
                <p className="text-green-700 text-sm">
                  הלקוח הווירטואלי יאתגר אותך ב-{selectedTopics.length} נושאים שבחרת
                </p>
              </div>
            </div>
            
              <button
                onClick={handleSubmit}
              disabled={isGenerating || selectedTopics.length === 0}
              className="w-full bg-green-600 text-white py-4 rounded-xl font-bold text-lg hover:bg-green-700 disabled:opacity-50 flex items-center justify-center gap-3"
              >
                {isGenerating ? (
                <>
                  <div className="animate-spin w-6 h-6 border-3 border-white border-t-transparent rounded-full" />
                  יוצר סימולציה...
                </>
              ) : (
                <>
                  🚀 התחל סימולציה
                </>
                )}
              </button>
        </div>
      </div>
    </div>
  )
  }

  return null
}
