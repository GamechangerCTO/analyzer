'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

interface StartSimulationButtonProps {
  callId?: string
  callType?: string
  analysisReport?: any
  buttonText: string
  variant: 'primary' | 'danger'
}

export function StartSimulationButton({
  callId,
  callType,
  analysisReport,
  buttonText,
  variant
}: StartSimulationButtonProps) {
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [selectedType, setSelectedType] = useState(
    callId ? getSimulationTypeFromCall(callType, analysisReport) : 'objection_handling'
  )
  const [selectedPersona, setSelectedPersona] = useState('hesitant')
  const [selectedDifficulty, setSelectedDifficulty] = useState('normal')
  const router = useRouter()

  const buttonClasses = variant === 'primary' 
    ? 'bg-blue-600 hover:bg-blue-700 text-white'
    : 'bg-red-600 hover:bg-red-700 text-white'

  const handleStartSimulation = async () => {
    setIsLoading(true)
    
    try {
      // יצירת סימולציה חדשה
      const response = await fetch('/api/simulations/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          simulation_type: selectedType,
          customer_persona: selectedPersona,
          difficulty_level: selectedDifficulty,
          triggered_by_call_id: callId || null,
        })
      })

      if (!response.ok) {
        throw new Error('Failed to create simulation')
      }

      const { simulation } = await response.json()
      
      // ניווט לדף הסימולציה
      router.push(`/simulations/${simulation.id}`)
    } catch (error) {
      console.error('Error creating simulation:', error)
      alert('שגיאה ביצירת הסימולציה. אנא נסה שוב.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <>
      <button
        onClick={() => setIsModalOpen(true)}
        className={`px-4 py-2 rounded-lg font-medium transition-colors ${buttonClasses}`}
      >
        {buttonText}
      </button>

      {/* מודאל בחירת פרמטרים */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">
              הגדרת סימולציה
            </h2>

            {/* סוג סימולציה */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                סוג התרגול
              </label>
              <select
                value={selectedType}
                onChange={(e) => setSelectedType(e.target.value)}
                className="w-full border border-gray-300 rounded-lg p-2"
              >
                <option value="objection_handling">טיפול בהתנגדויות</option>
                <option value="closing_techniques">טכניקות סגירה</option>
                <option value="follow_up_skills">מיומנויות פולואפ</option>
                <option value="price_negotiation">משא ומתן על מחיר</option>
                <option value="customer_service">שירות לקוחות</option>
                <option value="appointment_setting">קביעת פגישות</option>
              </select>
            </div>

            {/* טיפוס לקוח */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                טיפוס הלקוח
              </label>
              <select
                value={selectedPersona}
                onChange={(e) => setSelectedPersona(e.target.value)}
                className="w-full border border-gray-300 rounded-lg p-2"
              >
                <option value="aggressive">אגרסיבי 😠</option>
                <option value="hesitant">מהסס 🤔</option>
                <option value="technical">טכני 🔧</option>
                <option value="emotional">רגשי 💭</option>
                <option value="time_pressed">קצר בזמן ⏰</option>
                <option value="business">עסקי 💼</option>
              </select>
            </div>

            {/* רמת קושי */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                רמת קושי
              </label>
              <select
                value={selectedDifficulty}
                onChange={(e) => setSelectedDifficulty(e.target.value)}
                className="w-full border border-gray-300 rounded-lg p-2"
              >
                <option value="easy">קל - לקוח שיתופי</option>
                <option value="normal">רגיל - לקוח סטנדרטי</option>
                <option value="hard">קשה - לקוח מאתגר</option>
              </select>
            </div>

            {callId && (
              <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <p className="text-sm text-blue-800">
                  💡 הסימולציה תבוסס על נקודות השיפור מהשיחה שלך
                </p>
              </div>
            )}

            {/* כפתורי פעולה */}
            <div className="flex gap-3">
              <button
                onClick={() => setIsModalOpen(false)}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
              >
                ביטול
              </button>
              <button
                onClick={handleStartSimulation}
                disabled={isLoading}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                {isLoading ? 'יוצר...' : 'התחל סימולציה'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

// פונקציה לקביעת סוג סימולציה בהתבסס על השיחה המקורית
function getSimulationTypeFromCall(callType?: string, analysisReport?: any): string {
  if (!callType) return 'objection_handling'

  // ניתוח לפי סוג השיחה
  if (callType.includes('פולו אפ')) {
    return 'follow_up_skills'
  }
  if (callType.includes('תאום פגישה')) {
    return 'appointment_setting'
  }
  if (callType.includes('שירות')) {
    return 'customer_service'
  }

  // ניתוח לפי נקודות התרעה בדוח
  if (analysisReport?.improvement_areas) {
    const areas = JSON.stringify(analysisReport.improvement_areas).toLowerCase()
    
    if (areas.includes('סגירה') || areas.includes('closing')) {
      return 'closing_techniques'
    }
    if (areas.includes('מחיר') || areas.includes('price')) {
      return 'price_negotiation'
    }
    if (areas.includes('התנגדות') || areas.includes('objection')) {
      return 'objection_handling'
    }
  }

  return 'objection_handling' // ברירת מחדל
} 