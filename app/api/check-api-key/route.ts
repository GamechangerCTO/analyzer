import { NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';

// 🔐 מאובטח - רק super admins
export async function GET() {
  try {
    const supabase = createRouteHandlerClient({ cookies });
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: isSuperAdmin } = await supabase
      .from('system_admins')
      .select('id')
      .eq('user_id', session.user.id)
      .single();

    if (!isSuperAdmin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // לא מחזירים שום מידע על המפתחות בproduction!
    if (process.env.NODE_ENV === 'production') {
      return NextResponse.json({
        hasApiKey: !!process.env.OPENAI_API_KEY,
        environment: 'production'
        // לא חושפים prefix או length!
      });
    }

    // רק בdevelopment מחזירים עוד מידע
    const apiKey = process.env.OPENAI_API_KEY;
    return NextResponse.json({
      hasApiKey: !!apiKey,
      keyConfigured: !!apiKey && apiKey.length > 20,
      environment: process.env.NODE_ENV || 'unknown'
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: 'Internal error' },
      { status: 500 }
    );
  }
} 