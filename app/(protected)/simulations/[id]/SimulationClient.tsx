'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import RealtimeSimulation from '@/components/RealtimeSimulation'
import { ArrowRight, User, Target, AlertTriangle, CheckCircle } from 'lucide-react'

interface SimulationClientProps {
  simulation: any
  user: any
  company: any
}

export default function SimulationClient({ simulation, user, company }: SimulationClientProps) {
  const router = useRouter()
  const [isCompleted, setIsCompleted] = useState(simulation.status === 'completed')
  const [finalTranscript, setFinalTranscript] = useState<string | null>(null)
  const [finalDuration, setFinalDuration] = useState<number>(0)
  const [isGeneratingReport, setIsGeneratingReport] = useState(false)
  
  const persona = simulation.customer_personas_hebrew || {
    persona_name: 'לקוח כללי',
    personality_type: 'סטנדרטי',
    communication_style: 'ישיר'
  }
  
  // Handle simulation completion
  const handleComplete = async (transcript: string, duration: number) => {
    setFinalTranscript(transcript)
    setFinalDuration(duration)
    setIsCompleted(true)
    setIsGeneratingReport(true)
    
    try {
      // Update simulation status
      const response = await fetch('/api/simulations/complete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          simulationId: simulation.id,
          transcript,
          duration
        })
      })
      
      if (response.ok) {
        const result = await response.json()
        setTimeout(() => {
          if (result.reportId) {
            router.push(`/simulations/report/${result.reportId}`)
          } else {
            router.push(`/simulations/report/${simulation.id}`)
          }
        }, 2000)
      } else {
        console.error('Report generation failed')
        setIsGeneratingReport(false)
      }
    } catch (error) {
      console.error('Error completing simulation:', error)
      setIsGeneratingReport(false)
    }
  }
  
  // Handle errors
  const handleError = (error: string) => {
    console.error('Simulation error:', error)
  }
  
  // If already completed, show completion message
  if (isCompleted && !isGeneratingReport) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <div className="bg-white rounded-2xl shadow-lg p-8 text-center">
          <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle className="w-10 h-10 text-green-600" />
          </div>
          
          <h2 className="text-2xl font-bold text-gray-900 mb-4">
            הסימולציה הושלמה! 🎉
          </h2>
          
          {finalDuration > 0 && (
            <p className="text-gray-600 mb-6">
              משך השיחה: {Math.floor(finalDuration / 60)} דקות ו-{finalDuration % 60} שניות
            </p>
          )}
          
          <div className="flex justify-center gap-4">
            <button
              onClick={() => router.push(`/simulations/report/${simulation.id}`)}
              className="px-6 py-3 bg-brand-primary text-white rounded-lg hover:bg-brand-primary-dark transition-colors"
            >
              צפה בדוח
            </button>
            
            <button
              onClick={() => router.push('/simulations')}
              className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
            >
              חזור לרשימה
            </button>
          </div>
        </div>
      </div>
    )
  }
  
  // Generating report state
  if (isGeneratingReport) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <div className="bg-white rounded-2xl shadow-lg p-8 text-center">
          <div className="w-20 h-20 bg-brand-info-light rounded-full flex items-center justify-center mx-auto mb-6 animate-pulse">
            <Target className="w-10 h-10 text-brand-primary" />
          </div>
          
          <h2 className="text-2xl font-bold text-gray-900 mb-4">
            מייצר דוח ניתוח...
          </h2>
          
          <p className="text-gray-600">
            המערכת מנתחת את השיחה ומכינה משוב מפורט
          </p>
          
          <div className="mt-6 flex justify-center">
            <div className="w-8 h-8 border-4 border-brand-primary border-t-transparent rounded-full animate-spin"></div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-6xl mx-auto p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <button
          onClick={() => router.push('/simulations')}
          className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors"
        >
          <ArrowRight className="w-5 h-5" />
          <span>חזרה לרשימת הסימולציות</span>
        </button>
        
        <div className="flex items-center gap-4">
          <span className="text-sm text-gray-500">
            {simulation.simulation_type || 'סימולציית אימון'}
          </span>
          <span className={`px-3 py-1 rounded-full text-xs font-medium ${
            simulation.difficulty_level === 'קשה' || simulation.difficulty_level === 'hard'
              ? 'bg-red-100 text-red-700'
              : simulation.difficulty_level === 'קל' || simulation.difficulty_level === 'easy'
              ? 'bg-green-100 text-green-700'
              : 'bg-yellow-100 text-yellow-700'
          }`}>
            {simulation.difficulty_level || 'בינוני'}
          </span>
        </div>
      </div>
      
      {/* Info Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        {/* Persona Card */}
        <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center">
              <User className="w-5 h-5 text-purple-600" />
            </div>
            <div>
              <p className="text-xs text-gray-500">הלקוח שלך</p>
              <p className="font-semibold text-gray-900">{persona.persona_name}</p>
            </div>
          </div>
          <p className="text-sm text-gray-600">
            {persona.personality_type} • {persona.communication_style}
          </p>
        </div>
        
        {/* Focus Areas */}
        {simulation.selected_topics && simulation.selected_topics.length > 0 && (
          <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 bg-brand-info-light rounded-full flex items-center justify-center">
                <Target className="w-5 h-5 text-brand-primary" />
              </div>
              <div>
                <p className="text-xs text-gray-500">נושאים לאימון</p>
                <p className="font-semibold text-gray-900">{simulation.selected_topics.length} נושאים</p>
              </div>
            </div>
            <div className="flex flex-wrap gap-1">
              {simulation.selected_topics.slice(0, 3).map((topic: string, i: number) => (
                <span key={i} className="text-xs bg-brand-info-light/50 text-brand-primary-dark px-2 py-0.5 rounded">
                  {topic.replace(/_/g, ' ')}
                </span>
              ))}
              {simulation.selected_topics.length > 3 && (
                <span className="text-xs text-gray-500">+{simulation.selected_topics.length - 3}</span>
              )}
            </div>
          </div>
        )}
        
        {/* Tips */}
        <div className="bg-gradient-to-br from-amber-50 to-orange-50 rounded-xl p-4 shadow-sm border border-amber-100">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 bg-amber-100 rounded-full flex items-center justify-center">
              <AlertTriangle className="w-5 h-5 text-amber-600" />
            </div>
            <div>
              <p className="text-xs text-amber-700">טיפ</p>
              <p className="font-semibold text-amber-900">הקשב והגב</p>
            </div>
          </div>
          <p className="text-sm text-amber-800">
            הקשב לשאלות הלקוח והגב באופן טבעי. השהיה קצרה (~1-2 שניות) בין תשובות.
          </p>
        </div>
      </div>
      
      {/* Main Simulation Component - Realtime */}
      <RealtimeSimulation
        simulation={simulation}
        customerPersona={persona}
        user={user}
        company={company}
      />
      
      {/* Company Context */}
      {company?.company_questionnaires?.[0] && (
        <div className="mt-6 bg-white rounded-xl p-4 shadow-sm border border-gray-100">
          <h4 className="font-medium text-gray-900 mb-2">הקשר עסקי</h4>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
              <span className="text-gray-500">תחום:</span>
              <p className="font-medium">{company.company_questionnaires[0].sector || 'לא צוין'}</p>
            </div>
            <div>
              <span className="text-gray-500">מוצר:</span>
              <p className="font-medium">{company.company_questionnaires[0].product_info?.substring(0, 50) || 'לא צוין'}</p>
            </div>
            <div>
              <span className="text-gray-500">קהל יעד:</span>
              <p className="font-medium">{company.company_questionnaires[0].audience || 'לא צוין'}</p>
            </div>
            <div>
              <span className="text-gray-500">חברה:</span>
              <p className="font-medium">{company.name || 'לא צוין'}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

