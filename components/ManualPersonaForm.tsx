'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { User, Save, X } from 'lucide-react'

interface ManualPersonaFormProps {
  companyId: string
  onSuccess?: (persona: any) => void
  onCancel?: () => void
}

export default function ManualPersonaForm({ companyId, onSuccess, onCancel }: ManualPersonaFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [formData, setFormData] = useState({
    persona_name: '',
    personality_type: '',
    communication_style: '',
    industry_context: '',
    company_size: 'בינוני',
    background_story: '',
    current_situation: '',
    pain_points: [''],
    goals_and_objectives: [''],
    common_objections: [''],
    preferred_communication: [''],
    decision_making_style: '',
    budget_sensitivity: 'בינונית',
    time_pressure: 'רגיל',
    voice_gender: 'male'
  })

  const supabase = createClient()

  function updateField(field: string, value: any) {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  function updateArrayField(field: string, index: number, value: string) {
    setFormData(prev => {
      const arr = [...(prev[field as keyof typeof prev] as string[])]
      arr[index] = value
      return { ...prev, [field]: arr }
    })
  }

  function addArrayItem(field: string) {
    setFormData(prev => ({
      ...prev,
      [field]: [...(prev[field as keyof typeof prev] as string[]), '']
    }))
  }

  function removeArrayItem(field: string, index: number) {
    setFormData(prev => ({
      ...prev,
      [field]: (prev[field as keyof typeof prev] as string[]).filter((_, i) => i !== index)
    }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setIsSubmitting(true)

    try {
      // יצירת הוראות OpenAI
      const openaiInstructions = `אתה ${formData.persona_name}. ${formData.background_story}
${formData.current_situation}

אישיות: ${formData.personality_type}
סגנון תקשורת: ${formData.communication_style}
קבלת החלטות: ${formData.decision_making_style}

נקודות כאב שלך: ${formData.pain_points.filter(p => p).join(', ')}
מטרות: ${formData.goals_and_objectives.filter(g => g).join(', ')}

התנהג בהתאם לאופי הזה בסימולציה. העלה את ההתנגדויות הבאות: ${formData.common_objections.filter(o => o).join(', ')}.
היה ${formData.budget_sensitivity} ברגישות למחיר ו${formData.time_pressure} בלחץ זמן.`

      // שמירה במסד נתונים
      const { data: persona, error } = await supabase
        .from('customer_personas_hebrew')
        .insert({
          company_id: companyId,
          persona_name: formData.persona_name,
          personality_type: formData.personality_type,
          communication_style: formData.communication_style,
          industry_context: formData.industry_context,
          company_size: formData.company_size,
          background_story: formData.background_story,
          current_situation: formData.current_situation,
          pain_points: formData.pain_points.filter(p => p),
          goals_and_objectives: formData.goals_and_objectives.filter(g => g),
          common_objections: formData.common_objections.filter(o => o),
          objection_patterns: {},
          preferred_communication: formData.preferred_communication.filter(p => p),
          decision_making_style: formData.decision_making_style,
          budget_sensitivity: formData.budget_sensitivity,
          time_pressure: formData.time_pressure,
          openai_instructions: openaiInstructions,
          scenario_templates: {},
          voice_characteristics: { gender: formData.voice_gender },
          is_active: true,
          is_template: false
        })
        .select()
        .single()

      if (error) throw error

      // לוג יצירה ידנית
      await supabase.from('persona_creation_logs').insert({
        company_id: companyId,
        persona_id: persona.id,
        questionnaire_completeness: 100,
        ai_model_used: 'manual',
        generation_time_ms: 0,
        success: true
      })

      if (onSuccess) {
        onSuccess(persona)
      } else {
        alert('הפרסונה נוצרה בהצלחה!')
        // רענון הדף
        window.location.reload()
      }
    } catch (error) {
      console.error('Error creating persona:', error)
      alert('שגיאה ביצירת הפרסונה')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6 bg-white rounded-xl border p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-bold text-gray-900 flex items-center">
          <User className="w-5 h-5 ml-2 text-blue-600" />
          יצירת פרסונה ידנית
        </h3>
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="text-gray-500 hover:text-gray-700"
          >
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* מידע בסיסי */}
      <div className="space-y-4">
        <h4 className="font-semibold text-gray-700 border-b pb-2">מידע בסיסי</h4>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            שם הפרסונה *
          </label>
          <input
            type="text"
            required
            value={formData.persona_name}
            onChange={(e) => updateField('persona_name', e.target.value)}
            placeholder="לדוגמה: דוד כהן - מנהל רכש"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              סוג אישיות *
            </label>
            <input
              type="text"
              required
              value={formData.personality_type}
              onChange={(e) => updateField('personality_type', e.target.value)}
              placeholder="לדוגמה: סקפטי ומדייק"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              סגנון תקשורת *
            </label>
            <input
              type="text"
              required
              value={formData.communication_style}
              onChange={(e) => updateField('communication_style', e.target.value)}
              placeholder="לדוגמה: ישיר ומקצועי"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              הקשר תעשייתי
            </label>
            <input
              type="text"
              value={formData.industry_context}
              onChange={(e) => updateField('industry_context', e.target.value)}
              placeholder="לדוגמה: טכנולוגיה B2B"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              גודל חברה
            </label>
            <select
              value={formData.company_size}
              onChange={(e) => updateField('company_size', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg"
            >
              <option value="סטארטאפ">סטארטאפ</option>
              <option value="קטן">קטן</option>
              <option value="בינוני">בינוני</option>
              <option value="גדול">גדול</option>
              <option value="תאגיד">תאגיד</option>
            </select>
          </div>
        </div>
      </div>

      {/* רקע ומצב */}
      <div className="space-y-4">
        <h4 className="font-semibold text-gray-700 border-b pb-2">רקע ומצב נוכחי</h4>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            סיפור רקע *
          </label>
          <textarea
            required
            value={formData.background_story}
            onChange={(e) => updateField('background_story', e.target.value)}
            placeholder="סיפור רקע של הלקוח - מי הוא, מה הניסיון שלו..."
            rows={3}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            מצב נוכחי *
          </label>
          <textarea
            required
            value={formData.current_situation}
            onChange={(e) => updateField('current_situation', e.target.value)}
            placeholder="המצב הנוכחי והצרכים של הלקוח..."
            rows={3}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg"
          />
        </div>
      </div>

      {/* רשימות דינמיות */}
      <div className="space-y-4">
        <h4 className="font-semibold text-gray-700 border-b pb-2">נקודות כאב</h4>
        {formData.pain_points.map((pain, idx) => (
          <div key={idx} className="flex gap-2">
            <input
              type="text"
              value={pain}
              onChange={(e) => updateArrayField('pain_points', idx, e.target.value)}
              placeholder="נקודת כאב..."
              className="flex-1 px-3 py-2 border border-gray-300 rounded-lg"
            />
            {formData.pain_points.length > 1 && (
              <button
                type="button"
                onClick={() => removeArrayItem('pain_points', idx)}
                className="px-3 py-2 text-red-600 hover:bg-red-50 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        ))}
        <button
          type="button"
          onClick={() => addArrayItem('pain_points')}
          className="text-sm text-blue-600 hover:text-blue-800"
        >
          + הוסף נקודת כאב
        </button>
      </div>

      <div className="space-y-4">
        <h4 className="font-semibold text-gray-700 border-b pb-2">מטרות ויעדים</h4>
        {formData.goals_and_objectives.map((goal, idx) => (
          <div key={idx} className="flex gap-2">
            <input
              type="text"
              value={goal}
              onChange={(e) => updateArrayField('goals_and_objectives', idx, e.target.value)}
              placeholder="מטרה..."
              className="flex-1 px-3 py-2 border border-gray-300 rounded-lg"
            />
            {formData.goals_and_objectives.length > 1 && (
              <button
                type="button"
                onClick={() => removeArrayItem('goals_and_objectives', idx)}
                className="px-3 py-2 text-red-600 hover:bg-red-50 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        ))}
        <button
          type="button"
          onClick={() => addArrayItem('goals_and_objectives')}
          className="text-sm text-blue-600 hover:text-blue-800"
        >
          + הוסף מטרה
        </button>
      </div>

      <div className="space-y-4">
        <h4 className="font-semibold text-gray-700 border-b pb-2">התנגדויות נפוצות</h4>
        {formData.common_objections.map((objection, idx) => (
          <div key={idx} className="flex gap-2">
            <input
              type="text"
              value={objection}
              onChange={(e) => updateArrayField('common_objections', idx, e.target.value)}
              placeholder="התנגדות..."
              className="flex-1 px-3 py-2 border border-gray-300 rounded-lg"
            />
            {formData.common_objections.length > 1 && (
              <button
                type="button"
                onClick={() => removeArrayItem('common_objections', idx)}
                className="px-3 py-2 text-red-600 hover:bg-red-50 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        ))}
        <button
          type="button"
          onClick={() => addArrayItem('common_objections')}
          className="text-sm text-blue-600 hover:text-blue-800"
        >
          + הוסף התנגדות
        </button>
      </div>

      {/* מאפיינים */}
      <div className="space-y-4">
        <h4 className="font-semibold text-gray-700 border-b pb-2">מאפיינים</h4>
        
        <div className="grid grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              סגנון קבלת החלטות *
            </label>
            <input
              type="text"
              required
              value={formData.decision_making_style}
              onChange={(e) => updateField('decision_making_style', e.target.value)}
              placeholder="לדוגמה: מבוסס נתונים"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              רגישות תקציב
            </label>
            <select
              value={formData.budget_sensitivity}
              onChange={(e) => updateField('budget_sensitivity', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg"
            >
              <option value="נמוכה">נמוכה</option>
              <option value="בינונית">בינונית</option>
              <option value="גבוהה">גבוהה</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              לחץ זמן
            </label>
            <select
              value={formData.time_pressure}
              onChange={(e) => updateField('time_pressure', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg"
            >
              <option value="גמיש">גמיש</option>
              <option value="רגיל">רגיל</option>
              <option value="דחוף">דחוף</option>
            </select>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            מגדר הקול
          </label>
          <select
            value={formData.voice_gender}
            onChange={(e) => updateField('voice_gender', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg"
          >
            <option value="male">זכר</option>
            <option value="female">נקבה</option>
          </select>
        </div>
      </div>

      {/* כפתורים */}
      <div className="flex gap-3 pt-4 border-t">
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="flex-1 px-6 py-3 border-2 border-gray-300 text-gray-700 font-semibold rounded-lg hover:bg-gray-50"
          >
            ביטול
          </button>
        )}
        <button
          type="submit"
          disabled={isSubmitting}
          className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-6 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
        >
          {isSubmitting ? (
            <>
              <span className="inline-block animate-spin ml-2">⏳</span>
              שומר...
            </>
          ) : (
            <>
              <Save className="w-5 h-5 ml-2" />
              שמור פרסונה
            </>
          )}
        </button>
      </div>
    </form>
  )
}

