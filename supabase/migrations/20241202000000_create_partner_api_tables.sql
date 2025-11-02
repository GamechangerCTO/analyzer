-- Partner API Tables Migration
-- מבודד לחלוטין מהמערכת הקיימת
-- Created: December 2024

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================================
-- Table 1: partner_api_keys
-- מפתחות API לשותפים עסקיים
-- ============================================================================

CREATE TABLE IF NOT EXISTS partner_api_keys (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    partner_name TEXT NOT NULL,
    
    -- API credentials (hashed for security)
    api_key_hash TEXT UNIQUE NOT NULL,
    api_secret_hash TEXT NOT NULL,
    
    -- Environment (sandbox or production)
    environment TEXT NOT NULL CHECK (environment IN ('sandbox', 'production')),
    
    -- Optional: link to specific company
    company_id UUID REFERENCES companies(id) ON DELETE SET NULL,
    
    -- Permissions (JSON for flexibility)
    permissions JSONB DEFAULT '{"all": true}'::jsonb,
    
    -- Security features
    allowed_ips TEXT[], -- IP whitelist (optional)
    rate_limit_per_minute INTEGER DEFAULT 1000,
    
    -- Status and expiration
    is_active BOOLEAN DEFAULT true,
    expires_at TIMESTAMP WITH TIME ZONE,
    last_used_at TIMESTAMP WITH TIME ZONE,
    
    -- Audit
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_partner_api_keys_hash ON partner_api_keys(api_key_hash);
CREATE INDEX idx_partner_api_keys_active ON partner_api_keys(is_active) WHERE is_active = true;
CREATE INDEX idx_partner_api_keys_environment ON partner_api_keys(environment);

-- Auto-update timestamp
CREATE OR REPLACE FUNCTION update_partner_api_keys_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_partner_api_keys_timestamp
    BEFORE UPDATE ON partner_api_keys
    FOR EACH ROW
    EXECUTE FUNCTION update_partner_api_keys_updated_at();

-- ============================================================================
-- Table 2: async_jobs
-- ניהול משימות אסינכרוניות (ניתוח שיחות, סימולציות וכו')
-- ============================================================================

CREATE TABLE IF NOT EXISTS async_jobs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- Job metadata
    job_type TEXT NOT NULL CHECK (job_type IN ('call_analysis', 'simulation', 'batch_analysis', 'data_export')),
    
    -- Relations
    partner_api_key_id UUID NOT NULL REFERENCES partner_api_keys(id) ON DELETE CASCADE,
    company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
    agent_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    call_id UUID REFERENCES calls(id) ON DELETE SET NULL,
    
    -- Status tracking
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed', 'cancelled')),
    progress INTEGER DEFAULT 0 CHECK (progress >= 0 AND progress <= 100),
    
    -- Data
    input_data JSONB NOT NULL,
    output_data JSONB,
    
    -- Webhook configuration
    webhook_url TEXT,
    webhook_attempts INTEGER DEFAULT 0,
    webhook_last_attempt TIMESTAMP WITH TIME ZONE,
    webhook_completed BOOLEAN DEFAULT false,
    
    -- Idempotency (prevent duplicate requests)
    idempotency_key TEXT UNIQUE,
    
    -- Error handling
    error_message TEXT,
    error_details JSONB,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    completed_at TIMESTAMP WITH TIME ZONE
);

-- Indexes for queries
CREATE INDEX idx_async_jobs_status ON async_jobs(status);
CREATE INDEX idx_async_jobs_partner ON async_jobs(partner_api_key_id);
CREATE INDEX idx_async_jobs_company ON async_jobs(company_id);
CREATE INDEX idx_async_jobs_created ON async_jobs(created_at DESC);
CREATE INDEX idx_async_jobs_type ON async_jobs(job_type);
CREATE INDEX idx_async_jobs_idempotency ON async_jobs(idempotency_key) WHERE idempotency_key IS NOT NULL;

-- Auto-update timestamp
CREATE OR REPLACE FUNCTION update_async_jobs_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    
    -- Auto-set completed_at when status becomes completed or failed
    IF NEW.status IN ('completed', 'failed', 'cancelled') AND OLD.status NOT IN ('completed', 'failed', 'cancelled') THEN
        NEW.completed_at = NOW();
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_async_jobs_timestamp
    BEFORE UPDATE ON async_jobs
    FOR EACH ROW
    EXECUTE FUNCTION update_async_jobs_updated_at();

-- ============================================================================
-- Table 3: webhook_logs
-- מעקב אחר כל קריאות webhook שנשלחו
-- ============================================================================

CREATE TABLE IF NOT EXISTS webhook_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- Relation to job
    async_job_id UUID NOT NULL REFERENCES async_jobs(id) ON DELETE CASCADE,
    
    -- Webhook details
    webhook_url TEXT NOT NULL,
    
    -- HTTP response
    http_status INTEGER,
    response_headers JSONB,
    response_body TEXT,
    
    -- Request data
    request_payload JSONB NOT NULL,
    
    -- Attempt tracking
    attempt_number INTEGER NOT NULL,
    duration_ms INTEGER,
    
    -- Result
    success BOOLEAN DEFAULT false,
    error_message TEXT,
    
    -- Timestamp
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_webhook_logs_job ON webhook_logs(async_job_id);
CREATE INDEX idx_webhook_logs_created ON webhook_logs(created_at DESC);
CREATE INDEX idx_webhook_logs_success ON webhook_logs(success);

-- ============================================================================
-- Table 4: partner_api_requests
-- לוג של כל הקריאות ל-Partner API (לניטור וסטטיסטיקות)
-- ============================================================================

CREATE TABLE IF NOT EXISTS partner_api_requests (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- Partner identification
    partner_api_key_id UUID REFERENCES partner_api_keys(id) ON DELETE SET NULL,
    
    -- Request details
    endpoint TEXT NOT NULL,
    method TEXT NOT NULL CHECK (method IN ('GET', 'POST', 'PUT', 'PATCH', 'DELETE')),
    
    -- Client info
    ip_address TEXT,
    user_agent TEXT,
    
    -- Request/Response
    request_body JSONB,
    response_status INTEGER,
    response_time_ms INTEGER,
    
    -- Idempotency
    idempotency_key TEXT,
    
    -- Timestamp
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for analytics
CREATE INDEX idx_partner_requests_key ON partner_api_requests(partner_api_key_id);
CREATE INDEX idx_partner_requests_created ON partner_api_requests(created_at DESC);
CREATE INDEX idx_partner_requests_endpoint ON partner_api_requests(endpoint);
CREATE INDEX idx_partner_requests_status ON partner_api_requests(response_status);

-- ============================================================================
-- RLS Policies
-- Row Level Security לבטיחות מירבית
-- ============================================================================

-- Enable RLS on all tables
ALTER TABLE partner_api_keys ENABLE ROW LEVEL SECURITY;
ALTER TABLE async_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE webhook_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE partner_api_requests ENABLE ROW LEVEL SECURITY;

-- Policy 1: partner_api_keys - רק super_admin יכול לראות
CREATE POLICY "Super admin can view all partner keys"
    ON partner_api_keys
    FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM auth.users
            WHERE id = auth.uid() AND role = 'super_admin'
        )
    );

