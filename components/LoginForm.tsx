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
                .select('id, role, is_approved')
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
                    .update({ role: 'admin', is_approved: true })
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
                .select('id, role, is_approved')
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
    <div className="flex flex-col gap-4">
      {/* חלון בחירת תפקיד */}
      {showRoleSelector && (
        <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-60 z-50">
          <div className="bg-white p-6 rounded-lg shadow-xl w-full max-w-md">
            <h2 className="text-xl font-bold mb-4 text-center">בחר תפקיד להתחברות</h2>
            <div className="space-y-3">
              <button 
                onClick={() => setSelectedRole('admin')}
                className={`w-full py-3 px-4 rounded-md ${selectedRole === 'admin' ? 'bg-primary text-white' : 'bg-gray-100'}`}
              >
                מנהל מערכת
              </button>
              <button 
                onClick={() => setSelectedRole('manager')}
                className={`w-full py-3 px-4 rounded-md ${selectedRole === 'manager' ? 'bg-primary text-white' : 'bg-gray-100'}`}
              >
                מנהל
              </button>
              <button 
                onClick={() => setSelectedRole('agent')}
                className={`w-full py-3 px-4 rounded-md ${selectedRole === 'agent' ? 'bg-primary text-white' : 'bg-gray-100'}`}
              >
                נציג
              </button>
            </div>
            <div className="mt-6 flex justify-center">
              <button 
                onClick={loginWithRole}
                className="bg-primary text-white py-2 px-6 rounded-md hover:bg-primary-dark"
              >
                כניסה
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="flex justify-center gap-4 mb-4">
        <button
          onClick={() => setView('sign_in')}
          className={`px-4 py-2 rounded-md ${
            view === 'sign_in' 
              ? 'bg-primary text-white' 
              : 'bg-gray-100 text-gray-700'
          }`}
        >
          התחברות
        </button>
        <button
          onClick={() => setView('sign_up')}
          className={`px-4 py-2 rounded-md ${
            view === 'sign_up' 
              ? 'bg-primary text-white' 
              : 'bg-gray-100 text-gray-700'
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
                brand: 'rgb(59, 130, 246)',
                brandAccent: 'rgb(37, 99, 235)',
              },
            },
          },
          style: {
            button: {
              borderRadius: '0.375rem',
              height: '2.5rem',
            },
            input: {
              borderRadius: '0.375rem',
            },
            container: {
              direction: 'rtl',
            },
            label: {
              direction: 'rtl',
              textAlign: 'right',
            },
            message: {
              direction: 'rtl',
              textAlign: 'right',
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
            },
            sign_up: {
              email_label: 'אימייל',
              password_label: 'סיסמה',
              button_label: 'הירשם',
              social_provider_text: 'הירשם באמצעות {{provider}}',
              link_text: 'אין לך חשבון? הירשם',
            },
            forgotten_password: {
              email_label: 'אימייל',
              password_label: 'סיסמה',
              button_label: 'שלח הוראות איפוס סיסמה',
              link_text: 'שכחת סיסמה?',
            },
          },
        }}
        providers={[]}
      />
    </div>
  )
} 