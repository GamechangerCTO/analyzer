'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { extractWeakParameters, WeakParameter } from '@/lib/extract-weak-parameters'
import { Loader2 } from 'lucide-react'

interface SimulationTriggerButtonProps {
  callId: string
  contentAnalysis: any
  overallScore: number
}

export default function SimulationTriggerButton({ 
  callId, 
  contentAnalysis, 
  overallScore 
}: SimulationTriggerButtonProps) {
  const router = useRouter()
  const [isCreating, setIsCreating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  // הצג רק אם הציון < 8
  if (overallScore >= 8) return null
  
  const weakParams = extractWeakParameters(contentAnalysis)
  if (weakParams.length === 0) return null
  
  const handleStartSimulation = async () => {
    setIsCreating(true)
    setError(null)
    
    try {
      const response = await fetch('/api/simulations/create-from-analysis', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          callId,
          weakParameters: weakParams,
          autoGenerate: true
        })
      })
      
      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'שגיאה ביצירת הסימולציה')
      }
      
      const { simulationId } = await response.json()
      router.push(`/simulations/${simulationId}`)
    } catch (error) {
      console.error('Error creating simulation:', error)
      setError(error instanceof Error ? error.message : 'שגיאה ביצירת הסימולציה')
    } finally {
      setIsCreating(false)
    }
  }
  
  return (
    <div className="bg-gradient-to-r from-orange-50 to-red-50 border-2 border-orange-400 rounded-xl p-6 mt-6 shadow-lg animate-pulse-slow">
      <div className="flex items-center gap-4">
        <div className="text-5xl flex-shrink-0">🏋️</div>
        
        <div className="flex-1">
          <h3 className="text-xl font-bold text-orange-900 mb-2">
            מצאנו שיש מקום לשפר את השיחה הבאה
          </h3>
          <p className="text-orange-700 mb-3">
            בוא נשפר יחד את השיחה הבאה שלך - זוהו {weakParams.length} תחומים לשיפור
          </p>
          
          <div className="flex flex-wrap gap-2 mb-2">
            {weakParams.slice(0, 3).map(param => (
              <span 
                key={param.name} 
                className="px-3 py-1 bg-orange-200 text-orange-900 rounded-full text-sm font-medium"
              >
                {param.hebrewName}: {param.score}/10
              </span>
            ))}
            {weakParams.length > 3 && (
              <span className="px-3 py-1 bg-orange-100 text-orange-700 rounded-full text-sm">
                +{weakParams.length - 3} נוספים
              </span>
            )}
          </div>
          
          {error && (
            <div className="mt-2 text-sm text-red-600 bg-red-50 px-3 py-2 rounded">
              {error}
            </div>
          )}
        </div>
        
        <button
          onClick={handleStartSimulation}
          disabled={isCreating}
          className="bg-orange-600 hover:bg-orange-700 text-white px-8 py-4 rounded-lg font-bold text-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 flex-shrink-0"
        >
          {isCreating ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              <span>יוצר...</span>
            </>
          ) : (
            <>
              <span>🎯</span>
              <span>תרגל את החולשות</span>
            </>
          )}
        </button>
      </div>
    </div>
  )
}

