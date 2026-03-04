/**
 * מודל עלויות מפורט למערכת הניתוח והסימולציות
 * מחירים מעודכנים לפי OpenAI API Pricing (מרץ 2026)
 */

export interface ModelPricing {
  model: string
  inputTokenPrice: number  // $ per 1M tokens
  outputTokenPrice: number // $ per 1M tokens
  audioInputPrice?: number // $ per 1M tokens (for audio models)
  audioOutputPrice?: number // $ per 1M tokens (for audio models)
  realtimeInputPrice?: number // $ per 1M tokens (for realtime models)
  realtimeOutputPrice?: number // $ per 1M tokens (for realtime models)
  description: string
  usage: string[]
}

// מחירי המודלים - מעודכן מרץ 2026
export const MODEL_PRICING: Record<string, ModelPricing> = {
  // תמלול אודיו
  'gpt-4o-mini-transcribe': {
    model: 'gpt-4o-mini-transcribe',
    inputTokenPrice: 0.15,     // $0.15 per 1M tokens
    outputTokenPrice: 0.60,    // $0.60 per 1M tokens
    description: 'GPT-4o Mini Transcribe - תמלול אודיו מהיר וחסכוני',
    usage: ['תמלול קבצי אודיו', 'תמלול WebSocket בסימולציות']
  },

  // ניתוח רגשות וטונציה מאודיו
  'gpt-audio-1.5': {
    model: 'gpt-audio-1.5',
    inputTokenPrice: 2.50,     // $2.50 per 1M text tokens
    outputTokenPrice: 10.00,   // $10.00 per 1M text tokens
    audioInputPrice: 32.00,    // $32.00 per 1M audio tokens
    audioOutputPrice: 64.00,   // $64.00 per 1M audio tokens
    description: 'GPT Audio 1.5 - ניתוח רגשות וטונציה מאודיו',
    usage: ['ניתוח טונציה מאודיו']
  },

  // ניתוח מתקדם - GPT-5 Mini
  'gpt-5-mini': {
    model: 'gpt-5-mini',
    inputTokenPrice: 0.25,     // $0.25 per 1M tokens
    outputTokenPrice: 2.00,    // $2.00 per 1M tokens
    description: 'GPT-5 Mini - ניתוח מתקדם עם reasoning',
    usage: ['ניתוח שיחות', 'תובנות צוות', 'סיכום נציג']
  },

  // מודל מהיר וחסכוני - GPT-5 Nano
  'gpt-5-nano': {
    model: 'gpt-5-nano',
    inputTokenPrice: 0.05,     // $0.05 per 1M tokens
    outputTokenPrice: 0.40,    // $0.40 per 1M tokens
    description: 'GPT-5 Nano - מהיר וחסכוני ליצירת תוכן',
    usage: ['דוח סימולציה', 'יצירת פרסונה', 'יצירת תרחיש']
  },

  // סימולציות קוליות בזמן אמת
  'gpt-realtime-1.5': {
    model: 'gpt-realtime-1.5',
    inputTokenPrice: 4.00,      // $4.00 per 1M text tokens
    outputTokenPrice: 16.00,    // $16.00 per 1M text tokens
    realtimeInputPrice: 32.00,  // $32.00 per 1M audio tokens
    realtimeOutputPrice: 64.00, // $64.00 per 1M audio tokens
    description: 'GPT Realtime 1.5 - סימולציות קוליות בזמן אמת',
    usage: ['סימולציות קוליות בזמן אמת']
  }
}

export interface CallCostEstimate {
  callType: string
  avgDurationMinutes: number
  estimatedCost: number
  breakdown: {
    transcription?: number
    toneAnalysis?: number
    contentAnalysis?: number
  }
}

export interface SimulationCostEstimate {
  simulationType: string
  durationMinutes: number
  estimatedCost: number
  breakdown: {
    realtimeAudio?: number
    transcription?: number
    reportGeneration?: number
  }
}

