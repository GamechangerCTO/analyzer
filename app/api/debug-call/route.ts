import { NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { Database } from '@/types/database.types';

// הגדרת max duration לוורסל
export const maxDuration = 60;

export async function POST(request: Request) {
  try {
    const { call_id } = await request.json();

    if (!call_id) {
      return NextResponse.json(
        { error: 'חסר מזהה שיחה (call_id)' }, 
        { status: 400 }
      );
    }

    // יצירת לקוח סופהבייס בצד השרת עם הרשאות מלאות
    const supabase = createRouteHandlerClient<Database>({ cookies });
    
    // קבלת פרטי השיחה
    const { data: callData, error: callError } = await supabase
      .from('calls')
      .select('*')
      .eq('id', call_id)
      .single();

    if (callError || !callData) {
      return NextResponse.json(
        { error: 'השיחה לא נמצאה', details: callError },
        { status: 404 }
      );
    }

    // בדיקת קובץ האודיו
    let audioStatus = 'unknown';
    let audioDetails = {};
    
    if (callData.audio_file_path) {
      const { data, error: getUrlError } = await supabase
        .storage
        .from('audio_files')
        .createSignedUrl(callData.audio_file_path, 60 * 5);

      if (getUrlError) {
        audioStatus = 'error';
        audioDetails = { error: getUrlError.message };
      } else if (data?.signedUrl) {
        // בדיקת האודיו עצמו
        try {
          const response = await fetch(data.signedUrl, { method: 'HEAD' });
          audioStatus = response.ok ? 'accessible' : 'not_accessible';
          audioDetails = {
            status: response.status,
            size: response.headers.get('content-length'),
            type: response.headers.get('content-type'),
            url_works: response.ok
          };
        } catch (err: any) {
          audioStatus = 'fetch_error';
          audioDetails = { error: err.message };
        }
      }
    } else {
      audioStatus = 'no_path';
    }

    // בדיקת משתני סביבה (רק נוכחות)
    const envCheck = {
      has_openai_key: !!process.env.OPENAI_API_KEY,
      openai_key_length: process.env.OPENAI_API_KEY?.length || 0,
      has_supabase_url: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
      has_service_key: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
      vercel_env: process.env.VERCEL_ENV,
      node_env: process.env.NODE_ENV
    };

    // בדיקת לוגים
    const { data: logs, error: logsError } = await supabase
      .from('call_logs')
      .select('*')
      .eq('call_id', call_id)
      .order('created_at', { ascending: false })
      .limit(10);

    return NextResponse.json({
      call_id,
      call_data: {
        processing_status: callData.processing_status,
        error_message: callData.error_message,
        analysis_type: callData.analysis_type,
        call_type: callData.call_type,
        created_at: callData.created_at,
        analyzed_at: callData.analyzed_at,
        overall_score: callData.overall_score,
        has_transcript: !!callData.transcript,
        has_analysis_report: !!callData.analysis_report,
        audio_file_path: callData.audio_file_path
      },
      audio_status: audioStatus,
      audio_details: audioDetails,
      env_check: envCheck,
      recent_logs: logs || [],
      logs_error: logsError?.message || null,
      debug_timestamp: new Date().toISOString()
    });

  } catch (error: any) {
    console.error('שגיאה באבחון:', error);
    
    return NextResponse.json(
      { error: error.message, stack: error.stack },
      { status: 500 }
    );
  }
} 