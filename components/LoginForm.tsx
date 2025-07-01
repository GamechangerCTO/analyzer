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
        <div className="replayme-card p-4 bg-electric-coral/10 border border-electric-coral/30">
          <p className="text-electric-coral text-sm font-medium">{authError}</p>
        </div>
      )}

      {/* הצגת סטטוס אותנטיקציה */}
      {authLoading && (
        <div className="replayme-card p-4 bg-lemon-mint/10 border border-lemon-mint/30">
          <div className="flex items-center gap-3">
            <div className="w-4 h-4 animate-spin rounded-full border-2 border-lemon-mint border-t-transparent"></div>
            <p className="text-lemon-mint-dark text-sm font-medium">{authStatus}</p>
          </div>
        </div>
      )}

      {/* בורר תפקידים לסופר אדמין */}
      {showRoleSelector && (
        <div className="replayme-card p-6 bg-gradient-to-r from-lemon-mint/5 to-cream-sand-light/5 border border-lemon-mint/20">
          <h3 className="text-lg font-semibold text-indigo-night mb-4">בחר תפקיד להתחברות</h3>
          <div className="grid gap-3">
            {(['admin', 'manager', 'agent'] as Role[]).map((role) => (
              <button
                key={role}
                onClick={() => setSelectedRole(role)}
                className={`p-3 rounded-lg border-2 transition-all duration-200 text-right ${
                  selectedRole === role
                    ? 'border-lemon-mint bg-lemon-mint/10 text-lemon-mint-dark'
                    : 'border-gray-200 hover:border-lemon-mint/50 text-indigo-night/70'
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
            className="w-full mt-4 bg-lemon-mint hover:bg-lemon-mint-dark text-indigo-night font-medium py-3 px-4 rounded-lg transition-colors duration-200"
          >
            המשך עם התפקיד הנבחר
          </button>
        </div>
      )}

      {/* טופס התחברות/הרשמה */}
      {!showRoleSelector && (
        <div className="space-y-4">
          <div className="flex gap-2 p-1 bg-gray-100 rounded-lg">
            <button
              onClick={() => setView('sign_in')}
              className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors duration-200 ${
                view === 'sign_in' 
                  ? 'bg-white text-indigo-night shadow-sm' 
                  : 'text-indigo-night/60 hover:text-indigo-night'
              }`}
            >
              התחברות
            </button>
            <button
              onClick={() => setView('sign_up')}
              className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors duration-200 ${
                view === 'sign_up' 
                  ? 'bg-white text-indigo-night shadow-sm' 
                  : 'text-indigo-night/60 hover:text-indigo-night'
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
                    brand: '#8FE9D1',
                    brandAccent: '#65E3CE',
                    brandButtonText: '#2C4F7C',
                    defaultButtonBackground: 'transparent',
                    defaultButtonBackgroundHover: '#F7F8F9',
                    defaultButtonBorder: '#E5E7EB',
                    defaultButtonText: '#374151',
                    dividerBackground: '#E5E7EB',
                    inputBackground: 'white',
                    inputBorder: '#D1D5DB',
                    inputBorderHover: '#8FE9D1',
                    inputBorderFocus: '#8FE9D1',
                    inputText: '#1F2937',
                    inputLabelText: '#6B7280',
                    inputPlaceholder: '#9CA3AF',
                    messageText: '#EF4444',
                    messageTextDanger: '#EF4444',
                    anchorTextColor: '#2C4F7C',
                    anchorTextHoverColor: '#1E3A8A',
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
                    borderRadiusButton: '8px',
                    buttonBorderRadius: '8px',
                    inputBorderRadius: '8px',
                  },
                },
              },
              style: {
                button: {
                  border: '1px solid #E5E7EB',
                  borderRadius: '8px',
                },
                anchor: {
                  color: '#2C4F7C',
                  textDecoration: 'none',
                },
                container: {
                  direction: 'rtl',
                },
                input: {
                  border: '1px solid #D1D5DB',
                  borderRadius: '8px',
                  direction: 'rtl',
                },
                label: {
                  color: '#6B7280',
                  direction: 'rtl',
                  textAlign: 'right',
                },
                message: {
                  color: '#EF4444',
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
            providers={[]}
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