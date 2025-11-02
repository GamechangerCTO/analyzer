/**
 * Partner Job Processor
 * מעבד משימות אסינכרוניות (ניתוח שיחות, סימולציות וכו')
 * Created: December 2024
 */

import { createClient } from '@supabase/supabase-js';
import { sendWebhook } from './webhook-caller';
import type { AsyncJob, JobType } from '@/types/partner-api.types';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

// ============================================================================
// Supabase Client
// ============================================================================

function getServiceClient() {
  return createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

// ============================================================================
// Job Status Management
// ============================================================================

/**
 * עדכון סטטוס job
 */
export async function updateJobStatus(
  jobId: string,
  status: string,
  progress?: number,
  outputData?: Record<string, any>,
  errorMessage?: string,
  errorDetails?: Record<string, any>
): Promise<void> {
  const supabase = getServiceClient();
  
  const updates: any = {
    status,
    updated_at: new Date().toISOString(),
  };
  
  if (progress !== undefined) {
    updates.progress = progress;
  }
  
  if (outputData) {
    updates.output_data = outputData;
  }
  
  if (errorMessage) {
    updates.error_message = errorMessage;
  }
  
  if (errorDetails) {
    updates.error_details = errorDetails;
  }
  
  if (status === 'completed' || status === 'failed' || status === 'cancelled') {
    updates.completed_at = new Date().toISOString();
  }
  
  const { error } = await supabase
    .from('async_jobs')
    .update(updates)
    .eq('id', jobId);
  
  if (error) {
    console.error('Failed to update job status:', error);
  }
}

// ============================================================================
// Job Processors - יחזרו לפונקציות הקיימות במערכת
// ============================================================================

/**
 * עיבוד ניתוח שיחה
 */
async function processCallAnalysis(job: AsyncJob): Promise<{
  success: boolean;
  callId?: string;
  results?: Record<string, any>;
  error?: string;
}> {
  try {
    const { audio_file, company_id, agent_id, call_type, analysis_type = 'full' } = job.input_data;
    
    // בדיקות validation
    if (!audio_file || !company_id || !agent_id || !call_type) {
      return {
        success: false,
        error: 'Missing required parameters: audio_file, company_id, agent_id, call_type',
      };
    }
    
    const supabase = getServiceClient();
    
    // 1. המרת base64 לbuffer (אם נדרש)
    let audioBuffer: Buffer;
    if (audio_file.startsWith('data:')) {
      // Data URL format
      const base64Data = audio_file.split(',')[1];
      audioBuffer = Buffer.from(base64Data, 'base64');
    } else if (audio_file.startsWith('http')) {
      // URL - הורדת הקובץ
      const response = await fetch(audio_file);
      audioBuffer = Buffer.from(await response.arrayBuffer());
    } else {
      // Base64 רגיל
      audioBuffer = Buffer.from(audio_file, 'base64');
    }
    
    // 2. שמירת הקובץ ב-Supabase Storage
    const fileName = `partner-uploads/${job.id}-${Date.now()}.mp3`;
    const { error: uploadError } = await supabase.storage
      .from('calls')
      .upload(fileName, audioBuffer, {
        contentType: 'audio/mpeg',
        upsert: false,
      });
    
    if (uploadError) {
      return {
        success: false,
        error: `Failed to upload audio: ${uploadError.message}`,
      };
    }
    
    // 3. יצירת רשומת שיחה
    const { data: call, error: callError } = await supabase
      .from('calls')
      .insert({
        user_id: agent_id,
        company_id: company_id,
        call_type: call_type,
        audio_file_path: fileName,
        processing_status: 'processing',
        analysis_type: analysis_type,
      })
      .select()
      .single();
    
    if (callError || !call) {
      return {
        success: false,
        error: `Failed to create call record: ${callError?.message}`,
      };
    }
    
    await updateJobStatus(job.id, 'processing', 30);
    
    // 4. קריאה לפונקציית העיבוד הקיימת
    // זה ישתמש בפונקציה הקיימת processCall מ-/api/process-call
    const processResponse = await fetch(`${process.env.NEXT_PUBLIC_URL || 'http://localhost:3000'}/api/process-call`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        call_id: call.id,
      }),
    });
    
    if (!processResponse.ok) {
      const errorData = await processResponse.json();
      return {
        success: false,
        callId: call.id,
        error: `Analysis failed: ${errorData.error || processResponse.statusText}`,
      };
    }
    
    await updateJobStatus(job.id, 'processing', 90);
    
    // 5. שליפת התוצאות
    const { data: processedCall } = await supabase
      .from('calls')
      .select('*')
      .eq('id', call.id)
      .single();
    
    if (!processedCall) {
      return {
        success: false,
        callId: call.id,
        error: 'Failed to retrieve processed call',
      };
    }
    
    // 6. הכנת תוצאות
    const results = {
      call_id: call.id,
      transcript: processedCall.transcript,
      tone_analysis: processedCall.tone_analysis,
      content_analysis: processedCall.content_analysis,
      overall_score: processedCall.content_analysis?.overall_score || null,
      processing_status: processedCall.processing_status,
    };
    
    return {
      success: true,
      callId: call.id,
      results,
    };
    
  } catch (error: any) {
    console.error('Call analysis processing error:', error);
    return {
      success: false,
      error: error.message || 'Unknown error during call analysis',
    };
  }
}

