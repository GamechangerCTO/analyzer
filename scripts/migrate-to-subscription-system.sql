-- מיגרציה למערכת מנויים וחבילות
-- תאריך: דצמבר 2024

-- 1. טבלת חבילות מנוי
CREATE TABLE IF NOT EXISTS subscription_packages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL,
    display_name VARCHAR(100) NOT NULL,
    description TEXT,
    base_agents INTEGER NOT NULL DEFAULT 1,
    base_minutes INTEGER NOT NULL DEFAULT 240,
    monthly_price DECIMAL(10,2) NOT NULL,
    yearly_price DECIMAL(10,2),
    features JSONB DEFAULT '[]',
    is_active BOOLEAN DEFAULT true,
    is_popular BOOLEAN DEFAULT false,
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. טבלת מנויים
CREATE TABLE IF NOT EXISTS company_subscriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    package_id UUID NOT NULL REFERENCES subscription_packages(id),
    status VARCHAR(20) NOT NULL DEFAULT 'active', -- active, paused, cancelled, expired
    billing_cycle VARCHAR(10) NOT NULL DEFAULT 'monthly', -- monthly, yearly
    current_agents INTEGER NOT NULL DEFAULT 1,
    current_minutes INTEGER NOT NULL DEFAULT 240,
    next_billing_date DATE,
    trial_ends_at TIMESTAMP WITH TIME ZONE,
    cancelled_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(company_id)
);

-- 3. טבלת היסטוריית חיובים
CREATE TABLE IF NOT EXISTS billing_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id),
    subscription_id UUID NOT NULL REFERENCES company_subscriptions(id),
    invoice_number VARCHAR(50) UNIQUE NOT NULL,
    billing_period_start DATE NOT NULL,
    billing_period_end DATE NOT NULL,
    amount DECIMAL(10,2) NOT NULL,
    agents_count INTEGER NOT NULL,
    base_package_price DECIMAL(10,2) NOT NULL,
    additional_agents_price DECIMAL(10,2) DEFAULT 0,
    status VARCHAR(20) NOT NULL DEFAULT 'pending', -- pending, paid, failed, refunded
    payment_method VARCHAR(50),
    payment_transaction_id VARCHAR(100),
    stripe_invoice_id VARCHAR(100),
    paid_at TIMESTAMP WITH TIME ZONE,
    due_date DATE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. הוספת שדות למנוי בטבלת companies
ALTER TABLE companies 
ADD COLUMN IF NOT EXISTS subscription_id UUID REFERENCES company_subscriptions(id),
ADD COLUMN IF NOT EXISTS billing_email VARCHAR(255),
ADD COLUMN IF NOT EXISTS payment_method_id VARCHAR(100),
ADD COLUMN IF NOT EXISTS next_billing_amount DECIMAL(10,2);

-- 5. טבלת מדיניות תמחור לנציגים נוספים
CREATE TABLE IF NOT EXISTS agent_pricing_tiers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    min_agents INTEGER NOT NULL,
    max_agents INTEGER, -- NULL = אין הגבלה
    price_per_agent DECIMAL(10,2) NOT NULL,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- הכנסת מדרגות התמחור הקיימות
INSERT INTO agent_pricing_tiers (min_agents, max_agents, price_per_agent) VALUES
(1, 5, 69.00),
(6, 10, 59.00),
(11, NULL, 49.00)
ON CONFLICT DO NOTHING;

