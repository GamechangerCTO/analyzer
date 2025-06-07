import { createServerComponentClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import Link from 'next/link'

export default async function SimulationsPage() {
  const supabase = createServerComponentClient({ cookies })
  
  // בדיקת אימות משתמש
  const { data: { session }, error } = await supabase.auth.getSession()
  if (error || !session) {
    redirect('/login')
  }

  return (
    <div className="min-h-screen space-y-12">
      {/* כותרת עיקרית */}
      <div className="text-center space-y-6">
        <div className="w-24 h-24 bg-lemon-mint/20 rounded-2xl flex items-center justify-center mx-auto animate-lemon-pulse">
          <svg className="w-12 h-12 text-lemon-mint-dark" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
        </div>
        
        <div>
          <h1 className="text-display text-5xl font-bold text-indigo-night mb-4">
            חדר הכושר המכירתי 🏋️‍♂️
          </h1>
          <p className="text-xl text-indigo-night/70 max-w-3xl mx-auto leading-relaxed">
            מגרש האימון האישי שלך לשיפור כישורי המכירה דרך סימולציות מתקדמות ואתגרים אישיים
          </p>
        </div>
      </div>

      {/* הודעת בנייה מעוצבת */}
      <div className="replayme-card p-12 text-center border-r-4 border-electric-coral">
        <div className="space-y-6">
          <div className="flex justify-center items-center gap-6">
            <div className="w-16 h-16 bg-electric-coral/20 rounded-2xl flex items-center justify-center animate-coral-pulse">
              <svg className="w-8 h-8 text-electric-coral" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
              </svg>
            </div>
            
            <div className="text-6xl animate-bounce">🚧</div>
            
            <div className="w-16 h-16 bg-lemon-mint/20 rounded-2xl flex items-center justify-center animate-lemon-pulse">
              <svg className="w-8 h-8 text-lemon-mint-dark" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
              </svg>
            </div>
          </div>

          <div>
            <h2 className="text-display text-3xl font-bold text-indigo-night mb-4">
              בונים עבורכם חדר כושר מתקדם! 🏗️
            </h2>
            <p className="text-lg text-indigo-night/70 leading-relaxed">
              הצוות שלנו עובד ללא הפסקה על פיתוח מערכת אימון מתקדמת שתכיל:
            </p>
          </div>
        </div>
      </div>

      {/* תכונות עתידיות */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        <div className="replayme-card p-8 card-hover border-r-4 border-lemon-mint">
          <div className="space-y-4">
            <div className="w-16 h-16 bg-lemon-mint/20 rounded-2xl flex items-center justify-center">
              <svg className="w-8 h-8 text-lemon-mint-dark" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 4V2a1 1 0 011-1h8a1 1 0 011 1v2m0 0V1a1 1 0 011-1h2a1 1 0 011 1v4.586a1 1 0 01-.293.707l-2 2A1 1 0 0119 9H5a1 1 0 01-.707-.293l-2-2A1 1 0 012 6V2a1 1 0 011-1h2a1 1 0 011 1v3z" />
              </svg>
            </div>
            <div>
              <h3 className="text-display text-xl font-bold text-indigo-night mb-3">
                סימולציות מכירה אמיתיות 🎯
              </h3>
              <p className="text-indigo-night/70 leading-relaxed">
                שיחות מכירה מלאכותיות מותאמות לתחום שלך עם לקוחות ווירטואליים שמגיבים כמו לקוחות אמיתיים
              </p>
            </div>
          </div>
        </div>

        <div className="replayme-card p-8 card-hover border-r-4 border-electric-coral">
          <div className="space-y-4">
            <div className="w-16 h-16 bg-electric-coral/20 rounded-2xl flex items-center justify-center">
              <svg className="w-8 h-8 text-electric-coral" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
              </svg>
            </div>
            <div>
              <h3 className="text-display text-xl font-bold text-indigo-night mb-3">
                מערכת תגמולים ודירוגים 🏆
              </h3>
              <p className="text-indigo-night/70 leading-relaxed">
                אתגרים יומיים, תחרויות צוותיות ומערכת נקודות שתהפוך את התרגול למהנה ומעורר השראה
              </p>
            </div>
          </div>
        </div>

        <div className="replayme-card p-8 card-hover border-r-4 border-indigo-night">
          <div className="space-y-4">
            <div className="w-16 h-16 bg-indigo-night/20 rounded-2xl flex items-center justify-center">
              <svg className="w-8 h-8 text-indigo-night" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </div>
            <div>
              <h3 className="text-display text-xl font-bold text-indigo-night mb-3">
                ניתוח ביצועים מתקדם 📊
              </h3>
              <p className="text-indigo-night/70 leading-relaxed">
                מעקב מפורט אחר התקדמות, זיהוי נקודות חוזק וחולשה עם המלצות מותאמות אישית
              </p>
            </div>
          </div>
        </div>

        <div className="replayme-card p-8 card-hover border-r-4 border-success">
          <div className="space-y-4">
            <div className="w-16 h-16 bg-success/20 rounded-2xl flex items-center justify-center">
              <svg className="w-8 h-8 text-success" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            </div>
            <div>
              <h3 className="text-display text-xl font-bold text-indigo-night mb-3">
                אימונים קבוצתיים 👥
              </h3>
              <p className="text-indigo-night/70 leading-relaxed">
                סשנים קבוצתיים עם עמיתים, הכוונה מנהלים ותחרויות צוותיות לחיזוק הביטחון
              </p>
            </div>
          </div>
        </div>

        <div className="replayme-card p-8 card-hover border-r-4 border-warning">
          <div className="space-y-4">
            <div className="w-16 h-16 bg-warning/20 rounded-2xl flex items-center justify-center">
              <svg className="w-8 h-8 text-warning" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
              </svg>
            </div>
            <div>
              <h3 className="text-display text-xl font-bold text-indigo-night mb-3">
                אפליקציה ניידת 📱
              </h3>
              <p className="text-indigo-night/70 leading-relaxed">
                תרגלו בכל מקום ובכל זמן עם האפליקציה הנידת שתאפשר אימונים קצרים יעילים
              </p>
            </div>
          </div>
        </div>

        <div className="replayme-card p-8 card-hover border-r-4 border-purple-500">
          <div className="space-y-4">
            <div className="w-16 h-16 bg-purple-500/20 rounded-2xl flex items-center justify-center">
              <svg className="w-8 h-8 text-purple-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
              </svg>
            </div>
            <div>
              <h3 className="text-display text-xl font-bold text-indigo-night mb-3">
                AI מאמן אישי 🤖
              </h3>
              <p className="text-indigo-night/70 leading-relaxed">
                בינה מלאכותית שתלמד את הסגנון שלך ותציע אימונים מותאמים אישית לשיפור מהיר
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* בר התקדמות */}
      <div className="replayme-card p-8">
        <div className="space-y-6">
          <div className="text-center">
            <h3 className="text-display text-2xl font-bold text-indigo-night mb-2">
              התקדמות הפיתוח 🚀
            </h3>
            <p className="text-indigo-night/70">אנחנו כמעט שם! עוד קצת סבלנות...</p>
          </div>
          
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-lg font-semibold text-indigo-night">סה"כ התקדמות</span>
              <span className="text-2xl font-bold text-lemon-mint-dark animate-score-bounce">78%</span>
            </div>
            
            <div className="progress-bar">
              <div 
                className="progress-bar-fill bg-gradient-to-r from-lemon-mint to-electric-coral transition-all duration-1000 ease-out animate-lemon-pulse"
                style={{ width: '78%' }}
              ></div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
              <div className="flex justify-between">
                <span className="text-indigo-night/60">תכנון וחקר</span>
                <span className="text-success font-medium">✅ 100%</span>
              </div>
              <div className="flex justify-between">
                <span className="text-indigo-night/60">פיתוח ליבה</span>
                <span className="text-warning font-medium">🔄 85%</span>
              </div>
              <div className="flex justify-between">
                <span className="text-indigo-night/60">בדיקות ושיפור</span>
                <span className="text-electric-coral font-medium">⏳ 50%</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* הודעה מעודדת */}
      <div className="replayme-card-secondary p-8 border-r-4 border-lemon-mint">
        <div className="flex items-start space-x-6">
          <div className="w-16 h-16 bg-lemon-mint/30 rounded-2xl flex items-center justify-center flex-shrink-0 animate-lemon-pulse">
            <svg className="w-8 h-8 text-lemon-mint-dark" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
            </svg>
          </div>
          
          <div className="flex-1">
            <h3 className="text-display text-2xl font-bold text-indigo-night mb-4">
              בינתיים, המשיכו להתפתח! 💪
            </h3>
            <p className="text-lg text-indigo-night/70 leading-relaxed mb-6">
              עד שחדר הכושר יהיה מוכן, תוכלו להמשיך לשפר את הכישורים שלכם על ידי העלאה וניתוח של שיחות אמיתיות
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4">
              <Link 
                href="/upload" 
                className="replayme-button-primary"
              >
                <span className="flex items-center space-x-2">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                  </svg>
                  <span>העלה שיחה לניתוח</span>
                </span>
              </Link>
              
              <Link 
                href="/dashboard" 
                className="replayme-button-secondary"
              >
                <span className="flex items-center space-x-2">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                  </svg>
                  <span>חזרה לדשבורד</span>
                </span>
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* הודעת עדכונים */}
      <div className="glass-card p-6">
        <div className="text-center space-y-4">
          <div className="w-12 h-12 bg-indigo-night/10 rounded-xl flex items-center justify-center mx-auto">
            <svg className="w-6 h-6 text-indigo-night" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
            </svg>
          </div>
          <div>
            <h4 className="text-lg font-semibold text-indigo-night mb-2">
              💡 רוצים להיות הראשונים לדעת?
            </h4>
            <p className="text-indigo-night/70 text-sm">
              נשלח לכם הודעה ברגע שחדר הכושר יהיה מוכן להתנסות!
            </p>
          </div>
        </div>
      </div>
    </div>
  )
} 