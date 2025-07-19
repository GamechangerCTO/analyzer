-- Migration Script: From User Quotas to Minutes Quotas
-- מעבר ממכסות משתמשים למכסות דקות + תמיכה ב-POC

-- Step 1: Create new minutes quota table
CREATE TABLE IF NOT EXISTS company_minutes_quotas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    total_minutes INTEGER NOT NULL DEFAULT 240, -- 240 דק' לכל נציג
    used_minutes INTEGER NOT NULL DEFAULT 0,
    available_minutes INTEGER GENERATED ALWAYS AS (total_minutes - used_minutes) STORED,
    is_poc BOOLEAN NOT NULL DEFAULT FALSE, -- האם זה חברת POC
    poc_limit_minutes INTEGER DEFAULT 240, -- הגבלת דקות ל-POC (240 = נציג אחד)
    can_purchase_additional BOOLEAN GENERATED ALWAYS AS (NOT is_poc) STORED, -- POC לא יכול לרכוש
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add unique constraint
ALTER TABLE company_minutes_quotas 
ADD CONSTRAINT unique_company_minutes_quota UNIQUE (company_id);

-- Step 2: Add call duration tracking to calls table
ALTER TABLE calls 
ADD COLUMN IF NOT EXISTS duration_seconds INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS duration_minutes DECIMAL(5,2) GENERATED ALWAYS AS (duration_seconds / 60.0) STORED;

-- Step 3: Add POC flag to companies table
ALTER TABLE companies 
ADD COLUMN IF NOT EXISTS is_poc BOOLEAN DEFAULT FALSE;

-- Step 4: Migrate existing user quotas to minutes quotas
-- חישוב: 240 דק' לכל נציג פוטנציאלי (total_users * 240)
INSERT INTO company_minutes_quotas (company_id, total_minutes, used_minutes, is_poc)
SELECT 
    cq.company_id,
    cq.total_users * 240 as total_minutes, -- 240 דק' לכל נציג
    COALESCE(
        (SELECT SUM(EXTRACT(EPOCH FROM (NOW() - c.created_at))/60) 
         FROM calls c 
         WHERE c.company_id = cq.company_id), 0
    )::INTEGER as used_minutes, -- דקות בפועל משיחות קיימות (אמידה)
    c.is_poc
FROM company_user_quotas cq
JOIN companies c ON c.id = cq.company_id
ON CONFLICT (company_id) DO UPDATE SET
    total_minutes = EXCLUDED.total_minutes,
    updated_at = NOW();

-- Step 5: Create functions for minutes quota management

-- Function: Check if company can process a call of specific duration
CREATE OR REPLACE FUNCTION can_process_call_duration(
    p_company_id UUID,
    p_estimated_minutes INTEGER DEFAULT 10
) RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_available_minutes INTEGER;
    v_is_poc BOOLEAN;
BEGIN
    -- Get current quota info
    SELECT available_minutes, is_poc
    INTO v_available_minutes, v_is_poc
    FROM company_minutes_quotas 
    WHERE company_id = p_company_id;
    
    -- If no quota found, deny
    IF NOT FOUND THEN
        RETURN FALSE;
    END IF;
    
    -- Check if enough minutes available
    RETURN v_available_minutes >= p_estimated_minutes;
END;
$$;

-- Function: Deduct minutes after call processing
CREATE OR REPLACE FUNCTION deduct_call_minutes(
    p_company_id UUID,
    p_call_id UUID,
    p_actual_duration_seconds INTEGER
) RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_minutes_to_deduct INTEGER;
    v_available_minutes INTEGER;
BEGIN
    -- Calculate minutes to deduct (round up)
    v_minutes_to_deduct := CEIL(p_actual_duration_seconds / 60.0);
    
    -- Check available minutes
    SELECT available_minutes INTO v_available_minutes
    FROM company_minutes_quotas 
    WHERE company_id = p_company_id;
    
    IF NOT FOUND OR v_available_minutes < v_minutes_to_deduct THEN
        RETURN FALSE;
    END IF;
    
    -- Update quota
    UPDATE company_minutes_quotas 
    SET used_minutes = used_minutes + v_minutes_to_deduct,
        updated_at = NOW()
    WHERE company_id = p_company_id;
    
    -- Update call duration
    UPDATE calls 
    SET duration_seconds = p_actual_duration_seconds
    WHERE id = p_call_id;
    
    RETURN TRUE;