-- 6. הכנסת חבילות בסיס לדוגמה
INSERT INTO subscription_packages (
    name, display_name, description, base_agents, base_minutes, 
    monthly_price, yearly_price, features, is_popular, sort_order
) VALUES 
(
    'starter',
    'חבילת התחלה',
    'מושלמת לחברות קטנות ועסקים מתחילים',
    3,
    720, -- 3 * 240
    207.00, -- 3 * 69
    2070.00, -- חיסכון של חודש בתשלום שנתי
    '["ניתוח שיחות בלתי מוגבל", "דוחות בסיסיים", "תמיכה במייל"]',
    false,
    1
),
(
    'professional',
    'חבילה מקצועית',
    'עבור צוותי מכירות וחברות בצמיחה',
    8,
    1920, -- 8 * 240
    456.00, -- 3*69 + 5*59 = 207 + 295 = 502, ניתן הנחה ל-456
    4560.00,
    '["כל התכונות מחבילת ההתחלה", "דוחות מתקדמים", "אינטגרציות", "תמיכה טלפונית"]',
    true,
    2
),
(
    'enterprise',
    'חבילה ארגונית',
    'לארגונים גדולים עם צוותי מכירות נרחבים',
    15,
    3600, -- 15 * 240
    735.00, -- 3*69 + 5*59 + 7*49 = 207 + 295 + 343 = 845, ניתן הנחה ל-735
    7350.00,
    '["כל התכונות מהחבילות הקודמות", "ניהול משתמשים מתקדם", "תמיכה ייעודית", "אינטגרציות מותאמות אישית"]',
    false,
    3
)
ON CONFLICT (name) DO NOTHING;

-- 7. פונקציות עזר למערכת המנויים

-- פונקציה לחישוב מחיר דינמי לפי מספר נציגים
CREATE OR REPLACE FUNCTION calculate_monthly_price(agent_count INTEGER)
RETURNS DECIMAL(10,2) AS $$
DECLARE
    total_price DECIMAL(10,2) := 0;
    remaining_agents INTEGER := agent_count;
    tier_record RECORD;
BEGIN
    -- מעבר על כל מדרגות התמחור לפי סדר עולה
    FOR tier_record IN 
        SELECT min_agents, max_agents, price_per_agent 
        FROM agent_pricing_tiers 
        WHERE is_active = true 
        ORDER BY min_agents ASC
    LOOP
        -- כמה נציגים נמצאים בטווח הנוכחי
        DECLARE
            agents_in_tier INTEGER;
        BEGIN
            IF tier_record.max_agents IS NULL THEN
                -- מדרגה אחרונה ללא הגבלה
                agents_in_tier := remaining_agents;
            ELSE
                agents_in_tier := LEAST(remaining_agents, tier_record.max_agents - tier_record.min_agents + 1);
            END IF;
            
            -- הוספה למחיר הכולל
            total_price := total_price + (agents_in_tier * tier_record.price_per_agent);
            remaining_agents := remaining_agents - agents_in_tier;
            
            -- אם סיימנו עם כל הנציגים
            IF remaining_agents <= 0 THEN
                EXIT;
            END IF;
        END;
    END LOOP;
    
    RETURN total_price;
END;
$$ LANGUAGE plpgsql;