/**
 * מחשבון עלויות לעיבוד שיחה רגילה
 * מודלים: gpt-4o-mini-transcribe, gpt-audio-1.5, gpt-5-mini
 */
export function calculateCallProcessingCost(durationMinutes: number, callType: string = 'sales_call'): CallCostEstimate {
  let totalCost = 0
  const breakdown: any = {}

  // 1. תמלול עם gpt-4o-mini-transcribe
  // הערכה: ~150 tokens per minute of audio
  const transcriptTokens = durationMinutes * 150
  const transcriptionCost = (transcriptTokens / 1_000_000) * MODEL_PRICING['gpt-4o-mini-transcribe'].inputTokenPrice
  breakdown.transcription = transcriptionCost
  totalCost += transcriptionCost

  // 2. ניתוח טון עם gpt-audio-1.5 (אודיו + טקסט)
  const toneAudioTokens = durationMinutes * 1500 // ~1500 audio tokens per minute
  const toneAnalysisCost = (toneAudioTokens / 1_000_000) * (MODEL_PRICING['gpt-audio-1.5'].audioInputPrice || 0)
  breakdown.toneAnalysis = toneAnalysisCost
  totalCost += toneAnalysisCost

  // 3. ניתוח תוכן עם gpt-5-mini (responses API)
  // הערכה: ~750 tokens input + 750 tokens output לדקה
  const avgTokensPerMinute = 1500
  const contentInputCost = (avgTokensPerMinute * durationMinutes * 0.5 / 1_000_000) * MODEL_PRICING['gpt-5-mini'].inputTokenPrice
  const contentOutputCost = (avgTokensPerMinute * durationMinutes * 0.5 / 1_000_000) * MODEL_PRICING['gpt-5-mini'].outputTokenPrice
  breakdown.contentAnalysis = contentInputCost + contentOutputCost
  totalCost += breakdown.contentAnalysis

  return {
    callType,
    avgDurationMinutes: durationMinutes,
    estimatedCost: Math.round(totalCost * 100) / 100,
    breakdown
  }
}

/**
 * מחשבון עלויות לסימולציה בזמן אמת
 * מודלים: gpt-realtime-1.5, gpt-4o-mini-transcribe, gpt-5-nano
 */
export function calculateSimulationCost(durationMinutes: number, simulationType: string = 'realtime'): SimulationCostEstimate {
  let totalCost = 0
  const breakdown: any = {}

  // 1. Realtime Audio עם gpt-realtime-1.5
  // הערכה: ~1500 audio tokens per minute input + output
  const realtimeAudioTokens = durationMinutes * 1500
  const realtimeInputCost = (realtimeAudioTokens / 1_000_000) * (MODEL_PRICING['gpt-realtime-1.5'].realtimeInputPrice || 0)
  const realtimeOutputCost = (realtimeAudioTokens / 1_000_000) * (MODEL_PRICING['gpt-realtime-1.5'].realtimeOutputPrice || 0)
  breakdown.realtimeAudio = realtimeInputCost + realtimeOutputCost
  totalCost += breakdown.realtimeAudio

  // 2. תמלול עם gpt-4o-mini-transcribe
  const transcriptTokens = durationMinutes * 150
  breakdown.transcription = (transcriptTokens / 1_000_000) * MODEL_PRICING['gpt-4o-mini-transcribe'].inputTokenPrice
  totalCost += breakdown.transcription

  // 3. דוח סימולציה עם gpt-5-nano
  // הערכה: ~1000 tokens input + 2000 tokens output
  const reportInputCost = (1000 / 1_000_000) * MODEL_PRICING['gpt-5-nano'].inputTokenPrice
  const reportOutputCost = (2000 / 1_000_000) * MODEL_PRICING['gpt-5-nano'].outputTokenPrice
  breakdown.reportGeneration = reportInputCost + reportOutputCost
  totalCost += breakdown.reportGeneration

  return {
    simulationType,
    durationMinutes,
    estimatedCost: Math.round(totalCost * 100) / 100,
    breakdown
  }
}

