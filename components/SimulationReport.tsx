'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Line } from 'react-chartjs-2'
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js'

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
)

interface SimulationReportProps {
  report: any
  user: any
  recentReports: any[]
}

export default function SimulationReport({ report, user, recentReports }: SimulationReportProps) {
  const router = useRouter()
  const [activeTab, setActiveTab] = useState<'overview' | 'quotes' | 'improvements' | 'trends'>('overview')
  const [isRetrying, setIsRetrying] = useState(false)

  const simulation = report.simulations
  const persona = simulation?.customer_personas_hebrew?.[0] || simulation?.customer_personas_hebrew
  
  // הכנת נתונים לגרף מגמות
  const trendsData = {
    labels: recentReports.slice(0, 5).reverse().map((_, index) => `סימולציה ${index + 1}`),
    datasets: [
      {
        label: 'ציון כללי',
        data: recentReports.slice(0, 5).reverse().map(r => r.overall_score),
        borderColor: 'rgb(59, 130, 246)',
        backgroundColor: 'rgba(59, 130, 246, 0.1)',
        tension: 0.4,
      }
    ],
  }

  const getScoreColor = (score: number) => {
    if (score >= 8) return 'text-brand-success-dark bg-brand-success-light'
    if (score >= 6) return 'text-brand-warning-dark bg-brand-warning-light'
    return 'text-red-700 bg-red-50'
  }

  const getScoreEmoji = (score: number) => {
    if (score >= 9) return '🏆'
    if (score >= 8) return '⭐'
    if (score >= 7) return '👍'
    if (score >= 6) return '👌'
    return '💪'
  }

  // נסה שוב עם אותה פרסונה
  const handleRetry = async () => {
    setIsRetrying(true)
    try {
      const response = await fetch('/api/simulations/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          simulation_type: 'נסיון חוזר',
          customer_persona: 'לקוח ווירטואלי',
          persona_id: simulation?.persona_id,
          difficulty_level: simulation?.difficulty_level || 'אוטומטי',
          selectedTopics: simulation?.selected_topics || [],
          source_call_id: simulation?.source_call_id || null,
          max_duration_seconds: 600
        })
      })
      
      if (response.ok) {
        const data = await response.json()
        router.push(`/simulations/${data.simulation.id}`)
      }
    } catch (error) {
      console.error('Error retrying simulation:', error)
      alert('שגיאה ביצירת סימולציה חדשה')
    } finally {
      setIsRetrying(false)
    }
  }

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      {/* כותרת הדוח */}
      <div className="bg-white rounded-xl shadow-lg p-6">
        <div className="flex justify-between items-start mb-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              📊 דוח סימולציה מפורט
            </h1>
            <div className="text-gray-600 space-y-1">
              <p>נציג: {user?.full_name}</p>
              <p>לקוח ווירטואלי: {persona?.persona_name || 'לא צוין'}</p>
              <p>תאריך: {new Date(report.created_at).toLocaleDateString('he-IL')}</p>
              <p>רמת קושי: {simulation?.difficulty_level}</p>
            </div>
          </div>
          
          <div className="text-center">
            <div className={`inline-flex items-center justify-center w-24 h-24 rounded-full text-4xl font-bold ${getScoreColor(report.overall_score)}`}>
              {report.overall_score}
            </div>
            <div className="text-5xl mt-2">{getScoreEmoji(report.overall_score)}</div>
            <p className="text-sm text-gray-600 mt-1">ציון כללי</p>
          </div>
        </div>

        {/* פעולות מהירות */}
        <div className="flex flex-wrap gap-3">
          <button 
            onClick={handleRetry}
            disabled={isRetrying}
            className="bg-blue-600 text-white px-5 py-3 rounded-lg hover:bg-blue-700 transition-colors font-bold flex items-center gap-2 disabled:opacity-50"
          >
            {isRetrying ? (
              <>
                <div className="animate-spin w-5 h-5 border-2 border-white border-t-transparent rounded-full" />
                יוצר...
              </>
            ) : (
              <>
                🔄 נסה שוב עם אותו לקוח
              </>
            )}
          </button>
          <Link 
            href="/simulations/create"
            className="bg-brand-primary text-white px-4 py-2 rounded-lg hover:bg-brand-primary-dark transition-colors"
          >
            🎯 סימולציה חדשה
          </Link>
          <button 
            onClick={() => window.print()}
            className="bg-gray-600 text-white px-4 py-3 rounded-lg hover:bg-gray-700 transition-colors"
          >
            🖨️ הדפס
          </button>
        </div>
      </div>

      {/* טאבים */}
      <div className="bg-white rounded-xl shadow-lg">
        <div className="border-b border-gray-200">
          <nav className="flex space-x-4 px-6 overflow-x-auto">
            {[
              { id: 'overview', label: '📈 סקירה', icon: '📈' },
              { id: 'quotes', label: '💬 ציטוטים', icon: '💬' },
              { id: 'improvements', label: '🎯 שיפורים', icon: '🎯' },
              { id: 'trends', label: '📊 מגמות', icon: '📊' }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`py-4 px-2 border-b-2 font-medium text-sm whitespace-nowrap ${
                  activeTab === tab.id
                    ? 'border-brand-primary text-brand-primary'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </nav>
        </div>

        <div className="p-6">
          {/* טאב סקירה כללית */}
          {activeTab === 'overview' && (
            <div className="space-y-6">
              {/* סיכום */}
              {report.summary && (
                <div className="bg-blue-50 rounded-lg p-6">
                  <h3 className="text-lg font-bold text-blue-900 mb-3">💬 סיכום כללי</h3>
                  <p className="text-blue-800 leading-relaxed">{report.summary}</p>
                </div>
              )}

              {/* ציונים מפורטים */}
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
                {[
                  { key: 'communication_score', label: 'תקשורת' },
                  { key: 'objection_handling_score', label: 'טיפול בהתנגדויות' },
                  { key: 'rapport_building_score', label: 'בניית קשר' },
                  { key: 'closing_score', label: 'סגירה' },
                  { key: 'product_knowledge_score', label: 'ידע במוצר' },
                ].map(({ key, label }) => (
                  <div key={key} className="bg-white border-2 rounded-lg p-4 text-center">
                    <div className={`text-2xl font-bold mb-2 ${getScoreColor(report[key] || 6)}`}>
                      {report[key] || 6}/10
                    </div>
                    <div className="text-sm text-gray-600">{label}</div>
                  </div>
                ))}
              </div>

              {/* חוזקות וחולשות */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-brand-success-light/50 rounded-lg p-6">
                  <h3 className="text-lg font-bold text-brand-success-dark mb-4">✅ נקודות חוזק</h3>
                  <ul className="space-y-2">
                    {(report.strengths || []).map((strength: string, index: number) => (
                      <li key={index} className="flex items-start space-x-2">
                        <span className="text-brand-success font-bold">•</span>
                        <span className="text-neutral-700">{strength}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="bg-brand-warning-light/50 rounded-lg p-6">
                  <h3 className="text-lg font-bold text-brand-warning-dark mb-4">🎯 תחומים לשיפור</h3>
                  <ul className="space-y-2">
                    {(report.improvement_areas || []).map((area: string, index: number) => (
                      <li key={index} className="flex items-start space-x-2">
                        <span className="text-brand-warning font-bold">•</span>
                        <span className="text-neutral-700">{area}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              {/* השוואה לשיחה המקורית */}
              {report.comparison_to_original && (
                <div className="bg-purple-50 border-2 border-purple-200 rounded-lg p-6">
                  <h3 className="text-lg font-bold text-purple-900 mb-4">📊 השוואה לשיחה המקורית</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <h4 className="font-medium text-purple-800 mb-2">✅ השתפר:</h4>
                      <ul className="space-y-1">
                        {(report.comparison_to_original.improved || []).map((item: string, i: number) => (
                          <li key={i} className="text-purple-700">• {item}</li>
                        ))}
                      </ul>
                    </div>
                    <div>
                      <h4 className="font-medium text-purple-800 mb-2">⏳ עדיין דורש עבודה:</h4>
                      <ul className="space-y-1">
                        {(report.comparison_to_original.still_needs_work || []).map((item: string, i: number) => (
                          <li key={i} className="text-purple-700">• {item}</li>
                        ))}
                      </ul>
                    </div>
                  </div>
                  {report.comparison_to_original.score_change && (
                    <p className="mt-4 text-purple-900 font-medium">
                      📈 {report.comparison_to_original.score_change}
                    </p>
                  )}
                </div>
              )}
            </div>
          )}

          {/* טאב ציטוטים */}
          {activeTab === 'quotes' && (
            <div className="space-y-6">
              <h3 className="text-xl font-bold text-gray-900">💬 ציטוטים חשובים מהשיחה</h3>
              
              {(report.key_quotes || []).length > 0 ? (
                <div className="space-y-4">
                  {report.key_quotes.map((quote: any, index: number) => (
                    <div key={index} className="border-2 border-gray-200 rounded-lg p-5">
                      <div className="flex items-center gap-2 mb-3">
                        <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                          quote.speaker === 'נציג' ? 'bg-brand-info-light text-brand-primary' : 'bg-brand-success-light text-brand-success-dark'
                        }`}>
                          {quote.speaker === 'נציג' ? '👤 נציג' : '🎭 לקוח'}
                        </span>
                      </div>
                      <blockquote className="text-lg text-gray-800 italic border-r-4 border-blue-300 pr-4 mb-3">
                        "{quote.quote}"
                      </blockquote>
                      <p className="text-gray-600 text-sm">
                        <span className="font-medium">הקשר:</span> {quote.context}
                      </p>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12 text-gray-500">
                  <div className="text-4xl mb-4">💬</div>
                  <p>אין ציטוטים זמינים</p>
                </div>
              )}
            </div>
          )}

          {/* טאב שיפורים */}
          {activeTab === 'improvements' && (
            <div className="space-y-6">
              <h3 className="text-xl font-bold text-gray-900">🎯 מה היה צריך להגיד</h3>
              
              {(report.what_should_have_said || []).length > 0 ? (
                <div className="space-y-4">
                  {report.what_should_have_said.map((item: any, index: number) => (
                    <div key={index} className="border-2 border-gray-200 rounded-lg p-5">
                      <div className="mb-3">
                        <span className="text-sm text-gray-500 font-medium">📍 סיטואציה:</span>
                        <p className="text-gray-800">{item.situation}</p>
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="bg-red-50 rounded-lg p-4">
                          <span className="text-sm text-red-600 font-medium">❌ מה נאמר:</span>
                          <p className="text-red-800 mt-1">"{item.said}"</p>
                        </div>
                        <div className="bg-brand-success-light/50 rounded-lg p-4">
                          <span className="text-sm text-brand-success-dark font-medium">✅ מה היה צריך:</span>
                          <p className="text-brand-success-dark mt-1">"{item.should_say}"</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12 text-gray-500">
                  <div className="text-4xl mb-4">🎯</div>
                  <p>אין המלצות ספציפיות</p>
                </div>
              )}

              {/* המלצות מעשיות */}
              {(report.action_items || []).length > 0 && (
                <div className="bg-brand-info-light/50 rounded-lg p-6 mt-6">
                  <h3 className="text-lg font-bold text-brand-primary-dark mb-4">🚀 המלצות מעשיות</h3>
                  <div className="space-y-3">
                    {report.action_items.map((item: string, index: number) => (
                      <div key={index} className="flex items-start gap-3">
                        <div className="w-7 h-7 bg-brand-info-light rounded-full flex items-center justify-center flex-shrink-0">
                          <span className="text-brand-primary-dark text-sm font-bold">{index + 1}</span>
                        </div>
                        <p className="text-brand-primary-dark">{item}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* טאב מגמות */}
          {activeTab === 'trends' && (
            <div className="space-y-6">
              <div>
                <h3 className="text-xl font-bold text-gray-900 mb-4">📈 ההתקדמות שלך</h3>
                
                {recentReports.length > 1 ? (
                  <div className="bg-white p-6 rounded-lg border-2">
                    <Line 
                      data={trendsData}
                      options={{
                        responsive: true,
                        plugins: {
                          legend: {
                            position: 'top' as const,
                          },
                          title: {
                            display: true,
                            text: 'מגמת ציונים - 5 הסימולציות האחרונות',
                          },
                        },
                        scales: {
                          y: {
                            beginAtZero: true,
                            max: 10,
                          },
                        },
                      }}
                    />
                  </div>
                ) : (
                  <div className="text-center py-12 text-gray-500">
                    <div className="text-4xl mb-4">📊</div>
                    <p>בצע עוד סימולציות כדי לראות את מגמת ההתקדמות שלך</p>
                  </div>
                )}
              </div>

              {/* סטטיסטיקות */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-brand-info-light/40 rounded-lg p-6 text-center">
                  <div className="text-3xl font-bold text-brand-primary mb-2">
                    {recentReports.length}
                  </div>
                  <div className="text-neutral-700">סה״כ סימולציות</div>
                </div>

                <div className="bg-brand-success-light/40 rounded-lg p-6 text-center">
                  <div className="text-3xl font-bold text-brand-success-dark mb-2">
                    {recentReports.length > 0 ?
                      (recentReports.reduce((sum, r) => sum + r.overall_score, 0) / recentReports.length).toFixed(1)
                      : '0'}
                  </div>
                  <div className="text-neutral-700">ציון ממוצע</div>
                </div>

                <div className="bg-brand-accent-light/40 rounded-lg p-6 text-center">
                  <div className="text-3xl font-bold text-brand-secondary-dark mb-2">
                    {recentReports.length > 0 ? Math.max(...recentReports.map(r => r.overall_score)) : 0}
                  </div>
                  <div className="text-neutral-700">הציון הגבוה ביותר</div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* פעולות תחתונות */}
      <div className="bg-white rounded-xl shadow-lg p-6">
        <h3 className="text-lg font-bold text-gray-900 mb-4">🚀 מה הלאה?</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <button
            onClick={handleRetry}
            disabled={isRetrying}
            className="block p-5 border-2 border-brand-info-light rounded-lg hover:bg-brand-info-light/30 transition-colors text-right disabled:opacity-50"
          >
            <div className="text-2xl mb-2">🔄</div>
            <h4 className="font-bold text-gray-900 mb-1">נסה שוב</h4>
            <p className="text-sm text-gray-600">חזור על הסימולציה עם אותו לקוח</p>
          </button>

          <Link
            href="/simulations/create"
            className="block p-4 border border-brand-info-light rounded-lg hover:bg-brand-info-light/30 transition-colors"
          >
            <div className="text-2xl mb-2">🎯</div>
            <h4 className="font-bold text-gray-900 mb-1">סימולציה חדשה</h4>
            <p className="text-sm text-gray-600">צור סימולציה עם לקוח חדש</p>
          </Link>

          <Link
            href="/simulations"
            className="block p-4 border border-brand-success-light rounded-lg hover:bg-brand-success-light/30 transition-colors"
          >
            <div className="text-2xl mb-2">🏋️</div>
            <h4 className="font-medium text-gray-900 mb-1">חדר הכושר</h4>
            <p className="text-sm text-gray-600">חזור לדף הסימולציות הראשי</p>
          </Link>

          <Link
            href="/dashboard"
            className="block p-4 border border-brand-accent-light rounded-lg hover:bg-brand-accent-light/30 transition-colors"
          >
            <div className="text-2xl mb-2">📊</div>
            <h4 className="font-medium text-gray-900 mb-1">דשבורד</h4>
            <p className="text-sm text-gray-600">צפה בסטטיסטיקות מקיפות</p>
          </Link>
        </div>
      </div>
    </div>
  )
}
