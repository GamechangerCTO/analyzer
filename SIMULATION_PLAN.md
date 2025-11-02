# תוכנית מלאה: מערכת סימולציות חכמה ומושלמת 🚀

## 🎯 המטרה
הפיכת הסימולציות למשכיות טבעית של ניתוח השיחות - יואב קיבל ציון נמוך? לחיצת כפתור אחת → סימולציה ממוקדת בחולשות שזוהו.

---

## 📊 מצב קיים במסד הנתונים

### ✅ קיים:
1. **company_minutes_quotas** - דקות לניתוח שיחות (לא נוגעים!)
2. **calls** - עם `content_analysis` (32 פרמטרים), `overall_score`
3. **simulations** - עם `duration_seconds`, `triggered_by_call_id`, `status`
4. **simulation_reports_hebrew** - דוחות קיימים

### ❌ חסר:
- טבלה נפרדת למכסות דקות **סימולציה**
- פונקציות ספציפיות לסימולציה
- טבלת נוטיפיקציות
- שדות חדשים בטבלת simulations

---

## 🔨 שלב 1: תשתית DB (30 דק')

### קובץ: `migrations/001_simulation_system.sql`

```sql
-- 1. טבלה נפרדת למכסות דקות סימולציה
CREATE TABLE company_simulation_minutes_quotas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL UNIQUE REFERENCES companies(id) ON DELETE CASCADE,
  total_minutes INTEGER NOT NULL DEFAULT 100,
  used_minutes INTEGER NOT NULL DEFAULT 0,
  available_minutes INTEGER GENERATED ALWAYS AS (total_minutes - used_minutes) STORED,
  reset_date DATE DEFAULT DATE_TRUNC('month', NOW() + INTERVAL '1 month'),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_sim_quotas_company ON company_simulation_minutes_quotas(company_id);

-- 2. עדכון טבלת simulations
ALTER TABLE simulations 
ADD COLUMN IF NOT EXISTS simulation_mode TEXT DEFAULT 'manual',
ADD COLUMN IF NOT EXISTS focused_parameters JSONB DEFAULT '[]',
ADD COLUMN IF NOT EXISTS based_on_calls UUID[] DEFAULT '{}';

-- 3. טבלת נוטיפיקציות
CREATE TABLE simulation_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  notification_type TEXT NOT NULL,
  call_ids UUID[] NOT NULL DEFAULT '{}',
  parameters_to_practice JSONB NOT NULL DEFAULT '[]',
  message TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  read_at TIMESTAMP WITH TIME ZONE,
  simulation_created_at TIMESTAMP WITH TIME ZONE,
  reminded_manager_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX idx_sim_notif_agent ON simulation_notifications(agent_id);
CREATE INDEX idx_sim_notif_unread ON simulation_notifications(agent_id, read_at) WHERE read_at IS NULL;

-- 4. פונקציות
CREATE OR REPLACE FUNCTION can_create_simulation(
  p_company_id UUID,
  p_estimated_minutes INTEGER DEFAULT 10
) RETURNS BOOLEAN AS $$
DECLARE v_available_minutes INTEGER;
BEGIN
  SELECT available_minutes INTO v_available_minutes
  FROM company_simulation_minutes_quotas WHERE company_id = p_company_id;
  IF NOT FOUND THEN RETURN FALSE; END IF;
  RETURN v_available_minutes >= p_estimated_minutes;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION deduct_simulation_minutes(
  p_company_id UUID,
  p_simulation_id UUID,
  p_duration_seconds INTEGER
) RETURNS BOOLEAN AS $$
DECLARE v_minutes_to_deduct INTEGER;
BEGIN
  v_minutes_to_deduct := CEIL(p_duration_seconds / 60.0);
  UPDATE company_simulation_minutes_quotas 
  SET used_minutes = used_minutes + v_minutes_to_deduct, updated_at = NOW()
  WHERE company_id = p_company_id;
  UPDATE simulations SET duration_seconds = p_duration_seconds WHERE id = p_simulation_id;
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION get_simulation_minutes_quota(p_company_id UUID)
RETURNS TABLE(
  total_minutes INTEGER,
  used_minutes INTEGER,
  available_minutes INTEGER,
  usage_percentage DECIMAL(5,2)
) AS $$
BEGIN
  RETURN QUERY
  SELECT sq.total_minutes, sq.used_minutes, sq.available_minutes,
    ROUND((sq.used_minutes::DECIMAL / NULLIF(sq.total_minutes, 0)::DECIMAL) * 100, 2)
  FROM company_simulation_minutes_quotas sq WHERE sq.company_id = p_company_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. RLS
ALTER TABLE company_simulation_minutes_quotas ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own company simulation quota" 
ON company_simulation_minutes_quotas FOR SELECT 
USING (company_id IN (SELECT company_id FROM users WHERE id = auth.uid()));

ALTER TABLE simulation_notifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own notifications" 
ON simulation_notifications FOR SELECT 
USING (agent_id = auth.uid() OR company_id IN (SELECT company_id FROM users WHERE id = auth.uid()));

-- 6. אתחול לחברות קיימות
INSERT INTO company_simulation_minutes_quotas (company_id, total_minutes, used_minutes)
SELECT id, 100, 0 FROM companies ON CONFLICT (company_id) DO NOTHING;

-- 7. עדכון simulation_reports_hebrew
ALTER TABLE simulation_reports_hebrew 
ADD COLUMN IF NOT EXISTS before_simulation_scores JSONB DEFAULT '[]',
ADD COLUMN IF NOT EXISTS after_simulation_scores JSONB DEFAULT '[]',
ADD COLUMN IF NOT EXISTS improvement_delta JSONB DEFAULT '{}';
```

