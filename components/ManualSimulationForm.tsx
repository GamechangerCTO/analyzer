'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/utils/supabase/client'
import { extractWeakParameters, getTopWeakParameters } from '@/lib/extract-weak-parameters'
import { Loader2, CheckCircle2, AlertCircle, Clock } from 'lucide-react'

interface ManualSimulationFormProps {
  agents: any[]
  currentUser: any
  quota: any
}

export default function ManualSimulationForm({ 
  agents, 
  currentUser,
  quota 
}: ManualSimulationFormProps) {
  const router = useRouter()
  const supabase = createClient()
  
  const [selectedAgent, setSelectedAgent] = useState(currentUser.id)
  const [selectedCalls, setSelectedCalls] = useState<string[]>([])
  const [recentCalls, setRecentCalls] = useState<any[]>([])
  const [customNotes, setCustomNotes] = useState('')
  const [difficulty, setDifficulty] = useState('בינוני')
  const [estimatedDuration, setEstimatedDuration] = useState(10)
  const [isLoading, setIsLoading] = useState(false)
  const [loadingCalls, setLoadingCalls] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [weakParameters, setWeakParameters] = useState<any[]>([])
  
  // טעינת שיחות כאשר נציג נבחר
  useEffect(() => {
    loadRecentCalls(selectedAgent)
  }, [selectedAgent])

  const loadRecentCalls = async (agentId: string) => {
    setLoadingCalls(true)
    try {
      const { data, error } = await supabase
        .from('calls')
        .select('*')
        .eq('user_id', agentId)
        .eq('processing_status', 'completed')
        .not('content_analysis', 'is', null)
        .order('created_at', { ascending: false })
        .limit(20)
      
      if (error) throw error
      setRecentCalls(data || [])
    } catch (err) {
      console.error('Error loading calls:', err)
      setError('שגיאה בטעינת השיחות')
    } finally {
      setLoadingCalls(false)
    }
  }

  // עדכון פרמטרים חלשים כאשר שיחות נבחרות
  useEffect(() => {
    if (selectedCalls.length === 0) {
      setWeakParameters([])
      return
    }

    const selectedCallsData = recentCalls.filter(c => selectedCalls.includes(c.id))
    const allWeakParams = selectedCallsData.flatMap(call => 
      extractWeakParameters(call.content_analysis || {})
    )
    
    const topWeak = getTopWeakParameters(allWeakParams, 5)
    setWeakParameters(topWeak)
  }, [selectedCalls, recentCalls])

  const handleSubmit = async () => {
    if (selectedCalls.length === 0) {
      setError('יש לבחור לפחות שיחה אחת')
      return
    }

    // בדיקת מכסה
    if (quota && quota.available_minutes < estimatedDuration) {
      setError(`אין מספיק דקות זמינות. נותרו ${quota.available_minutes} דק', נדרשות ${estimatedDuration} דק'`)
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch('/api/simulations/create-manual', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          agentId: selectedAgent,
          callIds: selectedCalls,
          customNotes,
          difficulty,
          estimatedDuration,
          weakParameters
        })
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'שגיאה ביצירת הסימולציה')
      }

      const { simulationId } = await response.json()
      router.push(`/simulations/${simulationId}`)
    } catch (err) {
      console.error('Error creating simulation:', err)
      setError(err instanceof Error ? err.message : 'שגיאה ביצירת הסימולציה')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* מכסת דקות */}
      {quota && (
        <div className={`p-4 rounded-lg border-2 ${
          quota.available_minutes < 30 ? 'bg-red-50 border-red-300' :
          quota.available_minutes < 60 ? 'bg-orange-50 border-orange-300' :
          'bg-green-50 border-green-300'
        }`}>
          <div className="flex items-center gap-3">
            <Clock className={`w-6 h-6 ${
              quota.available_minutes < 30 ? 'text-red-600' :
              quota.available_minutes < 60 ? 'text-orange-600' :
              'text-green-600'
            }`} />
            <div className="flex-1">
              <div className="font-semibold">
                דקות זמינות: {quota.available_minutes} / {quota.total_minutes}
              </div>
              <div className="text-sm text-gray-600">
                הסימולציה המבוקשת: {estimatedDuration} דק'
              </div>
            </div>
          </div>
        </div>
      )}

      {/* בחירת נציג */}
      <div className="bg-white rounded-xl shadow-lg p-6">
        <label className="block font-medium mb-2 text-lg">1. בחר נציג:</label>
        <select 
          value={selectedAgent}
          onChange={(e) => setSelectedAgent(e.target.value)}
          className="w-full border rounded-lg p-3 text-lg focus:ring-2 focus:ring-blue-500"
        >
          {agents.map(agent => (
            <option key={agent.id} value={agent.id}>
              {agent.full_name} {agent.id === currentUser.id && '(אני)'}
            </option>
          ))}
        </select>
      </div>

      {/* בחירת שיחות */}
      <div className="bg-white rounded-xl shadow-lg p-6">
        <label className="block font-medium mb-2 text-lg">
          2. בחר שיחות (עד 5):
        </label>
        <p className="text-sm text-gray-600 mb-4">
          השיחות שתבחר ישמשו לזיהוי נקודות חולשה ובניית סימולציה ממוקדת
        </p>
        
        {loadingCalls ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
          </div>
        ) : recentCalls.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            לא נמצאו שיחות מנותחות עבור הנציג הזה
          </div>
        ) : (
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {recentCalls.map(call => (
              <label 
                key={call.id} 
                className={`flex items-center gap-3 p-4 border-2 rounded-lg cursor-pointer transition-all ${
                  selectedCalls.includes(call.id) 
                    ? 'border-blue-500 bg-blue-50' 
                    : 'border-gray-200 hover:border-blue-300 hover:bg-gray-50'
                }`}
              >
                <input
                  type="checkbox"
                  checked={selectedCalls.includes(call.id)}
                  onChange={(e) => {
                    if (e.target.checked && selectedCalls.length < 5) {
                      setSelectedCalls([...selectedCalls, call.id])
                    } else if (!e.target.checked) {
                      setSelectedCalls(selectedCalls.filter(id => id !== call.id))
                    }
                  }}
                  disabled={!selectedCalls.includes(call.id) && selectedCalls.length >= 5}
                  className="w-5 h-5"
                />
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <div className="font-medium">{call.call_type}</div>
                    <div className="text-sm text-gray-500">
                      {new Date(call.created_at).toLocaleDateString('he-IL')}
                    </div>
                  </div>
                  {call.overall_score && (
                    <div className="flex items-center gap-2 mt-1">
                      <span className={`text-sm font-medium ${
                        call.overall_score >= 8 ? 'text-green-600' :
                        call.overall_score >= 6 ? 'text-yellow-600' :
                        'text-red-600'
                      }`}>
                        ציון: {call.overall_score}/10
                      </span>
                      {call.overall_score < 8 && (
                        <span className="px-2 py-0.5 bg-orange-100 text-orange-800 text-xs rounded">
                          מומלץ לתרגול
                        </span>
                      )}
                    </div>
                  )}
                </div>
              </label>
            ))}
          </div>
        )}
        
        {selectedCalls.length > 0 && (
          <div className="mt-4 text-sm text-gray-600">
            נבחרו {selectedCalls.length} מתוך 5 שיחות אפשריות
          </div>
        )}
      </div>

      {/* פרמטרים חלשים שזוהו */}
      {weakParameters.length > 0 && (
        <div className="bg-orange-50 rounded-xl border-2 border-orange-300 p-6">
          <h3 className="font-bold text-lg text-orange-900 mb-3 flex items-center gap-2">
            <AlertCircle className="w-5 h-5" />
            תחומים לשיפור שזוהו:
          </h3>
          <div className="flex flex-wrap gap-2">
            {weakParameters.map(param => (
              <span 
                key={param.name}
                className="px-3 py-1 bg-orange-200 text-orange-900 rounded-full text-sm font-medium"
              >
                {param.hebrewName}: {param.score}/10
              </span>
            ))}
          </div>
        </div>
      )}

      {/* דגשים נוספים */}
      <div className="bg-white rounded-xl shadow-lg p-6">
        <label className="block font-medium mb-2 text-lg">
          3. דגשים חשובים לסימולציה (אופציונלי):
        </label>
        <textarea
          value={customNotes}
          onChange={(e) => setCustomNotes(e.target.value)}
          placeholder="למשל: תתמקד במיוחד בטיפול בהתנגדויות על מחיר, תהיה לקוח תובעני..."
          className="w-full border rounded-lg p-3 h-32 focus:ring-2 focus:ring-blue-500"
        />
      </div>

      {/* הגדרות */}
      <div className="bg-white rounded-xl shadow-lg p-6">
        <h3 className="font-medium mb-4 text-lg">4. הגדרות סימולציה:</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block font-medium mb-2">רמת קושי:</label>
            <select 
              value={difficulty}
              onChange={(e) => setDifficulty(e.target.value)}
              className="w-full border rounded-lg p-2 focus:ring-2 focus:ring-blue-500"
            >
              <option value="קל">קל - לקוח נעים וקל לשכנוע</option>
              <option value="בינוני">בינוני - לקוח עם התנגדויות</option>
              <option value="קשה">קשה - לקוח תובעני</option>
              <option value="מתקדם">מתקדם - לקוח מאוד מורכב</option>
            </select>
          </div>
          
          <div>
            <label className="block font-medium mb-2">
              משך זמן משוער: {estimatedDuration} דקות
            </label>
            <input
              type="range"
              min="5"
              max="20"
              value={estimatedDuration}
              onChange={(e) => setEstimatedDuration(Number(e.target.value))}
              className="w-full"
            />
            <div className="flex justify-between text-xs text-gray-500 mt-1">
              <span>5 דק'</span>
              <span>20 דק'</span>
            </div>
          </div>
        </div>
      </div>

      {/* שגיאה */}
      {error && (
        <div className="bg-red-50 border-2 border-red-300 rounded-lg p-4 text-red-700">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-5 h-5" />
            <span>{error}</span>
          </div>
        </div>
      )}

      {/* כפתור יצירה */}
      <button
        onClick={handleSubmit}
        disabled={isLoading || selectedCalls.length === 0 || (quota && quota.available_minutes < estimatedDuration)}
        className="w-full bg-gradient-to-r from-blue-600 to-purple-600 text-white py-4 rounded-lg font-bold text-xl hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
      >
        {isLoading ? (
          <>
            <Loader2 className="w-6 h-6 animate-spin" />
            <span>יוצר סימולציה...</span>
          </>
        ) : (
          <>
            <CheckCircle2 className="w-6 h-6" />
            <span>🚀 צור סימולציה ({estimatedDuration} דק')</span>
          </>
        )}
      </button>
    </div>
  )
}

