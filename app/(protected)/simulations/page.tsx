import { createServerComponentClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'

export default async function SimulationsPage() {
  const supabase = createServerComponentClient({ cookies })
  
  // בדיקת אימות משתמש
  const { data: { session }, error } = await supabase.auth.getSession()
  if (error || !session) {
    redirect('/login')
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
      <div className="container mx-auto px-4 py-16">
        <div className="max-w-4xl mx-auto text-center">
          {/* אנימציה של כלי עבודה */}
          <div className="mb-8 relative">
            <div className="text-8xl mb-4 animate-bounce">
              🚧
            </div>
            <div className="flex justify-center items-center gap-4 text-4xl">
              <span className="animate-pulse">🔨</span>
              <span className="animate-pulse delay-300">⚙️</span>
              <span className="animate-pulse delay-500">🔧</span>
              <span className="animate-pulse delay-700">⛏️</span>
            </div>
          </div>

          {/* כותרת עיקרית */}
          <h1 className="text-5xl font-bold text-gray-800 mb-4">
            חדר הכושר הדיגיטלי
          </h1>
          
          <h2 className="text-3xl font-semibold text-indigo-600 mb-8">
            בבנייה! 🏗️
          </h2>

          {/* הודעה קומית */}
          <div className="bg-white rounded-2xl shadow-lg p-8 mb-8 border-l-4 border-indigo-500">
            <div className="text-6xl mb-4">👷‍♂️</div>
            <p className="text-xl text-gray-700 mb-4 leading-relaxed">
              הצוות שלנו עובד ללא הפסקה (עם הרבה קפה ☕) כדי להכין עבורכם
            </p>
            <p className="text-lg text-gray-600 mb-6">
              <strong>חדר כושר דיגיטלי מתקדם</strong> לשיפור כישורי המכירה
            </p>
            
            <div className="grid md:grid-cols-3 gap-4 text-center">
              <div className="bg-blue-50 rounded-lg p-4">
                <div className="text-3xl mb-2">🎯</div>
                <div className="font-semibold text-blue-800">סימולציות מתקדמות</div>
              </div>
              <div className="bg-green-50 rounded-lg p-4">
                <div className="text-3xl mb-2">🏆</div>
                <div className="font-semibold text-green-800">תחרויות ואתגרים</div>
              </div>
              <div className="bg-purple-50 rounded-lg p-4">
                <div className="text-3xl mb-2">📊</div>
                <div className="font-semibold text-purple-800">מעקב התקדמות</div>
              </div>
            </div>
          </div>

          {/* בר התקדמות מדומה */}
          <div className="bg-white rounded-xl shadow-md p-6 mb-8">
            <div className="flex items-center justify-between mb-4">
              <span className="text-lg font-semibold text-gray-700">התקדמות הפיתוח</span>
              <span className="text-lg font-bold text-indigo-600">73%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-4">
              <div 
                className="bg-gradient-to-r from-indigo-500 to-purple-600 h-4 rounded-full transition-all duration-1000 ease-out"
                style={{ width: '73%' }}
              ></div>
            </div>
            <p className="text-sm text-gray-500 mt-2">
              אנחנו כמעט שם! עוד קצת סבלנות... 🚀
            </p>
          </div>

          {/* הודעה מעודדת */}
          <div className="bg-gradient-to-r from-yellow-100 to-orange-100 rounded-xl p-6 border-2 border-dashed border-yellow-300">
            <div className="text-4xl mb-3">🎉</div>
            <h3 className="text-xl font-bold text-gray-800 mb-2">
              בינתיים, ממשיכים לעבוד קשה!
            </h3>
            <p className="text-gray-700">
              תוכלו לחזור לדשבורד הראשי ולהמשיך לנתח שיחות ולהשתפר
            </p>
            <div className="mt-4">
              <a 
                href="/dashboard" 
                className="inline-flex items-center px-6 py-3 bg-indigo-600 text-white font-semibold rounded-lg hover:bg-indigo-700 transition-colors duration-200"
              >
                חזרה לדשבורד
                <span className="mr-2">🏠</span>
              </a>
            </div>
          </div>

          {/* טקסט קטן בתחתית */}
          <div className="mt-12 text-sm text-gray-500">
            <p>💡 רעיון? הצעה? בעיה? נשמח לשמוע ממכם!</p>
          </div>
        </div>
      </div>
    </div>
  )
} 