CREATE POLICY "Super admin can insert partner keys"
    ON partner_api_keys
    FOR INSERT
    TO authenticated
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM auth.users
            WHERE id = auth.uid() AND role = 'super_admin'
        )
    );

CREATE POLICY "Super admin can update partner keys"
    ON partner_api_keys
    FOR UPDATE
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM auth.users
            WHERE id = auth.uid() AND role = 'super_admin'
        )
    );

-- Policy 2: async_jobs - super_admin או jobs של החברה שלהם
CREATE POLICY "Super admin can view all jobs"
    ON async_jobs
    FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM auth.users
            WHERE id = auth.uid() AND role = 'super_admin'
        )
    );

CREATE POLICY "Users can view their company jobs"
    ON async_jobs
    FOR SELECT
    TO authenticated
    USING (
        company_id IN (
            SELECT company_id FROM auth.users WHERE id = auth.uid()
        )
    );

-- Policy 3: webhook_logs - רק super_admin
CREATE POLICY "Super admin can view webhook logs"
    ON webhook_logs
    FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM auth.users
            WHERE id = auth.uid() AND role = 'super_admin'
        )
    );

-- Policy 4: partner_api_requests - רק super_admin
CREATE POLICY "Super admin can view api requests"
    ON partner_api_requests
    FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM auth.users
            WHERE id = auth.uid() AND role = 'super_admin'
        )
    );

