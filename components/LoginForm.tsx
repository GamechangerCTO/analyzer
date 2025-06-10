'use client'

import { useState, useEffect } from 'react'
import { Auth } from '@supabase/auth-ui-react'
import { ThemeSupa } from '@supabase/auth-ui-shared'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

// טיפוסים
type Role = 'admin' | 'manager' | 'agent';

export default function LoginForm() {
  const [view, setView] = useState<'sign_in' | 'sign_up'>('sign_in')
  const supabase = createClient()
  const router = useRouter()
  const [showRoleSelector, setShowRoleSelector] = useState(false)
  const [selectedRole, setSelectedRole] = useState<Role>('admin')
  const [authError, setAuthError] = useState<string | null>(null)
  const [authLoading, setAuthLoading] = useState(false)
  const [authStatus, setAuthStatus] = useState<string>('מוכן להתחברות')

  const toggleView = () => {
    setView(view === 'sign_in' ? 'sign_up' : 'sign_in')
    setAuthError(null) // ניקוי שגיאות בעת מעבר בין מצבים
  }

  // פונקציה להתחברות עם תפקיד נבחר
  const loginWithRole = async () => {
    // ניתוב למסך המתאים לפי התפקיד הנבחר
    if (selectedRole === 'admin') {
      router.push('/dashboard')
    } else if (selectedRole === 'manager') {
      router.push('/dashboard/manager')
    } else {
      router.push('/dashboard/agent')
    }
    
    setShowRoleSelector(false)
  }

  // מאזין לשינויים במצב ההתחברות ומנתב אם יש משתמש מחובר
  useEffect(() => {
    // הוספת לוגים למעקב אחר טפסי התחברות
    const handleFormSubmit = (e: Event) => {
      console.log('[FORM] Form submitted:', e)
      const form = e.target as HTMLFormElement
      if (form) {
        const formData = new FormData(form)
        console.log('[FORM] Form data:', Object.fromEntries(formData.entries()))
      }
    }

    const handleFormError = (e: Event) => {
      console.log('[FORM] Form error:', e)
    }

    // הוספת listeners לטפסים
    document.addEventListener('submit', handleFormSubmit)
    document.addEventListener('error', handleFormError)

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log(`[AUTH] Event: ${event}`, { session: session?.user?.email })
        setAuthStatus(`אירוע: ${event}`)

        if (event === 'SIGNED_IN' && session) {
          setAuthLoading(true)
          setAuthError(null)
          setAuthStatus('מתחבר...')
          
          try {
            const currentEmail = session.user.email || '';
            // הדפסה של האימייל כפי שהוא מתקבל מהסשן
            console.log(`[onAuthStateChange] Email from session: "${currentEmail}"`); 
            console.log(`[onAuthStateChange] Hardcoded admin email: "ido.segev23@gmail.com"`);
            
            const isSuperAdminEmail = currentEmail === 'ido.segev23@gmail.com';
            // הדפסה של תוצאת ההשוואה
            console.log(`[onAuthStateChange] Is Super Admin Email? ${isSuperAdminEmail}`); 

            if (isSuperAdminEmail) {
              console.log("[onAuthStateChange] Super admin email detected (inside if).");
              const { data: adminUserData, error: adminCheckError } = await supabase
                .from('users')
                .select('id, role, is_approved, full_name, avatar_url')
                .eq('email', currentEmail)
                .maybeSingle();

              if (adminCheckError) {
                console.error("[onAuthStateChange] Error checking existing super admin user:", adminCheckError);
                setAuthError(`שגיאה בבדיקת משתמש: ${adminCheckError.message}`)
                setAuthLoading(false)
                return;
              }

              if (!adminUserData) {
                console.log("[onAuthStateChange] Super admin is new. Creating records...");
                // Create in public.users
                const { error: insertUserError } = await supabase
                  .from('users')
                  .insert({
                    id: session.user.id,
                    email: currentEmail,
                    role: 'admin',
                    full_name: session.user.user_metadata.full_name || session.user.user_metadata.name || null,
                    avatar_url: session.user.user_metadata.avatar_url || session.user.user_metadata.picture || null,
                    is_approved: true
                  });

                if (insertUserError) {
                  console.error("[onAuthStateChange] Error creating super admin in users table:", insertUserError);
                  setAuthError(`שגיאה ביצירת משתמש: ${insertUserError.message}`)
                  setAuthLoading(false)
                  return;
                }
                console.log("[onAuthStateChange] Super admin created in users table.");

                // Create in system_admins if it doesn't exist (should not happen for a truly new user, but good practice)
                const { error: insertSystemAdminError } = await supabase
                  .from('system_admins')
                  .upsert({ user_id: session.user.id }, { onConflict: 'user_id' }); // Use upsert to avoid error if exists

                if (insertSystemAdminError) {
                  console.error("[onAuthStateChange] Error creating super admin in system_admins table:", insertSystemAdminError);
                  setAuthError(`שגיאה ביצירת מנהל מערכת: ${insertSystemAdminError.message}`)
                  setAuthLoading(false)
                  return;
                }
                console.log("[onAuthStateChange] Super admin ensured in system_admins table.");

              } else { // Super admin user already exists in public.users
                console.log("[onAuthStateChange] Super admin already exists in users table. Checking/updating status...");
                if (adminUserData.role !== 'admin' || !adminUserData.is_approved) {
                  console.log("[onAuthStateChange] Super admin record needs update. Updating role and approval...");
                  const { error: updateUserError } = await supabase
                    .from('users')
                    .update({ 
                      role: 'admin', 
                      is_approved: true,
                      full_name: session.user.user_metadata.full_name || session.user.user_metadata.name || adminUserData.full_name,
                      avatar_url: session.user.user_metadata.avatar_url || session.user.user_metadata.picture || adminUserData.avatar_url
                    })
                    .eq('id', session.user.id);
                  if (updateUserError) {
                    console.error("[onAuthStateChange] Error updating super admin record:", updateUserError);
                    setAuthError(`שגיאה בעדכון משתמש: ${updateUserError.message}`)
                    setAuthLoading(false)
                    return;
                  }
                  console.log("[onAuthStateChange] Super admin record updated.");
                }

                // Ensure entry in system_admins
                const { error: upsertSystemAdminError } = await supabase
                  .from('system_admins')
                  .upsert({ user_id: session.user.id }, { onConflict: 'user_id' });
                
                if (upsertSystemAdminError) {
                  console.error("[onAuthStateChange] Error upserting super admin in system_admins table:", upsertSystemAdminError);
                  setAuthError(`שגיאה בעדכון מנהל מערכת: ${upsertSystemAdminError.message}`)
                  setAuthLoading(false)
                  return;
                }
                console.log("[onAuthStateChange] Super admin ensured in system_admins table (on existing user).");
              }
              
              console.log("[onAuthStateChange] Attempting to show role selector for super admin.");
              setAuthLoading(false)
              setShowRoleSelector(true); // Show role selector for super admin
              return;

            } else { // Regular user
              console.log("[onAuthStateChange] Regular user detected (inside else).");
              const { data: userData, error: userCheckError } = await supabase
                .from('users')
                .select('id, role, is_approved, full_name, avatar_url')
                .eq('email', currentEmail) // Check by email for new registrations
                .maybeSingle();
              
              if (userCheckError) {
                console.error("[onAuthStateChange] Error checking existing regular user:", userCheckError);
                setAuthError(`שגיאה בבדיקת משתמש: ${userCheckError.message}`)
                setAuthLoading(false)
                return;
              }
              
              if (!userData) {
                console.log("[onAuthStateChange] Regular user is new. Creating record (pending approval)...");
                const { error: insertError } = await supabase
                  .from('users')
                  .insert({
                    id: session.user.id,
                    email: currentEmail,
                    role: 'agent', 
                    full_name: session.user.user_metadata.full_name || session.user.user_metadata.name || null,
                    avatar_url: session.user.user_metadata.avatar_url || session.user.user_metadata.picture || null,
                    is_approved: false 
                  });
                
                if (insertError) {
                  console.error("[onAuthStateChange] Error creating regular user:", insertError);
                  setAuthError(`שגיאה ביצירת משתמש: ${insertError.message}`)
                  setAuthLoading(false)
                  return;
                }
                console.log("[onAuthStateChange] Redirecting new regular user to /not-approved?reason=pending");
                router.push('/not-approved?reason=pending');
                return;
              }
              
              if (!userData.is_approved) {
                console.log("[onAuthStateChange] Regular user is not approved. Redirecting to /not-approved?reason=pending");
                router.push('/not-approved?reason=pending');
                return;
              }
              
              console.log(`[onAuthStateChange] Approved regular user. Role: ${userData.role}. Redirecting...`);
              setAuthLoading(false)
              
              // דיבוג נוסף לבדיקת session ו-cookies
              console.log('[DEBUG] Current session check before redirect...')
              const { data: currentSession } = await supabase.auth.getSession()
              console.log('[DEBUG] Session data:', {
                hasSession: !!currentSession.session,
                userId: currentSession.session?.user?.id,
                userEmail: currentSession.session?.user?.email,
                expiresAt: currentSession.session?.expires_at,
                accessToken: currentSession.session?.access_token ? 'Present' : 'Missing'
              })
              
              // בדיקת cookies ידנית
              console.log('[DEBUG] Document cookies:', document.cookie)
              console.log('[DEBUG] Available storage:', {
                localStorage: typeof(Storage) !== 'undefined',
                sessionStorage: typeof(Storage) !== 'undefined'
              })
              
              console.log('[DEBUG] About to redirect immediately...')
              // ניסיון ניתוב ישיר ראשון
              if (userData.role === 'admin') { // This case should ideally not be hit if not super admin email
                console.log('[DEBUG] Redirecting to /dashboard')
                router.push('/dashboard');
              } else if (userData.role === 'manager' || userData.role === 'owner') {
                console.log('[DEBUG] Redirecting to /dashboard/manager')
                router.push('/dashboard/manager');
              } else { // agent
                console.log('[DEBUG] Redirecting to /dashboard/agent')
                router.push('/dashboard/agent');
              }
              
              // גיבוי - אם הניתוב הישיר לא עבד, נסה עם timeout
              setTimeout(async () => {
                console.log('[DEBUG] Backup timeout redirect executing...')
                
                // בדיקה נוספת של session לפני גיבוי
                const { data: backupSession } = await supabase.auth.getSession()
                console.log('[DEBUG] Backup session check:', {
                  hasSession: !!backupSession.session,
                  userId: backupSession.session?.user?.id
                })
                
                if (userData.role === 'admin') {
                  console.log('[DEBUG] Backup redirect to /dashboard')
                  window.location.href = '/dashboard';
                } else if (userData.role === 'manager' || userData.role === 'owner') {
                  console.log('[DEBUG] Backup redirect to /dashboard/manager')
                  window.location.href = '/dashboard/manager';
                } else { // agent
                  console.log('[DEBUG] Backup redirect to /dashboard/agent')
                  window.location.href = '/dashboard/agent';
                }
              }, 1000)
            }
          } catch (error) {
            console.error("[onAuthStateChange] Error in auth state change handler:", error);
            setAuthError(`שגיאה בעיבוד התחברות: ${error instanceof Error ? error.message : 'שגיאה לא ידועה'}`)
            setAuthLoading(false)
            // Fallback redirect, consider a more specific error page
            router.push('/login?error=auth_handler_failed'); 
          }
        } else if (event === 'SIGNED_OUT') {
          console.log("[onAuthStateChange] User signed out. Redirecting to login.");
          setShowRoleSelector(false); // Hide role selector on sign out
          setAuthError(null)
          setAuthLoading(false)
          setAuthStatus('מוכן להתחברות')
          router.push('/login');
        } else if (event === 'TOKEN_REFRESHED') {
          console.log("[AUTH] Token refreshed successfully")
          setAuthStatus('טוקן רועען')
        } else if (event === 'USER_UPDATED') {
          console.log("[AUTH] User updated")
          setAuthStatus('משתמש עודכן')
        } else {
          // כל אירוע אחר
          console.log(`[AUTH] Other auth event: ${event}`)
          setAuthStatus(`סטטוס: ${event}`)
        }
      }
    )
    
    // ניקוי ה-listeners כשהקומפוננטה נהרסת
    return () => {
      subscription.unsubscribe()
      document.removeEventListener('submit', handleFormSubmit)
      document.removeEventListener('error', handleFormError)
    }
  }, [supabase, router])

  // פונקציה לבדיקת התחברות ישירה (לצרכי debug)
  const testDirectLogin = async () => {
    setAuthLoading(true)
    setAuthError(null)
    setAuthStatus('בודק התחברות ישירה...')
    
    try {
      console.log('[DEBUG] Testing direct email/password login...')
      
      // נסה התחברות עם פרטים לדוגמה
      const { data, error } = await supabase.auth.signInWithPassword({
        email: 'test@example.com',
        password: 'test123456'
      })
      
      console.log('[DEBUG] Login result:', { data, error })
      
      if (error) {
        console.error('[DEBUG] Login error:', error)
        setAuthError(`שגיאה בהתחברות ישירה: ${error.message}`)
      } else {
        console.log('[DEBUG] Login successful:', data)
        setAuthStatus('התחברות ישירה הצליחה!')
      }
    } catch (err) {
      console.error('[DEBUG] Exception during login:', err)
      setAuthError(`שגיאה לא צפויה: ${err instanceof Error ? err.message : 'שגיאה לא ידועה'}`)
    } finally {
      setAuthLoading(false)
    }
  }

  // פונקציה לבדיקת הרשמה (לצרכי debug)
  const testDirectSignup = async () => {
    setAuthLoading(true)
    setAuthError(null)
    setAuthStatus('בודק הרשמה ישירה...')
    
    try {
      console.log('[DEBUG] Testing direct email/password signup...')
      
      const testEmail = `test-${Date.now()}@example.com`
      const testPassword = 'TestPassword123!'
      
      // נסה הרשמה עם פרטים לדוגמה
      const { data, error } = await supabase.auth.signUp({
        email: testEmail,
        password: testPassword
      })
      
      console.log('[DEBUG] Signup result:', { data, error })
      
      if (error) {
        console.error('[DEBUG] Signup error:', error)
        setAuthError(`שגיאה בהרשמה ישירה: ${error.message}`)
      } else {
        console.log('[DEBUG] Signup successful:', data)
        setAuthStatus('הרשמה ישירה הצליחה! בדוק אימיילים.')
      }
    } catch (err) {
      console.error('[DEBUG] Exception during signup:', err)
      setAuthError(`שגיאה לא צפויה בהרשמה: ${err instanceof Error ? err.message : 'שגיאה לא ידועה'}`)
    } finally {
      setAuthLoading(false)
    }
  }

  // פונקציה לבדיקת מצב המערכת
  const checkSystemStatus = async () => {
    setAuthLoading(true)
    setAuthError(null)
    setAuthStatus('בודק מצב מערכת...')
    
    try {
      console.log('[DEBUG] Checking system status...')
      
      // בדיקת חיבור ל-Supabase
      const { data: sessionData, error: sessionError } = await supabase.auth.getSession()
      console.log('[DEBUG] Current session:', { sessionData, sessionError })
      
      // בדיקת חיבור למסד הנתונים
      const { data: testQuery, error: queryError } = await supabase
        .from('users')
        .select('count')
        .limit(1)
      
      console.log('[DEBUG] DB connection test:', { testQuery, queryError })
      
      setAuthStatus('מערכת תקינה!')
    } catch (err) {
      console.error('[DEBUG] System check error:', err)
      setAuthError(`שגיאה בבדיקת מערכת: ${err instanceof Error ? err.message : 'שגיאה לא ידועה'}`)
    } finally {
      setAuthLoading(false)
    }
  }

  return (
    <div className="flex flex-col gap-6">
      {/* הצגת שגיאות אותנטיקציה */}
      {authError && (
        <div className="replayme-card p-4 bg-electric-coral/10 border border-electric-coral/30">
          <div className="flex items-center space-x-3">
            <svg className="w-5 h-5 text-electric-coral flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
            <div className="text-sm text-electric-coral font-medium">{authError}</div>
          </div>
        </div>
      )}

      {/* הצגת סטטוס טעינה */}
      {authLoading && (
        <div className="replayme-card p-4 bg-lemon-mint/10 border border-lemon-mint/30">
          <div className="flex items-center space-x-3">
            <div className="w-5 h-5 border-2 border-lemon-mint-dark border-t-transparent rounded-full animate-spin flex-shrink-0"></div>
            <div className="text-sm text-lemon-mint-dark font-medium">{authStatus}</div>
          </div>
        </div>
      )}

      {/* חלון בחירת תפקיד */}
      {showRoleSelector && (
        <div className="fixed inset-0 flex items-center justify-center bg-indigo-night/60 backdrop-blur-sm z-50">
          <div className="replayme-card p-8 w-full max-w-md mx-4 animate-scale-in">
            <div className="text-center mb-6">
              <div className="w-16 h-16 bg-lemon-mint/20 rounded-full flex items-center justify-center mx-auto mb-4 animate-lemon-pulse">
                <svg className="w-8 h-8 text-lemon-mint-dark" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
              </div>
              <h2 className="text-2xl font-bold text-indigo-night mb-2 text-display">בחר תפקיד להתחברות</h2>
              <p className="text-indigo-night/60 text-sm">איזה חדר אימון תרצה להיכנס אליו?</p>
            </div>
            
            <div className="space-y-3">
              <button 
                onClick={() => setSelectedRole('admin')}
                className={`w-full py-4 px-6 rounded-lg text-right transition-all duration-200 flex items-center space-x-3 ${
                  selectedRole === 'admin' 
                    ? 'bg-lemon-mint text-indigo-night shadow-replayme border-2 border-lemon-mint-dark' 
                    : 'bg-cream-sand hover:bg-cream-sand-dark text-indigo-night border-2 border-transparent hover:border-ice-gray'
                }`}
              >
                <div className="flex-1">
                  <div className="font-semibold">מנהל מערכת</div>
                  <div className="text-xs opacity-70">שליטה מלאה במערכת</div>
                </div>
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                </svg>
              </button>
              
              <button 
                onClick={() => setSelectedRole('manager')}
                className={`w-full py-4 px-6 rounded-lg text-right transition-all duration-200 flex items-center space-x-3 ${
                  selectedRole === 'manager' 
                    ? 'bg-lemon-mint text-indigo-night shadow-replayme border-2 border-lemon-mint-dark' 
                    : 'bg-cream-sand hover:bg-cream-sand-dark text-indigo-night border-2 border-transparent hover:border-ice-gray'
                }`}
              >
                <div className="flex-1">
                  <div className="font-semibold">מנהל צוות</div>
                  <div className="text-xs opacity-70">ניהול נציגים ודוחות</div>
                </div>
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </button>
              
              <button 
                onClick={() => setSelectedRole('agent')}
                className={`w-full py-4 px-6 rounded-lg text-right transition-all duration-200 flex items-center space-x-3 ${
                  selectedRole === 'agent' 
                    ? 'bg-lemon-mint text-indigo-night shadow-replayme border-2 border-lemon-mint-dark' 
                    : 'bg-cream-sand hover:bg-cream-sand-dark text-indigo-night border-2 border-transparent hover:border-ice-gray'
                }`}
              >
                <div className="flex-1">
                  <div className="font-semibold">נציג מכירות</div>
                  <div className="text-xs opacity-70">אימון אישי וסימולציות</div>
                </div>
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                </svg>
              </button>
            </div>
            
            <div className="mt-8 flex justify-center">
              <button 
                onClick={loginWithRole}
                className="replayme-button-primary px-8 py-3"
              >
                <span className="flex items-center space-x-2">
                  <span>כניסה לחדר הכושר</span>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
                  </svg>
                </span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* הצגת שגיאות אותנטיקציה */}
      {authError && (
        <div className="mb-4 p-4 rounded-xl border-r-4 bg-electric-coral/10 border-electric-coral">
          <div className="flex items-center">
            <svg className="w-5 h-5 text-electric-coral ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
            <div>
              <p className="text-sm font-medium text-electric-coral">שגיאה בהתחברות</p>
              <p className="text-xs text-indigo-night/70 mt-1">{authError}</p>
            </div>
          </div>
        </div>
      )}

      {/* הצגת סטטוס התחברות */}
      {authStatus !== 'מוכן להתחברות' && (
        <div className="mb-4 p-3 rounded-lg bg-cream-sand text-center">
          <p className="text-sm text-indigo-night/70">{authStatus}</p>
        </div>
      )}

      {/* Debug Panel - מסיר בייצור */}
      {process.env.NODE_ENV === 'development' && (
        <div className="mb-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
          <h3 className="text-sm font-medium text-yellow-800 mb-2">🔧 Debug Panel</h3>
          <div className="space-y-2">
            <button
              onClick={testDirectLogin}
              disabled={authLoading}
              className="px-3 py-1 bg-yellow-200 text-yellow-800 rounded text-xs hover:bg-yellow-300 disabled:opacity-50"
            >
              בדוק התחברות ישירה
            </button>
            <button
              onClick={testDirectSignup}
              disabled={authLoading}
              className="px-3 py-1 bg-yellow-200 text-yellow-800 rounded text-xs hover:bg-yellow-300 disabled:opacity-50"
            >
              בדוק הרשמה ישירה
            </button>
            <button
              onClick={checkSystemStatus}
              disabled={authLoading}
              className="px-3 py-1 bg-yellow-200 text-yellow-800 rounded text-xs hover:bg-yellow-300 disabled:opacity-50"
            >
              בדוק מצב מערכת
            </button>
            <div className="text-xs text-yellow-700">
              Auth Status: {authStatus}
            </div>
          </div>
        </div>
      )}

      {/* כפתורי בחירת מצב */}
      <div className="flex rounded-lg bg-cream-sand p-1 mb-4">
        <button
          onClick={() => setView('sign_in')}
          className={`flex-1 px-4 py-3 rounded-md transition-all duration-200 font-medium ${
            view === 'sign_in' 
              ? 'bg-white text-indigo-night shadow-soft' 
              : 'text-indigo-night/70 hover:text-indigo-night'
          }`}
        >
          התחברות
        </button>
        <button
          onClick={() => setView('sign_up')}
          className={`flex-1 px-4 py-3 rounded-md transition-all duration-200 font-medium ${
            view === 'sign_up' 
              ? 'bg-white text-indigo-night shadow-soft' 
              : 'text-indigo-night/70 hover:text-indigo-night'
          }`}
        >
          הרשמה
        </button>
      </div>

      <Auth
        supabaseClient={supabase}
        view={view}
        onlyThirdPartyProviders={false}
        magicLink={true}
        showLinks={true}
        appearance={{
          theme: ThemeSupa,
          variables: {
            default: {
              colors: {
                brand: '#C6F547', // lemon-mint
                brandAccent: '#A8D12F', // lemon-mint-dark
                defaultButtonBackground: '#F5F2EB', // cream-sand
                defaultButtonBackgroundHover: '#E8E2D6', // cream-sand-dark
                defaultButtonBorder: '#E1E1E1', // ice-gray
                defaultButtonText: '#2A2D4A', // indigo-night
                dividerBackground: '#E1E1E1', // ice-gray
                inputBackground: 'white',
                inputBorder: '#E1E1E1', // ice-gray
                inputBorderHover: '#C6F547', // lemon-mint
                inputBorderFocus: '#C6F547', // lemon-mint
                inputText: '#2A2D4A', // indigo-night
                inputLabelText: '#2A2D4A', // indigo-night
                inputPlaceholder: '#6B7280', // gray-500
                messageText: '#2A2D4A', // indigo-night
                messageTextDanger: '#FF6B6B', // electric-coral
                anchorTextColor: '#2A2D4A', // indigo-night
                anchorTextHoverColor: '#C6F547', // lemon-mint
              },
              space: {
                spaceSmall: '4px',
                spaceMedium: '8px',
                spaceLarge: '16px',
                labelBottomMargin: '8px',
                anchorBottomMargin: '4px',
                emailInputSpacing: '4px',
                socialAuthSpacing: '4px',
                buttonPadding: '12px 16px',
                inputPadding: '12px 16px',
              },
              borderWidths: {
                buttonBorderWidth: '1px',
                inputBorderWidth: '1px',
              },
              radii: {
                borderRadiusButton: '8px',
                buttonBorderRadius: '8px',
                inputBorderRadius: '8px',
              },
              fonts: {
                bodyFontFamily: 'Inter, sans-serif',
                buttonFontFamily: 'Inter, sans-serif',
                inputFontFamily: 'Inter, sans-serif',
                labelFontFamily: 'Inter, sans-serif',
              },
            },
          },
          style: {
            button: {
              borderRadius: '8px',
              height: '48px',
              fontSize: '14px',
              fontWeight: '500',
              transition: 'all 0.2s ease-in-out',
            },
            input: {
              borderRadius: '8px',
              height: '48px',
              fontSize: '14px',
              transition: 'all 0.2s ease-in-out',
            },
            container: {
              direction: 'rtl',
            },
            label: {
              direction: 'rtl',
              textAlign: 'right',
              fontSize: '14px',
              fontWeight: '500',
              color: '#2A2D4A',
            },
            message: {
              direction: 'rtl',
              textAlign: 'right',
              fontSize: '13px',
            },
            divider: {
              background: '#E1E1E1',
              textAlign: 'center',
            },
            anchor: {
              fontWeight: '500',
              textDecoration: 'none',
            },
          },
        }}
        localization={{
          variables: {
            sign_in: {
              email_label: 'אימייל',
              password_label: 'סיסמה',
              button_label: 'התחבר',
              social_provider_text: 'התחבר באמצעות {{provider}}',
              link_text: 'כבר יש לך חשבון? התחבר',
              loading_button_label: 'מתחבר...',
            },
            sign_up: {
              email_label: 'אימייל',
              password_label: 'סיסמה',
              button_label: 'הירשם',
              social_provider_text: 'הירשם באמצעות {{provider}}',
              link_text: 'אין לך חשבון? הירשם',
              loading_button_label: 'נרשם...',
            },
            forgotten_password: {
              email_label: 'אימייל',
              password_label: 'סיסמה',
              button_label: 'שלח הוראות איפוס סיסמה',
              link_text: 'שכחת סיסמה?',
              loading_button_label: 'שולח...',
            },
          },
        }}
        providers={['google']}
        redirectTo={`${typeof window !== 'undefined' ? window.location.origin : ''}/api/auth/callback`}
      />
    </div>
  )
} 