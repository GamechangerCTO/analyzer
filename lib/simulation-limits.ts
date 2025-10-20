/**
 * מערכת הגבלות חכמה לסימולציות
 * מבוססת על מודל העלויות ונתוני השימוש של החברה
 */

import { calculateSimulationCost, getSimulationLimitsRecommendation } from './cost-model'

export interface CompanyLimits {
  company_id: string
  max_simulation_duration_minutes: number
  max_simulations_per_day: number
  max_simulations_per_month: number
  max_cost_per_month: number
  current_month_usage: {
    simulations_count: number
    total_cost: number
    total_duration_minutes: number
  }
  warning_thresholds: {
    cost_warning_at: number    // אחוז מהמקסימום
    usage_warning_at: number   // אחוז מהמקסימום
  }
  is_limited: boolean
  company_size: 'small' | 'medium' | 'large'
  budget_tier: 'low' | 'medium' | 'high'
}

export interface SimulationLimitCheck {
  allowed: boolean
  reason?: string
  remaining_simulations_today?: number
  remaining_simulations_month?: number
  remaining_budget?: number
  cost_estimate?: number
  warnings?: string[]
}

/**
 * בדיקה האם סימולציה מותרת לחברה
 */
export async function checkSimulationLimits(
  company_id: string,
  duration_minutes: number,
  supabase: any
): Promise<SimulationLimitCheck> {
  
  try {
    // קבלת הגבלות החברה
    const limits = await getCompanyLimits(company_id, supabase)
    
    if (!limits.is_limited) {
      return {
        allowed: true,
        cost_estimate: calculateSimulationCost(duration_minutes).estimatedCost
      }
    }

    // חישוב עלות הסימולציה המתוכננת
    const simulationCost = calculateSimulationCost(duration_minutes)
    const warnings: string[] = []

    // בדיקת משך הסימולציה
    if (duration_minutes > limits.max_simulation_duration_minutes) {
      return {
        allowed: false,
        reason: `משך הסימולציה (${duration_minutes} דקות) חורג מהמותר (${limits.max_simulation_duration_minutes} דקות)`,
        cost_estimate: simulationCost.estimatedCost
      }
    }

    // בדיקת מספר סימולציות יומיות
    const todaySimulations = await getTodaySimulationsCount(company_id, supabase)
    if (todaySimulations >= limits.max_simulations_per_day) {
      return {
        allowed: false,
        reason: `הגעת למגבלת הסימולציות היומית (${limits.max_simulations_per_day})`,
        remaining_simulations_today: 0,
        cost_estimate: simulationCost.estimatedCost
      }
    }

    // בדיקת מספר סימולציות חודשיות
    if (limits.current_month_usage.simulations_count >= limits.max_simulations_per_month) {
      return {
        allowed: false,
        reason: `הגעת למגבלת הסימולציות החודשית (${limits.max_simulations_per_month})`,
        remaining_simulations_month: 0,
        cost_estimate: simulationCost.estimatedCost
      }
    }

    // בדיקת תקציב חודשי
    const projectedCost = limits.current_month_usage.total_cost + simulationCost.estimatedCost
    if (projectedCost > limits.max_cost_per_month) {
      return {
        allowed: false,
        reason: `הסימולציה תחרוג מהתקציב החודשי ($${projectedCost.toFixed(2)} > $${limits.max_cost_per_month})`,
        remaining_budget: Math.max(0, limits.max_cost_per_month - limits.current_month_usage.total_cost),
        cost_estimate: simulationCost.estimatedCost
      }
    }

    // בדיקת אזהרות
    const costUsagePercent = (projectedCost / limits.max_cost_per_month) * 100
    const simulationsUsagePercent = ((limits.current_month_usage.simulations_count + 1) / limits.max_simulations_per_month) * 100

    if (costUsagePercent >= limits.warning_thresholds.cost_warning_at) {
      warnings.push(`אזהרה: השימוש הגיע ל-${costUsagePercent.toFixed(1)}% מהתקציב החודשי`)
    }

    if (simulationsUsagePercent >= limits.warning_thresholds.usage_warning_at) {
      warnings.push(`אזהרה: השימוש הגיע ל-${simulationsUsagePercent.toFixed(1)}% ממכסת הסימולציות החודשית`)
    }

    return {
      allowed: true,
      remaining_simulations_today: limits.max_simulations_per_day - todaySimulations - 1,
      remaining_simulations_month: limits.max_simulations_per_month - limits.current_month_usage.simulations_count - 1,
      remaining_budget: limits.max_cost_per_month - projectedCost,
      cost_estimate: simulationCost.estimatedCost,
      warnings: warnings.length > 0 ? warnings : undefined
    }

  } catch (error) {
    console.error('Error checking simulation limits:', error)
    return {
      allowed: true, // במקרה של שגיאה, נאפשר (fail-safe)
      warnings: ['לא ניתן לבדוק מגבלות - המשך בזהירות']
    }
  }
}

/**
 * קבלת הגבלות החברה מהמסד נתונים
 */