-- ============================================================================
-- Helper Functions
-- פונקציות עזר לניהול Partner API
-- ============================================================================

-- Function 1: Generate new Partner API key
CREATE OR REPLACE FUNCTION generate_partner_api_key(
    p_partner_name TEXT,
    p_environment TEXT,
    p_company_id UUID DEFAULT NULL,
    p_expires_in_days INTEGER DEFAULT NULL
)
RETURNS TABLE(api_key TEXT, api_secret TEXT, key_id UUID)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_api_key TEXT;
    v_api_secret TEXT;
    v_key_hash TEXT;
    v_secret_hash TEXT;
    v_key_id UUID;
    v_expires_at TIMESTAMP WITH TIME ZONE;
BEGIN
    -- בדיקת הרשאות - רק super_admin
    IF NOT EXISTS (
        SELECT 1 FROM auth.users 
        WHERE id = auth.uid() AND role = 'super_admin'
    ) THEN
        RAISE EXCEPTION 'Only super_admin can generate API keys';
    END IF;
    
    -- Validate environment
    IF p_environment NOT IN ('sandbox', 'production') THEN
        RAISE EXCEPTION 'Environment must be sandbox or production';
    END IF;
    
    -- יצירת מפתחות אקראיים
    v_api_key := 'pk_' || p_environment || '_' || encode(gen_random_bytes(32), 'hex');
    v_api_secret := 'sk_' || encode(gen_random_bytes(32), 'hex');
    
    -- Hash המפתחות (SHA-256)
    v_key_hash := encode(digest(v_api_key, 'sha256'), 'hex');
    v_secret_hash := encode(digest(v_api_secret, 'sha256'), 'hex');
    
    -- חישוב תאריך פקיעה
    IF p_expires_in_days IS NOT NULL THEN
        v_expires_at := NOW() + (p_expires_in_days || ' days')::INTERVAL;
    END IF;
    
    -- שמירה בטבלה
    INSERT INTO partner_api_keys (
        partner_name, 
        api_key_hash, 
        api_secret_hash, 
        environment, 
        company_id,
        expires_at,
        created_by
    ) VALUES (
        p_partner_name, 
        v_key_hash, 
        v_secret_hash,
        p_environment, 
        p_company_id,
        v_expires_at,
        auth.uid()
    )
    RETURNING id INTO v_key_id;
    
    -- החזרת המפתחות (רק פעם אחת!)
    RETURN QUERY SELECT v_api_key, v_api_secret, v_key_id;
END;
$$;