END;
$$;

-- Function: Get company minutes quota info
CREATE OR REPLACE FUNCTION get_company_minutes_quota(p_company_id UUID)
RETURNS TABLE(
    total_minutes INTEGER,
    used_minutes INTEGER,
    available_minutes INTEGER,
    is_poc BOOLEAN,
    can_purchase_additional BOOLEAN,
    usage_percentage DECIMAL(5,2)
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        cmq.total_minutes,
        cmq.used_minutes,
        cmq.available_minutes,
        cmq.is_poc,
        cmq.can_purchase_additional,
        ROUND((cmq.used_minutes::DECIMAL / cmq.total_minutes::DECIMAL) * 100, 2) as usage_percentage
    FROM company_minutes_quotas cmq
    WHERE cmq.company_id = p_company_id;
END;
$$;

-- Function: Add minutes to company quota (for purchases)
CREATE OR REPLACE FUNCTION add_minutes_to_company(
    p_company_id UUID,
    p_additional_minutes INTEGER
) RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_is_poc BOOLEAN;
BEGIN
    -- Check if company is POC (cannot purchase)
    SELECT is_poc INTO v_is_poc
    FROM company_minutes_quotas 
    WHERE company_id = p_company_id;
    
    IF NOT FOUND THEN
        RETURN FALSE;
    END IF;
    
    -- POC companies cannot purchase additional minutes
    IF v_is_poc THEN
        RETURN FALSE;
    END IF;
    
    -- Add minutes
    UPDATE company_minutes_quotas 
    SET total_minutes = total_minutes + p_additional_minutes,
        updated_at = NOW()
    WHERE company_id = p_company_id;
    
    RETURN TRUE;
END;
$$;

-- Step 6: Create triggers for automatic updates
CREATE OR REPLACE FUNCTION update_company_minutes_quota() 
RETURNS TRIGGER AS $$
BEGIN
    -- Update the updated_at timestamp
    UPDATE company_minutes_quotas 
    SET updated_at = NOW() 
    WHERE company_id = NEW.company_id;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for calls table
DROP TRIGGER IF EXISTS update_minutes_quota_trigger ON calls;
CREATE TRIGGER update_minutes_quota_trigger
    AFTER INSERT OR UPDATE ON calls
    FOR EACH ROW 
    EXECUTE FUNCTION update_company_minutes_quota();

-- Step 7: Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_company_minutes_quotas_company_id ON company_minutes_quotas(company_id);
CREATE INDEX IF NOT EXISTS idx_company_minutes_quotas_is_poc ON company_minutes_quotas(is_poc);
CREATE INDEX IF NOT EXISTS idx_calls_duration ON calls(duration_seconds) WHERE duration_seconds > 0;
CREATE INDEX IF NOT EXISTS idx_calls_company_duration ON calls(company_id, duration_seconds);

-- Step 8: Add RLS (Row Level Security) policies
ALTER TABLE company_minutes_quotas ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view their own company's minutes quota
CREATE POLICY "Users can view own company minutes quota" ON company_minutes_quotas
    FOR SELECT USING (
        company_id IN (
            SELECT company_id FROM users 
            WHERE id = auth.uid()
        )
    );

-- Policy: Only admins can modify minutes quotas
CREATE POLICY "Only admins can modify minutes quotas" ON company_minutes_quotas
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM users u
            JOIN system_admins sa ON sa.user_id = u.id
            WHERE u.id = auth.uid()
        )
    );

-- Step 9: Update existing calls with estimated duration (fallback)
-- אמידה בסיסית: 300 שניות (5 דק') לשיחות ללא duration
UPDATE calls 
SET duration_seconds = 300 
WHERE duration_seconds = 0 OR duration_seconds IS NULL;

-- Step 10: Verification queries
-- הצגת המצב החדש
DO $$
BEGIN
    RAISE NOTICE 'Migration completed successfully!';
    RAISE NOTICE 'Companies with minutes quotas: %', (SELECT COUNT(*) FROM company_minutes_quotas);
    RAISE NOTICE 'POC companies: %', (SELECT COUNT(*) FROM company_minutes_quotas WHERE is_poc = true);
    RAISE NOTICE 'Total minutes allocated: %', (SELECT SUM(total_minutes) FROM company_minutes_quotas);
    RAISE NOTICE 'Total minutes used: %', (SELECT SUM(used_minutes) FROM company_minutes_quotas);
END $$; 