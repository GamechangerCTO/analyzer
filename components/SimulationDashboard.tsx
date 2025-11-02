'use client'

import { useState } from 'react'
import Link from 'next/link'
import SimulationMinutesWidget from './SimulationMinutesWidget'

interface SimulationDashboardProps {
  user: any
  personas: any[]
  recentSimulations: any[]
  progress: any
}

export default function SimulationDashboard({ 
  user, 
  personas, 
  recentSimulations, 
  progress 
}: SimulationDashboardProps) {
  const [selectedDifficulty, setSelectedDifficulty] = useState<string>('all')
  const [selectedWeakness, setSelectedWeakness] = useState<string>('all')

  // סינון פרסונות לפי הקריטריונים שנבחרו
  const filteredPersonas = personas.filter(persona => {
    const difficultyMatch = selectedDifficulty === 'all' || persona.difficulty_level === selectedDifficulty
    const weaknessMatch = selectedWeakness === 'all' || 
      persona.targets_weaknesses?.includes(selectedWeakness)
    
    return difficultyMatch && weaknessMatch
  })

  // קבלת כל החולשות הזמינות
  const allWeaknesses = Array.from(new Set(
    personas.flatMap(p => p.targets_weaknesses || [])
  ))

  return (
    <div className="space-y-8">
      {/* כותרת הדשבורד */}
      <div className="bg-white rounded-xl shadow-lg p-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-3xl font-bold text-gray-900">
              שלום {user?.full_name?.split(' ')[0]}! 👋
            </h2>
            <p className="text-gray-600 mt-2">
              בוא נמשיך לשפר את כישורי המכירה שלך עם אימונים מותאמים אישית
            </p>
          </div>
          
          <div className="flex items-center gap-4">
            <SimulationMinutesWidget companyId={user?.company_id} showDetails={false} />
            <Link 
              href="/simulations/create"
              className="bg-gradient-to-r from-blue-600 to-purple-600 text-white px-6 py-3 rounded-lg font-medium hover:shadow-lg transition-all whitespace-nowrap"
            >
              🎯 צור אימון מותאם
            </Link>
            <Link 
              href="/simulations/create-manual"
              className="bg-gradient-to-r from-green-600 to-teal-600 text-white px-6 py-3 rounded-lg font-medium hover:shadow-lg transition-all whitespace-nowrap"
            >
              ✍️ סימולציה ידנית
            </Link>
          </div>
        </div>

        {/* המלצות מהירות */}
        {progress?.weakest_skill && (
          <div className="bg-orange-50 border border-orange-200 rounded-lg p-4 mb-6">
            <div className="flex items-start space-x-3">
              <div className="w-8 h-8 bg-orange-100 rounded-full flex items-center justify-center flex-shrink-0">
                <svg className="w-5 h-5 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div className="flex-1">
                <h3 className="font-medium text-orange-900 mb-1">
                  💡 המלצה אישית עבורך
                </h3>
                <p className="text-orange-700 text-sm">
                  נזהה שאתה יכול לשפר את התחום: <strong>{progress.weakest_skill}</strong>
                  <br />
                  מומלץ להתחיל עם לקוח ברמת קושי "בינוני" שמתמחה בתחום הזה.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* פילטרים */}
        <div className="flex flex-col sm:flex-row gap-4 mb-6">
          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              רמת קושי
            </label>
            <select 
              value={selectedDifficulty}
              onChange={(e) => setSelectedDifficulty(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="all">כל הרמות</option>
              <option value="קל">קל</option>
              <option value="בינוני">בינוני</option>
              <option value="קשה">קשה</option>
              <option value="מתקדם">מתקדם</option>
            </select>
          </div>

          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              תחום אימון
            </label>
            <select 
              value={selectedWeakness}
              onChange={(e) => setSelectedWeakness(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="all">כל התחומים</option>
              {allWeaknesses.map((weakness) => (
                <option key={weakness} value={weakness}>{weakness}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* תוצאות הפילטרים */}
      <div className="bg-white rounded-xl shadow-lg p-8">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-2xl font-bold text-gray-900">
            🎭 לקוחות מומלצים עבורך ({filteredPersonas.length})
          </h3>
          
          {filteredPersonas.length === 0 && (
            <Link 
              href="/simulations/create-persona"
              className="bg-green-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-green-700 transition-colors"
            >
              + צור לקוח חדש
            </Link>
          )}
        </div>

        {filteredPersonas.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredPersonas.map((persona) => (
              <PersonaCard key={persona.id} persona={persona} />
            ))}
          </div>
        ) : (
          <div className="text-center py-12">
            <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-10 h-10 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              לא נמצאו לקוחות מתאימים
            </h3>
            <p className="text-gray-500 mb-4">
              נסה לשנות את הפילטרים או צור לקוח ווירטואלי חדש
            </p>
            <button 
              onClick={() => {
                setSelectedDifficulty('all')
                setSelectedWeakness('all')
              }}
              className="bg-gray-100 text-gray-700 px-4 py-2 rounded-lg text-sm hover:bg-gray-200 transition-colors mr-3"
            >
              אפס פילטרים
            </button>
            <Link 
              href="/simulations/create-persona"
              className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-blue-700 transition-colors"
            >
              צור לקוח חדש
            </Link>
          </div>
        )}
      </div>

      {/* אימונים מומלצים */}
      <QuickStartSection progress={progress} />
    </div>
  )
}

function PersonaCard({ persona }: { persona: any }) {
  return (
    <div className="border rounded-lg p-6 hover:shadow-md transition-all bg-white">
      {/* כותרת הפרסונה */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1">
          <h4 className="font-bold text-lg text-gray-900 mb-1">
            {persona.persona_name}
          </h4>
          <div className="flex items-center space-x-2 text-sm text-gray-500">
            <span className="bg-gray-100 px-2 py-1 rounded">{persona.personality_type}</span>
            <span>•</span>
            <span>{persona.communication_style}</span>
          </div>
        </div>
        
        <DifficultyBadge level={persona.difficulty_level} />
      </div>
      
      {/* תיאור הפרסונה */}
      <p className="text-gray-600 text-sm mb-4 line-clamp-3">
        {persona.current_situation || persona.background_story}
      </p>
      
      {/* תחומי אימון */}
      <div className="mb-4">
        <p className="text-xs font-medium text-gray-500 mb-2">מתאמן על:</p>
        <div className="flex flex-wrap gap-2">
          {persona.targets_weaknesses?.slice(0, 3).map((weakness: string, index: number) => (
            <span key={index} className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded">
              {weakness}
            </span>
          )) || <span className="text-xs text-gray-400">לא צוין</span>}
        </div>
      </div>
      
      {/* התנגדויות נפוצות */}
      <div className="mb-4">
        <p className="text-xs font-medium text-gray-500 mb-2">התנגדויות נפוצות:</p>
        <div className="space-y-1">
          {persona.common_objections?.slice(0, 2).map((objection: string, index: number) => (
            <p key={index} className="text-xs text-gray-600 italic">
              "{objection}"
            </p>
          )) || <p className="text-xs text-gray-400">לא צוינו</p>}
        </div>
      </div>
      
      {/* פוטר עם נתונים ופעולה */}
      <div className="flex justify-between items-center pt-4 border-t">
        <div className="text-xs text-gray-500">
          <span className="font-medium">{persona.usage_count || 0}</span> אימונים
          {persona.average_score && (
            <>
              <span className="mx-1">•</span>
              <span>ממוצע: {persona.average_score.toFixed(1)}</span>
            </>
          )}
        </div>
        
        <Link 
          href={`/simulations/start?persona=${persona.id}`}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
        >
          התחל אימון
        </Link>
      </div>
    </div>
  )
}

function DifficultyBadge({ level }: { level: string }) {
  const colors = {
    'קל': 'bg-green-100 text-green-800',
    'בינוני': 'bg-yellow-100 text-yellow-800', 
    'קשה': 'bg-red-100 text-red-800',
    'מתקדם': 'bg-purple-100 text-purple-800'
  }
  
  return (
    <span className={`px-2 py-1 rounded-full text-xs font-medium ${colors[level as keyof typeof colors] || 'bg-gray-100 text-gray-800'}`}>
      {level}
    </span>
  )
}

function QuickStartSection({ progress }: { progress: any }) {
  const quickStarts = [
    {
      title: "אימון מהיר - 5 דקות",
      description: "שיחה קצרה עם לקוח ידידותי",
      icon: "⚡",
      difficulty: "קל",
      href: "/simulations/quick?type=friendly&duration=5"
    },
    {
      title: "אתגר התנגדויות",
      description: "לקוח עם התנגדויות מחיר חזקות",
      icon: "💪",
      difficulty: "בינוני", 
      href: "/simulations/quick?type=price_objections&duration=10"
    },
    {
      title: "סגירת עסקה מתקדמת",
      description: "לקוח מהסס שצריך שכנוע",
      icon: "🎯",
      difficulty: "קשה",
      href: "/simulations/quick?type=closing&duration=15"
    }
  ]

  return (
    <div className="bg-white rounded-xl shadow-lg p-8">
      <h3 className="text-2xl font-bold text-gray-900 mb-6">
        🚀 אימונים מהירים
      </h3>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {quickStarts.map((quickStart, index) => (
          <Link 
            key={index}
            href={quickStart.href}
            className="border rounded-lg p-6 hover:shadow-md transition-all bg-gradient-to-br from-gray-50 to-white"
          >
            <div className="text-center">
              <div className="text-4xl mb-3">{quickStart.icon}</div>
              <h4 className="font-bold text-lg text-gray-900 mb-2">
                {quickStart.title}
              </h4>
              <p className="text-gray-600 text-sm mb-4">
                {quickStart.description}
              </p>
              <DifficultyBadge level={quickStart.difficulty} />
            </div>
          </Link>
        ))}
      </div>
    </div>
  )
}
