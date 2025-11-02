/**
 * Partner API Type Definitions
 * מבודד לחלוטין מהמערכת הקיימת
 * Created: December 2024
 */

// ============================================================================
// Database Tables Types
// ============================================================================

export type PartnerEnvironment = 'sandbox' | 'production';
export type JobType = 'call_analysis' | 'simulation' | 'batch_analysis' | 'data_export';
export type JobStatus = 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled';
export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

export interface PartnerApiKey {
  id: string;
  partner_name: string;
  api_key_hash: string;
  api_secret_hash: string;
  environment: PartnerEnvironment;
  company_id: string | null;
  permissions: Record<string, any>;
  allowed_ips: string[] | null;
  rate_limit_per_minute: number;
  is_active: boolean;
  expires_at: string | null;
  last_used_at: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface AsyncJob {
  id: string;
  job_type: JobType;
  partner_api_key_id: string;
  company_id: string | null;
  agent_id: string | null;
  call_id: string | null;
  status: JobStatus;
  progress: number;
  input_data: Record<string, any>;
  output_data: Record<string, any> | null;
  webhook_url: string | null;
  webhook_attempts: number;
  webhook_last_attempt: string | null;
  webhook_completed: boolean;
  idempotency_key: string | null;
  error_message: string | null;
  error_details: Record<string, any> | null;
  created_at: string;
  updated_at: string;
  completed_at: string | null;
}

export interface WebhookLog {
  id: string;
  async_job_id: string;
  webhook_url: string;
  http_status: number | null;
  response_headers: Record<string, any> | null;
  response_body: string | null;
  request_payload: Record<string, any>;
  attempt_number: number;
  duration_ms: number | null;
  success: boolean;
  error_message: string | null;
  created_at: string;
}

export interface PartnerApiRequest {
  id: string;
  partner_api_key_id: string | null;
  endpoint: string;
  method: HttpMethod;
  ip_address: string | null;
  user_agent: string | null;
  request_body: Record<string, any> | null;
  response_status: number | null;
  response_time_ms: number | null;
  idempotency_key: string | null;
  created_at: string;
}

// ============================================================================
// API Request/Response Types
// ============================================================================

// Authentication
export interface PartnerAuthHeaders {
  authorization: string; // Bearer token
  'x-api-secret': string;
  'x-idempotency-key'?: string;
}

export interface PartnerAuthResult {
  is_valid: boolean;
  key_id: string | null;
  partner_name: string | null;
  environment: PartnerEnvironment | null;
  company_id: string | null;
  permissions: Record<string, any> | null;
}

// Standard Error Response
export interface PartnerApiError {
  error: {
    code: string;
    message: string;
    details?: Record<string, any>;
    timestamp: string;
  };
}

// Health Check
export interface HealthCheckResponse {
  status: 'ok' | 'degraded' | 'error';
  environment: PartnerEnvironment;
  partner_name: string;
  timestamp: string;
  version: string;
}

// Company Management
export interface CreateCompanyRequest {
  name: string;
  industry?: string;
  contact_email: string;
  questionnaire_data?: Record<string, any>;
}

export interface CreateCompanyResponse {
  company_id: string;
  status: 'created';
  message: string;
}

export interface GetCompanyResponse {
  id: string;
  name: string;
  industry: string | null;
  created_at: string;
  questionnaire_data: Record<string, any> | null;
  total_agents: number;
  total_calls: number;
}

export interface UpdateQuestionnaireRequest {
  questionnaire_data: Record<string, any>;
}

export interface UpdateQuestionnaireResponse {
  success: boolean;
  message: string;
}

// Agent Management
export interface CreateAgentRequest {
  email: string;
  name: string;
  role?: 'agent' | 'manager';
  phone?: string;
}

export interface CreateAgentResponse {
  agent_id: string;
  temporary_password: string;
  status: 'created';
  message: string;
}

export interface GetAgentsResponse {
  agents: Array<{
    id: string;
    email: string;
    name: string;
    role: string;
    created_at: string;
    total_calls: number;
    average_score: number | null;
  }>;
  total: number;
}

// Call Analysis
export interface AnalyzeCallRequest {
  audio_file: string; // base64 encoded או URL
  company_id: string;
  agent_id: string;
  call_type: string;
  webhook_url?: string;
  analysis_type?: 'full' | 'tone_only';
  metadata?: Record<string, any>;
}

export interface AnalyzeCallResponse {
  job_id: string;
  status: 'queued';
  estimated_time: string;
  message: string;
}

export interface JobStatusResponse {
  job_id: string;
  status: JobStatus;
  progress: number;
  created_at: string;
  updated_at: string;
  completed_at: string | null;
  