-- Function 2: Validate Partner API Key
CREATE OR REPLACE FUNCTION validate_partner_api_key(
    p_api_key TEXT,
    p_api_secret TEXT
)
RETURNS TABLE(
    is_valid BOOLEAN,
    key_id UUID,
    partner_name TEXT,
    environment TEXT,
    company_id UUID,
    permissions JSONB
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_key_hash TEXT;
    v_secret_hash TEXT;
BEGIN
    -- Hash המפתחות שהתקבלו
    v_key_hash := encode(digest(p_api_key, 'sha256'), 'hex');
    v_secret_hash := encode(digest(p_api_secret, 'sha256'), 'hex');
    
    -- בדיקה בטבלה
    RETURN QUERY
    SELECT 
        true as is_valid,
        pak.id,
        pak.partner_name,
        pak.environment,
        pak.company_id,
        pak.permissions
    FROM partner_api_keys pak
    WHERE 
        pak.api_key_hash = v_key_hash
        AND pak.api_secret_hash = v_secret_hash
        AND pak.is_active = true
        AND (pak.expires_at IS NULL OR pak.expires_at > NOW());
    
    -- אם לא נמצא, החזר false
    IF NOT FOUND THEN
        RETURN QUERY SELECT false, NULL::UUID, NULL::TEXT, NULL::TEXT, NULL::UUID, NULL::JSONB;
    ELSE
        -- עדכן last_used_at
        UPDATE partner_api_keys 
        SET last_used_at = NOW()
        WHERE api_key_hash = v_key_hash;
    END IF;
END;
$$;

-- Function 3: Get Partner API Usage Statistics
CREATE OR REPLACE FUNCTION get_partner_api_usage(
    p_partner_api_key_id UUID,
    p_from_date TIMESTAMP WITH TIME ZONE DEFAULT NOW() - INTERVAL '30 days',
    p_to_date TIMESTAMP WITH TIME ZONE DEFAULT NOW()
)
RETURNS TABLE(
    total_requests BIGINT,
    successful_requests BIGINT,
    failed_requests BIGINT,
    avg_response_time_ms NUMERIC,
    total_jobs BIGINT,
    completed_jobs BIGINT,
    failed_jobs BIGINT,
    pending_jobs BIGINT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- בדיקת הרשאות
    IF NOT EXISTS (
        SELECT 1 FROM auth.users 
        WHERE id = auth.uid() AND role = 'super_admin'
    ) THEN
        RAISE EXCEPTION 'Only super_admin can view usage statistics';
    END IF;
    
    RETURN QUERY
    SELECT 
        -- Request statistics
        COUNT(par.id) as total_requests,
        COUNT(par.id) FILTER (WHERE par.response_status >= 200 AND par.response_status < 300) as successful_requests,
        COUNT(par.id) FILTER (WHERE par.response_status >= 400) as failed_requests,
        ROUND(AVG(par.response_time_ms), 2) as avg_response_time_ms,
        
        -- Job statistics
        COUNT(DISTINCT aj.id) as total_jobs,
        COUNT(DISTINCT aj.id) FILTER (WHERE aj.status = 'completed') as completed_jobs,
        COUNT(DISTINCT aj.id) FILTER (WHERE aj.status = 'failed') as failed_jobs,
        COUNT(DISTINCT aj.id) FILTER (WHERE aj.status = 'pending') as pending_jobs
    FROM partner_api_requests par
    LEFT JOIN async_jobs aj ON aj.partner_api_key_id = par.partner_api_key_id
    WHERE 
        par.partner_api_key_id = p_partner_api_key_id
        AND par.created_at BETWEEN p_from_date AND p_to_date;
END;
$$;

-- Function 4: Clean up old data (for maintenance)
CREATE OR REPLACE FUNCTION cleanup_partner_api_logs(
    p_days_to_keep INTEGER DEFAULT 90
)
RETURNS TABLE(
    deleted_requests BIGINT,
    deleted_webhook_logs BIGINT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_deleted_requests BIGINT;
    v_deleted_logs BIGINT;
    v_cutoff_date TIMESTAMP WITH TIME ZONE;
BEGIN
    -- בדיקת הרשאות
    IF NOT EXISTS (
        SELECT 1 FROM auth.users 
        WHERE id = auth.uid() AND role = 'super_admin'
    ) THEN
        RAISE EXCEPTION 'Only super_admin can cleanup logs';
    END IF;
    
    v_cutoff_date := NOW() - (p_days_to_keep || ' days')::INTERVAL;
    
    -- מחיקת בקשות ישנות
    DELETE FROM partner_api_requests
    WHERE created_at < v_cutoff_date;
    GET DIAGNOSTICS v_deleted_requests = ROW_COUNT;
    
    -- מחיקת webhook logs ישנים
    DELETE FROM webhook_logs
    WHERE created_at < v_cutoff_date;
    GET DIAGNOSTICS v_deleted_logs = ROW_COUNT;
    
    RETURN QUERY SELECT v_deleted_requests, v_deleted_logs;
END;
$$;

-- ============================================================================
-- Comments for documentation
-- ============================================================================

COMMENT ON TABLE partner_api_keys IS 'מפתחות API לשותפים עסקיים - מבודד מהמערכת הקיימת';
COMMENT ON TABLE async_jobs IS 'ניהול משימות אסינכרוניות (ניתוח שיחות, סימולציות)';
COMMENT ON TABLE webhook_logs IS 'לוג של כל קריאות webhook שנשלחו לשותפים';
COMMENT ON TABLE partner_api_requests IS 'לוג של כל הקריאות ל-Partner API לסטטיסטיקות';

COMMENT ON FUNCTION generate_partner_api_key IS 'יוצר זוג API key + secret חדש לשותף (רק super_admin)';
COMMENT ON FUNCTION validate_partner_api_key IS 'מאמת API key + secret ומחזיר פרטי השותף';
COMMENT ON FUNCTION get_partner_api_usage IS 'מחזיר סטטיסטיקות שימוש של שותף';
COMMENT ON FUNCTION cleanup_partner_api_logs IS 'מנקה לוגים ישנים (maintenance)';

-- ============================================================================
-- Initial data (optional)
-- ============================================================================

-- אין נתונים ראשוניים - הכל ייווצר דרך הממשק

