import { NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { Database } from '@/types/database.types';
import OpenAI from 'openai';
import { addCallLog } from '@/lib/addCallLog';

// אתחול OpenAI API
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(request: Request) {
  try {
    // יצירת לקוח סופהבייס בצד השרת עם הרשאות מלאות
    const supabase = createRouteHandlerClient<Database>({ cookies });
    
    // קבלת ה-ID של השיחה מגוף הבקשה
    const { call_id } = await request.json();

    if (!call_id) {
      return NextResponse.json(
        { error: 'חסר מזהה שיחה (call_id)' }, 
        { status: 400 }
      );
    }

    addCallLog(call_id, '🚀 התחלת תהליך ניתוח שיחה', { timestamp: new Date().toISOString() });

    // קבלת פרטי השיחה
    const { data: callData, error: callError } = await supabase
      .from('calls')
      .select('*')
      .eq('id', call_id)
      .single();

    if (callError || !callData) {
      addCallLog(call_id, '❌ שגיאה בטעינת השיחה', { 
        error: callError, 
        error_message: callError?.message || 'שגיאה לא ידועה' 
      });
      return NextResponse.json(
        { error: 'השיחה לא נמצאה', details: callError },
        { status: 404 }
      );
    }

    addCallLog(call_id, '✅ נתוני שיחה נטענו בהצלחה', { 
      call_type: callData.call_type,
      audio_path: callData.audio_file_path,
      analysis_type: callData.analysis_type
    });

    // עדכון סטטוס העיבוד ל-transcribing
    await supabase
      .from('calls')
      .update({ processing_status: 'transcribing' })
      .eq('id', call_id);

    addCallLog(call_id, '🔄 עדכון סטטוס לתמלול', { new_status: 'transcribing' });

    // בדיקת סוג הניתוח
    const isFullAnalysis = callData.analysis_type === 'full';
    addCallLog(call_id, `ℹ️ סוג ניתוח: ${isFullAnalysis ? 'מלא (כולל תמלול)' : 'טונציה בלבד'}`);

    // קבלת URL להורדת הקובץ
    const { data, error: getUrlError } = await supabase
      .storage
      .from('audio_files')
      .createSignedUrl(callData.audio_file_path, 60 * 5); // 5 דקות

    const signedUrl = data?.signedUrl;
    
    if (getUrlError || !signedUrl) {
      addCallLog(call_id, '❌ שגיאה בקבלת קישור לקובץ האודיו', { 
        error: getUrlError,
        error_message: getUrlError?.message || 'unknown',
        storage_path: callData.audio_file_path
      });
      await supabase
        .from('calls')
        .update({
          processing_status: 'error',
          error_message: `שגיאה בקבלת קובץ האודיו: ${getUrlError?.message || 'אין URL חתום'}`
        })
        .eq('id', call_id);

      return NextResponse.json(
        { error: 'לא ניתן לקבל את קובץ האודיו', details: getUrlError },
        { status: 500 }
      );
    }

    addCallLog(call_id, '✅ קישור האודיו נוצר בהצלחה', {
      url_expiry_minutes: 5,
      audio_path: callData.audio_file_path
    });

    // שלב 1: תמלול השיחה (רק עבור ניתוח מלא)
    let transcript = null;
    if (isFullAnalysis) {
      try {
        addCallLog(call_id, '📝 מתחיל תהליך תמלול שיחה', { model: 'whisper-1', language: 'he' });
        
        // הורדת קובץ האודיו
        addCallLog(call_id, '⬇️ מוריד קובץ אודיו מהשרת');
        const audioResponse = await fetch(signedUrl);
        
        if (!audioResponse.ok) {
          throw new Error(`שגיאה בהורדת קובץ אודיו: ${audioResponse.status} ${audioResponse.statusText}`);
        }
        
        const audioBlob = await audioResponse.blob();
        
        addCallLog(call_id, '✅ קובץ אודיו הורד בהצלחה', { 
          size_bytes: audioBlob.size,
          size_mb: (audioBlob.size / (1024 * 1024)).toFixed(2),
          content_type: audioBlob.type
        });
        
        // המרת ה-blob לקובץ שאפשר לשלוח ל-OpenAI API
        const formData = new FormData();
        formData.append('file', audioBlob);
        formData.append('model', 'whisper-1');
        formData.append('language', 'he');
        formData.append('response_format', 'json');
        
        addCallLog(call_id, '🔄 שולח בקשת תמלול ל-Whisper API', { 
          request_time: new Date().toISOString(),
          file_size_mb: (audioBlob.size / (1024 * 1024)).toFixed(2)
        });
        
        const transcriptionResponse = await fetch('https://api.openai.com/v1/audio/transcriptions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`
          },
          body: formData
        });
        
        if (!transcriptionResponse.ok) {
          const errorText = await transcriptionResponse.text();
          addCallLog(call_id, '❌ שגיאת Whisper API', { 
            status: transcriptionResponse.status,
            error_text: errorText
          });
          throw new Error(`Whisper API error: ${transcriptionResponse.status} ${errorText}`);
        }
        
        const transcriptionData = await transcriptionResponse.json();
        transcript = transcriptionData.text;
        
        addCallLog(call_id, '✅ תמלול הושלם בהצלחה', { 
          transcript_length: transcript.length,
          transcript_words: transcript.split(' ').length,
          time_taken_ms: new Date().getTime() - new Date(transcriptionData.created_at || Date.now()).getTime()
        });
        
        // עדכון התמליל בטבלה
        await supabase
          .from('calls')
          .update({
            transcript,
            processing_status: 'analyzing_tone'
          })
          .eq('id', call_id);
          
        addCallLog(call_id, '💾 תמליל נשמר בהצלחה במסד הנתונים', {
          new_status: 'analyzing_tone'
        });
          
      } catch (transcribeError: any) {
        addCallLog(call_id, '❌ שגיאה בתמלול', { 
          error: transcribeError.message,
          error_name: transcribeError.name,
          error_stack: transcribeError.stack?.substring(0, 200)
        });
        
        await supabase
          .from('calls')
          .update({
            processing_status: 'error',
            error_message: `שגיאת תמלול: ${transcribeError.message}`
          })
          .eq('id', call_id);

        return NextResponse.json(
          { error: 'התמלול נכשל', details: transcribeError.message },
          { status: 500 }
        );
      }
    } else {
      // אם זה ניתוח טונציה בלבד, עדכון הסטטוס ישירות ל-analyzing_tone
      await supabase
        .from('calls')
        .update({ processing_status: 'analyzing_tone' })
        .eq('id', call_id);
        
      addCallLog(call_id, '⏩ דילוג על שלב התמלול (ניתוח טונציה בלבד)', {
        new_status: 'analyzing_tone'
      });
    }

    // שלב 2: ניתוח טון ישיר מהאודיו עם GPT-4o
    try {
      addCallLog(call_id, '🎭 מתחיל ניתוח טונציה', { model: 'gpt-4o' });
      
      // הכנת הבקשה לניתוח טונציה
      addCallLog(call_id, '🔄 מכין בקשה לניתוח טונציה עם GPT-4o');
      
      const toneAnalysisResponse = await openai.chat.completions.create({
        model: 'gpt-4o',
        messages: [
          {
            role: 'system',
            content: `אתה מומחה בניתוח טון, רגש ושפת גוף בשיחות טלפוניות בעברית. 
            אתה מנתח את הטון, רמת האנרגיה, החיוביות והמקצועיות בשיחה, 
            ומזהה סימנים לדגלים אדומים כמו צעקות, לחץ או חוסר סבלנות.
            המטרה שלך היא לספק תובנות מדויקות על האופן בו נשמע הדובר, ולזהות דפוסי תקשורת בעייתיים שיכולים להשפיע על יעילות המכירה או השירות.
            התמקד בניתוח פרוזודי - טון, קצב, עוצמה, הפסקות, והשתקות.
            החזר תמיד JSON.`
          },
          {
            role: 'user',
            content: `נתח את טון הדיבור, רמת האנרגיה, החיוביות, והמקצועיות בשיחה זו.
            זהה דגלים אדומים כמו צעקות, לחץ או חוסר סבלנות.
            סוג השיחה: ${callData.call_type}
            ${transcript ? `תמליל השיחה: ${transcript}` : ''}
            הקפד להחזיר את התשובה בפורמט JSON.`
          }
        ],
        response_format: { type: 'json_object' }
      });

      addCallLog(call_id, '✅ תשובת OpenAI התקבלה לניתוח טונציה', { 
        token_usage: toneAnalysisResponse.usage,
        model: toneAnalysisResponse.model,
        response_id: toneAnalysisResponse.id
      });

      const toneAnalysisReport = JSON.parse(toneAnalysisResponse.choices[0].message.content || '{}');
      
      addCallLog(call_id, '✅ ניתוח טונציה הושלם', { 
        report_keys: Object.keys(toneAnalysisReport),
        identified_red_flags: toneAnalysisReport.red_flags ? Object.keys(toneAnalysisReport.red_flags).filter(flag => toneAnalysisReport.red_flags[flag]) : []
      });

      // ניתוח מלא דורש שלב נוסף
      if (isFullAnalysis) {
        // עדכון לשלב analyzing_content
        await supabase
          .from('calls')
          .update({
            processing_status: 'analyzing_content'
          })
          .eq('id', call_id);

        addCallLog(call_id, '🔄 עדכון סטטוס לניתוח תוכן', { new_status: 'analyzing_content' });
        addCallLog(call_id, '📊 מתחיל ניתוח תוכן', { model: 'gpt-4.1-2025-04-14' });

        // שלב 3: ניתוח תוכן מקצועי עם GPT-4 Turbo
        // קבלת הפרומפט המתאים לסוג השיחה
        const { data: promptData, error: promptError } = await supabase
          .from('prompts')
          .select('system_prompt')
          .eq('call_type', callData.call_type)
          .single();

        let systemPrompt = '';
        if (promptError || !promptData) {
          // פרומפט ברירת מחדל אם אין התאמה ספציפית
          systemPrompt = `אתה מומחה בניתוח שיחות מכירה ושירות בעברית. נתח את השיחה המצורפת והערך אותה במגוון פרמטרים מקצועיים.
          תן ציון כללי לשיחה (בין 3-10), וציונים נפרדים לקטגוריות ופרמטרים שונים.
          זהה נקודות חוזק לשימור ונקודות לשיפור.
          הצע המלצות פרקטיות לשיפור המכירה או השירות.
          אם הציון בפרמטר נמוך מ-7, סמן אותו כדגל אדום לטיפול מיידי.`;
          addCallLog(call_id, 'ℹ️ משתמש בפרומפט ברירת מחדל (לא נמצא פרומפט ספציפי לסוג השיחה)', {
            call_type: callData.call_type,
            prompt_error: promptError?.message
          });
        } else {
          systemPrompt = promptData.system_prompt;
          addCallLog(call_id, '✅ פרומפט מותאם לסוג השיחה נטען בהצלחה', { 
            call_type: callData.call_type,
            prompt_length: systemPrompt.length
          });
        }

        // קבלת פרטי החברה והמשתמש
        const { data: userData, error: userError } = await supabase
          .from('users')
          .select(`
            id, full_name, email, role,
            companies:company_id (*)
          `)
          .eq('id', callData.user_id)
          .single();

        const companyName = userData?.companies && 'name' in userData.companies ? userData.companies.name : '';
        
        addCallLog(call_id, '✅ מידע משתמש וחברה נטען', { 
          user_id: userData?.id,
          user_role: userData?.role,
          company_name: companyName || 'לא ידוע'
        });

        // ניתוח התוכן עם GPT-4 Turbo
        addCallLog(call_id, '🔄 שולח בקשה לניתוח תוכן ל-GPT-4 Turbo', {
          transcript_length: transcript?.length || 0,
          prompt_length: systemPrompt.length,
          request_time: new Date().toISOString()
        });
        
        const contentAnalysisResponse = await openai.chat.completions.create({
          model: 'gpt-4.1-2025-04-14',
          messages: [
            {
              role: 'system',
              content: systemPrompt.includes('JSON') ? systemPrompt : systemPrompt + '\nהחזר תמיד JSON.'
            },
            {
              role: 'user',
              content: `נתח את השיחה הבאה:
              סוג שיחה: ${callData.call_type}
              תמליל השיחה: ${transcript}
              
              מידע נוסף:
              ${companyName ? `חברה: ${companyName}` : ''}
              ${userData ? `תפקיד המשתמש: ${userData.role}` : ''}
              ${callData.agent_notes ? `הערות נציג: ${callData.agent_notes}` : ''}
              
              ניתוח טונציה: ${JSON.stringify(toneAnalysisReport)}
              הקפד להחזיר את התשובה בפורמט JSON.`
            }
          ],
          response_format: { type: 'json_object' }
        });

        addCallLog(call_id, '✅ תשובת OpenAI התקבלה לניתוח תוכן', { 
          token_usage: contentAnalysisResponse.usage,
          model: contentAnalysisResponse.model,
          response_id: contentAnalysisResponse.id,
          completion_time: new Date().toISOString()
        });

        const contentAnalysisReport = JSON.parse(contentAnalysisResponse.choices[0].message.content || '{}');
        
        addCallLog(call_id, '✅ ניתוח תוכן הושלם', { 
          overall_score: contentAnalysisReport.overall_score,
          report_sections: Object.keys(contentAnalysisReport),
          identified_strengths: contentAnalysisReport.strengths_and_preservation_points?.length || 0,
          improvement_points: contentAnalysisReport.improvement_points?.length || 0,
          has_red_flags: contentAnalysisReport.red_flag || false
        });

        // שילוב הניתוחים
        const finalReport = {
          ...contentAnalysisReport,
          tone_analysis_report: toneAnalysisReport
        };

        // עדכון הניתוח הסופי בטבלה
        await supabase
          .from('calls')
          .update({
            analysis_report: finalReport,
            overall_score: contentAnalysisReport.overall_score || 0,
            red_flag: contentAnalysisReport.red_flag || false,
            processing_status: 'completed',
            analyzed_at: new Date().toISOString()
          })
          .eq('id', call_id);
          
        addCallLog(call_id, '🏁 ניתוח שיחה הושלם', { 
          overall_score: contentAnalysisReport.overall_score,
          red_flag: contentAnalysisReport.red_flag || false,
          completion_time: new Date().toISOString(),
          time_taken_seconds: Math.round((new Date().getTime() - new Date(callData.created_at).getTime()) / 1000)
        });
          
      } else {
        // רק ניתוח טונציה - עדכון הניתוח בטבלה
        const finalReport = {
          tone_analysis_report: toneAnalysisReport,
          // עבור ניתוח טונציה בלבד, נשתמש בשדות summary
          executive_summary: toneAnalysisReport.summary || '',
          overall_score: toneAnalysisReport.overall_score || 0,
          red_flag: toneAnalysisReport.red_flags?.shouting_detected || 
                  toneAnalysisReport.red_flags?.high_stress_detected || 
                  toneAnalysisReport.red_flags?.impatience_detected || false,
          strengths_and_preservation_points: toneAnalysisReport.strengths || [],
          improvement_points: toneAnalysisReport.improvement_points || []
        };

        await supabase
          .from('calls')
          .update({
            analysis_report: finalReport,
            overall_score: finalReport.overall_score,
            red_flag: finalReport.red_flag,
            processing_status: 'completed',
            analyzed_at: new Date().toISOString()
          })
          .eq('id', call_id);
          
        addCallLog(call_id, '🏁 ניתוח טונציה הושלם (סוג ניתוח: טונציה בלבד)', { 
          overall_score: finalReport.overall_score,
          red_flag: finalReport.red_flag || false,
          completion_time: new Date().toISOString(),
          time_taken_seconds: Math.round((new Date().getTime() - new Date(callData.created_at).getTime()) / 1000)
        });
      }

      return NextResponse.json({
        success: true,
        call_id,
        message: 'ניתוח השיחה הושלם בהצלחה'
      });

    } catch (analysisError: any) {
      addCallLog(call_id, '❌ שגיאה בניתוח', { 
        error: analysisError.message,
        error_name: analysisError.name,
        error_stack: analysisError.stack?.substring(0, 200),
        error_time: new Date().toISOString()
      });
      
      await supabase
        .from('calls')
        .update({
          processing_status: 'error',
          error_message: `שגיאת ניתוח: ${analysisError.message}`
        })
        .eq('id', call_id);

      return NextResponse.json(
        { error: 'הניתוח נכשל', details: analysisError.message },
        { status: 500 }
      );
    }

  } catch (error: any) {
    console.error('שגיאה כללית:', error);
    
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
} 