/**
 * המלצות גבולות לסימולציות
 */
export interface SimulationLimits {
  maxDurationMinutes: number
  maxSimulationsPerDay: number
  maxSimulationsPerMonth: number
  estimatedMonthlyCost: number
  reasoning: string
}

export function getSimulationLimitsRecommendation(
  companySize: 'small' | 'medium' | 'large' = 'medium',
  budget: 'low' | 'medium' | 'high' = 'medium'
): SimulationLimits {
  
  const recommendations = {
    small_low: {
      maxDurationMinutes: 5,
      maxSimulationsPerDay: 2,
      maxSimulationsPerMonth: 30,
      reasoning: 'חברה קטנה עם תקציב מוגבל - סימולציות קצרות ומוגבלות'
    },
    small_medium: {
      maxDurationMinutes: 8,
      maxSimulationsPerDay: 3,
      maxSimulationsPerMonth: 50,
      reasoning: 'חברה קטנה עם תקציב בינוני - איזון בין עלות לערך'
    },
    small_high: {
      maxDurationMinutes: 12,
      maxSimulationsPerDay: 5,
      maxSimulationsPerMonth: 80,
      reasoning: 'חברה קטנה עם תקציב גבוה - מקסימום ערך לסוכנים'
    },
    medium_low: {
      maxDurationMinutes: 6,
      maxSimulationsPerDay: 5,
      maxSimulationsPerMonth: 100,
      reasoning: 'חברה בינונית עם תקציב מוגבל - פוקוס על יעילות'
    },
    medium_medium: {
      maxDurationMinutes: 10,
      maxSimulationsPerDay: 8,
      maxSimulationsPerMonth: 150,
      reasoning: 'חברה בינונית עם תקציב בינוני - המלצה מאוזנת'
    },
    medium_high: {
      maxDurationMinutes: 15,
      maxSimulationsPerDay: 12,
      maxSimulationsPerMonth: 250,
      reasoning: 'חברה בינונית עם תקציב גבוה - אימון מקסימלי'
    },
    large_low: {
      maxDurationMinutes: 8,
      maxSimulationsPerDay: 10,
      maxSimulationsPerMonth: 200,
      reasoning: 'חברה גדולה עם תקציב מוגבל - יעילות בקנה מידה'
    },
    large_medium: {
      maxDurationMinutes: 12,
      maxSimulationsPerDay: 15,
      maxSimulationsPerMonth: 300,
      reasoning: 'חברה גדולה עם תקציב בינוני - אימון מקצועי'
    },
    large_high: {
      maxDurationMinutes: 20,
      maxSimulationsPerDay: 25,
      maxSimulationsPerMonth: 500,
      reasoning: 'חברה גדולה עם תקציב גבוה - אין הגבלות מעשיות'
    }
  }

  const key = `${companySize}_${budget}` as keyof typeof recommendations
  const recommendation = recommendations[key]

  // חישוב עלות חודשית משוערת
  const avgSimulationCost = calculateSimulationCost(recommendation.maxDurationMinutes).estimatedCost
  const estimatedMonthlyCost = Math.round(avgSimulationCost * recommendation.maxSimulationsPerMonth * 100) / 100

  return {
    ...recommendation,
    estimatedMonthlyCost
  }
}

/**
 * ניתוח עלות-תועלת
 */
export interface CostBenefitAnalysis {
  scenario: string
  monthlyCost: number
  expectedBenefits: string[]
  roi: string
  recommendation: 'highly_recommended' | 'recommended' | 'consider_carefully' | 'not_recommended'
}