  // אם הושלם
  call_id?: string;
  results?: {
    transcript?: string;
    tone_analysis?: Record<string, any>;
    content_analysis?: Record<string, any>;
    overall_score?: number;
  };
  
  // אם נכשל
  error_message?: string;
  error_details?: Record<string, any>;
}

// Webhook Payload
export interface WebhookPayload {
  job_id: string;
  job_type: JobType;
  status: 'completed' | 'failed';
  timestamp: string;
  
  // אם הושלם
  call_id?: string;
  results?: Record<string, any>;
  
  // אם נכשל
  error_message?: string;
  error_details?: Record<string, any>;
}

// Simulation
export interface TriggerSimulationRequest {
  agent_id: string;
  call_id?: string;
  webhook_url?: string;
  simulation_type?: string;
}

export interface TriggerSimulationResponse {
  job_id: string;
  status: 'queued';
  estimated_time: string;
  message: string;
}

// Data Retrieval
export interface GetCallsRequest {
  company_id: string;
  from_date?: string;
  to_date?: string;
  agent_id?: string;
  call_type?: string;
  limit?: number;
  offset?: number;
}

export interface GetCallsResponse {
  calls: Array<{
    id: string;
    agent_id: string;
    agent_name: string;
    call_type: string;
    created_at: string;
    duration_seconds: number | null;
    overall_score: number | null;
    has_transcript: boolean;
    has_tone_analysis: boolean;
    has_content_analysis: boolean;
  }>;
  total: number;
  limit: number;
  offset: number;
}

export interface GetCallDetailsResponse {
  id: string;
  agent_id: string;
  agent_name: string;
  company_id: string;
  call_type: string;
  created_at: string;
  duration_seconds: number | null;
  audio_file_path: string;
  
  transcript: string | null;
  tone_analysis: Record<string, any> | null;
  content_analysis: Record<string, any> | null;
  
