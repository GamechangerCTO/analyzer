'use client'

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { Calculator, DollarSign, TrendingUp, AlertTriangle, CheckCircle } from 'lucide-react'

interface CostBreakdown {
  transcription?: number
  toneAnalysis?: number
  contentAnalysis?: number
  realtimeAudio?: number
  reportGeneration?: number
}

interface CostEstimate {
  callType?: string
  simulationType?: string
  avgDurationMinutes?: number
  durationMinutes?: number
  estimatedCost: number
  breakdown: CostBreakdown
}

interface Recommendations {
  limits: {
    maxDurationMinutes: number
    maxSimulationsPerDay: number
    maxSimulationsPerMonth: number
    estimatedMonthlyCost: number
    reasoning: string
  }
  analysis: {
    scenario: string
    monthlyCost: number
    expectedBenefits: string[]
    roi: string
    recommendation: 'highly_recommended' | 'recommended' | 'consider_carefully' | 'not_recommended'
  }
  costPerAgent: number
}

export default function CostCalculator() {
  const [callDuration, setCallDuration] = useState<number>(5)
  const [callType, setCallType] = useState<string>('sales_call')
  const [simulationDuration, setSimulationDuration] = useState<number>(10)
  const [simulationType, setSimulationType] = useState<string>('realtime')
  const [companySize, setCompanySize] = useState<'small' | 'medium' | 'large'>('medium')
  const [budget, setBudget] = useState<'low' | 'medium' | 'high'>('medium')
  const [teamSize, setTeamSize] = useState<number>(10)

  const [callCost, setCallCost] = useState<CostEstimate | null>(null)
  const [simulationCost, setSimulationCost] = useState<CostEstimate | null>(null)
  const [recommendations, setRecommendations] = useState<Recommendations | null>(null)
  const [actualCosts, setActualCosts] = useState<any>(null)
  const [loading, setLoading] = useState<boolean>(false)

  const calculateCallCost = async () => {
    setLoading(true)
    try {
      const response = await fetch('/api/cost-calculator', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'calculate-call-cost',
          durationMinutes: callDuration,
          callType
        })
      })
      const data = await response.json()
      if (data.success) {
        setCallCost(data.cost)
      }
    } catch (error) {
      console.error('Error calculating call cost:', error)
    } finally {
      setLoading(false)
    }
  }

  const calculateSimulationCost = async () => {
    setLoading(true)
    try {
      const response = await fetch('/api/cost-calculator', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'calculate-simulation-cost',
          simulationDuration,
          simulationType
        })
      })
      const data = await response.json()
      if (data.success) {
        setSimulationCost(data.cost)
      }
    } catch (error) {
      console.error('Error calculating simulation cost:', error)
    } finally {
      setLoading(false)
    }
  }

  const getRecommendations = async () => {
    setLoading(true)
    try {
      const response = await fetch(`/api/cost-calculator?action=recommendations&companySize=${companySize}&budget=${budget}&teamSize=${teamSize}`)
      const data = await response.json()
      if (data.success) {
        setRecommendations(data.recommendations)
      }
    } catch (error) {
      console.error('Error getting recommendations:', error)
    } finally {
      setLoading(false)
    }
  }

  const getActualCosts = async () => {
    setLoading(true)
    try {
      const response = await fetch('/api/cost-calculator?action=actual-costs')
      const data = await response.json()
      if (data.success) {
        setActualCosts(data)
      }
    } catch (error) {
      console.error('Error getting actual costs:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    calculateCallCost()
    calculateSimulationCost()
    getRecommendations()
    getActualCosts()
  }, [])

  const getRecommendationColor = (recommendation: string) => {
    switch (recommendation) {
      case 'highly_recommended': return 'bg-green-100 text-green-800 border-green-200'
      case 'recommended': return 'bg-blue-100 text-blue-800 border-blue-200'
      case 'consider_carefully': return 'bg-yellow-100 text-yellow-800 border-yellow-200'
      case 'not_recommended': return 'bg-red-100 text-red-800 border-red-200'
      default: return 'bg-gray-100 text-gray-800 border-gray-200'
    }
  }

  const getRecommendationIcon = (recommendation: string) => {
    switch (recommendation) {
      case 'highly_recommended': return <CheckCircle className="w-4 h-4" />
      case 'recommended': return <TrendingUp className="w-4 h-4" />
      case 'consider_carefully': return <AlertTriangle className="w-4 h-4" />
      case 'not_recommended': return <AlertTriangle className="w-4 h-4" />
      default: return <Calculator className="w-4 h-4" />
    }
  }

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6" dir="rtl">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">מחשבון עלויות AI</h1>
        <p className="text-gray-600">חישוב עלויות מדויק לניתוח שיחות וסימולציות</p>
      </div>

      <Tabs defaultValue="calculator" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="calculator">מחשבון</TabsTrigger>
          <TabsTrigger value="recommendations">המלצות</TabsTrigger>
          <TabsTrigger value="actual">עלויות בפועל</TabsTrigger>
          <TabsTrigger value="analysis">ניתוח עלות-תועלת</TabsTrigger>
        </TabsList>

        <TabsContent value="calculator" className="space-y-6">
          <div className="grid md:grid-cols-2 gap-6">
            {/* מחשבון עיבוד שיחות */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calculator className="w-5 h-5" />
                  עיבוד שיחה רגילה
                </CardTitle>
                <CardDescription>
                  חישוב עלות לתמלול, ניתוח טון וניתוח תוכן
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="call-duration">משך השיחה (דקות)</Label>
                  <Input
                    id="call-duration"
                    type="number"
                    value={callDuration}
                    onChange={(e) => setCallDuration(Number(e.target.value))}
                    min="1"
                    max="60"
                  />
                </div>
                <div>
                  <Label htmlFor="call-type">סוג השיחה</Label>
                  <Select value={callType} onValueChange={setCallType}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="sales_call">מכירות</SelectItem>
                      <SelectItem value="customer_service">שירות לקוחות</SelectItem>
                      <SelectItem value="appointment_setting">תיאום פגישות</SelectItem>
                      <SelectItem value="follow_up">מעקב</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Button onClick={calculateCallCost} disabled={loading} className="w-full">
                  חשב עלות
                </Button>

                {callCost && (
                  <div className="mt-4 p-4 bg-blue-50 rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-semibold">עלות כוללת:</span>
                      <span className="text-lg font-bold text-blue-600">
                        ${callCost.estimatedCost}
                      </span>
                    </div>
                    <div className="text-sm space-y-1">
                      {callCost.breakdown.transcription && (
                        <div className="flex justify-between">
                          <span>תמלול:</span>
                          <span>${callCost.breakdown.transcription.toFixed(3)}</span>
                        </div>
                      )}
                      {callCost.breakdown.toneAnalysis && (
                        <div className="flex justify-between">
                          <span>ניתוח טון:</span>
                          <span>${callCost.breakdown.toneAnalysis.toFixed(3)}</span>
                        </div>
                      )}
                      {callCost.breakdown.contentAnalysis && (
                        <div className="flex justify-between">
                          <span>ניתוח תוכן:</span>
                          <span>${callCost.breakdown.contentAnalysis.toFixed(3)}</span>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* מחשבון סימולציות */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <DollarSign className="w-5 h-5" />
                  סימולציה בזמן אמת
                </CardTitle>
                <CardDescription>
                  חישוב עלות לסימולציה קולית חיה - הכי יקר!
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="simulation-duration">משך הסימולציה (דקות)</Label>
                  <Input
                    id="simulation-duration"
                    type="number"
                    value={simulationDuration}
                    onChange={(e) => setSimulationDuration(Number(e.target.value))}
                    min="1"
                    max="30"
                  />
                </div>
                <div>
                  <Label htmlFor="simulation-type">סוג הסימולציה</Label>
                  <Select value={simulationType} onValueChange={setSimulationType}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="realtime">זמן אמת (יקר!)</SelectItem>
                      <SelectItem value="practice">תרגול רגיל</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Button onClick={calculateSimulationCost} disabled={loading} className="w-full">
                  חשב עלות
                </Button>

                {simulationCost && (
                  <div className="mt-4 p-4 bg-red-50 rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-semibold">עלות כוללת:</span>
                      <span className="text-lg font-bold text-red-600">
                        ${simulationCost.estimatedCost}
                      </span>
                    </div>
                    <div className="text-sm space-y-1">
                      {simulationCost.breakdown.realtimeAudio && (
                        <div className="flex justify-between">
                          <span>אודיו בזמן אמת:</span>
                          <span>${simulationCost.breakdown.realtimeAudio.toFixed(3)}</span>
                        </div>
                      )}
                      {simulationCost.breakdown.transcription && (
                        <div className="flex justify-between">
                          <span>תמלול:</span>
                          <span>${simulationCost.breakdown.transcription.toFixed(3)}</span>
                        </div>
                      )}
                      {simulationCost.breakdown.reportGeneration && (
                        <div className="flex justify-between">
                          <span>יצירת דוח:</span>
                          <span>${simulationCost.breakdown.reportGeneration.toFixed(3)}</span>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="recommendations" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>הגדרות החברה</CardTitle>
              <CardDescription>הגדר את פרטי החברה לקבלת המלצות מותאמות</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid md:grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="company-size">גודל החברה</Label>
                  <Select value={companySize} onValueChange={(value: any) => setCompanySize(value)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="small">קטנה (1-20 עובדים)</SelectItem>
                      <SelectItem value="medium">בינונית (21-100 עובדים)</SelectItem>
                      <SelectItem value="large">גדולה (100+ עובדים)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="budget">תקציב</Label>
                  <Select value={budget} onValueChange={(value: any) => setBudget(value)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">נמוך</SelectItem>
                      <SelectItem value="medium">בינוני</SelectItem>
                      <SelectItem value="high">גבוה</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="team-size">מספר סוכנים</Label>
                  <Input
                    id="team-size"
                    type="number"
                    value={teamSize}
                    onChange={(e) => setTeamSize(Number(e.target.value))}
                    min="1"
                    max="500"
                  />
                </div>
              </div>
              <Button onClick={getRecommendations} disabled={loading} className="w-full">
                קבל המלצות
              </Button>
            </CardContent>
          </Card>

          {recommendations && (
            <div className="grid md:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>המלצות גבולות</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex justify-between">
                    <span>משך מקסימלי לסימולציה:</span>
                    <Badge variant="outline">{recommendations.limits.maxDurationMinutes} דקות</Badge>
                  </div>
                  <div className="flex justify-between">
                    <span>סימולציות ביום:</span>
                    <Badge variant="outline">{recommendations.limits.maxSimulationsPerDay}</Badge>
                  </div>
                  <div className="flex justify-between">
                    <span>סימולציות בחודש:</span>
                    <Badge variant="outline">{recommendations.limits.maxSimulationsPerMonth}</Badge>
                  </div>
                  <div className="flex justify-between">
                    <span>עלות חודשית משוערת:</span>
                    <Badge variant="outline">${recommendations.limits.estimatedMonthlyCost}</Badge>
                  </div>
                  <div className="flex justify-between">
                    <span>עלות לסוכן:</span>
                    <Badge variant="outline">${recommendations.costPerAgent}</Badge>
                  </div>
                  <p className="text-sm text-gray-600 mt-3">
                    {recommendations.limits.reasoning}
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>ניתוח עלות-תועלת</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className={`p-3 rounded-lg border ${getRecommendationColor(recommendations.analysis.recommendation)}`}>
                    <div className="flex items-center gap-2 mb-2">
                      {getRecommendationIcon(recommendations.analysis.recommendation)}
                      <span className="font-semibold">
                        {recommendations.analysis.recommendation === 'highly_recommended' && 'מומלץ מאוד'}
                        {recommendations.analysis.recommendation === 'recommended' && 'מומלץ'}
                        {recommendations.analysis.recommendation === 'consider_carefully' && 'שקול בזהירות'}
                        {recommendations.analysis.recommendation === 'not_recommended' && 'לא מומלץ'}
                      </span>
                    </div>
                    <p className="text-sm">{recommendations.analysis.roi}</p>
                  </div>
                  
                  <div>
                    <h4 className="font-semibold mb-2">יתרונות צפויים:</h4>
                    <ul className="text-sm space-y-1">
                      {recommendations.analysis.expectedBenefits.map((benefit, index) => (
                        <li key={index} className="flex items-start gap-2">
                          <CheckCircle className="w-3 h-3 mt-1 text-green-500" />
                          {benefit}
                        </li>
                      ))}
                    </ul>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </TabsContent>

        <TabsContent value="actual" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>עלויות בפועל (30 הימים האחרונים)</CardTitle>
              <CardDescription>נתונים מהמערכת שלך</CardDescription>
            </CardHeader>
            <CardContent>
              <Button onClick={getActualCosts} disabled={loading} className="mb-4">
                רענן נתונים
              </Button>
              
              {actualCosts && (
                <div className="grid md:grid-cols-3 gap-4">
                  <div className="p-4 bg-blue-50 rounded-lg">
                    <h4 className="font-semibold text-blue-800">עלות כוללת</h4>
                    <p className="text-2xl font-bold text-blue-600">
                      ${actualCosts.actualCosts.totalCost}
                    </p>
                  </div>
                  <div className="p-4 bg-green-50 rounded-lg">
                    <h4 className="font-semibold text-green-800">עיבוד שיחות</h4>
                    <p className="text-2xl font-bold text-green-600">
                      ${actualCosts.actualCosts.callsCost}
                    </p>
                    <p className="text-sm text-green-600">
                      {actualCosts.actualCosts.callsCount} שיחות
                    </p>
                  </div>
                  <div className="p-4 bg-purple-50 rounded-lg">
                    <h4 className="font-semibold text-purple-800">סימולציות</h4>
                    <p className="text-2xl font-bold text-purple-600">
                      ${actualCosts.actualCosts.simulationsCost}
                    </p>
                    <p className="text-sm text-purple-600">
                      {actualCosts.actualCosts.simulationsCount} סימולציות
                    </p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="analysis" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>השוואת תרחישים</CardTitle>
              <CardDescription>
                השוואה בין תרחישי שימוש שונים
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                <div className="grid md:grid-cols-3 gap-4">
                  <div className="p-4 border rounded-lg">
                    <h4 className="font-semibold text-green-600 mb-2">שימוש חסכני</h4>
                    <ul className="text-sm space-y-1">
                      <li>• 30 סימולציות/חודש</li>
                      <li>• 5 דקות ממוצע</li>
                      <li>• 5 סוכנים</li>
                      <li className="font-semibold text-green-600">~$45/חודש</li>
                    </ul>
                  </div>
                  <div className="p-4 border rounded-lg">
                    <h4 className="font-semibold text-blue-600 mb-2">שימוש מאוזן</h4>
                    <ul className="text-sm space-y-1">
                      <li>• 100 סימולציות/חודש</li>
                      <li>• 8 דקות ממוצע</li>
                      <li>• 10 סוכנים</li>
                      <li className="font-semibold text-blue-600">~$240/חודש</li>
                    </ul>
                  </div>
                  <div className="p-4 border rounded-lg">
                    <h4 className="font-semibold text-purple-600 mb-2">שימוש אינטנסיבי</h4>
                    <ul className="text-sm space-y-1">
                      <li>• 300 סימולציות/חודש</li>
                      <li>• 12 דקות ממוצע</li>
                      <li>• 20 סוכנים</li>
                      <li className="font-semibold text-purple-600">~$1,080/חודש</li>
                    </ul>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}