export function analyzeCostBenefit(
  avgSimulationsPerMonth: number,
  avgDurationMinutes: number,
  teamSize: number
): CostBenefitAnalysis {
  
  const simulationCost = calculateSimulationCost(avgDurationMinutes).estimatedCost
  const monthlyCost = simulationCost * avgSimulationsPerMonth
  const costPerAgent = monthlyCost / teamSize

  let recommendation: CostBenefitAnalysis['recommendation']
  let roi: string
  let expectedBenefits: string[]

  if (costPerAgent <= 50) {
    recommendation = 'highly_recommended'
    roi = 'גבוה מאוד - החזר השקעה תוך 1-2 חודשים'
    expectedBenefits = [
      'שיפור ביצועי מכירות ב-15-25%',
      'קיצור זמן הדרכה לעובדים חדשים ב-40%',
      'הגדלת שביעות רצון לקוחות',
      'חיסכון בעלויות הדרכה מסורתית'
    ]
  } else if (costPerAgent <= 100) {
    recommendation = 'recommended'
    roi = 'טוב - החזר השקעה תוך 2-4 חודשים'
    expectedBenefits = [
      'שיפור ביצועי מכירות ב-10-20%',
      'שיפור איכות שירות לקוחות',
      'אימון מתמשך ועקבי'
    ]
  } else if (costPerAgent <= 200) {
    recommendation = 'consider_carefully'
    roi = 'בינוני - החזר השקעה תוך 4-8 חודשים'
    expectedBenefits = [
      'שיפור מקצועי של הצוות',
      'אימון מתקדם לתרחישים מורכבים'
    ]
  } else {
    recommendation = 'not_recommended'
    roi = 'נמוך - החזר השקעה לא ברור'
    expectedBenefits = [
      'אימון מתקדם מאוד',
      'מתאים רק לחברות עם תקציב גבוה מאוד'
    ]
  }

  return {
    scenario: `${avgSimulationsPerMonth} סימולציות חודשיות, ${avgDurationMinutes} דקות ממוצע, ${teamSize} סוכנים`,
    monthlyCost: Math.round(monthlyCost * 100) / 100,
    expectedBenefits,
    roi,
    recommendation
  }
}

/**
 * דוגמאות לתרחישים שונים
 */
export function getExampleScenarios() {
  return [
    {
      name: 'סטארטאפ קטן (5 סוכנים)',
      limits: getSimulationLimitsRecommendation('small', 'medium'),
      analysis: analyzeCostBenefit(50, 8, 5)
    },
    {
      name: 'חברה בינונית (15 סוכנים)', 
      limits: getSimulationLimitsRecommendation('medium', 'medium'),
      analysis: analyzeCostBenefit(150, 10, 15)
    },
    {
      name: 'חברה גדולה (50 סוכנים)',
      limits: getSimulationLimitsRecommendation('large', 'high'),
      analysis: analyzeCostBenefit(500, 15, 50)
    }
  ]
}

/**
 * חישוב עלויות בפועל מנתוני השימוש
 */
export function calculateActualCosts(callsData: any[], simulationsData: any[] = []) {
  let totalCost = 0
  let callsCost = 0
  let simulationsCost = 0

  // עלויות עיבוד שיחות
  for (const call of callsData) {
    const duration = call.duration_minutes || 0
    if (duration > 0) {
      const cost = calculateCallProcessingCost(duration, call.call_type)
      callsCost += cost.estimatedCost
    }
  }

  // עלויות סימולציות
  for (const simulation of simulationsData) {
    const duration = (simulation.duration_seconds || 0) / 60
    if (duration > 0) {
      const cost = calculateSimulationCost(duration, simulation.simulation_type)
      simulationsCost += cost.estimatedCost
    }
  }

  totalCost = callsCost + simulationsCost

  return {
    totalCost: Math.round(totalCost * 100) / 100,
    callsCost: Math.round(callsCost * 100) / 100,
    simulationsCost: Math.round(simulationsCost * 100) / 100,
    callsCount: callsData.length,
    simulationsCount: simulationsData.length
  }
}