  overall_score: number | null;
  processing_status: string;
}

export interface GetInsightsRequest {
  company_id: string;
  from_date?: string;
  to_date?: string;
}

export interface GetInsightsResponse {
  period: {
    from: string;
    to: string;
  };
  overview: {
    total_calls: number;
    average_score: number;
    improvement_rate: number;
    total_agents: number;
  };
  top_strengths: string[];
  common_weaknesses: string[];
  top_performers: Array<{
    agent_id: string;
    agent_name: string;
    average_score: number;
    total_calls: number;
  }>;
  recommendations: string[];
}

export interface GetStatisticsRequest {
  company_id: string;
  from_date?: string;
  to_date?: string;
  group_by?: 'day' | 'week' | 'month';
}

export interface GetStatisticsResponse {
  period: {
    from: string;
    to: string;
  };
  totals: {
    calls: number;
    agents: number;
    total_duration_minutes: number;
    average_score: number;
  };
  by_call_type: Array<{
    call_type: string;
    count: number;
    average_score: number;
  }>;
  timeline: Array<{
    date: string;
    calls: number;
    average_score: number;
  }>;
}

export interface GetAgentPerformanceRequest {
  agent_id: string;
  from_date?: string;
  to_date?: string;
}

export interface GetAgentPerformanceResponse {
  agent: {
    id: string;
    name: string;
    email: string;
  };
  period: {
    from: string;
    to: string;
  };
  metrics: {
    total_calls: number;
    average_score: number;
    score_trend: 'improving' | 'stable' | 'declining';
    best_score: number;
    worst_score: number;
  };
  strengths: string[];
  areas_for_improvement: string[];
  recent_calls: Array<{
    id: string;
    date: string;
    call_type: string;
    score: number;
  }>;
}

// ============================================================================
// Admin Interface Types
// ============================================================================

export interface CreateApiKeyRequest {
  partner_name: string;
  environment: PartnerEnvironment;
  company_id?: string;
  expires_in_days?: number;
  allowed_ips?: string[];
  rate_limit_per_minute?: number;
}

export interface CreateApiKeyResponse {
  success: true;
  api_key: string;
  api_secret: string;
  key_id: string;
  environment: PartnerEnvironment;
  partner_name: string;
  warning: string; // אזהרה שהמפתחות מוצגים פעם אחת בלבד
}

export interface ListApiKeysResponse {
  keys: Array<{
    id: string;
    partner_name: string;
    environment: PartnerEnvironment;
    company_id: string | null;
    is_active: boolean;
    created_at: string;
    last_used_at: string | null;
    expires_at: string | null;
    total_requests_today: number;
  }>;
  total: number;
}

export interface UpdateApiKeyRequest {
  is_active?: boolean;
  allowed_ips?: string[];
  rate_limit_per_minute?: number;
  expires_at?: string | null;
}

export interface UpdateApiKeyResponse {
  success: boolean;
  message: string;
}

export interface ApiKeyUsageStats {
  key_id: string;
  partner_name: string;
  period: {
    from: string;
    to: string;
  };
  requests: {
    total: number;
    successful: number;
    failed: number;
    by_endpoint: Array<{
      endpoint: string;
      count: number;
      avg_response_time_ms: number;
    }>;
  };
  jobs: {
    total: number;
    completed: number;
    failed: number;
    pending: number;
  };
  webhooks: {
    total_attempts: number;
    successful: number;
    failed: number;
  };
}

// ============================================================================
// Utility Types
// ============================================================================

export interface PaginationParams {
  limit?: number;
  offset?: number;
}

export interface DateRangeParams {
  from_date?: string;
  to_date?: string;
}

export interface SuccessResponse<T = any> {
  success: true;
  data: T;
  message?: string;
}

export interface ErrorCode {
  INVALID_API_KEY: 'INVALID_API_KEY';
  EXPIRED_API_KEY: 'EXPIRED_API_KEY';
  INACTIVE_API_KEY: 'INACTIVE_API_KEY';
  RATE_LIMIT_EXCEEDED: 'RATE_LIMIT_EXCEEDED';
  INVALID_INPUT: 'INVALID_INPUT';
  RESOURCE_NOT_FOUND: 'RESOURCE_NOT_FOUND';
  DUPLICATE_REQUEST: 'DUPLICATE_REQUEST';
  WEBHOOK_DELIVERY_FAILED: 'WEBHOOK_DELIVERY_FAILED';
  INTERNAL_ERROR: 'INTERNAL_ERROR';
  INSUFFICIENT_PERMISSIONS: 'INSUFFICIENT_PERMISSIONS';
  COMPANY_NOT_FOUND: 'COMPANY_NOT_FOUND';
  AGENT_NOT_FOUND: 'AGENT_NOT_FOUND';
  JOB_NOT_FOUND: 'JOB_NOT_FOUND';
  INVALID_AUDIO_FILE: 'INVALID_AUDIO_FILE';
}

export const ErrorCodes: ErrorCode = {
  INVALID_API_KEY: 'INVALID_API_KEY',
  EXPIRED_API_KEY: 'EXPIRED_API_KEY',
  INACTIVE_API_KEY: 'INACTIVE_API_KEY',
  RATE_LIMIT_EXCEEDED: 'RATE_LIMIT_EXCEEDED',
  INVALID_INPUT: 'INVALID_INPUT',
  RESOURCE_NOT_FOUND: 'RESOURCE_NOT_FOUND',
  DUPLICATE_REQUEST: 'DUPLICATE_REQUEST',
  WEBHOOK_DELIVERY_FAILED: 'WEBHOOK_DELIVERY_FAILED',
  INTERNAL_ERROR: 'INTERNAL_ERROR',
  INSUFFICIENT_PERMISSIONS: 'INSUFFICIENT_PERMISSIONS',
  COMPANY_NOT_FOUND: 'COMPANY_NOT_FOUND',
  AGENT_NOT_FOUND: 'AGENT_NOT_FOUND',
  JOB_NOT_FOUND: 'JOB_NOT_FOUND',
  INVALID_AUDIO_FILE: 'INVALID_AUDIO_FILE',
};

