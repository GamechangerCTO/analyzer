'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { 
  User, 
  Star, 
  TrendingUp, 
  Clock, 
  Edit, 
  Trash2, 
  Eye, 
  CheckCircle,
  XCircle,
  BarChart3,
  Plus
} from 'lucide-react'
import PersonaPreview from './PersonaPreview'

interface PersonaManagementClientProps {
  companyId: string
  companyName?: string
}

export default function PersonaManagementClient({ companyId, companyName }: PersonaManagementClientProps) {
  const [personas, setPersonas] = useState<any[]>([])
  const [analytics, setAnalytics] = useState<any[]>([])
  const [logs, setLogs] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [selectedPersona, setSelectedPersona] = useState<any | null>(null)
  const [viewMode, setViewMode] = useState<'list' | 'preview' | 'analytics'>('list')
  const [showInactive, setShowInactive] = useState(false)

  const supabase = createClient()

  useEffect(() => {
    loadData()
  }, [companyId, showInactive])

  async function loadData() {
    setIsLoading(true)
    try {
      // טעינת פרסונות
      let query = supabase
        .from('customer_personas_hebrew')
        .select('*')
        .eq('company_id', companyId)
        .order('created_at', { ascending: false })

      if (!showInactive) {
        query = query.eq('is_active', true)
      }

      const { data: personasData } = await query
      setPersonas(personasData || [])

      // טעינת analytics
      const { data: analyticsData } = await supabase
        .from('persona_analytics')
        .select('*')
        .eq('company_id', companyId)
        .order('created_at', { ascending: false })
        .limit(50)

      setAnalytics(analyticsData || [])

      // טעינת logs
      const { data: logsData } = await supabase
        .from('persona_creation_logs')
        .select('*')
        .eq('company_id', companyId)
        .order('created_at', { ascending: false})
        .limit(20)

      setLogs(logsData || [])

    } catch (error) {
      console.error('Error loading data:', error)
    } finally {
      setIsLoading(false)
    }
  }

  async function toggleRecommended(personaId: string, currentValue: boolean) {
    try {
      await supabase
        .from('customer_personas_hebrew')
        .update({ is_recommended: !currentValue })
        .eq('id', personaId)

      loadData()
    } catch (error) {
      console.error('Error toggling recommended:', error)
    }
  }

  async function toggleActive(personaId: string, currentValue: boolean) {
    try {
      await supabase
        .from('customer_personas_hebrew')
        .update({ is_active: !currentValue })
        .eq('id', personaId)

      loadData()
    } catch (error) {
      console.error('Error toggling active:', error)
    }
  }

  async function deletePersona(personaId: string) {
    if (!confirm('האם אתה בטוח שברצונך למחוק פרסונה זו?')) {
      return
    }

    try {
      await supabase
        .from('customer_personas_hebrew')
        .delete()
        .eq('id', personaId)

      loadData()
    } catch (error) {
      console.error('Error deleting persona:', error)
      alert('שגיאה במחיקת הפרסונה')
    }
  }

  // חישוב סטטיסטיקות
  const totalPersonas = personas.length
  const activePersonas = personas.filter(p => p.is_active).length
  const recommendedPersonas = personas.filter(p => p.is_recommended).length
  const totalUsage = personas.reduce((sum, p) => sum + (p.usage_count || 0), 0)
  const avgImprovement = personas.reduce((sum, p) => sum + (p.average_improvement_score || 0), 0) / personas.filter(p => p.average_improvement_score).length || 0

  // success rate של יצירת פרסונות
  const successfulCreations = logs.filter(l => l.success).length
  const successRate = logs.length > 0 ? (successfulCreations / logs.length * 100).toFixed(1) : 0

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-primary"></div>
        <span className="mr-3 text-gray-600">טוען נתונים...</span>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* סטטיסטיקות כלליות */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <div className="bg-gradient-to-br from-brand-info-light to-white border-2 border-brand-info-light rounded-xl p-4">
          <div className="flex items-center justify-between mb-2">
            <User className="w-5 h-5 text-brand-primary" />
          </div>
          <p className="text-2xl font-bold text-gray-900">{totalPersonas}</p>
          <p className="text-xs text-gray-600">סה"כ פרסונות</p>
        </div>

        <div className="bg-gradient-to-br from-green-50 to-white border-2 border-green-200 rounded-xl p-4">
          <div className="flex items-center justify-between mb-2">
            <CheckCircle className="w-5 h-5 text-green-600" />
          </div>
          <p className="text-2xl font-bold text-gray-900">{activePersonas}</p>
          <p className="text-xs text-gray-600">פעילות</p>
        </div>

        <div className="bg-gradient-to-br from-yellow-50 to-white border-2 border-yellow-200 rounded-xl p-4">
          <div className="flex items-center justify-between mb-2">
            <Star className="w-5 h-5 text-yellow-600" />
          </div>
          <p className="text-2xl font-bold text-gray-900">{recommendedPersonas}</p>
          <p className="text-xs text-gray-600">מומלצות</p>
        </div>

        <div className="bg-gradient-to-br from-brand-accent-light to-white border-2 border-brand-accent-light rounded-xl p-4">
          <div className="flex items-center justify-between mb-2">
            <Clock className="w-5 h-5 text-brand-info-dark" />
          </div>
          <p className="text-2xl font-bold text-gray-900">{totalUsage}</p>
          <p className="text-xs text-gray-600">שימושים</p>
        </div>

        <div className="bg-gradient-to-br from-pink-50 to-white border-2 border-pink-200 rounded-xl p-4">
          <div className="flex items-center justify-between mb-2">
            <TrendingUp className="w-5 h-5 text-pink-600" />
          </div>
          <p className="text-2xl font-bold text-gray-900">{avgImprovement.toFixed(1)}</p>
          <p className="text-xs text-gray-600">שיפור ממוצע</p>
        </div>
      </div>

      {/* טאבים */}
      <div className="flex gap-2 border-b">
        <button
          onClick={() => setViewMode('list')}
          className={`px-4 py-2 font-medium transition-colors ${
            viewMode === 'list'
              ? 'text-brand-primary border-b-2 border-brand-primary'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          רשימת פרסונות ({totalPersonas})
        </button>
        <button
          onClick={() => setViewMode('analytics')}
          className={`px-4 py-2 font-medium transition-colors ${
            viewMode === 'analytics'
              ? 'text-brand-primary border-b-2 border-brand-primary'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          <BarChart3 className="w-4 h-4 inline ml-1" />
          אנליטיקס
        </button>
      </div>

      {/* רשימת פרסונות */}
      {viewMode === 'list' && (
        <div className="space-y-4">
          {/* פילטרים */}
          <div className="flex items-center justify-between">
            <label className="flex items-center gap-2 text-sm text-gray-700">
              <input
                type="checkbox"
                checked={showInactive}
                onChange={(e) => setShowInactive(e.target.checked)}
                className="rounded"
              />
              הצג גם לא פעילות
            </label>

            <button
              className="flex items-center gap-2 px-4 py-2 bg-brand-primary text-white rounded-lg hover:bg-brand-primary-dark transition-colors"
            >
              <Plus className="w-4 h-4" />
              צור פרסונה חדשה
            </button>
          </div>

          {/* טבלת פרסונות */}
          <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
            <table className="w-full">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-gray-700">פרסונה</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-gray-700">תעשייה</th>
                  <th className="px-4 py-3 text-center text-xs font-semibold text-gray-700">שימושים</th>
                  <th className="px-4 py-3 text-center text-xs font-semibold text-gray-700">שיפור ממוצע</th>
                  <th className="px-4 py-3 text-center text-xs font-semibold text-gray-700">סטטוס</th>
                  <th className="px-4 py-3 text-center text-xs font-semibold text-gray-700">פעולות</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {personas.map((persona) => (
                  <tr key={persona.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <div>
                        <p className="font-medium text-gray-900">{persona.persona_name || 'ללא שם'}</p>
                        <p className="text-xs text-gray-500">{persona.personality_type}</p>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">
                      {persona.industry_context || '-'}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className="inline-flex items-center gap-1 text-sm text-gray-700">
                        <Clock className="w-3 h-3" />
                        {persona.usage_count || 0}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      {persona.average_improvement_score ? (
                        <span className="inline-flex items-center gap-1 text-sm font-medium text-green-600">
                          <TrendingUp className="w-3 h-3" />
                          +{persona.average_improvement_score.toFixed(1)}
                        </span>
                      ) : (
                        <span className="text-sm text-gray-400">-</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <div className="flex items-center justify-center gap-2">
                        {persona.is_active ? (
                          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                            <CheckCircle className="w-3 h-3 ml-1" />
                            פעיל
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-600">
                            <XCircle className="w-3 h-3 ml-1" />
                            לא פעיל
                          </span>
                        )}
                        {persona.is_recommended && (
                          <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-center gap-2">
                        <button
                          onClick={() => {
                            setSelectedPersona(persona)
                            setViewMode('preview')
                          }}
                          className="p-1 text-brand-primary hover:bg-brand-info-light rounded"
                          title="תצוגה מקדימה"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => toggleRecommended(persona.id, persona.is_recommended)}
                          className={`p-1 rounded ${
                            persona.is_recommended 
                              ? 'text-yellow-600 hover:bg-yellow-50' 
                              : 'text-gray-400 hover:bg-gray-50'
                          }`}
                          title={persona.is_recommended ? 'הסר המלצה' : 'סמן כמומלץ'}
                        >
                          <Star className={`w-4 h-4 ${persona.is_recommended ? 'fill-yellow-500' : ''}`} />
                        </button>
                        <button
                          onClick={() => toggleActive(persona.id, persona.is_active)}
                          className="p-1 text-gray-600 hover:bg-gray-50 rounded"
                          title={persona.is_active ? 'השבת' : 'הפעל'}
                        >
                          {persona.is_active ? (
                            <CheckCircle className="w-4 h-4" />
                          ) : (
                            <XCircle className="w-4 h-4" />
                          )}
                        </button>
                        <button
                          onClick={() => deletePersona(persona.id)}
                          className="p-1 text-red-600 hover:bg-red-50 rounded"
                          title="מחק"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {personas.length === 0 && (
            <div className="text-center py-12">
              <User className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500">אין עדיין פרסונות במערכת</p>
            </div>
          )}
        </div>
      )}

      {/* תצוגה מקדימה */}
      {viewMode === 'preview' && selectedPersona && (
        <div className="space-y-4">
          <button
            onClick={() => setViewMode('list')}
            className="text-brand-primary hover:text-brand-primary-dark font-medium"
          >
            חזור לרשימה →
          </button>
          <PersonaPreview
            persona={selectedPersona}
            onAccept={() => {}}
            onRegenerate={undefined}
          />
        </div>
      )}

      {/* אנליטיקס */}
      {viewMode === 'analytics' && (
        <div className="space-y-6">
          {/* סטטיסטיקות יצירה */}
          <div className="bg-white rounded-xl border p-6">
            <h3 className="text-lg font-bold text-gray-900 mb-4">📊 סטטיסטיקות יצירת פרסונות</h3>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <p className="text-sm text-gray-600">סה"כ ניסיונות</p>
                <p className="text-2xl font-bold text-gray-900">{logs.length}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">הצלחות</p>
                <p className="text-2xl font-bold text-green-600">{successfulCreations}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">אחוז הצלחה</p>
                <p className="text-2xl font-bold text-brand-primary">{successRate}%</p>
              </div>
            </div>
          </div>

          {/* לוגים אחרונים */}
          <div className="bg-white rounded-xl border p-6">
            <h3 className="text-lg font-bold text-gray-900 mb-4">📝 לוגים אחרונים</h3>
            <div className="space-y-2">
              {logs.slice(0, 10).map((log) => (
                <div key={log.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center gap-3">
                    {log.success ? (
                      <CheckCircle className="w-4 h-4 text-green-600" />
                    ) : (
                      <XCircle className="w-4 h-4 text-red-600" />
                    )}
                    <div>
                      <p className="text-sm font-medium text-gray-900">
                        {log.ai_model_used} - {log.success ? 'הצלחה' : 'כשלון'}
                      </p>
                      <p className="text-xs text-gray-500">
                        {new Date(log.created_at).toLocaleString('he-IL')} • 
                        {log.generation_time_ms}ms • 
                        שלמות שאלון: {log.questionnaire_completeness}%
                      </p>
                    </div>
                  </div>
                  {log.error_message && (
                    <p className="text-xs text-red-600 max-w-xs truncate">{log.error_message}</p>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

