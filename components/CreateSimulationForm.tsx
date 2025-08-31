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
  const [currentStep, setCurrentStep] = useState(1)
  const [isGenerating, setIsGenerating] = useState(false)
  const [formData, setFormData] = useState({
    // שלב 1: בחירת מקור
    sourceType: 'analysis', // 'analysis' | 'custom' | 'existing'
    selectedCallId: '',
    
    // שלב 2: הגדרות סימולציה
    difficulty: 'בינוני',
    focusArea: '',
    specificScenario: '',
    estimatedDuration: 10,
    
    // שלב 3: פרסונה
    useExistingPersona: false,
    selectedPersonaId: '',
    
    // שלב 4: תרחיש
    customScenarioTitle: '',
    customScenarioDescription: ''
  })

  const handleNext = () => {
    if (currentStep < 4) {
      setCurrentStep(currentStep + 1)
    }
  }

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1)
    }
  }

  const handleSubmit = async () => {
    setIsGenerating(true)
    
    try {
      // יצירת פרסונה אם נדרש
      let personaId = formData.selectedPersonaId
      
      if (!formData.useExistingPersona) {
        // חילוץ נתוני השיחה הנבחרת לניתוח מפורט
        let selectedCallAnalysis = null
        if (formData.selectedCallId && formData.sourceType === 'analysis') {
          const selectedCall = recentCalls.find(call => call.id === formData.selectedCallId)
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

        const personaResponse = await fetch('/api/simulations/generate-persona', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            agentId: user.id,
            companyId: user.company_id,
            targetWeaknesses: formData.focusArea ? [formData.focusArea] : [],
            difficulty: formData.difficulty,
            specificScenario: formData.specificScenario,
            callAnalysis: selectedCallAnalysis // העברת הניתוח המלא של השיחה
          })
        })
        
        if (!personaResponse.ok) {
          throw new Error('Failed to generate persona')
        }
        
        const personaData = await personaResponse.json()
        personaId = personaData.persona.id
      }
      
      // יצירת תרחיש
      const scenarioResponse = await fetch('/api/simulations/generate-scenario', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          personaId,
          companyId: user.company_id,
          difficulty: formData.difficulty,
          focusArea: formData.focusArea,
          estimatedDuration: formData.estimatedDuration
        })
      })
      
      if (!scenarioResponse.ok) {
        throw new Error('Failed to generate scenario')
      }
      
      const scenarioData = await scenarioResponse.json()
      
      // יצירת הסימולציה עצמה
      const simulationResponse = await fetch('/api/simulations/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          simulation_type: formData.focusArea || 'אימון כללי',
          customer_persona: personaId,
          difficulty_level: formData.difficulty,
          triggered_by_call_id: formData.selectedCallId || null,
          scenario_id: scenarioData.scenario.id
        })
      })
      
      if (!simulationResponse.ok) {
        throw new Error('Failed to create simulation')
      }
      
      const simulation = await simulationResponse.json()
      
      // ניווט לסימולציה
      router.push(`/simulations/${simulation.simulation.id}`)
      
    } catch (error) {
      console.error('Error creating simulation:', error)
      alert('שגיאה ביצירת הסימולציה. אנא נסה שוב.')
    } finally {
      setIsGenerating(false)
    }
  }

  return (
    <div className="bg-white rounded-xl shadow-lg">
      {/* Progress Bar */}
      <div className="p-6 border-b border-gray-200">
        <div className="flex items-center space-x-4">
          {[1, 2, 3, 4].map((step) => (
            <div key={step} className="flex items-center">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                step <= currentStep 
                  ? 'bg-blue-600 text-white' 
                  : 'bg-gray-200 text-gray-600'
              }`}>
                {step}
              </div>
              {step < 4 && (
                <div className={`w-12 h-1 mx-2 ${
                  step < currentStep ? 'bg-blue-600' : 'bg-gray-200'
                }`} />
              )}
            </div>
          ))}
        </div>
        
        <div className="mt-4">
          <h2 className="text-xl font-bold text-gray-900">
            {currentStep === 1 && 'בחר מקור לסימולציה'}
            {currentStep === 2 && 'הגדר את האימון'}
            {currentStep === 3 && 'בחר לקוח ווירטואלי'}
            {currentStep === 4 && 'סיכום וביצוע'}
          </h2>
        </div>
      </div>

      <div className="p-6">
        {/* Step 1: Source Selection */}
        {currentStep === 1 && (
          <div className="space-y-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">
              איך תרצה לבנות את הסימולציה?
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <button
                onClick={() => setFormData({...formData, sourceType: 'analysis'})}
                className={`p-6 border-2 rounded-lg text-center transition-all ${
                  formData.sourceType === 'analysis' 
                    ? 'border-blue-600 bg-blue-50' 
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <div className="text-3xl mb-3">📊</div>
                <h4 className="font-medium text-gray-900 mb-2">
                  מבוסס על ניתוח שיחות
                </h4>
                <p className="text-sm text-gray-600">
                  צור סימולציה המבוססת על נקודות החולשה מהניתוחים שלך
                </p>
              </button>

              <button
                onClick={() => setFormData({...formData, sourceType: 'custom'})}
                className={`p-6 border-2 rounded-lg text-center transition-all ${
                  formData.sourceType === 'custom' 
                    ? 'border-blue-600 bg-blue-50' 
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <div className="text-3xl mb-3">🎨</div>
                <h4 className="font-medium text-gray-900 mb-2">
                  מותאם אישית
                </h4>
                <p className="text-sm text-gray-600">
                  צור סימולציה עם תרחיש והגדרות שאתה בוחר
                </p>
              </button>

              <button
                onClick={() => setFormData({...formData, sourceType: 'existing'})}
                className={`p-6 border-2 rounded-lg text-center transition-all ${
                  formData.sourceType === 'existing' 
                    ? 'border-blue-600 bg-blue-50' 
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <div className="text-3xl mb-3">🎭</div>
                <h4 className="font-medium text-gray-900 mb-2">
                  לקוח קיים
                </h4>
                <p className="text-sm text-gray-600">
                  השתמש באחד מהלקוחות הווירטואליים הקיימים
                </p>
              </button>
            </div>

            {formData.sourceType === 'analysis' && recentCalls.length > 0 && (
              <div className="mt-6">
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  בחר שיחה לניתוח ויצירת פרסונה מותאמת:
                </label>
                <div className="space-y-3">
                  {recentCalls.slice(0, 5).map((call) => {
                    // חילוץ נקודות שיפור מהניתוח
                    let improvementAreas = []
                    try {
                      if (call.content_analysis) {
                        const content = typeof call.content_analysis === 'string' ? 
                          JSON.parse(call.content_analysis) : call.content_analysis
                        if (content.איך_משפרים || content.improvement_areas) {
                          improvementAreas = Array.isArray(content.איך_משפרים) ? 
                            content.איך_משפרים : 
                            (Array.isArray(content.improvement_areas) ? 
                             content.improvement_areas : 
                             [content.איך_משפרים || content.improvement_areas])
                        }
                      }
                    } catch (e) {
                      // אם לא הצלחנו לחלץ, נשאיר ריק
                    }

                    return (
                      <button
                        key={call.id}
                        onClick={() => setFormData({...formData, selectedCallId: call.id})}
                        className={`w-full text-right p-4 border rounded-lg transition-all ${
                          formData.selectedCallId === call.id
                            ? 'border-blue-600 bg-blue-50'
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        <div className="space-y-3">
                          <div className="flex justify-between items-start">
                            <div className="flex-1">
                              <div className="font-medium text-gray-900 mb-1">{call.call_type}</div>
                              <div className="text-sm text-gray-500">
                                {new Date(call.created_at).toLocaleDateString('he-IL')} • 
                                {call.duration_seconds ? ` ${Math.round(call.duration_seconds / 60)} דקות` : ''}
                              </div>
                            </div>
                            <div className="text-center ml-4">
                              <div className={`text-lg font-bold ${
                                call.overall_score >= 8 ? 'text-green-600' :
                                call.overall_score >= 6 ? 'text-yellow-600' :
                                'text-red-600'
                              }`}>
                                {call.overall_score}/10
                              </div>
                              {call.red_flags && call.red_flags.length > 0 && (
                                <div className="text-xs text-red-600">🚩 {call.red_flags.length} דגלים</div>
                              )}
                            </div>
                          </div>
                          
                          {improvementAreas.length > 0 && (
                            <div className="bg-orange-50 border border-orange-200 rounded p-3">
                              <div className="text-sm font-medium text-orange-900 mb-1">
                                נקודות לשיפור שזוהו:
                              </div>
                              <div className="flex flex-wrap gap-2">
                                {improvementAreas.slice(0, 3).map((area: string, index: number) => (
                                  <span key={index} className="px-2 py-1 bg-orange-100 text-orange-800 text-xs rounded">
                                    {area}
                                  </span>
                                ))}
                                {improvementAreas.length > 3 && (
                                  <span className="text-xs text-orange-600">+{improvementAreas.length - 3} נוספות</span>
                                )}
                              </div>
                            </div>
                          )}

                          {formData.selectedCallId === call.id && (
                            <div className="bg-blue-50 border border-blue-200 rounded p-3">
                              <div className="flex items-center space-x-2">
                                <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                                <span className="text-sm text-blue-800">
                                  ייווצר לקוח ווירטואלי שיתרגל בדיוק את החולשות שזוהו בשיחה זו
                                </span>
                              </div>
                            </div>
                          )}
                        </div>
                      </button>
                    )
                  })}
                </div>

                {formData.selectedCallId && (
                  <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-lg">
                    <div className="flex items-start space-x-3">
                      <div className="text-xl">🎯</div>
                      <div>
                        <h4 className="font-medium text-green-900 mb-1">
                          אימון מותאם אישית
                        </h4>
                        <p className="text-green-700 text-sm">
                          הפרסונה שתיווצר תתמחה בדיוק בנקודות החולשה שזוהו בשיחה שבחרת. 
                          זה יהיה אימון ממוקד ואפקטיביי לשיפור הביצועים שלך.
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Step 2: Simulation Settings */}
        {currentStep === 2 && (
          <div className="space-y-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">
              הגדר את פרמטרי האימון
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  רמת קושי
                </label>
                <select
                  value={formData.difficulty}
                  onChange={(e) => setFormData({...formData, difficulty: e.target.value})}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500"
                >
                  <option value="קל">קל - לקוח נעים ושיתופי</option>
                  <option value="בינוני">בינוני - לקוח עם כמה התנגדויות</option>
                  <option value="קשה">קשה - לקוח תובעני עם התנגדויות חזקות</option>
                  <option value="מתקדם">מתקדם - לקוח מאוד מורכב</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  משך זמן משוער (דקות)
                </label>
                <select
                  value={formData.estimatedDuration}
                  onChange={(e) => setFormData({...formData, estimatedDuration: parseInt(e.target.value)})}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500"
                >
                  <option value={5}>5 דקות - אימון מהיר</option>
                  <option value={10}>10 דקות - אימון רגיל</option>
                  <option value={15}>15 דקות - אימון מפורט</option>
                  <option value={20}>20 דקות - אימון מעמיק</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                תחום מיקוד (אופציונלי)
              </label>
              <select
                value={formData.focusArea}
                onChange={(e) => setFormData({...formData, focusArea: e.target.value})}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500"
              >
                <option value="">בחר תחום מיקוד</option>
                <option value="התמודדות עם התנגדויות">התמודדות עם התנגדויות</option>
                <option value="בניית קשר">בניית קשר עם הלקוח</option>
                <option value="סגירת עסקה">טכניקות סגירת עסקה</option>
                <option value="הצגת מוצר">הצגת מוצר ויתרונות</option>
                <option value="זיהוי צרכים">זיהוי וברור צרכי הלקוח</option>
                <option value="תמחור ומיקוח">דיונים על מחיר ומיקוח</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                תרחיש ספציפי (אופציונלי)
              </label>
              <textarea
                value={formData.specificScenario}
                onChange={(e) => setFormData({...formData, specificScenario: e.target.value})}
                placeholder="תאר תרחיש ספציפי שברצונך להתאמן עליו..."
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500"
                rows={3}
              />
            </div>
          </div>
        )}

        {/* Step 3: Persona Selection */}
        {currentStep === 3 && (
          <div className="space-y-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">
              בחר או צור לקוח ווירטואלי
            </h3>

            <div className="flex space-x-4 mb-6">
              <button
                onClick={() => setFormData({...formData, useExistingPersona: true})}
                className={`flex-1 p-4 border-2 rounded-lg text-center transition-all ${
                  formData.useExistingPersona 
                    ? 'border-blue-600 bg-blue-50' 
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <div className="text-2xl mb-2">🎭</div>
                <div className="font-medium">השתמש בלקוח קיים</div>
              </button>
              <button
                onClick={() => setFormData({...formData, useExistingPersona: false})}
                className={`flex-1 p-4 border-2 rounded-lg text-center transition-all ${
                  !formData.useExistingPersona 
                    ? 'border-blue-600 bg-blue-50' 
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <div className="text-2xl mb-2">✨</div>
                <div className="font-medium">צור לקוח חדש</div>
              </button>
            </div>

            {formData.useExistingPersona && (
              <div className="space-y-3">
                <label className="block text-sm font-medium text-gray-700">
                  בחר לקוח מהרשימה:
                </label>
                {existingPersonas.length > 0 ? (
                  <div className="space-y-2">
                    {existingPersonas.map((persona) => (
                      <button
                        key={persona.id}
                        onClick={() => setFormData({...formData, selectedPersonaId: persona.id})}
                        className={`w-full text-right p-4 border rounded-lg transition-all ${
                          formData.selectedPersonaId === persona.id
                            ? 'border-blue-600 bg-blue-50'
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        <div className="flex justify-between items-start">
                          <div className="flex-1">
                            <div className="font-medium text-gray-900 mb-1">
                              {persona.persona_name}
                            </div>
                            <div className="text-sm text-gray-500 mb-2">
                              {persona.personality_type} • {persona.communication_style}
                            </div>
                            <div className="text-sm text-gray-600">
                              {persona.current_situation}
                            </div>
                          </div>
                          <div className="text-left ml-4">
                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                              persona.difficulty_level === 'קל' ? 'bg-green-100 text-green-800' :
                              persona.difficulty_level === 'בינוני' ? 'bg-yellow-100 text-yellow-800' :
                              persona.difficulty_level === 'קשה' ? 'bg-red-100 text-red-800' :
                              'bg-purple-100 text-purple-800'
                            }`}>
                              {persona.difficulty_level}
                            </span>
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    <div className="text-4xl mb-2">🤷‍♂️</div>
                    <p>אין לקוחות ווירטואליים קיימים</p>
                    <p className="text-sm">נצור לך לקוח חדש מותאם אישית</p>
                  </div>
                )}
              </div>
            )}

            {!formData.useExistingPersona && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-start space-x-3">
                  <div className="text-2xl">🤖</div>
                  <div>
                    <h4 className="font-medium text-blue-900 mb-1">
                      יצירת לקוח ווירטואלי חכם
                    </h4>
                    <p className="text-blue-700 text-sm">
                      נבין את הצרכים שלך ונצור לקוח ווירטואלי מותאם במיוחד עבורך, 
                      בהתבסס על {formData.selectedCallId ? 'הניתוח שבחרת' : 'ההגדרות שקבעת'}.
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Step 4: Summary */}
        {currentStep === 4 && (
          <div className="space-y-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">
              סיכום ויצירת הסימולציה
            </h3>

            <div className="bg-gray-50 rounded-lg p-6 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <h4 className="font-medium text-gray-900 mb-2">הגדרות אימון</h4>
                  <ul className="text-sm text-gray-600 space-y-1">
                    <li>• רמת קושי: <strong>{formData.difficulty}</strong></li>
                    <li>• משך זמן: <strong>{formData.estimatedDuration} דקות</strong></li>
                    {formData.focusArea && (
                      <li>• תחום מיקוד: <strong>{formData.focusArea}</strong></li>
                    )}
                  </ul>
                </div>

                <div>
                  <h4 className="font-medium text-gray-900 mb-2">לקוח ווירטואלי</h4>
                  <p className="text-sm text-gray-600">
                    {formData.useExistingPersona 
                      ? existingPersonas.find(p => p.id === formData.selectedPersonaId)?.persona_name || 'לא נבחר'
                      : 'יווצר לקוח חדש מותאם אישית'}
                  </p>
                </div>
              </div>

              {formData.selectedCallId && (
                <div>
                  <h4 className="font-medium text-gray-900 mb-2">מבוסס על שיחה</h4>
                  <p className="text-sm text-gray-600">
                    {recentCalls.find(c => c.id === formData.selectedCallId)?.call_type} • 
                    {new Date(recentCalls.find(c => c.id === formData.selectedCallId)?.created_at).toLocaleDateString('he-IL')}
                  </p>
                </div>
              )}
            </div>

            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <div className="flex items-start space-x-3">
                <div className="text-xl">⏱️</div>
                <div>
                  <h4 className="font-medium text-yellow-900 mb-1">
                    זמן יצירה משוער
                  </h4>
                  <p className="text-yellow-700 text-sm">
                    יצירת הסימולציה עלולה לקחת 30-60 שניות. 
                    אנחנו יוצרים לך לקוח ווירטואלי מותאם במיוחד עם תרחיש מפורט.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Navigation Buttons */}
        <div className="flex justify-between pt-6 border-t border-gray-200">
          <button
            onClick={handleBack}
            disabled={currentStep === 1}
            className="px-4 py-2 text-gray-600 hover:text-gray-800 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            ← חזור
          </button>

          <div className="flex space-x-3">
            {currentStep < 4 ? (
              <button
                onClick={handleNext}
                className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors"
              >
                המשך →
              </button>
            ) : (
              <button
                onClick={handleSubmit}
                disabled={isGenerating}
                className="bg-green-600 text-white px-6 py-2 rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {isGenerating ? (
                  <span className="flex items-center space-x-2">
                    <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    <span>יוצר סימולציה...</span>
                  </span>
                ) : (
                  '🚀 צור סימולציה'
                )}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