/**
 * עיבוד סימולציה
 */
async function processSimulation(job: AsyncJob): Promise<{
  success: boolean;
  simulationId?: string;
  results?: Record<string, any>;
  error?: string;
}> {
  try {
    const { agent_id, call_id } = job.input_data;
    
    // בדיקות validation
    if (!agent_id) {
      return {
        success: false,
        error: 'Missing required parameter: agent_id',
      };
    }
    
    await updateJobStatus(job.id, 'processing', 30);
    
    // קריאה ל-API של סימולציות
    const simulationResponse = await fetch(
      `${process.env.NEXT_PUBLIC_URL || 'http://localhost:3000'}/api/simulations/auto-trigger`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          user_id: agent_id,
          call_id: call_id || null,
        }),
      }
    );
    
    if (!simulationResponse.ok) {
      const errorData = await simulationResponse.json();
      return {
        success: false,
        error: `Simulation failed: ${errorData.error || simulationResponse.statusText}`,
      };
    }
    
    const simulationData = await simulationResponse.json();
    
    await updateJobStatus(job.id, 'processing', 90);
    
    return {
      success: true,
      simulationId: simulationData.simulation_id,
      results: simulationData,
    };
    
  } catch (error: any) {
    console.error('Simulation processing error:', error);
    return {
      success: false,
      error: error.message || 'Unknown error during simulation',
    };
  }
}

// ============================================================================
// Main Job Processor
// ============================================================================

/**
 * עיבוד job בודד
 */
export async function processJob(jobId: string): Promise<boolean> {
  const supabase = getServiceClient();
  
  try {
    // שליפת הjob
    const { data: job, error: jobError } = await supabase
      .from('async_jobs')
      .select('*')
      .eq('id', jobId)
      .single();
    
    if (jobError || !job) {
      console.error('Job not found:', jobId);
      return false;
    }
    
    // בדיקה אם כבר בעיבוד
    if (job.status !== 'pending') {
      console.log('Job already processed or in progress:', jobId);
      return true;
    }
    
    // עדכון לprocessing
    await updateJobStatus(jobId, 'processing', 10);
    
    // עיבוד לפי סוג
    let result: any;
    
    switch (job.job_type) {
      case 'call_analysis':
        result = await processCallAnalysis(job);
        break;
      
      case 'simulation':
        result = await processSimulation(job);
        break;
      
      default:
        result = {
          success: false,
          error: `Unknown job type: ${job.job_type}`,
        };
    }
    
    // עדכון סטטוס סופי
    if (result.success) {
      await updateJobStatus(
        jobId,
        'completed',
        100,
        result.results || result,
        undefined,
        undefined
      );
    } else {
      await updateJobStatus(
        jobId,
        'failed',
        undefined,
        undefined,
        result.error || 'Processing failed',
        { details: result }
      );
    }
    
    // שליחת webhook אם הוגדר
    if (job.webhook_url) {
      const webhookPayload = {
        job_id: job.id,
        job_type: job.job_type,
        status: result.success ? 'completed' as const : 'failed' as const,
        timestamp: new Date().toISOString(),
        ...(result.success ? { results: result.results || result } : {}),
        ...(result.error ? { error_message: result.error } : {}),
      };
      
      // שליחה אסינכרונית (לא נחכה)
      sendWebhook(job.id, job.webhook_url, webhookPayload).catch(error => {
        console.error('Webhook sending failed:', error);
      });
    }
    
    return result.success;
    
  } catch (error: any) {
    console.error('Job processing error:', error);
    await updateJobStatus(
      jobId,
      'failed',
      undefined,
      undefined,
      error.message || 'Unknown error',
      { stack: error.stack }
    );
    return false;
  }
}

/**
 * עיבוד כל הjobs הממתינים
 */
export async function processPendingJobs(): Promise<{
  total: number;
  successful: number;
  failed: number;
}> {
  const supabase = getServiceClient();
  
  // שליפת jobs ממתינים
  const { data: jobs, error } = await supabase
    .from('async_jobs')
    .select('id')
    .eq('status', 'pending')
    .order('created_at', { ascending: true })
    .limit(10); // עיבוד עד 10 jobs בפעם אחת
  
  if (error || !jobs) {
    console.error('Failed to fetch pending jobs:', error);
    return { total: 0, successful: 0, failed: 0 };
  }
  
  let successful = 0;
  let failed = 0;
  
  // עיבוד כל job
  for (const job of jobs) {
    const success = await processJob(job.id);
    if (success) {
      successful++;
    } else {
      failed++;
    }
  }
  
  return {
    total: jobs.length,
    successful,
    failed,
  };
}

// ============================================================================
// Exports
// ============================================================================

export default {
  processJob,
  processPendingJobs,
  updateJobStatus,
};

