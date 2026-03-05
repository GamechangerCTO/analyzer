import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import SimulationMinutesWidget from '@/components/SimulationMinutesWidget'

export default async function SimulationsPage() {
  const supabase = createClient()
  
  const { data: { session }, error } = await supabase.auth.getSession()
  if (error || !session) {
    redirect('/login')
  }

  const { data: user } = await supabase
    .from('users')
    .select('*')
    .eq('id', session.user.id)
    .single()

  // סימולציות אחרונות
  const { data: recentSimulations } = await supabase
    .from('simulations')
    .select(`
      *,
      simulation_reports_hebrew (*)
    `)
    .eq('agent_id', session.user.id)
    .order('created_at', { ascending: false })
    .limit(10)

  // ספירת סימולציות
  const completedCount = recentSimulations?.filter(s => s.status === 'completed').length || 0
  const avgScore = recentSimulations?.filter(s => s.score)
    .reduce((sum, s) => sum + s.score, 0) / (completedCount || 1)

  return (
    <div className="min-h-screen bg-gradient-to-br from-neutral-50 via-brand-info-light to-brand-info-light py-8 px-4">
      <div className="max-w-5xl mx-auto space-y-8">
        
        {/* Hero Section - פשוט ונקי */}
        <div className="bg-white rounded-3xl shadow-xl p-8 md:p-12 border border-gray-100">
          <div className="flex flex-col md:flex-row items-center justify-between gap-8">
            <div className="text-center md:text-right">
              <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
                חדר הכושר 🏋️‍♂️
              </h1>
              <p className="text-xl text-gray-600 max-w-lg">
                אימון מכירות עם לקוחות AI בעברית. 
                <br className="hidden md:block" />
                שיחות אמיתיות, משוב מיידי, שיפור מתמיד.
              </p>
            </div>
            
            <div className="flex flex-col gap-4 w-full md:w-auto">
              <Link 
                href="/simulations/create"
                className="flex items-center justify-center gap-3 bg-gradient-to-r from-brand-primary to-brand-primary text-white px-8 py-5 rounded-2xl font-bold text-xl hover:from-brand-primary-dark hover:to-brand-primary-dark transition-all shadow-lg hover:shadow-xl transform hover:-translate-y-1"
              >
                <span className="text-2xl">🎯</span>
                התחל אימון חדש
              </Link>
              
              <SimulationMinutesWidget companyId={user?.company_id} showDetails={false} />
            </div>
          </div>
        </div>

        {/* סטטיסטיקות מהירות */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white rounded-2xl p-6 shadow-md border-r-4 border-brand-primary">
            <p className="text-3xl font-bold text-gray-900">{recentSimulations?.length || 0}</p>
            <p className="text-sm text-gray-600">סה"כ אימונים</p>
          </div>
          <div className="bg-white rounded-2xl p-6 shadow-md border-r-4 border-green-500">
            <p className="text-3xl font-bold text-gray-900">{completedCount}</p>
            <p className="text-sm text-gray-600">הושלמו</p>
          </div>
          <div className="bg-white rounded-2xl p-6 shadow-md border-r-4 border-brand-info">
            <p className="text-3xl font-bold text-gray-900">{avgScore ? avgScore.toFixed(1) : '—'}</p>
            <p className="text-sm text-gray-600">ציון ממוצע</p>
          </div>
          <div className="bg-white rounded-2xl p-6 shadow-md border-r-4 border-amber-500">
            <p className="text-3xl font-bold text-gray-900">
              {recentSimulations?.filter(s => (s.score || 0) >= 8).length || 0}
            </p>
            <p className="text-sm text-gray-600">ציון גבוה</p>
          </div>
        </div>

        {/* אימונים אחרונים */}
        <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
          <div className="p-6 border-b border-gray-100 flex items-center justify-between">
            <h2 className="text-2xl font-bold text-gray-900">
              📊 האימונים שלך
            </h2>
            {recentSimulations && recentSimulations.length > 0 && (
              <span className="text-sm text-gray-500">
                {recentSimulations.length} אימונים
              </span>
            )}
          </div>
          
          {recentSimulations && recentSimulations.length > 0 ? (
            <div className="divide-y divide-gray-50">
              {recentSimulations.map((sim) => (
                <SimulationRow key={sim.id} simulation={sim} />
              ))}
            </div>
          ) : (
            <div className="p-12 text-center">
              <div className="w-20 h-20 bg-brand-info-light rounded-full flex items-center justify-center mx-auto mb-6">
                <span className="text-4xl">🎯</span>
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-3">
                עוד לא התחלת אימון
              </h3>
              <p className="text-gray-600 mb-6">
                התחל את האימון הראשון שלך ותראה את ההתקדמות
              </p>
              <Link 
                href="/simulations/create"
                className="inline-flex items-center gap-2 bg-brand-primary text-white px-6 py-3 rounded-xl font-medium hover:bg-brand-primary-dark transition-colors"
              >
                🚀 התחל עכשיו
              </Link>
            </div>
          )}
        </div>

        {/* מה תלמד */}
        <div className="bg-gradient-to-r from-brand-primary to-brand-primary rounded-2xl p-8 text-white">
          <h3 className="text-2xl font-bold mb-6">מה תתרגל באימונים?</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { icon: '👋', title: 'פתיחת שיחה' },
              { icon: '🔍', title: 'איתור צרכים' },
              { icon: '🛡️', title: 'טיפול בהתנגדויות' },
              { icon: '🎯', title: 'סגירת עסקאות' }
            ].map((item, i) => (
              <div key={i} className="bg-white/10 rounded-xl p-4 text-center backdrop-blur-sm">
                <span className="text-3xl">{item.icon}</span>
                <p className="mt-2 font-medium">{item.title}</p>
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  )
}

function SimulationRow({ simulation }: { simulation: any }) {
  const statusColors: Record<string, string> = {
    pending: 'bg-yellow-100 text-yellow-700',
    active: 'bg-brand-info-light text-brand-primary-dark',
    completed: 'bg-green-100 text-green-700',
    error: 'bg-red-100 text-red-700'
  }

  const statusLabels: Record<string, string> = {
    pending: 'ממתין',
    active: 'פעיל',
    completed: 'הושלם',
    error: 'שגיאה'
  }

  const hasReport = simulation.simulation_reports_hebrew?.length > 0
  const reportId = hasReport ? simulation.simulation_reports_hebrew[0].id : null

  return (
    <div className="p-5 hover:bg-gray-50 transition-colors flex items-center justify-between gap-4">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-3 mb-1">
          <h3 className="font-semibold text-gray-900 truncate">
            {simulation.simulation_type || 'אימון'}
          </h3>
          <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${statusColors[simulation.status] || 'bg-gray-100 text-gray-600'}`}>
            {statusLabels[simulation.status] || simulation.status}
          </span>
        </div>
        <p className="text-sm text-gray-500">
          {new Date(simulation.created_at).toLocaleDateString('he-IL', {
            day: 'numeric',
            month: 'short',
            hour: '2-digit',
            minute: '2-digit'
          })}
        </p>
      </div>
      
      {simulation.score && (
        <div className="text-center">
          <p className={`text-2xl font-bold ${
            simulation.score >= 8 ? 'text-green-600' :
            simulation.score >= 6 ? 'text-yellow-600' :
            'text-red-600'
          }`}>
            {simulation.score}
          </p>
          <p className="text-xs text-gray-500">ציון</p>
        </div>
      )}
      
      <div className="flex items-center gap-2">
        {simulation.status === 'pending' && (
          <Link 
            href={`/simulations/${simulation.id}`}
            className="px-4 py-2 bg-brand-primary text-white rounded-lg text-sm font-medium hover:bg-brand-primary-dark transition-colors"
          >
            התחל
          </Link>
        )}
        
        {simulation.status === 'completed' && reportId && (
          <Link 
            href={`/simulations/report/${reportId}`}
            className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-200 transition-colors"
          >
            צפה בדוח
          </Link>
        )}
        
        {simulation.status === 'active' && (
          <Link 
            href={`/simulations/${simulation.id}`}
            className="px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 transition-colors"
          >
            המשך
          </Link>
        )}
      </div>
    </div>
  )
}
