import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function POST(request: NextRequest) {
  try {
    console.log('🚀 Simple user creation API called');
    
    const body = await request.json();
    console.log('📥 Request body:', {
      email: body.email,
      full_name: body.full_name,
      role: body.role,
      company_id: body.company_id
    });

    // בדיקת משתני סביבה
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
      console.error('❌ Missing environment variables:', {
        SUPABASE_URL: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
        SERVICE_ROLE_KEY: !!process.env.SUPABASE_SERVICE_ROLE_KEY
      });
      return NextResponse.json({ 
        error: 'Missing environment variables',
        details: 'SUPABASE_URL or SERVICE_ROLE_KEY not found'
      }, { status: 500 });
    }

    console.log('✅ Environment variables found');

    // ולידציה: אדמינים לא צריכים להיות משויכים לחברה
    if (body.role === 'admin' && body.company_id) {
      return NextResponse.json({ 
        error: 'מנהלי מערכת לא צריכים להיות משויכים לחברה ספציפית',
        details: 'Admin users should not have company association'
      }, { status: 400 });
    }

    // ולידציה: מנהלים ונציגים חייבים להיות משויכים לחברה
    if ((body.role === 'manager' || body.role === 'agent') && !body.company_id) {
      const roleText = body.role === 'manager' ? 'מנהלים' : 'נציגים';
      return NextResponse.json({ 
        error: `${roleText} חייבים להיות משויכים לחברה`,
        details: `${body.role} users must have company association`
      }, { status: 400 });
    }

    // יצירת קליינט סופאבייס עם service role
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    );

    console.log('✅ Supabase admin client created');

    // בדיקה אם המשתמש כבר קיים ב-Auth לפי האימייל
    console.log('🔍 Checking existing users in Auth...');
    const { data: existingUsers, error: existingError } = await supabaseAdmin.auth.admin.listUsers();
    
    if (existingError) {
      console.error('❌ Error checking existing users:', existingError);
      return NextResponse.json({ 
        error: 'Failed to check existing users',
        details: existingError.message
      }, { status: 400 });
    }

    const existingUser = existingUsers.users.find(user => user.email === body.email);
    let authUser;

    if (existingUser) {
      console.log('ℹ️ User already exists in Auth, updating details');
      authUser = existingUser;
      
      // עדכון סיסמה למשתמש קיים
      if (body.password) {
        const { error: updatePasswordError } = await supabaseAdmin.auth.admin.updateUserById(
          authUser.id,
          { password: body.password }
        );
        
        if (updatePasswordError) {
          console.warn('⚠️ Warning updating password for existing user:', updatePasswordError);
        } else {
          console.log('✅ Password updated for existing user');
        }
      }
    } else {
      // יצירת משתמש חדש ב-Auth
      console.log('🔍 Creating new user in Auth...');
      const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
        email: body.email,
        password: body.password || '123456',
        email_confirm: true,
        user_metadata: {
          full_name: body.full_name,
        }
      });

      if (authError) {
        console.error('❌ Auth error:', authError);
        return NextResponse.json({ 
          error: 'Failed to create user in Auth',
          details: authError.message
        }, { status: 400 });
      }

      if (!authData.user) {
        console.error('❌ No user returned from Auth');
        return NextResponse.json({ 
          error: 'No user returned from Auth creation'
        }, { status: 400 });
      }

      console.log('✅ User created in Auth:', authData.user.id);
      authUser = authData.user;
    }

    // הוספת/עדכון המשתמש בטבלת users באמצעות upsert
    console.log('🔍 Upserting user to public.users...');
    const { error: upsertError } = await supabaseAdmin
      .from('users')
      .upsert({
        id: authUser.id,
        email: body.email,
        full_name: body.full_name,
        role: body.role || 'agent',
        company_id: body.company_id || null,
        is_approved: true // אדמין מאשר אוטומטית
      }, { onConflict: 'id' });

    if (upsertError) {
      console.error('❌ Upsert error:', upsertError);
      
      // אם נכשלה ההוספה/עדכון ואם יצרנו משתמש חדש, נמחק אותו מה-Auth
      if (!existingUser) {
        await supabaseAdmin.auth.admin.deleteUser(authUser.id);
      }
      
      return NextResponse.json({ 
        error: 'Database error creating new user',
        details: upsertError.message
      }, { status: 400 });
    }

    console.log('✅ User upserted to public.users successfully');

    return NextResponse.json({
      success: true,
      message: `User ${body.email} ${existingUser ? 'updated' : 'created'} successfully`,
      user: {
        id: authUser.id,
        email: authUser.email,
        full_name: body.full_name,
        role: body.role || 'agent'
      },
      isExisting: !!existingUser
    });

  } catch (error) {
    console.error('❌ Unexpected error:', error);
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
} 