'use client'

import { useState } from 'react'
import Link from 'next/link'
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
  const [activeTab, setActiveTab] = useState<'overview' | 'detailed' | 'trends'>('overview')

  const simulation = report.simulations
  const persona = simulation?.customer_personas_hebrew?.[0]
  
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
    if (score >= 8) return 'text-green-600 bg-green-100'
    if (score >= 6) return 'text-yellow-600 bg-yellow-100'
    return 'text-red-600 bg-red-100'
  }

  const getScoreEmoji = (score: number) => {
    if (score >= 9) return '🏆'
    if (score >= 8) return '⭐'
    if (score >= 7) return '👍'
    if (score >= 6) return '👌'
    return '💪'
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
            <div className={`inline-flex items-center justify-center w-20 h-20 rounded-full text-3xl font-bold ${getScoreColor(report.overall_score)}`}>
              {report.overall_score}
            </div>
            <div className="text-4xl mt-2">{getScoreEmoji(report.overall_score)}</div>
            <p className="text-sm text-gray-600 mt-1">ציון כללי</p>
          </div>
        </div>

        {/* פעולות מהירות */}
        <div className="flex flex-wrap gap-3">
          <Link 
            href="/simulations/create"
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
          >
            🎯 אימון נוסף
          </Link>
          <Link 
            href={`/simulations/${simulation.id}/transcript`}
            className="bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700 transition-colors"
          >
            📝 תמלול מלא
          </Link>
          <button 
            onClick={() => window.print()}
            className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors"
          >
            🖨️ הדפס דוח
          </button>
        </div>
      </div>

      {/* טאבים */}
      <div className="bg-white rounded-xl shadow-lg">
        <div className="border-b border-gray-200">
          <nav className="flex space-x-8 px-6">
            {[
              { id: 'overview', label: '📈 סקירה כללית', icon: '📈' },
              { id: 'detailed', label: '🔍 ניתוח מפורט', icon: '🔍' },
              { id: 'trends', label: '📊 מגמות התקדמות', icon: '📊' }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`py-4 border-b-2 font-medium text-sm ${
                  activeTab === tab.id
                    ? 'border-blue-500 text-blue-600'
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
              <div className="bg-blue-50 rounded-lg p-6">
                <h3 className="text-lg font-bold text-blue-900 mb-3">💬 סיכום כללי</h3>
                <p className="text-blue-800 leading-relaxed">{report.summary}</p>
              </div>

              {/* ציונים מפורטים */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                {Object.entries(report.detailed_scores || {}).map(([category, score]) => {
                  const categoryNames = {
                    communication: 'תקשורת',
                    objection_handling: 'התמודדות עם התנגדויות',
                    relationship_building: 'בניית קשר',
                    closing: 'סגירת עסקה',
                    product_knowledge: 'ידע במוצר'
                  }
                  
                  return (
                    <div key={category} className="bg-white border rounded-lg p-4 text-center">
                      <div className={`text-2xl font-bold mb-2 ${getScoreColor(score as number)}`}>
                        {score}/10
                      </div>
                      <div className="text-sm text-gray-600">
                        {categoryNames[category as keyof typeof categoryNames] || category}
                      </div>
                    </div>
                  )
                })}
              </div>

              {/* חוזקות וחולשות */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-green-50 rounded-lg p-6">
                  <h3 className="text-lg font-bold text-green-900 mb-4">✅ נקודות חוזק</h3>
                  <ul className="space-y-2">
                    {(report.strengths || []).map((strength: string, index: number) => (
                      <li key={index} className="flex items-start space-x-2">
                        <span className="text-green-600 font-bold">•</span>
                        <span className="text-green-800">{strength}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="bg-orange-50 rounded-lg p-6">
                  <h3 className="text-lg font-bold text-orange-900 mb-4">🎯 תחומים לשיפור</h3>
                  <ul className="space-y-2">
                    {(report.improvement_areas || []).map((area: string, index: number) => (
                      <li key={index} className="flex items-start space-x-2">
                        <span className="text-orange-600 font-bold">•</span>
                        <span className="text-orange-800">{area}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          )}

          {/* טאב ניתוח מפורט */}
          {activeTab === 'detailed' && (
            <div className="space-y-6">
              {/* פידבק ספציפי */}
              <div>
                <h3 className="text-xl font-bold text-gray-900 mb-4">🔍 ניתוח מפורט</h3>
                <div className="space-y-4">
                  {(report.specific_feedback || []).map((feedback: any, index: number) => (
                    <div key={index} className="border border-gray-200 rounded-lg p-6">
                      <div className="flex justify-between items-start mb-3">
                        <h4 className="font-bold text-lg text-gray-900">{feedback.category}</h4>
                        <span className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm">
                          ציטוט מהשיחה
                        </span>
                      </div>
                      
                      <div className="bg-gray-50 rounded p-4 mb-4">
                        <p className="text-gray-700 italic">"{feedback.quote}"</p>
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <h5 className="font-medium text-gray-900 mb-2">📝 ניתוח:</h5>
                          <p className="text-gray-700">{feedback.analysis}</p>
                        </div>
                        <div>
                          <h5 className="font-medium text-gray-900 mb-2">💡 הצעה לשיפור:</h5>
                          <p className="text-blue-700">{feedback.suggestion}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* המלצות מעשיות */}
              <div className="bg-purple-50 rounded-lg p-6">
                <h3 className="text-lg font-bold text-purple-900 mb-4">🚀 המלצות מעשיות</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {(report.recommendations || []).map((recommendation: string, index: number) => (
                    <div key={index} className="flex items-start space-x-3">
                      <div className="w-6 h-6 bg-purple-200 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                        <span className="text-purple-800 text-sm font-bold">{index + 1}</span>
                      </div>
                      <p className="text-purple-800">{recommendation}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* המיקוד הבא */}
              <div className="bg-indigo-50 rounded-lg p-6">
                <h3 className="text-lg font-bold text-indigo-900 mb-3">🎯 המיקוד לאימון הבא</h3>
                <p className="text-indigo-800 text-lg">{report.next_training_focus}</p>
              </div>
            </div>
          )}

          {/* טאב מגמות */}
          {activeTab === 'trends' && (
            <div className="space-y-6">
              <div>
                <h3 className="text-xl font-bold text-gray-900 mb-4">📈 ההתקדמות שלך</h3>
                
                {recentReports.length > 1 ? (
                  <div className="bg-white p-6 rounded-lg border">
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
                <div className="bg-blue-50 rounded-lg p-6 text-center">
                  <div className="text-3xl font-bold text-blue-600 mb-2">
                    {recentReports.length}
                  </div>
                  <div className="text-blue-800">סה״כ סימולציות</div>
                </div>
                
                <div className="bg-green-50 rounded-lg p-6 text-center">
                  <div className="text-3xl font-bold text-green-600 mb-2">
                    {recentReports.length > 0 ? 
                      (recentReports.reduce((sum, r) => sum + r.overall_score, 0) / recentReports.length).toFixed(1) 
                      : '0'}
                  </div>
                  <div className="text-green-800">ציון ממוצע</div>
                </div>
                
                <div className="bg-purple-50 rounded-lg p-6 text-center">
                  <div className="text-3xl font-bold text-purple-600 mb-2">
                    {recentReports.length > 0 ? Math.max(...recentReports.map(r => r.overall_score)) : 0}
                  </div>
                  <div className="text-purple-800">הציון הגבוה ביותר</div>
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
          <Link 
            href="/simulations/create"
            className="block p-4 border border-blue-200 rounded-lg hover:bg-blue-50 transition-colors"
          >
            <div className="text-2xl mb-2">🎯</div>
            <h4 className="font-medium text-gray-900 mb-1">אימון מותאם</h4>
            <p className="text-sm text-gray-600">צור סימולציה חדשה בהתבסס על הדוח</p>
          </Link>
          
          <Link 
            href="/simulations"
            className="block p-4 border border-green-200 rounded-lg hover:bg-green-50 transition-colors"
          >
            <div className="text-2xl mb-2">🏋️‍♂️</div>
            <h4 className="font-medium text-gray-900 mb-1">חדר הכושר</h4>
            <p className="text-sm text-gray-600">חזור לדף הסימולציות הראשי</p>
          </Link>
          
          <Link 
            href="/dashboard"
            className="block p-4 border border-purple-200 rounded-lg hover:bg-purple-50 transition-colors"
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
