'use client'

import { WeakParameter } from '@/lib/extract-weak-parameters'
import { TrendingUp, TrendingDown, Minus, CheckCircle2, Target } from 'lucide-react'

interface SimulationComparisonReportProps {
  beforeScores: WeakParameter[]
  afterScores: any[]
  reportData: any
}

export default function SimulationComparisonReport({ 
  beforeScores, 
  afterScores, 
  reportData 
}: SimulationComparisonReportProps) {
  // חישוב שיפור
  const calculateImprovement = (paramName: string): { 
    before: number, 
    after: number, 
    delta: number, 
    improved: boolean 
  } => {
    const before = beforeScores.find(p => p.name === paramName)
    const after = afterScores.find((p: any) => p.name === paramName || p.parameter === paramName)
    
    const beforeScore = before?.score || 0
    const afterScore = after?.score || beforeScore
    const delta = afterScore - beforeScore
    
    return {
      before: beforeScore,
      after: afterScore,
      delta,
      improved: delta > 0
    }
  }

  return (
    <div className="space-y-6">
      {/* כותרת */}
      <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-xl p-6 border-r-4 border-blue-500">
        <h2 className="text-2xl font-bold text-gray-800 mb-2 flex items-center gap-2">
          <Target className="w-7 h-7 text-blue-600" />
          דוח השוואה: לפני ואחרי הסימולציה
        </h2>
        <p className="text-gray-700">
          {reportData?.summary || 'הנה ההתקדמות שלך בתחומים שתרגלת'}
        </p>
      </div>

      {/* השוואה גרפית של כל פרמטר */}
      <div className="bg-white rounded-xl shadow-lg p-6">
        <h3 className="text-xl font-bold mb-4 text-gray-800 flex items-center gap-2">
          📊 השיפור שלך בתחומים שתרגלת
        </h3>
        <div className="space-y-4">
          {beforeScores.map((param) => {
            const improvement = calculateImprovement(param.name)
            const percentChange = improvement.before > 0 
              ? ((improvement.delta / improvement.before) * 100).toFixed(0)
              : '0'
            
            return (
              <div key={param.name} className="border rounded-lg p-4 hover:shadow-md transition-shadow">
                {/* כותרת הפרמטר */}
                <div className="flex items-center justify-between mb-3">
                  <span className="font-semibold text-gray-800 text-lg">{param.hebrewName}</span>
                  <div className="flex items-center gap-4">
                    <span className="text-gray-500 text-sm">לפני: {improvement.before}/10</span>
                    <span className="text-2xl">→</span>
                    <span className={`text-xl font-bold ${
                      improvement.improved ? 'text-green-600' : 
                      improvement.delta === 0 ? 'text-gray-600' : 'text-red-600'
                    }`}>
                      אחרי: {improvement.after}/10
                    </span>
                    {improvement.delta !== 0 && (
                      <div className={`flex items-center gap-1 px-3 py-1 rounded-full ${
                        improvement.improved ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                      }`}>
                        {improvement.improved ? (
                          <TrendingUp className="w-4 h-4" />
                        ) : (
                          <TrendingDown className="w-4 h-4" />
                        )}
                        <span className="font-bold">
                          {improvement.improved ? '+' : ''}{improvement.delta}
                        </span>
                        <span className="text-xs">
                          ({percentChange}%)
                        </span>
                      </div>
                    )}
                    {improvement.delta === 0 && (
                      <div className="flex items-center gap-1 px-3 py-1 rounded-full bg-gray-100 text-gray-600">
                        <Minus className="w-4 h-4" />
                        <span>ללא שינוי</span>
                      </div>
                    )}
                  </div>
                </div>
                
                {/* Progress bar עם השוואה */}
                <div className="relative h-4 bg-gray-200 rounded-full overflow-hidden">
                  {/* ציון לפני - באפור */}
                  <div 
                    className="absolute h-full bg-gray-400 transition-all"
                    style={{ width: `${improvement.before * 10}%` }}
                  />
                  {/* ציון אחרי - בצבע */}
                  <div 
                    className={`absolute h-full transition-all ${
                      improvement.improved ? 'bg-green-500' : 
                      improvement.delta === 0 ? 'bg-gray-400' : 'bg-red-500'
                    }`}
                    style={{ width: `${improvement.after * 10}%` }}
                  />
                </div>

                {/* הסבר קצר */}
                {improvement.improved && (
                  <p className="mt-2 text-sm text-green-700 bg-green-50 p-2 rounded">
                    ✅ שיפור מצוין! המשך לתרגל כדי להגיע לציון מושלם.
                  </p>
                )}
                {improvement.delta === 0 && (
                  <p className="mt-2 text-sm text-gray-600 bg-gray-50 p-2 rounded">
                    ↔️ ללא שינוי. זה זמן טוב לתרגל עוד פעם עם דגש רב יותר.
                  </p>
                )}
                {!improvement.improved && improvement.delta < 0 && (
                  <p className="mt-2 text-sm text-orange-700 bg-orange-50 p-2 rounded">
                    💡 הביצועים ירדו מעט. אל תתייאש! זה חלק מהתהליך. בוא נתרגל שוב.
                  </p>
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* נקודות חוזק */}
      {reportData?.strengths && reportData.strengths.length > 0 && (
        <div className="bg-green-50 rounded-xl p-6 border-r-4 border-green-500">
          <h3 className="text-xl font-bold text-green-900 mb-4 flex items-center gap-2">
            <CheckCircle2 className="w-6 h-6" />
            נקודות לשימור - מה עבד טוב!
          </h3>
          <ul className="space-y-2">
            {reportData.strengths.map((strength: string, i: number) => (
              <li key={i} className="flex items-start gap-3">
                <span className="text-green-600 text-xl mt-0.5">✓</span>
                <span className="text-green-900 flex-1">{strength}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* תחומים שעדיין צריכים עבודה */}
      {reportData?.improvement_areas && reportData.improvement_areas.length > 0 && (
        <div className="bg-orange-50 rounded-xl p-6 border-r-4 border-orange-500">
          <h3 className="text-xl font-bold text-orange-900 mb-4 flex items-center gap-2">
            <Target className="w-6 h-6" />
            המשך לתרגל - תחומים לשיפור
          </h3>
          <ul className="space-y-2">
            {reportData.improvement_areas.map((area: string, i: number) => (
              <li key={i} className="flex items-start gap-3">
                <span className="text-orange-600 text-xl mt-0.5">🎯</span>
                <span className="text-orange-900 flex-1">{area}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* המלצות לסימולציה הבאה */}
      <div className="bg-purple-50 rounded-xl p-6 border-r-4 border-purple-500">
        <h3 className="text-xl font-bold text-purple-900 mb-3 flex items-center gap-2">
          🚀 מה הלאה?
        </h3>
        <p className="text-purple-800 mb-4 text-lg">
          {reportData?.next_training_focus || 'המשך לתרגל את התחומים שזיהינו!'}
        </p>
        
        {reportData?.recommendations && reportData.recommendations.length > 0 && (
          <div className="space-y-2 mb-4">
            <h4 className="font-semibold text-purple-900">המלצות מעשיות:</h4>
            <ul className="space-y-1">
              {reportData.recommendations.slice(0, 3).map((rec: string, i: number) => (
                <li key={i} className="text-purple-800 flex items-start gap-2">
                  <span className="text-purple-600">•</span>
                  <span>{rec}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        <button 
          onClick={() => window.location.href = '/simulations'}
          className="bg-purple-600 text-white px-6 py-3 rounded-lg hover:bg-purple-700 transition-colors font-medium"
        >
          🏋️ צור סימולציה נוספת
        </button>
      </div>

      {/* סיכום כללי */}
      <div className="bg-gradient-to-r from-gray-50 to-gray-100 rounded-xl p-6 border">
        <h3 className="text-lg font-bold text-gray-800 mb-3">📝 סיכום</h3>
        <div className="grid grid-cols-3 gap-4 text-center">
          <div className="bg-white p-4 rounded-lg shadow-sm">
            <div className="text-3xl font-bold text-blue-600">
              {beforeScores.length}
            </div>
            <div className="text-sm text-gray-600 mt-1">תחומים שתרגלת</div>
          </div>
          <div className="bg-white p-4 rounded-lg shadow-sm">
            <div className="text-3xl font-bold text-green-600">
              {beforeScores.filter(p => {
                const imp = calculateImprovement(p.name)
                return imp.improved
              }).length}
            </div>
            <div className="text-sm text-gray-600 mt-1">תחומים ששיפרת</div>
          </div>
          <div className="bg-white p-4 rounded-lg shadow-sm">
            <div className="text-3xl font-bold text-purple-600">
              {reportData?.overall_score || 0}/10
            </div>
            <div className="text-sm text-gray-600 mt-1">ציון כללי</div>
          </div>
        </div>
      </div>
    </div>
  )
}

