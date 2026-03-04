import { describe, it, expect } from 'vitest'
import {
  calculateCallProcessingCost,
  calculateSimulationCost,
  getSimulationLimitsRecommendation,
  analyzeCostBenefit,
  calculateActualCosts,
  getExampleScenarios,
  MODEL_PRICING,
} from '@/lib/cost-model'

describe('cost-model', () => {
  // =========================================================================
  // calculateCallProcessingCost
  // =========================================================================
  describe('calculateCallProcessingCost', () => {
    it('returns correct structure with all breakdown keys', () => {
      const result = calculateCallProcessingCost(5)
      expect(result).toHaveProperty('callType')
      expect(result).toHaveProperty('avgDurationMinutes', 5)
      expect(result).toHaveProperty('estimatedCost')
      expect(result).toHaveProperty('breakdown')
      expect(result.breakdown).toHaveProperty('transcription')
      expect(result.breakdown).toHaveProperty('toneAnalysis')
      expect(result.breakdown).toHaveProperty('contentAnalysis')
    })

    it('defaults callType to sales_call', () => {
      const result = calculateCallProcessingCost(5)
      expect(result.callType).toBe('sales_call')
    })

    it('uses provided callType', () => {
      const result = calculateCallProcessingCost(5, 'customer_service')
      expect(result.callType).toBe('customer_service')
    })

    it('cost is proportional to duration (2x duration ≈ 2x cost)', () => {
      const cost5 = calculateCallProcessingCost(5)
      const cost10 = calculateCallProcessingCost(10)
      // Content analysis has both proportional and fixed components,
      // but in this model all components are duration-based
      if (cost5.estimatedCost > 0) {
        expect(cost10.estimatedCost).toBeCloseTo(cost5.estimatedCost * 2, 2)
      }
    })

    it('zero duration returns zero cost', () => {
      const result = calculateCallProcessingCost(0)
      expect(result.estimatedCost).toBe(0)
      expect(result.breakdown.transcription).toBe(0)
      expect(result.breakdown.toneAnalysis).toBe(0)
      expect(result.breakdown.contentAnalysis).toBe(0)
    })

    it('rounds to 2 decimal places', () => {
      const result = calculateCallProcessingCost(7)
      const decimals = result.estimatedCost.toString().split('.')[1]
      expect(!decimals || decimals.length <= 2).toBe(true)
    })

    it('estimatedCost equals sum of breakdown', () => {
      const result = calculateCallProcessingCost(10)
      const sum = (result.breakdown.transcription ?? 0) +
                  (result.breakdown.toneAnalysis ?? 0) +
                  (result.breakdown.contentAnalysis ?? 0)
      expect(result.estimatedCost).toBeCloseTo(Math.round(sum * 100) / 100, 2)
    })
  })

  // =========================================================================
  // calculateSimulationCost
  // =========================================================================
  describe('calculateSimulationCost', () => {
    it('returns correct structure with all breakdown keys', () => {
      const result = calculateSimulationCost(10)
      expect(result).toHaveProperty('simulationType')
      expect(result).toHaveProperty('durationMinutes', 10)
      expect(result).toHaveProperty('estimatedCost')
      expect(result.breakdown).toHaveProperty('realtimeAudio')
      expect(result.breakdown).toHaveProperty('transcription')
      expect(result.breakdown).toHaveProperty('reportGeneration')
    })

    it('defaults simulationType to realtime', () => {
      const result = calculateSimulationCost(10)
      expect(result.simulationType).toBe('realtime')
    })

    it('zero duration returns zero or near-zero cost', () => {
      const result = calculateSimulationCost(0)
      expect(result.estimatedCost).toBe(0)
    })

    it('rounds to 2 decimal places', () => {
      const result = calculateSimulationCost(13)
      const decimals = result.estimatedCost.toString().split('.')[1]
      expect(!decimals || decimals.length <= 2).toBe(true)
    })

    it('estimatedCost equals sum of breakdown', () => {
      const result = calculateSimulationCost(10)
      const sum = (result.breakdown.realtimeAudio ?? 0) +
                  (result.breakdown.transcription ?? 0) +
                  (result.breakdown.reportGeneration ?? 0)
      expect(result.estimatedCost).toBeCloseTo(Math.round(sum * 100) / 100, 2)
    })
  })

  // =========================================================================
  // getSimulationLimitsRecommendation
  // =========================================================================
  describe('getSimulationLimitsRecommendation', () => {
    const sizes = ['small', 'medium', 'large'] as const
    const budgets = ['low', 'medium', 'high'] as const

    it('returns valid object for all 9 size×budget combinations', () => {
      for (const size of sizes) {
        for (const budget of budgets) {
          const result = getSimulationLimitsRecommendation(size, budget)
          expect(result).toHaveProperty('maxDurationMinutes')
          expect(result).toHaveProperty('maxSimulationsPerDay')
          expect(result).toHaveProperty('maxSimulationsPerMonth')
          expect(result).toHaveProperty('estimatedMonthlyCost')
          expect(result).toHaveProperty('reasoning')
          expect(typeof result.maxDurationMinutes).toBe('number')
          expect(typeof result.maxSimulationsPerDay).toBe('number')
          expect(typeof result.maxSimulationsPerMonth).toBe('number')
          expect(typeof result.estimatedMonthlyCost).toBe('number')
          expect(typeof result.reasoning).toBe('string')
        }
      }
    })

    it('defaults to medium/medium when no params', () => {
      const result = getSimulationLimitsRecommendation()
      const explicit = getSimulationLimitsRecommendation('medium', 'medium')
      expect(result.maxDurationMinutes).toBe(explicit.maxDurationMinutes)
      expect(result.maxSimulationsPerDay).toBe(explicit.maxSimulationsPerDay)
    })

    it('higher budget allows more simulations per month', () => {
      const low = getSimulationLimitsRecommendation('medium', 'low')
      const high = getSimulationLimitsRecommendation('medium', 'high')
      expect(high.maxSimulationsPerMonth).toBeGreaterThan(low.maxSimulationsPerMonth)
    })

    it('larger company size allows more simulations per day', () => {
      const small = getSimulationLimitsRecommendation('small', 'medium')
      const large = getSimulationLimitsRecommendation('large', 'medium')
      expect(large.maxSimulationsPerDay).toBeGreaterThan(small.maxSimulationsPerDay)
    })

    it('estimatedMonthlyCost is non-negative', () => {
      for (const size of sizes) {
        for (const budget of budgets) {
          const result = getSimulationLimitsRecommendation(size, budget)
          expect(result.estimatedMonthlyCost).toBeGreaterThanOrEqual(0)
        }
      }
    })
  })

  // =========================================================================
  // analyzeCostBenefit
  // =========================================================================
  describe('analyzeCostBenefit', () => {
    it('returns highly_recommended when costPerAgent <= 50', () => {
      // With current TBD pricing (all 0), costs will be 0 -> highly_recommended
      const result = analyzeCostBenefit(10, 5, 5)
      expect(result.recommendation).toBe('highly_recommended')
    })

    it('returns correct structure', () => {
      const result = analyzeCostBenefit(50, 10, 10)
      expect(result).toHaveProperty('scenario')
      expect(result).toHaveProperty('monthlyCost')
      expect(result).toHaveProperty('expectedBenefits')
      expect(result).toHaveProperty('roi')
      expect(result).toHaveProperty('recommendation')
      expect(Array.isArray(result.expectedBenefits)).toBe(true)
      expect(typeof result.scenario).toBe('string')
    })

    it('monthlyCost is non-negative', () => {
      const result = analyzeCostBenefit(100, 15, 20)
      expect(result.monthlyCost).toBeGreaterThanOrEqual(0)
    })

    it('monthlyCost rounds to 2 decimal places', () => {
      const result = analyzeCostBenefit(100, 15, 20)
      const decimals = result.monthlyCost.toString().split('.')[1]
      expect(!decimals || decimals.length <= 2).toBe(true)
    })

    it('recommendation is one of the valid values', () => {
      const validValues = ['highly_recommended', 'recommended', 'consider_carefully', 'not_recommended']
      const result = analyzeCostBenefit(50, 10, 10)
      expect(validValues).toContain(result.recommendation)
    })
  })

  // =========================================================================
  // calculateActualCosts
  // =========================================================================
  describe('calculateActualCosts', () => {
    it('empty arrays return zero costs', () => {
      const result = calculateActualCosts([], [])
      expect(result.totalCost).toBe(0)
      expect(result.callsCost).toBe(0)
      expect(result.simulationsCost).toBe(0)
      expect(result.callsCount).toBe(0)
      expect(result.simulationsCount).toBe(0)
    })

    it('calls with zero duration are included in count but add zero cost', () => {
      const calls = [
        { duration_minutes: 0, call_type: 'sales_call' },
        { duration_minutes: 5, call_type: 'sales_call' },
      ]
      const result = calculateActualCosts(calls)
      expect(result.callsCount).toBe(2)
    })

    it('simulations convert duration_seconds to minutes', () => {
      const sims = [{ duration_seconds: 600, simulation_type: 'realtime' }]
      const result = calculateActualCosts([], sims)
      expect(result.simulationsCount).toBe(1)
      // 600 seconds = 10 minutes
      const expected = calculateSimulationCost(10).estimatedCost
      expect(result.simulationsCost).toBe(expected)
    })

    it('totalCost equals callsCost + simulationsCost', () => {
      const calls = [{ duration_minutes: 5, call_type: 'sales_call' }]
      const sims = [{ duration_seconds: 300, simulation_type: 'realtime' }]
      const result = calculateActualCosts(calls, sims)
      expect(result.totalCost).toBeCloseTo(result.callsCost + result.simulationsCost, 2)
    })

    it('defaults simulationsData to empty array', () => {
      const result = calculateActualCosts([{ duration_minutes: 5, call_type: 'sales_call' }])
      expect(result.simulationsCount).toBe(0)
      expect(result.simulationsCost).toBe(0)
    })
  })

  // =========================================================================
  // getExampleScenarios
  // =========================================================================
  describe('getExampleScenarios', () => {
    it('returns 3 example scenarios', () => {
      const scenarios = getExampleScenarios()
      expect(scenarios).toHaveLength(3)
    })

    it('each scenario has name, limits, and analysis', () => {
      const scenarios = getExampleScenarios()
      for (const scenario of scenarios) {
        expect(scenario).toHaveProperty('name')
        expect(scenario).toHaveProperty('limits')
        expect(scenario).toHaveProperty('analysis')
        expect(scenario.limits).toHaveProperty('maxDurationMinutes')
        expect(scenario.analysis).toHaveProperty('recommendation')
      }
    })
  })

  // =========================================================================
  // MODEL_PRICING
  // =========================================================================
  describe('MODEL_PRICING', () => {
    it('contains expected models', () => {
      expect(MODEL_PRICING).toHaveProperty('gpt-4o-mini-transcribe')
      expect(MODEL_PRICING).toHaveProperty('gpt-audio-1.5')
      expect(MODEL_PRICING).toHaveProperty('gpt-5-mini')
      expect(MODEL_PRICING).toHaveProperty('gpt-5-nano')
      expect(MODEL_PRICING).toHaveProperty('gpt-realtime-1.5')
    })

    it('each model has required fields', () => {
      for (const [key, pricing] of Object.entries(MODEL_PRICING)) {
        expect(pricing).toHaveProperty('model', key)
        expect(pricing).toHaveProperty('description')
        expect(pricing).toHaveProperty('usage')
        expect(Array.isArray(pricing.usage)).toBe(true)
        expect(typeof pricing.inputTokenPrice).toBe('number')
        expect(typeof pricing.outputTokenPrice).toBe('number')
      }
    })
  })
})