-- פונקציה לקבלת מידע על מנוי חברה
CREATE OR REPLACE FUNCTION get_company_subscription_info(p_company_id UUID)
RETURNS TABLE (
    subscription_id UUID,
    package_name VARCHAR,
    package_display_name VARCHAR,
    status VARCHAR,
    billing_cycle VARCHAR,
    current_agents INTEGER,
    current_minutes INTEGER,
    monthly_price DECIMAL,
    next_billing_date DATE,
    is_trial BOOLEAN,
    trial_days_left INTEGER
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        cs.id,
        sp.name,
        sp.display_name,
        cs.status,
        cs.billing_cycle,
        cs.current_agents,
        cs.current_minutes,
        calculate_monthly_price(cs.current_agents),
        cs.next_billing_date,
        (cs.trial_ends_at IS NOT NULL AND cs.trial_ends_at > NOW()),
        CASE 
            WHEN cs.trial_ends_at IS NOT NULL AND cs.trial_ends_at > NOW() THEN
                EXTRACT(DAY FROM cs.trial_ends_at - NOW())::INTEGER
            ELSE 0
        END
    FROM company_subscriptions cs
    JOIN subscription_packages sp ON cs.package_id = sp.id
    WHERE cs.company_id = p_company_id;
END;
$$ LANGUAGE plpgsql;

-- פונקציה ליצירת חשבונית חדשה
CREATE OR REPLACE FUNCTION create_billing_invoice(
    p_company_id UUID,
    p_subscription_id UUID,
    p_period_start DATE,
    p_period_end DATE,
    p_agents_count INTEGER
)
RETURNS UUID AS $$
DECLARE
    new_invoice_id UUID;
    base_price DECIMAL(10,2);
    total_amount DECIMAL(10,2);
    invoice_number VARCHAR(50);
BEGIN
    -- חישוב מחיר
    total_amount := calculate_monthly_price(p_agents_count);
    base_price := total_amount;
    
    -- יצירת מספר חשבונית ייחודי
    invoice_number := 'INV-' || TO_CHAR(NOW(), 'YYYYMM') || '-' || LPAD(EXTRACT(DAY FROM NOW())::TEXT, 2, '0') || '-' || 
                     SUBSTRING(p_company_id::TEXT, 1, 8);
    
    -- הכנסת החשבונית
    INSERT INTO billing_history (
        company_id, subscription_id, invoice_number,
        billing_period_start, billing_period_end,
        amount, agents_count, base_package_price,
        due_date
    ) VALUES (
        p_company_id, p_subscription_id, invoice_number,
        p_period_start, p_period_end,
        total_amount, p_agents_count, base_price,
        p_period_end + INTERVAL '7 days'
    )
    RETURNING id INTO new_invoice_id;
    
    RETURN new_invoice_id;
END;
$$ LANGUAGE plpgsql;

-- אבטחת רמת שורה (RLS)
ALTER TABLE subscription_packages ENABLE ROW LEVEL SECURITY;
ALTER TABLE company_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE billing_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_pricing_tiers ENABLE ROW LEVEL SECURITY;

-- מדיניות אבטחה לחבילות (כולם יכולים לקרוא חבילות פעילות)
CREATE POLICY "Everyone can view active packages" ON subscription_packages
    FOR SELECT USING (is_active = true);

-- מדיניות אבטחה למנויים (רק בעלי החברה יכולים לראות)
CREATE POLICY "Users can view own company subscription" ON company_subscriptions
    FOR SELECT USING (
        company_id IN (
            SELECT company_id FROM users WHERE id = auth.uid()
        )
    );

-- מדיניות אבטחה לחיובים
CREATE POLICY "Users can view own company billing" ON billing_history
    FOR SELECT USING (
        company_id IN (
            SELECT company_id FROM users WHERE id = auth.uid()
        )
    );

-- מדיניות אבטחה למדרגות תמחור (כולם יכולים לקרוא)
CREATE POLICY "Everyone can view pricing tiers" ON agent_pricing_tiers
    FOR SELECT USING (is_active = true);

-- עדכון timestamps
CREATE OR REPLACE FUNCTION update_subscription_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_subscription_packages_updated_at
    BEFORE UPDATE ON subscription_packages
    FOR EACH ROW EXECUTE FUNCTION update_subscription_updated_at();

CREATE TRIGGER update_company_subscriptions_updated_at
    BEFORE UPDATE ON company_subscriptions
    FOR EACH ROW EXECUTE FUNCTION update_subscription_updated_at();

CREATE TRIGGER update_billing_history_updated_at
    BEFORE UPDATE ON billing_history
    FOR EACH ROW EXECUTE FUNCTION update_subscription_updated_at();

COMMENT ON TABLE subscription_packages IS 'חבילות מנוי בסיסיות של המערכת';
COMMENT ON TABLE company_subscriptions IS 'מנויים פעילים של חברות';
COMMENT ON TABLE billing_history IS 'היסטוריית חיובים וחשבוניות';
COMMENT ON TABLE agent_pricing_tiers IS 'מדרגות תמחור לנציגים נוספים'; 