---

## 🔨 שלב 2: חילוץ פרמטרים (20 דק')

### קובץ: `lib/extract-weak-parameters.ts`

```typescript
export interface WeakParameter {
  name: string
  hebrewName: string
  score: number
  category: string
}

export function extractWeakParameters(
  contentAnalysis: any,
  scoreThreshold: number = 8
): WeakParameter[] {
  const weakParams: WeakParameter[] = []
  
  if (!contentAnalysis || typeof contentAnalysis !== 'object') {
    return weakParams
  }
  
  Object.entries(contentAnalysis).forEach(([key, value]: [string, any]) => {
    if (value && typeof value === 'object' && 'ציון' in value) {
      const score = parseInt(value.ציון) || 0
      
      if (score < scoreThreshold && score > 0) {
        weakParams.push({
          name: key,
          hebrewName: key.replace(/_/g, ' '),
          score,
          category: getCategoryForParameter(key)
        })
      }
    }
  })
  
  return weakParams.sort((a, b) => a.score - b.score)
}

function getCategoryForParameter(paramName: string): string {
  const categories: Record<string, string> = {
    'טיפול_בהתנגדויות': 'התנגדויות',
    'סגירת_עסקה': 'סגירה',
    'בירור_צרכים': 'תקשורת',
    'הצגת_תועלת': 'תקשורת',
    'בניית_קשר': 'קשר',
    'ידע_מוצר': 'ידע'
  }
  return categories[paramName] || 'כללי'
}

export function getChallengeTips(paramName: string): string {
  const tips: Record<string, string> = {
    'טיפול_בהתנגדויות': 'תביע התנגדות חזקה: "זה יקר מדי", "אני לא בטוח"',
    'סגירת_עסקה': 'תישאר מהסס גם אחרי הצעה טובה',
    'בירור_צרכים': 'אל תגלה מידע, תחכה שהנציג ישאל',
    'הצגת_תועלת': 'תשאל "מה זה ייתן לי?"'
  }
  return tips[paramName] || 'תאתגר את הנציג בתחום הזה'
}
```

---

## 🔨 שלב 3: כפתור בניתוח (30 דק')

### קובץ: `components/SimulationTriggerButton.tsx`

```tsx
'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { extractWeakParameters, WeakParameter } from '@/lib/extract-weak-parameters'

interface Props {
  callId: string
  contentAnalysis: any
  overallScore: number
}

export default function SimulationTriggerButton({ callId, contentAnalysis, overallScore }: Props) {
  const router = useRouter()
  const [isCreating, setIsCreating] = useState(false)
  
  if (overallScore >= 8) return null
  
  const weakParams = extractWeakParameters(contentAnalysis)
  if (weakParams.length === 0) return null
  
  const handleStartSimulation = async () => {
    setIsCreating(true)
    try {
      const response = await fetch('/api/simulations/create-from-analysis', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ callId, weakParameters: weakParams, autoGenerate: true })
      })
      
      const { simulationId } = await response.json()
      router.push(`/simulations/${simulationId}`)
    } catch (error) {
      console.error('Error:', error)
      alert('שגיאה ביצירת הסימולציה')
    } finally {
      setIsCreating(false)
    }
  }
  
  return (
    <div className="bg-gradient-to-r from-orange-50 to-red-50 border-2 border-orange-400 rounded-xl p-6 mt-6">
      <div className="flex items-center gap-4">
        <div className="text-5xl">🏋️</div>
        <div className="flex-1">
          <h3 className="text-xl font-bold text-orange-900 mb-2">
            מצאנו שיש מקום לשפר את השיחה הבאה
          </h3>
          <p className="text-orange-700 mb-3">
            בוא נשפר יחד את השיחה הבאה שלך - זוהו {weakParams.length} תחומים לשיפור
          </p>
          <div className="flex flex-wrap gap-2">
            {weakParams.slice(0, 3).map(param => (
              <span key={param.name} className="px-3 py-1 bg-orange-200 text-orange-900 rounded-full text-sm">
                {param.hebrewName}: {param.score}/10
              </span>
            ))}
            {weakParams.length > 3 && (
              <span className="px-3 py-1 bg-orange-100 text-orange-700 rounded-full text-sm">
                +{weakParams.length - 3} נוספים
              </span>
            )}
          </div>
        </div>
        <button
          onClick={handleStartSimulation}
          disabled={isCreating}
          className="bg-orange-600 hover:bg-orange-700 text-white px-8 py-4 rounded-lg font-bold text-lg transition-colors disabled:opacity-50"
        >
          {isCreating ? '🔄 יוצר...' : '🎯 תרגל את החולשות'}
        </button>
      </div>
    </div>
  )
}
```

