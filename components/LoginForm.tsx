'use client'

import { useState, useEffect, useRef } from 'react'
import { Auth } from '@supabase/auth-ui-react'
import { ThemeSupa } from '@supabase/auth-ui-shared'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { AlertCircle, CheckCircle, User, Settings, Users, Crown, Loader2 } from 'lucide-react'
import { handleAuthError, createRateLimiter, debounce } from '@/lib/utils'

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
  
  // Rate limiting protection
  const isProcessingRef = useRef(false)
  const lastAuthAttemptRef = useRef(0)
  const retryCountRef = useRef(0)
  const maxRetries = 3
  
  // Create rate limiter instance
  const rateLimiter = useRef(createRateLimiter(3, 60000))

  // בדיקת שגיאות מ-URL
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search)
    const error = urlParams.get('error')
    
    if (error) {
      const errorMessages: { [key: string]: string } = {
        'auth_callback_error': 'שגיאה בהתחברות - אנא נסה שוב',
        'database_error': 'שגיאה במסד הנתונים - אנא נסה שוב מאוחר יותר',
        'creation_error': 'שגיאה ביצירת החשבון - אנא צור קשר עם התמיכה',
        'auth_exchange_error': 'שגיאה בחילוף אסימונים - אנא נסה שוב',
        'processing_error': 'שגיאה בעיבוד הבקשה - אנא נסה שוב',
        'rate_limit': 'יותר מדי ניסיונות התחברות - אנא המתן דקה ונסה שוב'
      }
      
      setAuthError(errorMessages[error] || 'שגיאה לא ידועה - אנא נסה שוב')
      
      // ניקוי השגיאה מה-URL
      const newUrl = window.location.pathname
      window.history.replaceState({}, '', newUrl)
    }
  }, [])

  const toggleView = () => {
    setView(view === 'sign_in' ? 'sign_up' : 'sign_in')
    setAuthError(null)
  }

  // פונקציה להתחברות עם תפקיד נבחר
  const loginWithRole = async () => {
    if (selectedRole === 'admin') {
      router.push('/dashboard')
    } else if (selectedRole === 'manager') {
      router.push('/dashboard/manager')
    } else {
      router.push('/dashboard/agent')
    }
    setShowRoleSelector(false)
  }

  // Rate limiting helper
  const checkRateLimit = () => {
    const now = Date.now()
    const timeSinceLastAttempt = now - lastAuthAttemptRef.current
    
    // Prevent multiple simultaneous requests
    if (isProcessingRef.current) {
      return false
    }
    
    // Rate limit: minimum 2 seconds between attempts
    if (timeSinceLastAttempt < 2000) {
      setAuthError('אנא המתן 2 שניות בין ניסיונות התחברות')
      return false
    }
    
    // Reset retry count if more than 30 seconds have passed
    if (timeSinceLastAttempt > 30000) {
      retryCountRef.current = 0
    }
    
    // Check if we've exceeded max retries
    if (retryCountRef.current >= maxRetries) {
      setAuthError('יותר מדי ניסיונות התחברות - אנא המתן 5 דקות ונסה שוב')
      return false
    }
    
    lastAuthAttemptRef.current = now
    retryCountRef.current++
    isProcessingRef.current = true
    return true
  }

  // מאזין לשינויים במצב ההתחברות
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log(`[AUTH] Event: ${event}`, { userEmail: session?.user?.email })
        setAuthStatus(`אירוע: ${event}`)

        if (event === 'SIGNED_IN' && session) {
          // Rate limiting check
          if (!checkRateLimit()) {
            return
          }
          
          setAuthLoading(true)
          setAuthError(null)
          setAuthStatus('מתחבר...')
          
          try {
            const currentEmail = session.user.email || '';
            console.log(`[AUTH] User signed in: ${currentEmail}`);
            
            // בדיקה מיוחדת לסופר אדמין
            const isSuperAdmin = currentEmail === 'ido.segev23@gmail.com';
            
            if (isSuperAdmin) {
              console.log("[AUTH] Super admin detected");
              
              // וידוא שהסופר אדמין קיים במסד הנתונים
              const { data: adminUser, error: adminError } = await supabase
                .from('users')
                .select('*')
                .eq('email', currentEmail)
                .maybeSingle();

              if (adminError) {
                console.error("[AUTH] Error checking super admin:", adminError);
                setAuthError(`שגיאה בבדיקת משתמש: ${adminError.message}`)
                setAuthLoading(false)
                isProcessingRef.current = false
                return;
              }

              if (!adminUser) {
                // יצירת סופר אדמין חדש
                const { error: createError } = await supabase
                  .from('users')
                  .insert({
                    id: session.user.id,
                    email: currentEmail,
                    role: 'admin',
                    full_name: session.user.user_metadata.full_name || 'Super Admin',
                    is_approved: true
                  });

                if (createError) {
                  console.error("[AUTH] Error creating super admin:", createError);
                  setAuthError(`שגיאה ביצירת מנהל: ${createError.message}`)
                  setAuthLoading(false)
                  isProcessingRef.current = false
                  return;
                }

                // הוספה לטבלת system_admins
                await supabase
                  .from('system_admins')
                  .upsert({ user_id: session.user.id });
              }
              
              setAuthLoading(false)
              setShowRoleSelector(true);
              isProcessingRef.current = false
              return;

            } else {
              // משתמש רגיל
              console.log("[AUTH] Regular user detected");
              const { data: userData, error: userError } = await supabase
                .from('users')
                .select('*')
                .eq('email', currentEmail)
                .maybeSingle();
              
              if (userError) {
                console.error("[AUTH] Error checking user:", userError);
                setAuthError(`שגיאה בבדיקת משתמש: ${userError.message}`)
                setAuthLoading(false)
                isProcessingRef.current = false
                return;
              }
              
              if (!userData) {
                // משתמש חדש - הפנייה לפלואו הרשמה מלא
                console.log("[AUTH] New user detected, redirecting to complete signup");
                router.push('/signup-complete');
                setAuthLoading(false)
                isProcessingRef.current = false
                return;
              }

              if (!userData.is_approved) {
                console.log("[AUTH] User not approved, redirecting to approval page");
                router.push('/not-approved');
                setAuthLoading(false)
                isProcessingRef.current = false
                return;
              }

              console.log("[AUTH] User approved, redirecting to dashboard");
              router.push('/dashboard');
              setAuthLoading(false)
              isProcessingRef.current = false
            }

          } catch (error: any) {
            console.error("[AUTH] Unexpected error:", error);
            
            // Handle rate limit errors specifically
            if (error.message?.includes('429') || error.message?.includes('rate limit')) {
              setAuthError('יותר מדי ניסיונות התחברות - אנא המתן דקה ונסה שוב')
              retryCountRef.current = maxRetries // Prevent further attempts
            } else {
              setAuthError('שגיאה בלתי צפויה - אנא נסה שוב')
            }
            
            setAuthLoading(false)
            isProcessingRef.current = false
          }
        }

        if (event === 'SIGNED_OUT') {
          setAuthError(null)
          setAuthLoading(false)
          setShowRoleSelector(false)
          isProcessingRef.current = false
          retryCountRef.current = 0
        }
      }
    )

    return () => subscription.unsubscribe()
  }, [router, supabase])

  const roleOptions = [
    { 
      value: 'admin' as Role, 
      label: 'מנהל מערכת', 
      description: 'גישה מלאה למערכת',
      icon: Crown,
      color: 'from-brand-primary to-brand-primary-light'
    },
    { 
      value: 'manager' as Role, 
      label: 'מנהל צוות', 
      description: 'ניהול נציגים וצפייה בדוחות',
      icon: Users,
      color: 'from-brand-secondary to-brand-secondary-light'
    },
    { 
      value: 'agent' as Role, 
      label: 'נציג מכירות', 
      description: 'העלאת שיחות וצפייה בביצועים',
      icon: User,
      color: 'from-brand-accent-dark to-brand-secondary'
    }
  ]

  return (
    <div className="space-y-6">
      {/* הודעת סטטוס */}
      {authLoading && (
        <div className="p-4 rounded-2xl bg-gradient-to-r from-brand-primary-light/10 to-brand-secondary-light/20 border border-brand-primary-light/20 animate-in slide-in-from-top duration-500">
          <div className="flex items-center gap-3 text-brand-primary-dark">
            <Loader2 className="w-5 h-5 animate-spin" />
            <span className="font-medium">{authStatus}</span>
          </div>
        </div>
      )}

      {/* הודעת שגיאה */}
      {authError && (
        <div className="p-4 rounded-2xl bg-gradient-to-r from-red-50 to-red-100 border border-red-200/50 animate-in slide-in-from-top duration-500">
          <div className="flex items-center gap-3 text-red-700">
            <AlertCircle className="w-5 h-5" />
            <span className="font-medium">{authError}</span>
          </div>
        </div>
      )}

      {/* בורר תפקידים לסופר אדמין */}
      {showRoleSelector && (
        <div className="space-y-6 animate-in slide-in-from-bottom duration-500">
          <div className="text-center space-y-2">
            <h3 className="text-xl font-bold text-neutral-900">בחר תפקיד להתחברות</h3>
            <p className="text-neutral-600">בחר את התפקיד שבו ברצונך להתחבר למערכת</p>
          </div>
          
          <div className="space-y-3">
            {roleOptions.map((role) => {
              const Icon = role.icon
              return (
                <button
                  key={role.value}
                  onClick={() => setSelectedRole(role.value)}
                  className={`w-full p-4 rounded-2xl border-2 transition-all duration-300 group hover:scale-[1.02] ${
                    selectedRole === role.value
                      ? 'border-brand-primary bg-gradient-to-r from-brand-primary-light/10 to-brand-secondary-light/20 shadow-lg shadow-brand-primary/20'
                      : 'border-neutral-200 bg-white hover:border-brand-primary-light hover:bg-brand-primary-light/5'
                  }`}
                >
                  <div className="flex items-center gap-4">
                    <div className={`p-3 rounded-xl bg-gradient-to-r ${role.color} shadow-lg`}>
                      <Icon className="w-6 h-6 text-white" />
                    </div>
                    <div className="flex-1 text-right">
                      <h4 className="font-bold text-neutral-900 group-hover:text-brand-primary-dark transition-colors">
                        {role.label}
                      </h4>
                      <p className="text-sm text-neutral-600 mt-1">
                        {role.description}
                      </p>
                    </div>
                    <div className={`w-5 h-5 rounded-full border-2 transition-all ${
                      selectedRole === role.value
                        ? 'border-brand-primary bg-brand-primary'
                        : 'border-neutral-300 group-hover:border-brand-primary-light'
                    }`}>
                      {selectedRole === role.value && (
                        <CheckCircle className="w-3 h-3 text-white m-0.5" />
                      )}
                    </div>
                  </div>
                </button>
              )
            })}
          </div>
          
          <button
            onClick={loginWithRole}
            className="w-full py-4 px-6 bg-gradient-to-r from-brand-primary to-brand-primary-light text-white rounded-2xl font-bold shadow-lg shadow-brand-primary/25 hover:shadow-xl hover:shadow-brand-primary/30 transition-all duration-300 hover:scale-[1.02] active:scale-[0.98]"
          >
            המשך עם התפקיד הנבחר
          </button>
        </div>
      )}

      {/* טופס התחברות/הרשמה */}
      {!showRoleSelector && (
        <div className="space-y-6">
          {/* כפתורי החלפה בין התחברות והרשמה */}
          <div className="flex p-1 bg-neutral-100 rounded-2xl shadow-inner">
            <button
              onClick={() => setView('sign_in')}
              className={`flex-1 py-3 px-4 rounded-xl text-sm font-bold transition-all duration-300 ${
                view === 'sign_in' 
                  ? 'bg-white text-brand-primary shadow-lg shadow-brand-primary/10' 
                  : 'text-neutral-600 hover:text-brand-primary'
              }`}
            >
              התחברות
            </button>
            <button
              onClick={() => setView('sign_up')}
              className={`flex-1 py-3 px-4 rounded-xl text-sm font-bold transition-all duration-300 ${
                view === 'sign_up' 
                  ? 'bg-white text-brand-primary shadow-lg shadow-brand-primary/10' 
                  : 'text-neutral-600 hover:text-brand-primary'
              }`}
            >
              הרשמה
            </button>
          </div>

          {/* Auth component עם עיצוב מעודכן */}
          <div className="auth-container">
            <Auth
              supabaseClient={supabase}
              view={view}
              appearance={{
                theme: ThemeSupa,
                variables: {
                  default: {
                    colors: {
                      brand: '#472DA6', // brand-primary
                      brandAccent: '#5336BF', // brand-primary-light
                      brandButtonText: 'white',
                      defaultButtonBackground: 'transparent',
                      defaultButtonBackgroundHover: '#F8FAFC',
                      defaultButtonBorder: '#E2E8F0',
                      defaultButtonText: '#334155',
                      dividerBackground: '#E2E8F0',
                      inputBackground: 'white',
                      inputBorder: '#CBD5E1',
                      inputBorderHover: '#472DA6',
                      inputBorderFocus: '#472DA6',
                      inputText: '#0F172A',
                      inputLabelText: '#475569',
                      inputPlaceholder: '#94A3B8',
                      messageText: '#EF4444',
                      messageTextDanger: '#EF4444',
                      anchorTextColor: '#472DA6',
                      anchorTextHoverColor: '#5336BF',
                    },
                    space: {
                      spaceSmall: '6px',
                      spaceMedium: '12px',
                      spaceLarge: '20px',
                      labelBottomMargin: '8px',
                      anchorBottomMargin: '6px',
                      emailInputSpacing: '6px',
                      socialAuthSpacing: '6px',
                      buttonPadding: '14px 20px',
                      inputPadding: '14px 20px',
                    },
                    fontSizes: {
                      baseBodySize: '15px',
                      baseInputSize: '15px',
                      baseLabelSize: '14px',
                      baseButtonSize: '15px',
                    },
                    fonts: {
                      bodyFontFamily: `Inter, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`,
                      buttonFontFamily: `Inter, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`,
                      inputFontFamily: `Inter, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`,
                      labelFontFamily: `Inter, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`,
                    },
                    borderWidths: {
                      buttonBorderWidth: '1px',
                      inputBorderWidth: '1px',
                    },
                    radii: {
                      borderRadiusButton: '1rem',
                      buttonBorderRadius: '1rem',
                      inputBorderRadius: '1rem',
                    },
                  },
                },
                style: {
                  button: {
                    border: '1px solid #E2E8F0',
                    borderRadius: '1rem',
                    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
                    fontWeight: '600',
                    transition: 'all 0.2s ease-in-out',
                  },
                  anchor: {
                    color: '#472DA6',
                    textDecoration: 'none',
                    fontWeight: '500',
                  },
                  container: {
                    direction: 'rtl',
                  },
                  input: {
                    border: '1px solid #CBD5E1',
                    borderRadius: '1rem',
                    direction: 'rtl',
                    boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
                    transition: 'all 0.2s ease-in-out',
                  },
                  label: {
                    color: '#475569',
                    direction: 'rtl',
                    textAlign: 'right',
                    fontWeight: '500',
                  },
                  message: {
                    color: '#EF4444',
                    direction: 'rtl',
                    textAlign: 'right',
                    fontWeight: '500',
                  },
                },
              }}
              localization={{
                variables: {
                  sign_in: {
                    email_label: 'כתובת אימייל',
                    password_label: 'סיסמה',
                    email_input_placeholder: 'הכנס את כתובת האימייל שלך',
                    password_input_placeholder: 'הכנס את הסיסמה שלך',
                    button_label: 'התחבר',
                    loading_button_label: 'מתחבר...',
                    social_provider_text: 'התחבר עם {{provider}}',
                    link_text: 'יש לך כבר חשבון? התחבר',
                  },
                  sign_up: {
                    email_label: 'כתובת אימייל',
                    password_label: 'סיסמה',
                    email_input_placeholder: 'הכנס את כתובת האימייל שלך',
                    password_input_placeholder: 'הכנס סיסמה',
                    button_label: 'הירשם',
                    loading_button_label: 'נרשם...',
                    social_provider_text: 'הירשם עם {{provider}}',
                    link_text: 'אין לך חשבון? הירשם',
                  },
                  forgotten_password: {
                    email_label: 'כתובת אימייל',
                    password_label: 'סיסמה',
                    email_input_placeholder: 'הכנס את כתובת האימייל שלך',
                    button_label: 'שלח הוראות איפוס',
                    loading_button_label: 'שולח הוראות איפוס...',
                    link_text: 'שכחת את הסיסמה?',
                  },
                },
              }}
              providers={[]}
              redirectTo={`${window.location.origin}/api/auth/callback`}
              onlyThirdPartyProviders={false}
              magicLink={false}
              showLinks={true}
            />
          </div>
        </div>
      )}
    </div>
  )
} 