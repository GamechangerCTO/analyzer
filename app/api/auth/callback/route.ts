import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

// Force dynamic rendering for this API route due to searchParams usage
export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const next = searchParams.get('next') ?? '/dashboard'

  console.log('[CALLBACK] Auth callback initiated:', { code: !!code, origin, next })

  if (code) {
    const supabase = createClient()
    
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    
    if (!error) {
      const { data: { user } } = await supabase.auth.getUser()
      
      if (user) {
        console.log(`[CALLBACK] User authenticated: ${user.email}`)
        
        try {
          const currentEmail = user.email || '';
          
          // בדיקה מיוחדת לסופר אדמין
          const isSuperAdmin = currentEmail === 'ido.segev23@gmail.com';
          
          if (isSuperAdmin) {
            console.log("[CALLBACK] Super admin detected via Google");
            
            // וידוא שהסופר אדמין קיים במסד הנתונים
            const { data: adminUser, error: adminError } = await supabase
              .from('users')
              .select('*')
              .eq('email', currentEmail)
              .maybeSingle();

            if (adminError) {
              console.error("[CALLBACK] Error checking super admin:", adminError);
              return NextResponse.redirect(`${origin}/login?error=database_error`)
            }

            if (!adminUser) {
              // יצירת סופר אדמין חדש
              const { error: createError } = await supabase
                .from('users')
                .insert({
                  id: user.id,
                  email: currentEmail,
                  role: 'admin',
                  full_name: user.user_metadata.full_name || 'Super Admin',
                  is_approved: true
                });

              if (createError) {
                console.error("[CALLBACK] Error creating super admin:", createError);
                return NextResponse.redirect(`${origin}/login?error=creation_error`)
              }

              // הוספה לטבלת system_admins
              await supabase
                .from('system_admins')
                .upsert({ user_id: user.id });
            }
            
            return NextResponse.redirect(`${origin}/dashboard`)

          } else {
            // משתמש רגיל
            console.log("[CALLBACK] Regular user detected via Google");
            const { data: userData, error: userError } = await supabase
              .from('users')
              .select('*')
              .eq('email', currentEmail)
              .maybeSingle();
            
            if (userError) {
              console.error("[CALLBACK] Error checking user:", userError);
              return NextResponse.redirect(`${origin}/login?error=database_error`)
            }
            
            if (!userData) {
              // משתמש חדש - הפנייה לפלואו הרשמה מלא
              console.log("[CALLBACK] New user detected, redirecting to complete signup");
              return NextResponse.redirect(`${origin}/signup-complete`);
            }
            
            if (!userData.is_approved) {
              return NextResponse.redirect(`${origin}/not-approved?reason=pending`);
            }
            
            // משתמש מאושר - ניתוב לפי תפקיד
            const redirectPath = userData.role === 'admin' ? '/dashboard' :
                               userData.role === 'manager' ? '/dashboard/manager' :
                               '/dashboard/agent';
            
            console.log(`[CALLBACK] Redirecting approved user to: ${redirectPath}`);
            return NextResponse.redirect(`${origin}${redirectPath}`);
          }
        } catch (error) {
          console.error("[CALLBACK] Error in auth handler:", error);
          return NextResponse.redirect(`${origin}/login?error=processing_error`)
        }
      }
    } else {
      console.error("[CALLBACK] Auth exchange error:", error);
      return NextResponse.redirect(`${origin}/login?error=auth_exchange_error`)
    }
  }

  // Return the user to an error page with instructions
  return NextResponse.redirect(`${origin}/login?error=auth_callback_error`)
} 