'use client'

import { useState } from 'react'
import { User, Briefcase, Target, AlertTriangle, MessageSquare, Clock, DollarSign } from 'lucide-react'

interface PersonaPreviewProps {
  persona: any
  onAccept: () => void
  onRegenerate?: () => void
  isRegenerating?: boolean
  questionnaireAge?: number
  questionnaireCompleteness?: number
}

export default function PersonaPreview({ 
  persona, 
  onAccept, 
  onRegenerate, 
  isRegenerating = false,
  questionnaireAge,
  questionnaireCompleteness 
}: PersonaPreviewProps) {
  const [isExpanded, setIsExpanded] = useState(false)

  if (!persona) {
    return (
      <div className="rounded-xl border-2 border-dashed border-gray-300 p-8 text-center">
        <p className="text-gray-500">אין פרסונה זמינה</p>
      </div>
    )
  }

  const hasWarnings = questionnaireAge && questionnaireAge > 180
  const hasIncomplete = questionnaireCompleteness && questionnaireCompleteness < 100

  return (
    <div className="space-y-4">
      {/* אזהרות */}
      {(hasWarnings || hasIncomplete) && (
        <div className="bg-amber-50 border-r-4 border-amber-400 p-4 rounded-lg">
          <div className="flex items-start">
            <AlertTriangle className="w-5 h-5 text-amber-600 ml-3 mt-0.5 flex-shrink-0" />
            <div>
              <h4 className="font-semibold text-amber-900 mb-1">שים לב</h4>
              <ul className="text-sm text-amber-800 space-y-1">
                {hasWarnings && (
                  <li>שאלון החברה לא עודכן ב-{questionnaireAge} יום - הפרסונה עלולה להיות לא מעודכנת</li>
                )}
                {hasIncomplete && (
                  <li>שאלון החברה מלא רק ב-{questionnaireCompleteness}% - הפרסונה עלולה להיות פחות מדויקת</li>
                )}
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* כרטיס הפרסונה */}
      <div className="rounded-xl border-2 border-blue-200 bg-gradient-to-br from-blue-50 to-white p-6 shadow-lg">
        {/* כותרת */}
        <div className="flex items-start justify-between mb-6">
          <div className="flex-1">
            <div className="flex items-center mb-2">
              <User className="w-6 h-6 text-blue-600 ml-2" />
              <h3 className="text-xl font-bold text-gray-900">
                {persona.persona_name || 'לקוח ווירטואלי'}
              </h3>
            </div>
            <div className="flex flex-wrap gap-2">
              {persona.personality_type && (
                <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                  {persona.personality_type}
                </span>
              )}
              {persona.communication_style && (
                <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                  {persona.communication_style}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* פרטים עיקריים */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          {persona.industry_context && (
            <div className="flex items-start">
              <Briefcase className="w-5 h-5 text-gray-400 ml-2 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-xs text-gray-500 font-medium">תחום</p>
                <p className="text-sm text-gray-900">{persona.industry_context}</p>
              </div>
            </div>
          )}

          {persona.company_size && (
            <div className="flex items-start">
              <Briefcase className="w-5 h-5 text-gray-400 ml-2 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-xs text-gray-500 font-medium">גודל חברה</p>
                <p className="text-sm text-gray-900">{persona.company_size}</p>
              </div>
            </div>
          )}

          {persona.budget_sensitivity && (
            <div className="flex items-start">
              <DollarSign className="w-5 h-5 text-gray-400 ml-2 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-xs text-gray-500 font-medium">רגישות תקציב</p>
                <p className="text-sm text-gray-900">{persona.budget_sensitivity}</p>
              </div>
            </div>
          )}

          {persona.time_pressure && (
            <div className="flex items-start">
              <Clock className="w-5 h-5 text-gray-400 ml-2 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-xs text-gray-500 font-medium">לחץ זמן</p>
                <p className="text-sm text-gray-900">{persona.time_pressure}</p>
              </div>
            </div>
          )}
        </div>

        {/* רקע */}
        {persona.background_story && (
          <div className="bg-white rounded-lg p-4 mb-4">
            <h4 className="text-sm font-semibold text-gray-700 mb-2">📖 רקע</h4>
            <p className="text-sm text-gray-600 leading-relaxed">
              {persona.background_story}
            </p>
          </div>
        )}

        {/* מצב נוכחי */}
        {persona.current_situation && (
          <div className="bg-white rounded-lg p-4 mb-4">
            <h4 className="text-sm font-semibold text-gray-700 mb-2">🎯 מצב נוכחי</h4>
            <p className="text-sm text-gray-600 leading-relaxed">
              {persona.current_situation}
            </p>
          </div>
        )}

        {/* נקודות כאב */}
        {persona.pain_points && persona.pain_points.length > 0 && (
          <div className="bg-red-50 rounded-lg p-4 mb-4">
            <h4 className="text-sm font-semibold text-gray-700 mb-2">💢 נקודות כאב</h4>
            <ul className="space-y-1">
              {persona.pain_points.map((pain: string, idx: number) => (
                <li key={idx} className="text-sm text-gray-700 flex items-start">
                  <span className="text-red-500 ml-2">•</span>
                  {pain}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* מטרות */}
        {persona.goals_and_objectives && persona.goals_and_objectives.length > 0 && (
          <div className="bg-green-50 rounded-lg p-4 mb-4">
            <h4 className="text-sm font-semibold text-gray-700 mb-2">🎯 מטרות ויעדים</h4>
            <ul className="space-y-1">
              {persona.goals_and_objectives.map((goal: string, idx: number) => (
                <li key={idx} className="text-sm text-gray-700 flex items-start">
                  <span className="text-green-500 ml-2">✓</span>
                  {goal}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* התנגדויות נפוצות */}
        {persona.common_objections && persona.common_objections.length > 0 && (
          <div className="bg-amber-50 rounded-lg p-4 mb-4">
            <h4 className="text-sm font-semibold text-gray-700 mb-2">⚠️ התנגדויות שיעלו</h4>
            <ul className="space-y-1">
              {persona.common_objections.map((objection: string, idx: number) => (
                <li key={idx} className="text-sm text-gray-700 flex items-start">
                  <span className="text-amber-500 ml-2">⚠</span>
                  {objection}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* פרטים נוספים - מתקפל */}
        {isExpanded && (
          <div className="space-y-4 mt-4 pt-4 border-t">
            {persona.decision_making_style && (
              <div className="bg-white rounded-lg p-4">
                <h4 className="text-sm font-semibold text-gray-700 mb-2">🧠 סגנון קבלת החלטות</h4>
                <p className="text-sm text-gray-600">{persona.decision_making_style}</p>
              </div>
            )}

            {persona.preferred_communication && persona.preferred_communication.length > 0 && (
              <div className="bg-white rounded-lg p-4">
                <h4 className="text-sm font-semibold text-gray-700 mb-2">💬 תקשורת מועדפת</h4>
                <div className="flex flex-wrap gap-2">
                  {persona.preferred_communication.map((pref: string, idx: number) => (
                    <span key={idx} className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-xs">
                      {pref}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {persona.targets_weaknesses && persona.targets_weaknesses.length > 0 && (
              <div className="bg-indigo-50 rounded-lg p-4">
                <h4 className="text-sm font-semibold text-gray-700 mb-2">🎯 תחומים לתרגול</h4>
                <div className="flex flex-wrap gap-2">
                  {persona.targets_weaknesses.map((weakness: string, idx: number) => (
                    <span key={idx} className="px-3 py-1 bg-indigo-100 text-indigo-800 rounded-full text-xs font-medium">
                      {weakness}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* כפתור הצג/הסתר פרטים */}
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="text-sm text-blue-600 hover:text-blue-800 font-medium mt-2"
        >
          {isExpanded ? '▲ הסתר פרטים נוספים' : '▼ הצג פרטים נוספים'}
        </button>
      </div>

      {/* כפתורי פעולה */}
      <div className="flex gap-3">
        <button
          onClick={onAccept}
          className="flex-1 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-semibold py-3 px-6 rounded-xl shadow-lg transition-all duration-200 flex items-center justify-center"
        >
          <Target className="w-5 h-5 ml-2" />
          התחל סימולציה
        </button>

        {onRegenerate && (
          <button
            onClick={onRegenerate}
            disabled={isRegenerating}
            className="bg-white hover:bg-gray-50 text-gray-700 font-semibold py-3 px-6 rounded-xl border-2 border-gray-300 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
          >
            {isRegenerating ? (
              <span className="inline-block animate-spin">🔄</span>
            ) : (
              <span>🔄</span>
            )}
            <span className="mr-2">צור פרסונה אחרת</span>
          </button>
        )}
      </div>
    </div>
  )
}

