'use client'

import { useState, useEffect, useRef } from 'react'
import { Auth } from '@supabase/auth-ui-react'
import { ThemeSupa } from '@supabase/auth-ui-shared'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { AlertCircle, CheckCircle, User, Users, Crown, Loader2 } from 'lucide-react'
import { handleAuthError, createRateLimiter } from '@/lib/utils'

type Role = 'admin' | 'manager' | 'agent'

export default function LoginForm() {
  const [view, setView] = useState<'sign_in' | 'sign_up'>('sign_in')
  const supabase = createClient()
  const router = useRouter()
  const [showRoleSelector, setShowRoleSelector] = useState(false)
  const [selectedRole, setSelectedRole] = useState<Role>('admin')
  const [authError, setAuthError] = useState<string | null>(null)
  const [authLoading, setAuthLoading] = useState(false)
  const [authStatus, setAuthStatus] = useState<string>('מוכן להתחברות')
  
  const isProcessingRef = useRef(false)
  const lastAuthAttemptRef = useRef(0)
  const retryCountRef = useRef(0)
  const maxRetries = 3
  const rateLimiter = useRef(createRateLimiter(3, 60000))

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search)
    const error = urlParams.get('error')
    
    if (error) {
      const errorMessages: { [key: string]: string } = {
        'auth_callback_error': 'שגיאה בהתחברות - אנא נסה שוב',
        'database_error': 'שגיאה במסד הנתונים - אנא נסה שוב מאוחר יותר',
        'creation_error': 'שגיאה ביצירת החשבון - אנא צור קשר עם התמיכה',
        'rate_limit': 'יותר מדי ניסיונות התחברות - אנא המתן דקה'
      }
      
      setAuthError(errorMessages[error] || 'שגיאה לא ידועה - אנא נסה שוב')
      const newUrl = window.location.pathname
      window.history.replaceState({}, '', newUrl)
    }
  }, [])

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

  const checkRateLimit = () => {
    const now = Date.now()
    const timeSinceLastAttempt = now - lastAuthAttemptRef.current
    
    if (isProcessingRef.current) return false
    if (timeSinceLastAttempt < 2000) {
      setAuthError('אנא המתן 2 שניות בין ניסיונות התחברות')
      return false
    }
    if (timeSinceLastAttempt > 30000) retryCountRef.current = 0
    if (retryCountRef.current >= maxRetries) {
      setAuthError('יותר מדי ניסיונות התחברות - אנא המתן 5 דקות')
      return false
    }
    
    lastAuthAttemptRef.current = now
    retryCountRef.current++
    isProcessingRef.current = true
    return true
  }

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        setAuthStatus(`אירוע: ${event}`)

        if (event === 'SIGNED_IN' && session) {
          if (!checkRateLimit()) return
          
          setAuthLoading(true)
          setAuthError(null)
          setAuthStatus('מתחבר...')
          
          try {
            const currentEmail = session.user.email || ''
            const isSuperAdmin = currentEmail === 'ido.segev23@gmail.com'
            
            if (isSuperAdmin) {
              const { data: adminUser, error: adminError } = await supabase
                .from('users')
                .select('*')
                .eq('email', currentEmail)
                .maybeSingle()

              if (adminError) {
                setAuthError(`שגיאה בבדיקת משתמש: ${adminError.message}`)
                setAuthLoading(false)
                isProcessingRef.current = false
                return
              }

              if (!adminUser) {
                const { error: createError } = await supabase
                  .from('users')
                  .insert({
                    id: session.user.id,
                    email: currentEmail,
                    role: 'admin',
                    full_name: session.user.user_metadata.full_name || 'Super Admin',
                    is_approved: true
                  })

                if (createError) {
                  setAuthError(`שגיאה ביצירת מנהל: ${createError.message}`)
                  setAuthLoading(false)
                  isProcessingRef.current = false
                  return
                }

                await supabase.from('system_admins').upsert({ user_id: session.user.id })
              }
              
              setAuthLoading(false)
              setShowRoleSelector(true)
              isProcessingRef.current = false
              return
            } else {
              const { data: userData, error: userError } = await supabase
                .from('users')
                .select('*')
                .eq('email', currentEmail)
                .maybeSingle()
              
              if (userError) {
                setAuthError(`שגיאה בבדיקת משתמש: ${userError.message}`)
                setAuthLoading(false)
                isProcessingRef.current = false
                return
              }
              
              if (!userData) {
                router.push('/signup-complete')
                setAuthLoading(false)
                isProcessingRef.current = false
                return
              }

              if (!userData.is_approved) {
                router.push('/not-approved')
                setAuthLoading(false)
                isProcessingRef.current = false
                return
              }

              router.push('/dashboard')
              setAuthLoading(false)
              isProcessingRef.current = false
            }

          } catch (error: any) {
            if (error.message?.includes('429') || error.message?.includes('rate limit')) {
              setAuthError('יותר מדי ניסיונות - אנא המתן דקה')
              retryCountRef.current = maxRetries
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
    { value: 'admin' as Role, label: 'מנהל מערכת', description: 'גישה מלאה למערכת', icon: Crown, color: 'bg-brand-primary' },
    { value: 'manager' as Role, label: 'מנהל צוות', description: 'ניהול נציגים וצפייה בדוחות', icon: Users, color: 'bg-brand-secondary' },
    { value: 'agent' as Role, label: 'נציג מכירות', description: 'העלאת שיחות וצפייה בביצועים', icon: User, color: 'bg-amber-500' }
  ]

  return (
    <div className="space-y-4">
      {/* Loading Status */}
      {authLoading && (
        <div className="bg-brand-primary/5 border border-brand-primary/20 rounded-xl p-4">
          <div className="flex items-center gap-3 text-brand-primary">
            <Loader2 className="w-5 h-5 animate-spin" />
            <span className="font-medium">{authStatus}</span>
          </div>
        </div>
      )}

      {/* Error Message */}
      {authError && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4">
          <div className="flex items-center gap-3 text-red-600">
            <AlertCircle className="w-5 h-5" />
            <span className="font-medium">{authError}</span>
          </div>
        </div>
      )}

      {/* Role Selector for Super Admin */}
      {showRoleSelector && (
        <div className="bg-white border border-neutral-200 rounded-xl p-6 space-y-4">
          <div className="text-center">
            <h3 className="text-xl font-semibold text-neutral-900 mb-1">בחר תפקיד להתחברות</h3>
            <p className="text-neutral-500 text-sm">בחר את התפקיד שבו ברצונך להתחבר</p>
          </div>
          
          <div className="space-y-2">
            {roleOptions.map((role) => {
              const Icon = role.icon
              return (
                <button
                  key={role.value}
                  onClick={() => setSelectedRole(role.value)}
                  className={`w-full p-4 rounded-xl border-2 transition-colors text-right flex items-center gap-4 ${
                    selectedRole === role.value
                      ? 'border-brand-primary bg-brand-primary/5'
                      : 'border-neutral-200 hover:border-neutral-300'
                  }`}
                >
                  <div className={`p-2 rounded-lg ${role.color}`}>
                    <Icon className="w-5 h-5 text-white" />
                  </div>
                  <div className="flex-1">
                    <h4 className="font-medium text-neutral-900">{role.label}</h4>
                    <p className="text-sm text-neutral-500">{role.description}</p>
                  </div>
                  <div className={`w-4 h-4 rounded-full border-2 ${
                    selectedRole === role.value ? 'border-brand-primary bg-brand-primary' : 'border-neutral-300'
                  }`}>
                    {selectedRole === role.value && <CheckCircle className="w-3 h-3 text-white" />}
                  </div>
                </button>
              )
            })}
          </div>
          
          <button
            onClick={loginWithRole}
            className="w-full py-3 px-6 bg-brand-primary text-white rounded-xl font-medium hover:bg-brand-primary-dark transition-colors"
          >
            המשך עם התפקיד הנבחר
          </button>
        </div>
      )}

      {/* Auth Form */}
      {!showRoleSelector && (
        <div className="space-y-4">
          {/* Tab Switcher */}
          <div className="flex p-1 bg-neutral-100 rounded-xl">
            <button
              onClick={() => setView('sign_in')}
              className={`flex-1 py-2 px-4 rounded-lg text-sm font-medium transition-colors ${
                view === 'sign_in' ? 'bg-white text-neutral-900 shadow-sm' : 'text-neutral-600 hover:text-neutral-900'
              }`}
            >
              התחברות
            </button>
            <button
              onClick={() => setView('sign_up')}
              className={`flex-1 py-2 px-4 rounded-lg text-sm font-medium transition-colors ${
                view === 'sign_up' ? 'bg-white text-neutral-900 shadow-sm' : 'text-neutral-600 hover:text-neutral-900'
              }`}
            >
              הרשמה
            </button>
          </div>

          {/* Auth Component */}
          <div className="auth-container">
            <Auth
              supabaseClient={supabase}
              view={view}
              appearance={{
                theme: ThemeSupa,
                variables: {
                  default: {
                    colors: {
                      brand: '#472DA6',
                      brandAccent: '#5336BF',
                      brandButtonText: 'white',
                      defaultButtonBackground: 'transparent',
                      defaultButtonBackgroundHover: '#F8FAFC',
                      defaultButtonBorder: '#E2E8F0',
                      defaultButtonText: '#334155',
                      inputBackground: 'white',
                      inputBorder: '#CBD5E1',
                      inputBorderHover: '#472DA6',
                      inputBorderFocus: '#472DA6',
                      inputText: '#0F172A',
                      inputLabelText: '#475569',
                      inputPlaceholder: '#94A3B8',
                      anchorTextColor: '#472DA6',
                    },
                    space: {
                      buttonPadding: '12px 16px',
                      inputPadding: '12px 16px',
                    },
                    radii: {
                      borderRadiusButton: '0.75rem',
                      inputBorderRadius: '0.75rem',
                    },
                  },
                },
                style: {
                  button: { borderRadius: '0.75rem', fontWeight: '500' },
                  input: { borderRadius: '0.75rem' },
                  label: { direction: 'rtl', textAlign: 'right', fontWeight: '500' },
                  container: { direction: 'rtl' },
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
                    link_text: 'יש לך כבר חשבון? התחבר',
                  },
                  sign_up: {
                    email_label: 'כתובת אימייל',
                    password_label: 'סיסמה',
                    email_input_placeholder: 'הכנס את כתובת האימייל שלך',
                    password_input_placeholder: 'הכנס סיסמה',
                    button_label: 'הירשם',
                    loading_button_label: 'נרשם...',
                    link_text: 'אין לך חשבון? הירשם',
                  },
                  forgotten_password: {
                    email_label: 'כתובת אימייל',
                    email_input_placeholder: 'הכנס את כתובת האימייל שלך',
                    button_label: 'שלח הוראות איפוס',
                    loading_button_label: 'שולח...',
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
