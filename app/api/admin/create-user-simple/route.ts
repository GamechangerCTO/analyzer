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

    // יצירת משתמש חדש ב-Auth
    console.log('🔍 Creating user in Auth...');
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

    // הוספת המשתמש לטבלת users
    console.log('🔍 Inserting user to public.users...');
    const { error: insertError } = await supabaseAdmin
      .from('users')
      .insert({
        id: authData.user.id,
        email: body.email,
        full_name: body.full_name,
        role: body.role || 'agent',
        company_id: body.company_id || null,
        is_approved: true // אדמין מאשר אוטומטית
      });

    if (insertError) {
      console.error('❌ Insert error:', insertError);
      
      // אם נכשלה ההכנסה, נמחק את המשתמש מה-Auth
      await supabaseAdmin.auth.admin.deleteUser(authData.user.id);
      
      return NextResponse.json({ 
        error: 'Failed to insert user to database',
        details: insertError.message
      }, { status: 400 });
    }

    console.log('✅ User inserted to public.users successfully');

    return NextResponse.json({
      success: true,
      message: `User ${body.email} created successfully`,
      user: {
        id: authData.user.id,
        email: authData.user.email,
        full_name: body.full_name,
        role: body.role || 'agent'
      }
    });

  } catch (error) {
    console.error('❌ Unexpected error:', error);
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
} 