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
        'processing_error': 'שגיאה בעיבוד הבקשה - אנא נסה שוב'
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

  // מאזין לשינויים במצב ההתחברות
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log(`[AUTH] Event: ${event}`, { userEmail: session?.user?.email })
        setAuthStatus(`אירוע: ${event}`)

        if (event === 'SIGNED_IN' && session) {
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
                  return;
                }

                // הוספה לטבלת system_admins
                await supabase
                  .from('system_admins')
                  .upsert({ user_id: session.user.id });
              }
              
              setAuthLoading(false)
              setShowRoleSelector(true);
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
                return;
              }
              
              if (!userData) {
                // משתמש חדש - יצירת רשומה
                const { error: createError } = await supabase
                  .from('users')
                  .insert({
                    id: session.user.id,
                    email: currentEmail,
                    role: 'agent',
                    full_name: session.user.user_metadata.full_name || null,
                    is_approved: false
                  });
                
                if (createError) {
                  console.error("[AUTH] Error creating user:", createError);
                  setAuthError(`שגיאה ביצירת משתמש: ${createError.message}`)
                  setAuthLoading(false)
                  return;
                }
                
                router.push('/not-approved?reason=pending');
                return;
              }
              
              if (!userData.is_approved) {
                router.push('/not-approved?reason=pending');
                return;
              }
              
              // משתמש מאושר - ניתוב לפי תפקיד
              setAuthLoading(false)
              
              const redirectPath = userData.role === 'admin' ? '/dashboard' :
                                 userData.role === 'manager' ? '/dashboard/manager' :
                                 '/dashboard/agent';
              
              console.log(`[AUTH] Redirecting approved user to: ${redirectPath}`);
              router.push(redirectPath);
            }
          } catch (error) {
            console.error("[AUTH] Error in auth handler:", error);
            setAuthError(`שגיאה בעיבוד התחברות: ${error instanceof Error ? error.message : 'שגיאה לא ידועה'}`)
            setAuthLoading(false)
          }
        } else if (event === 'SIGNED_OUT') {
          console.log("[AUTH] User signed out");
          setShowRoleSelector(false);
          setAuthError(null)
          setAuthLoading(false)
          setAuthStatus('מוכן להתחברות')
          router.push('/login');
        }
      }
    )
    
    return () => {
      subscription.unsubscribe()
    }
  }, [supabase, router])

  return (
    <div className="flex flex-col gap-6">
      {/* הצגת שגיאות אותנטיקציה */}
      {authError && (
        <div className="choacee-card-glass p-4 bg-clay-danger/10 border border-clay-danger/30">
          <div className="flex items-start justify-between">
            <p className="text-clay-danger text-sm font-medium flex-1">{authError}</p>
            <button
              onClick={() => setAuthError(null)}
              className="text-clay-danger hover:text-clay-danger/80 transition-colors ml-2"
              title="סגור הודעה"
            >
              ✕
            </button>
          </div>
        </div>
      )}

      {/* הצגת סטטוס אותנטיקציה */}
      {authLoading && (
        <div className="choacee-card-glass p-4 bg-clay-success/10 border border-clay-success/30">
          <div className="flex items-center gap-3">
            <div className="w-4 h-4 animate-spin rounded-full border-2 border-clay-success border-t-transparent"></div>
            <p className="text-clay-success text-sm font-medium">{authStatus}</p>
          </div>
        </div>
      )}

      {/* בורר תפקידים לסופר אדמין */}
      {showRoleSelector && (
        <div className="choacee-card-clay-raised p-6 bg-gradient-to-r from-clay-success/5 to-glass-light/5 border border-clay-success/20">
          <h3 className="choacee-text-display text-lg font-semibold text-clay-primary mb-4">בחר תפקיד להתחברות</h3>
          <div className="grid gap-3">
            {(['admin', 'manager', 'agent'] as Role[]).map((role) => (
              <button
                key={role}
                onClick={() => setSelectedRole(role)}
                className={`p-3 rounded-clay border-2 transition-all duration-200 text-right choacee-interactive ${
                  selectedRole === role
                    ? 'border-clay-success bg-clay-success/10 text-clay-primary shadow-clay-soft'
                    : 'border-neutral-200 hover:border-clay-success/50 text-neutral-600'
                }`}
              >
                <div className="font-medium">
                  {role === 'admin' && 'מנהל מערכת'}
                  {role === 'manager' && 'מנהל חברה'}
                  {role === 'agent' && 'סוכן מכירות'}
                </div>
              </button>
            ))}
          </div>
          <button
            onClick={loginWithRole}
            className="choacee-btn-clay-success w-full mt-4 py-3 px-4"
          >
            המשך עם התפקיד הנבחר
          </button>
        </div>
      )}

      {/* טופס התחברות/הרשמה */}
      {!showRoleSelector && (
        <div className="space-y-4">
          <div className="flex gap-2 p-1 bg-glass-light rounded-clay shadow-clay-soft">
            <button
              onClick={() => setView('sign_in')}
              className={`flex-1 py-2 px-4 rounded-clay text-sm font-medium transition-colors duration-200 choacee-interactive ${
                view === 'sign_in' 
                  ? 'bg-white text-clay-primary shadow-clay-raised' 
                  : 'text-neutral-500 hover:text-clay-primary'
              }`}
            >
              התחברות
            </button>
            <button
              onClick={() => setView('sign_up')}
              className={`flex-1 py-2 px-4 rounded-clay text-sm font-medium transition-colors duration-200 choacee-interactive ${
                view === 'sign_up' 
                  ? 'bg-white text-clay-primary shadow-clay-raised' 
                  : 'text-neutral-500 hover:text-clay-primary'
              }`}
            >
              הרשמה
            </button>
          </div>

          <Auth
            supabaseClient={supabase}
            view={view}
            appearance={{
              theme: ThemeSupa,
              variables: {
                default: {
                  colors: {
                    brand: '#8B5FBF',
                    brandAccent: '#7B4FAF',
                    brandButtonText: 'white',
                    defaultButtonBackground: 'transparent',
                    defaultButtonBackgroundHover: '#F8F9FA',
                    defaultButtonBorder: '#E9ECEF',
                    defaultButtonText: '#495057',
                    dividerBackground: '#E9ECEF',
                    inputBackground: 'white',
                    inputBorder: '#DEE2E6',
                    inputBorderHover: '#8B5FBF',
                    inputBorderFocus: '#8B5FBF',
                    inputText: '#212529',
                    inputLabelText: '#6C757D',
                    inputPlaceholder: '#ADB5BD',
                    messageText: '#EC7063',
                    messageTextDanger: '#EC7063',
                    anchorTextColor: '#8B5FBF',
                    anchorTextHoverColor: '#7B4FAF',
                  },
                  space: {
                    spaceSmall: '4px',
                    spaceMedium: '8px',
                    spaceLarge: '16px',
                    labelBottomMargin: '8px',
                    anchorBottomMargin: '4px',
                    emailInputSpacing: '4px',
                    socialAuthSpacing: '4px',
                    buttonPadding: '10px 15px',
                    inputPadding: '10px 15px',
                  },
                  fontSizes: {
                    baseBodySize: '14px',
                    baseInputSize: '14px',
                    baseLabelSize: '14px',
                    baseButtonSize: '14px',
                  },
                  fonts: {
                    bodyFontFamily: `system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`,
                    buttonFontFamily: `system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`,
                    inputFontFamily: `system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`,
                    labelFontFamily: `system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`,
                  },
                  borderWidths: {
                    buttonBorderWidth: '1px',
                    inputBorderWidth: '1px',
                  },
                  radii: {
                    borderRadiusButton: '1.5rem',
                    buttonBorderRadius: '1.5rem',
                    inputBorderRadius: '1.5rem',
                  },
                },
              },
              style: {
                button: {
                  border: '1px solid #E9ECEF',
                  borderRadius: '1.5rem',
                  boxShadow: '0 2px 4px rgba(0, 0, 0, 0.05), inset 0 1px 0 rgba(255, 255, 255, 0.1)',
                },
                anchor: {
                  color: '#8B5FBF',
                  textDecoration: 'none',
                },
                container: {
                  direction: 'rtl',
                },
                input: {
                  border: '1px solid #DEE2E6',
                  borderRadius: '1.5rem',
                  direction: 'rtl',
                  boxShadow: 'inset 0 2px 4px rgba(0, 0, 0, 0.06)',
                },
                label: {
                  color: '#6C757D',
                  direction: 'rtl',
                  textAlign: 'right',
                },
                message: {
                  color: '#EC7063',
                  direction: 'rtl',
                  textAlign: 'right',
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
            providers={['google']}
            redirectTo={`${window.location.origin}/api/auth/callback`}
            onlyThirdPartyProviders={false}
            magicLink={false}
            showLinks={true}
          />
        </div>
      )}
    </div>
  )
} 