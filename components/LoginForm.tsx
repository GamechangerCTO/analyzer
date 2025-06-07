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

  const toggleView = () => {
    setView(view === 'sign_in' ? 'sign_up' : 'sign_in')
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
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (event === 'SIGNED_IN' && session) {
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
                  return;
                }
                console.log("[onAuthStateChange] Super admin created in users table.");

                // Create in system_admins if it doesn't exist (should not happen for a truly new user, but good practice)
                const { error: insertSystemAdminError } = await supabase
                  .from('system_admins')
                  .upsert({ user_id: session.user.id }, { onConflict: 'user_id' }); // Use upsert to avoid error if exists

                if (insertSystemAdminError) {
                  console.error("[onAuthStateChange] Error creating super admin in system_admins table:", insertSystemAdminError);
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
                  return;
                }
                console.log("[onAuthStateChange] Super admin ensured in system_admins table (on existing user).");
              }
              
              console.log("[onAuthStateChange] Attempting to show role selector for super admin.");
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
              if (userData.role === 'admin') { // This case should ideally not be hit if not super admin email
                router.push('/dashboard');
              } else if (userData.role === 'manager' || userData.role === 'owner') {
                router.push('/dashboard/manager');
              } else { // agent
                router.push('/dashboard/agent');
              }
            }
          } catch (error) {
            console.error("[onAuthStateChange] Error in auth state change handler:", error);
            // Fallback redirect, consider a more specific error page
            router.push('/login?error=auth_handler_failed'); 
          }
        } else if (event === 'SIGNED_OUT') {
          console.log("[onAuthStateChange] User signed out. Redirecting to login.");
          setShowRoleSelector(false); // Hide role selector on sign out
          router.push('/login');
        }
      }
    )
    
    // ניקוי ה-listener כשהקומפוננטה נהרסת
    return () => {
      subscription.unsubscribe()
    }
  }, [supabase, router])

  return (
    <div className="flex flex-col gap-6">
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