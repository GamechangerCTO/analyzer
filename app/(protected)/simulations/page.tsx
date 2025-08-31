import { createClient } from '@/lib/supabase/server'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import SimulationDashboard from '@/components/SimulationDashboard'

export default async function SimulationsPage() {
  const supabase = createClient()
  
  // בדיקת אימות משתמש
  const { data: { session }, error } = await supabase.auth.getSession()
  if (error || !session) {
    redirect('/login')
  }

  // קבלת נתוני המשתמש
  const { data: user } = await supabase
    .from('users')
    .select('*')
    .eq('id', session.user.id)
    .single()

  // קבלת פרסונות זמינות בחברה
  const { data: personas } = await supabase
    .from('customer_personas_hebrew')
    .select('*')
    .eq('company_id', user?.company_id)
    .eq('is_active', true)
    .order('usage_count', { ascending: false })

  // קבלת סימולציות אחרונות של המשתמש
  const { data: recentSimulations } = await supabase
    .from('simulations')
    .select(`
      *,
      simulation_reports_hebrew (*)
    `)
    .eq('agent_id', session.user.id)
    .order('created_at', { ascending: false })
    .limit(5)

  // קבלת התקדמות האמן
  const { data: progress } = await supabase
    .from('agent_simulation_progress')
    .select('*')
    .eq('agent_id', session.user.id)
    .single()

  return (
    <div className="min-h-screen space-y-8">
      {/* כותרת עיקרית מעודכנת */}
      <div className="text-center space-y-6">
        <div className="w-24 h-24 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl flex items-center justify-center mx-auto shadow-lg">
          <svg className="w-12 h-12 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
        </div>
        
        <div>
          <h1 className="text-5xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent mb-4">
            חדר הכושר המכירתי 🏋️‍♂️
          </h1>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto leading-relaxed">
            מגרש האימון האישי שלך! סימולציות AI מתקדמות בעברית עם דוחות מפורטים ומותאמים אישית
          </p>
        </div>
      </div>

      {/* מצב מערכת - עכשיו פעילה! */}
      <div className="bg-gradient-to-r from-green-50 to-blue-50 border border-green-200 rounded-xl p-6">
        <div className="flex items-center justify-center space-x-4">
          <div className="w-12 h-12 bg-green-500 rounded-full flex items-center justify-center">
            <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <div className="text-center">
            <h2 className="text-2xl font-bold text-green-700 mb-2">
              🎉 חדר הכושר פתוח לאימונים!
            </h2>
            <p className="text-green-600">
              מערכת הסימולציות בעברית מוכנה לשימוש עם לקוחות ווירטואליים מותאמים אישית
            </p>
          </div>
        </div>
      </div>

      {/* הדשבורד החדש */}
      <SimulationDashboard 
        user={user}
        personas={personas || []}
        recentSimulations={recentSimulations || []}
        progress={progress}
      />

      {/* סטטיסטיקות מהירות */}
      {progress && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="bg-white rounded-xl p-6 shadow-md border-r-4 border-blue-500">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">סה״כ סימולציות</p>
                <p className="text-2xl font-bold text-gray-900">{progress.total_simulations || 0}</p>
              </div>
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl p-6 shadow-md border-r-4 border-green-500">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">ציון ממוצע</p>
                <p className="text-2xl font-bold text-gray-900">{progress.average_score?.toFixed(1) || '—'}</p>
              </div>
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl p-6 shadow-md border-r-4 border-purple-500">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">תחום חזק</p>
                <p className="text-lg font-bold text-gray-900">{progress.strongest_skill || 'טוב לא זוהה'}</p>
              </div>
              <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
                </svg>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl p-6 shadow-md border-r-4 border-orange-500">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">תחום לשיפור</p>
                <p className="text-lg font-bold text-gray-900">{progress.weakest_skill || 'טרם זוהה'}</p>
              </div>
              <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center">
                <svg className="w-6 h-6 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* לקוחות ווירטואליים זמינים */}
      {personas && personas.length > 0 && (
        <div className="bg-white rounded-xl shadow-lg p-8">
          <h3 className="text-2xl font-bold text-gray-900 mb-6">
            🎭 לקוחות ווירטואליים זמינים לאימון
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {personas.slice(0, 6).map((persona) => (
              <div key={persona.id} className="border rounded-lg p-6 hover:shadow-md transition-shadow">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h4 className="font-bold text-lg text-gray-900">{persona.persona_name}</h4>
                    <p className="text-sm text-gray-500">{persona.personality_type} • {persona.communication_style}</p>
                  </div>
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                    persona.difficulty_level === 'קל' ? 'bg-green-100 text-green-800' :
                    persona.difficulty_level === 'בינוני' ? 'bg-yellow-100 text-yellow-800' :
                    persona.difficulty_level === 'קשה' ? 'bg-red-100 text-red-800' :
                    'bg-purple-100 text-purple-800'
                  }`}>
                    {persona.difficulty_level}
                  </span>
                </div>
                
                <p className="text-gray-600 text-sm mb-4 line-clamp-3">
                  {persona.background_story}
                </p>
                
                <div className="flex flex-wrap gap-2 mb-4">
                  {persona.targets_weaknesses?.slice(0, 2).map((weakness: string, index: number) => (
                    <span key={index} className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded">
                      {weakness}
                    </span>
                  ))}
                </div>
                
                <div className="flex justify-between items-center">
                  <span className="text-xs text-gray-500">
                    {persona.usage_count} אימונים
                  </span>
                  <Link 
                    href={`/simulations/start?persona=${persona.id}`}
                    className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
                  >
                    התחל אימון
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* סימולציות אחרונות */}
      {recentSimulations && recentSimulations.length > 0 && (
        <div className="bg-white rounded-xl shadow-lg p-8">
          <h3 className="text-2xl font-bold text-gray-900 mb-6">
            📊 הסימולציות האחרונות שלך
          </h3>
          <div className="space-y-4">
            {recentSimulations.map((simulation) => (
              <div key={simulation.id} className="border rounded-lg p-4 hover:bg-gray-50 transition-colors">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <h4 className="font-medium text-gray-900">{simulation.simulation_type}</h4>
                    <p className="text-sm text-gray-500">{simulation.customer_persona}</p>
                    <p className="text-xs text-gray-400">
                      {new Date(simulation.created_at).toLocaleDateString('he-IL')}
                    </p>
                  </div>
                  
                  <div className="text-center ml-4">
                    {simulation.score && (
                      <div className={`text-2xl font-bold ${
                        simulation.score >= 8 ? 'text-green-600' :
                        simulation.score >= 6 ? 'text-yellow-600' :
                        'text-red-600'
                      }`}>
                        {simulation.score}/10
                      </div>
                    )}
                    <p className="text-xs text-gray-500">ציון</p>
                  </div>
                  
                  <div className="ml-4">
                    {simulation.simulation_reports_hebrew?.[0] ? (
                      <Link 
                        href={`/simulations/report/${simulation.simulation_reports_hebrew[0].id}`}
                        className="bg-gray-100 text-gray-700 px-3 py-2 rounded-lg text-sm hover:bg-gray-200 transition-colors"
                      >
                        צפה בדוח
                      </Link>
                    ) : (
                      <span className="text-xs text-gray-400">בעיבוד...</span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* קריאה לפעולה אם אין סימולציות */}
      {(!recentSimulations || recentSimulations.length === 0) && (
        <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-xl p-8 text-center">
          <div className="w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <svg className="w-10 h-10 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
          </div>
          
          <h3 className="text-2xl font-bold text-gray-900 mb-4">
            מוכן להתחיל את האימון הראשון שלך?
          </h3>
          <p className="text-gray-600 mb-6 max-w-2xl mx-auto">
            בחר לקוח ווירטואלי מהרשימה למעלה או צור סימולציה מותאמת אישית בהתבסס על הניתוחים שלך
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link 
              href="/simulations/create"
              className="bg-blue-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-blue-700 transition-colors"
            >
              צור סימולציה מותאמת
            </Link>
            <Link 
              href="/upload"
              className="bg-gray-100 text-gray-700 px-6 py-3 rounded-lg font-medium hover:bg-gray-200 transition-colors"
            >
              נתח קודם שיחה אמיתית
            </Link>
          </div>
        </div>
      )}
    </div>
  )
} 