### שילוב ב-`CallAnalysis.tsx`:

```tsx
import SimulationTriggerButton from './SimulationTriggerButton'

// בסוף הקומפוננטה, אחרי הדוח:
{status === 'completed' && call?.content_analysis && (
  <SimulationTriggerButton
    callId={call.id}
    contentAnalysis={call.content_analysis}
    overallScore={call.overall_score || 10}
  />
)}
```

---

## 🔨 שלב 4: API יצירה מניתוח (40 דק')

### קובץ: `app/api/simulations/create-from-analysis/route.ts`

```typescript
import { createClient } from '@/utils/supabase/server'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  try {
    const { callId, weakParameters } = await request.json()
    const supabase = createClient()
    
    // 1. שליפת השיחה
    const { data: call } = await supabase
      .from('calls')
      .select('*, users!inner(*), companies!inner(*)')
      .eq('id', callId)
      .single()
    
    if (!call) {
      return NextResponse.json({ error: 'שיחה לא נמצאה' }, { status: 404 })
    }
    
    // 2. בדיקת מכסת דקות
    const { data: canCreate } = await supabase
      .rpc('can_create_simulation', {
        p_company_id: call.company_id,
        p_estimated_minutes: 10
      })
    
    if (!canCreate) {
      return NextResponse.json({ 
        error: 'אין מספיק דקות סימולציה זמינות' 
      }, { status: 403 })
    }
    
    // 3. קבלת או יצירת persona
    const { data: existingPersonas } = await supabase
      .from('customer_personas_hebrew')
      .select('*')
      .eq('company_id', call.company_id)
      .eq('is_active', true)
      .limit(1)
    
    let personaId = existingPersonas?.[0]?.id
    
    if (!personaId) {
      // יצירת persona בסיסית
      const { data: newPersona } = await supabase
        .from('customer_personas_hebrew')
        .insert({
          company_id: call.company_id,
          created_by: call.user_id,
          customer_name: 'לקוח אימון',
          business_type: 'כללי',
          company_size: 'בינוני',
          personality_traits: ['מקצועי', 'מאתגר'],
          background_info: 'לקוח לאימון ושיפור מיומנויות',
          is_active: true
        })
        .select()
        .single()
      
      personaId = newPersona.id
    }
    
    // 4. יצירת תרחיש ממוקד
    const focusAreas = weakParameters.map((p: any) => p.hebrewName).join(', ')
    const scenario = `סימולציה ממוקדת לשיפור: ${focusAreas}`
    
    // 5. יצירת הסימולציה
    const { data: simulation } = await supabase
      .from('simulations')
      .insert({
        agent_id: call.user_id,
        company_id: call.company_id,
        simulation_type: call.call_type || 'מכירות',
        customer_persona: personaId,
        difficulty_level: 'ממוקד',
        scenario_description: scenario,
        simulation_mode: 'manual',
        focused_parameters: weakParameters,
        based_on_calls: [callId],
        status: 'pending'
      })
      .select()
      .single()
    
    return NextResponse.json({ simulationId: simulation.id })
  } catch (error) {
    console.error('Error creating simulation:', error)
    return NextResponse.json({ error: 'שגיאה ביצירת סימולציה' }, { status: 500 })
  }
}
```

---

**התוכנית ממשיכה בקובץ... (יש עוד שלבים 5-11)**

אני שומר את זה בקובץ SIMULATION_PLAN.md - תרצה שאמשיך לכתוב את כל השלבים הנוספים?

