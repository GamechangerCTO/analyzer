'use client'

import { formatDistanceToNow } from 'date-fns'
import { he } from 'date-fns/locale'
import Link from 'next/link'

interface Simulation {
  id: string
  simulation_type: string
  customer_persona: string
  difficulty_level: string
  scenario_description: string
  status: string
  score?: number
  triggered_by_call_id?: string
  expires_at: string
  created_at: string
}

interface SimulationsListProps {
  simulations: Simulation[]
  type: 'pending' | 'completed'
}

const simulationTypeLabels: { [key: string]: string } = {
  'objection_handling': 'טיפול בהתנגדויות',
  'closing_techniques': 'טכניקות סגירה',
  'follow_up_skills': 'מיומנויות פולואפ',
  'price_negotiation': 'משא ומתן על מחיר',
  'customer_service': 'שירות לקוחות',
  'appointment_setting': 'קביעת פגישות',
  'custom': 'תרחיש מותאם'
}

const customerPersonaLabels: { [key: string]: string } = {
  'aggressive': 'אגרסיבי 😠',
  'hesitant': 'מהסס 🤔',
  'technical': 'טכני 🔧',
  'emotional': 'רגשי 💭',
  'time_pressed': 'קצר בזמן ⏰',
  'business': 'עסקי 💼'
}

const difficultyLabels: { [key: string]: string } = {
  'easy': 'קל',
  'normal': 'רגיל',
  'hard': 'קשה',
  'custom': 'מותאם'
}

const difficultyColors: { [key: string]: string } = {
  'easy': 'bg-green-100 text-green-800',
  'normal': 'bg-yellow-100 text-yellow-800',
  'hard': 'bg-red-100 text-red-800',
  'custom': 'bg-purple-100 text-purple-800'
}

export function SimulationsList({ simulations, type }: SimulationsListProps) {
  if (simulations.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        {type === 'pending' ? (
          <div>
            <div className="text-4xl mb-4">🎯</div>
            <p>אין סימולציות ממתינות</p>
            <p className="text-sm mt-2">כל הכבוד! אתה מעודכן עם כל התרגולים</p>
          </div>
        ) : (
          <div>
            <div className="text-4xl mb-4">📝</div>
            <p>טרם ביצעת סימולציות</p>
            <p className="text-sm mt-2">התחל את הסימולציה הראשונה שלך</p>
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {simulations.map((simulation) => {
        const isExpiringSoon = type === 'pending' && 
          new Date(simulation.expires_at) < new Date(Date.now() + 24 * 60 * 60 * 1000)
        
        return (
          <div
            key={simulation.id}
            className={`border rounded-lg p-4 transition-colors ${
              type === 'pending' 
                ? isExpiringSoon 
                  ? 'border-red-200 bg-red-50' 
                  : 'border-gray-200 bg-white hover:bg-gray-50'
                : 'border-gray-200 bg-gray-50'
            }`}
          >
            <div className="flex justify-between items-start mb-3">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <h3 className="font-medium text-gray-900">
                    {simulationTypeLabels[simulation.simulation_type] || simulation.simulation_type}
                  </h3>
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                    difficultyColors[simulation.difficulty_level]
                  }`}>
                    {difficultyLabels[simulation.difficulty_level]}
                  </span>
                </div>
                
                <div className="text-sm text-gray-600 mb-2">
                  {customerPersonaLabels[simulation.customer_persona] || simulation.customer_persona}
                </div>
                
                <p className="text-sm text-gray-700 line-clamp-2 mb-2">
                  {simulation.scenario_description}
                </p>
              </div>
              
              {type === 'completed' && simulation.score && (
                <div className="text-center ml-4">
                  <div className={`text-lg font-bold ${
                    simulation.score >= 8 ? 'text-green-600' :
                    simulation.score >= 6 ? 'text-yellow-600' : 'text-red-600'
                  }`}>
                    {simulation.score.toFixed(1)}
                  </div>
                  <div className="text-xs text-gray-500">ציון</div>
                </div>
              )}
            </div>

            <div className="flex justify-between items-center text-sm">
              <div className="text-gray-500">
                {type === 'pending' ? (
                  isExpiringSoon ? (
                    <span className="text-red-600 font-medium">
                      פוקע בקרוב: {formatDistanceToNow(new Date(simulation.expires_at), { 
                        addSuffix: true, 
                        locale: he 
                      })}
                    </span>
                  ) : (
                    `פוקע ${formatDistanceToNow(new Date(simulation.expires_at), { 
                      addSuffix: true, 
                      locale: he 
                    })}`
                  )
                ) : (
                  `הושלם ${formatDistanceToNow(new Date(simulation.created_at), { 
                    addSuffix: true, 
                    locale: he 
                  })}`
                )}
              </div>
              
              {type === 'pending' ? (
                <Link
                  href={`/simulations/${simulation.id}`}
                  className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
                >
                  התחל תרגול
                </Link>
              ) : (
                <Link
                  href={`/simulations/${simulation.id}/results`}
                  className="text-blue-600 hover:text-blue-700 text-sm font-medium"
                >
                  צפה בתוצאות
                </Link>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
} 