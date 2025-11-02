'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { User, Star, TrendingUp, Clock, Filter, Search } from 'lucide-react'

interface PersonaLibraryProps {
  companyId: string
  onSelectPersona: (persona: any) => void
  currentIndustry?: string
}

export default function PersonaLibrary({ companyId, onSelectPersona, currentIndustry }: PersonaLibraryProps) {
  const [personas, setPersonas] = useState<any[]>([])
  const [templates, setTemplates] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterType, setFilterType] = useState<'all' | 'company' | 'templates'>('all')
  const [sortBy, setSortBy] = useState<'recent' | 'popular' | 'effective'>('recent')

  const supabase = createClient()

  useEffect(() => {
    loadPersonas()
  }, [companyId, sortBy, filterType])

  async function loadPersonas() {
    setIsLoading(true)
    try {
      // טעינת פרסונות החברה
      if (filterType === 'all' || filterType === 'company') {
        let query = supabase
          .from('customer_personas_hebrew')
          .select('*')
          .eq('company_id', companyId)
          .eq('is_active', true)

        // מיון
        if (sortBy === 'recent') {
          query = query.order('created_at', { ascending: false })
        } else if (sortBy === 'popular') {
          query = query.order('usage_count', { ascending: false })
        } else if (sortBy === 'effective') {
          query = query.order('average_improvement_score', { ascending: false })
        }

        const { data } = await query.limit(20)
        setPersonas(data || [])
      }

      // טעינת תבניות
      if (filterType === 'all' || filterType === 'templates') {
        let templateQuery = supabase
          .from('persona_templates')
          .select('*')
          .eq('is_active', true)

        // סינון לפי תעשייה אם קיימת
        if (currentIndustry && filterType === 'templates') {
          templateQuery = templateQuery.eq('industry', currentIndustry)
        }

        const { data: templateData } = await templateQuery.order('usage_count', { ascending: false })
        setTemplates(templateData || [])
      }

    } catch (error) {
      console.error('Error loading personas:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const filteredPersonas = personas.filter(p =>
    !searchTerm || 
    p.persona_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.industry_context?.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const filteredTemplates = templates.filter(t =>
    !searchTerm || 
    t.template_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    t.industry?.toLowerCase().includes(searchTerm.toLowerCase())
  )

  async function handleSelectTemplate(template: any) {
    // יצירת פרסונה חדשה מתבנית
    try {
      const personaData = template.persona_data
      const { data: newPersona, error } = await supabase
        .from('customer_personas_hebrew')
        .insert({
          company_id: companyId,
          created_from_template: template.id,
          ...personaData,
          is_template: false,
          is_active: true
        })
        .select()
        .single()

      if (error) throw error

      // עדכון מונה שימוש בתבנית
      await supabase
        .from('persona_templates')
        .update({ usage_count: (template.usage_count || 0) + 1 })
        .eq('id', template.id)

      onSelectPersona(newPersona)
    } catch (error) {
      console.error('Error creating persona from template:', error)
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="mr-3 text-gray-600">טוען פרסונות...</span>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* כותרת וכלים */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <h3 className="text-lg font-bold text-gray-900">📚 ספריית פרסונות</h3>
        
        <div className="flex flex-wrap gap-2">
          {/* סינון */}
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value as any)}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
          >
            <option value="all">הכל</option>
            <option value="company">שלי</option>
            <option value="templates">תבניות</option>
          </select>

          {/* מיון */}
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
          >
            <option value="recent">אחרונים</option>
            <option value="popular">פופולריים</option>
            <option value="effective">יעילים</option>
          </select>
        </div>
      </div>

      {/* חיפוש */}
      <div className="relative">
        <Search className="absolute right-3 top-3 w-5 h-5 text-gray-400" />
        <input
          type="text"
          placeholder="חפש פרסונה..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full pr-10 pl-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
      </div>

      {/* תבניות */}
      {(filterType === 'all' || filterType === 'templates') && filteredTemplates.length > 0 && (
        <div className="space-y-3">
          <h4 className="text-sm font-semibold text-gray-700 flex items-center">
            <Star className="w-4 h-4 text-yellow-500 ml-2" />
            תבניות מומלצות
            {currentIndustry && ` - ${currentIndustry}`}
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {filteredTemplates.map((template) => {
              const data = template.persona_data
              return (
                <button
                  key={template.id}
                  onClick={() => handleSelectTemplate(template)}
                  className="text-right bg-gradient-to-br from-yellow-50 to-white border-2 border-yellow-200 hover:border-yellow-400 rounded-xl p-4 transition-all duration-200"
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1">
                      <h5 className="font-semibold text-gray-900 mb-1">
                        {template.template_name}
                      </h5>
                      <p className="text-xs text-gray-600">{template.industry}</p>
                    </div>
                    <Star className="w-4 h-4 text-yellow-500 flex-shrink-0" />
                  </div>
                  {template.description && (
                    <p className="text-sm text-gray-600 mb-2 line-clamp-2">
                      {template.description}
                    </p>
                  )}
                  <div className="flex items-center justify-between text-xs text-gray-500">
                    <span>נוצר {template.usage_count || 0} פעמים</span>
                    <span className="text-blue-600 font-medium">← לחץ לשימוש</span>
                  </div>
                </button>
              )
            })}
          </div>
        </div>
      )}

      {/* פרסונות של החברה */}
      {(filterType === 'all' || filterType === 'company') && filteredPersonas.length > 0 && (
        <div className="space-y-3">
          <h4 className="text-sm font-semibold text-gray-700">הפרסונות שלי</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {filteredPersonas.map((persona) => (
              <button
                key={persona.id}
                onClick={() => onSelectPersona(persona)}
                className="text-right bg-white hover:bg-blue-50 border-2 border-gray-200 hover:border-blue-400 rounded-xl p-4 transition-all duration-200"
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="flex-1">
                    <h5 className="font-semibold text-gray-900 mb-1">
                      {persona.persona_name || 'לקוח ווירטואלי'}
                    </h5>
                    <div className="flex flex-wrap gap-1">
                      {persona.personality_type && (
                        <span className="inline-block px-2 py-0.5 bg-purple-100 text-purple-700 text-xs rounded-full">
                          {persona.personality_type}
                        </span>
                      )}
                      {persona.industry_context && (
                        <span className="inline-block px-2 py-0.5 bg-blue-100 text-blue-700 text-xs rounded-full">
                          {persona.industry_context}
                        </span>
                      )}
                    </div>
                  </div>
                  <User className="w-5 h-5 text-blue-500 flex-shrink-0" />
                </div>

                {/* סטטיסטיקות */}
                <div className="flex items-center justify-between text-xs text-gray-500 mt-3 pt-3 border-t">
                  <div className="flex items-center gap-3">
                    {persona.usage_count > 0 && (
                      <span className="flex items-center">
                        <Clock className="w-3 h-3 ml-1" />
                        {persona.usage_count} שימושים
                      </span>
                    )}
                    {persona.average_improvement_score && (
                      <span className="flex items-center text-green-600 font-medium">
                        <TrendingUp className="w-3 h-3 ml-1" />
                        +{persona.average_improvement_score.toFixed(1)}
                      </span>
                    )}
                  </div>
                  {persona.is_recommended && (
                    <span className="text-yellow-600 font-medium">⭐ מומלץ</span>
                  )}
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* אין תוצאות */}
      {filteredPersonas.length === 0 && filteredTemplates.length === 0 && (
        <div className="text-center py-12">
          <User className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500">
            {searchTerm ? 'לא נמצאו פרסונות תואמות' : 'אין עדיין פרסונות בספרייה'}
          </p>
          <p className="text-sm text-gray-400 mt-1">
            צור פרסונה חדשה או השתמש בתבניות
          </p>
        </div>
      )}
    </div>
  )
}