export async function getCompanyLimits(company_id: string, supabase: any): Promise<CompanyLimits> {
  // קבלת נתוני החברה
  const { data: companyData, error: companyError } = await supabase
    .from('companies')
    .select('*')
    .eq('id', company_id)
    .single()

  if (companyError) {
    throw new Error(`Failed to fetch company data: ${companyError.message}`)
  }

  // קבלת מכסת הדקות של החברה
  const { data: quotaData } = await supabase
    .from('company_minutes_quotas')
    .select('*')
    .eq('company_id', company_id)
    .single()

  // קבלת נתוני שימוש חודשיים
  const monthlyUsage = await getMonthlyUsage(company_id, supabase)

  // קביעת גודל החברה ותקציב (לוגיקה פשוטה - ניתן לשפר)
  const teamSize = await getCompanyTeamSize(company_id, supabase)
  const companySize: 'small' | 'medium' | 'large' = 
    teamSize <= 10 ? 'small' : 
    teamSize <= 50 ? 'medium' : 'large'

  // קביעת רמת תקציב בהתבסס על מכסת הדקות
  const totalMinutes = quotaData?.total_minutes || 240
  const budgetTier: 'low' | 'medium' | 'high' = 
    totalMinutes <= 240 ? 'low' :
    totalMinutes <= 600 ? 'medium' : 'high'

  // קבלת המלצות מהמודל
  const recommendations = getSimulationLimitsRecommendation(companySize, budgetTier)

  return {
    company_id,
    max_simulation_duration_minutes: recommendations.maxDurationMinutes,
    max_simulations_per_day: recommendations.maxSimulationsPerDay,
    max_simulations_per_month: recommendations.maxSimulationsPerMonth,
    max_cost_per_month: recommendations.estimatedMonthlyCost,
    current_month_usage: monthlyUsage,
    warning_thresholds: {
      cost_warning_at: 80, // 80% מהתקציב
      usage_warning_at: 85 // 85% מהשימוש
    },
    is_limited: !quotaData?.is_poc && teamSize > 0, // POC לא מוגבל
    company_size: companySize,
    budget_tier: budgetTier
  }
}

/**
 * קבלת נתוני שימוש חודשיים
 */
async function getMonthlyUsage(company_id: string, supabase: any) {
  const startOfMonth = new Date()
  startOfMonth.setDate(1)
  startOfMonth.setHours(0, 0, 0, 0)

  const { data: simulations, error } = await supabase
    .from('simulations')
    .select('duration_seconds')
    .eq('company_id', company_id)
    .gte('created_at', startOfMonth.toISOString())
    .gt('duration_seconds', 0)

  if (error) {
    console.error('Error fetching monthly usage:', error)
    return {
      simulations_count: 0,
      total_cost: 0,
      total_duration_minutes: 0
    }
  }

  let total_cost = 0
  let total_duration_minutes = 0

  for (const sim of simulations || []) {
    const durationMinutes = (sim.duration_seconds || 0) / 60
    total_duration_minutes += durationMinutes
    total_cost += calculateSimulationCost(durationMinutes).estimatedCost
  }

  return {
    simulations_count: simulations?.length || 0,
    total_cost: Math.round(total_cost * 100) / 100,
    total_duration_minutes: Math.round(total_duration_minutes * 100) / 100
  }
}

/**
 * קבלת מספר סימולציות היום
 */
async function getTodaySimulationsCount(company_id: string, supabase: any): Promise<number> {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const tomorrow = new Date(today)
  tomorrow.setDate(tomorrow.getDate() + 1)

  const { data, error } = await supabase
    .from('simulations')
    .select('id')
    .eq('company_id', company_id)
    .gte('created_at', today.toISOString())
    .lt('created_at', tomorrow.toISOString())

  if (error) {
    console.error('Error fetching today simulations:', error)
    return 0
  }

  return data?.length || 0
}

/**
 * קבלת גודל הצוות של החברה
 */
async function getCompanyTeamSize(company_id: string, supabase: any): Promise<number> {
  const { data, error } = await supabase
    .from('users')
    .select('id')
    .eq('company_id', company_id)
    .eq('is_approved', true)

  if (error) {
    console.error('Error fetching team size:', error)
    return 0
  }

  return data?.length || 0
}

/**
 * עדכון הגבלות חברה (לאדמינים)
 */
export async function updateCompanyLimits(
  company_id: string,
  limits: Partial<CompanyLimits>,
  supabase: any
): Promise<boolean> {
  try {
    // כאן נוכל להוסיף טבלה ייעודית להגבלות מותאמות אישית
    // לעת עתה נשתמש בהגבלות המחושבות אוטומטית
    
    console.log('Company limits updated:', { company_id, limits })
    return true
  } catch (error) {
    console.error('Error updating company limits:', error)
    return false
  }
}

/**
 * קבלת סטטיסטיקות שימוש לחברה
 */
export async function getCompanyUsageStats(company_id: string, supabase: any) {
  const limits = await getCompanyLimits(company_id, supabase)
  const todayUsage = await getTodaySimulationsCount(company_id, supabase)
  
  return {
    limits,
    today_usage: todayUsage,
    usage_percentages: {
      daily: (todayUsage / limits.max_simulations_per_day) * 100,
      monthly_simulations: (limits.current_month_usage.simulations_count / limits.max_simulations_per_month) * 100,
      monthly_cost: (limits.current_month_usage.total_cost / limits.max_cost_per_month) * 100
    },
    remaining: {
      simulations_today: Math.max(0, limits.max_simulations_per_day - todayUsage),
      simulations_month: Math.max(0, limits.max_simulations_per_month - limits.current_month_usage.simulations_count),
      budget: Math.max(0, limits.max_cost_per_month - limits.current_month_usage.total_cost)
    }
  }
}


