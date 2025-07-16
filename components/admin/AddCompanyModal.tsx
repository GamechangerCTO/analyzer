'use client'

import React, { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { 
  X, 
  Building2, 
  Target, 
  Package, 
  DollarSign, 
  Grid3X3, 
  Users, 
  Star, 
  Heart, 
  TrendingUp, 
  Upload,
  AlertCircle, 
  CheckCircle2,
  Info,
  Paperclip,
  Zap,
  Smile
} from 'lucide-react'

interface Company {
  id: string
  name: string
}

interface AddCompanyModalProps {
  isOpen: boolean
  onClose: () => void
  onCompanyAdded: () => void
}

export default function AddCompanyModal({ isOpen, onClose, onCompanyAdded }: AddCompanyModalProps) {
  const supabase = createClient()
  const [formData, setFormData] = useState({
    name: '',
    sector: '',
    product_info: '',
    avg_product_cost: '',
    product_types: '',
    audience: '',
    differentiators: ['', '', ''],
    customer_benefits: ['', '', ''],
    company_benefits: ['', '', ''],
    uploads_professional_materials: false,
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const [files, setFiles] = useState<File[]>([])

  // אפשרויות סוגי מוצרים
  const productTypeOptions = [
    'מוצרי מדף לצרכן הסופי',
    'מוצרים פיזיים', 
    'שירותים',
    'מוצרים דיגיטליים'
  ]

  // אפשרויות קהל יעד
  const audienceOptions = [
    'קהל C2B (לצרכן)',
    'קהל עסקי B2B'
  ]

  useEffect(() => {
    // Reset form when modal is opened/closed or on error/success
    if (isOpen) {
        setFormData({
            name: '',
            sector: '',
            product_info: '',
            avg_product_cost: '',
            product_types: '',
            audience: '',
            differentiators: ['', '', ''],
            customer_benefits: ['', '', ''],
            company_benefits: ['', '', ''],
            uploads_professional_materials: false,
        })
        setFiles([])
        setError(null)
        setSuccessMessage(null)
    }
  }, [isOpen])

  if (!isOpen) return null

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target
    if (type === 'checkbox') {
      const checked = (e.target as HTMLInputElement).checked
      setFormData(prev => ({
        ...prev,
        [name]: checked,
      }))
    } else {
      setFormData(prev => ({
        ...prev,
        [name]: value,
      }))
    }
  }

  const handleArrayChange = (field: 'differentiators' | 'customer_benefits' | 'company_benefits', index: number, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: prev[field].map((item, idx) => idx === index ? value : item)
    }))
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setFiles(Array.from(e.target.files))
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setError(null)
    setSuccessMessage(null)

    try {
      // בדיקת שדות חובה
      if (!formData.name.trim()) {
        setError('שם החברה הוא שדה חובה.')
        setSaving(false)
        return
      }

      if (!formData.sector.trim()) {
        setError('תחום/סגמנט הוא שדה חובה.')
        setSaving(false)
        return
      }

      if (!formData.product_info.trim()) {
        setError('פרטים על המוצר/השירות הוא שדה חובה.')
        setSaving(false)
        return
      }

      if (!formData.avg_product_cost.trim()) {
        setError('עלות המוצר/שירות הוא שדה חובה.')
        setSaving(false)
        return
      }

      if (!formData.product_types) {
        setError('יש לבחור סוג מוצר.')
        setSaving(false)
        return
      }

      if (!formData.audience) {
        setError('יש לבחור קהל יעד.')
        setSaving(false)
        return
      }

      // בדיקת שדות הבידולים (חובה למלא לפחות אחד)
      const validDifferentiators = formData.differentiators.filter(d => d.trim())
      if (validDifferentiators.length === 0) {
        setError('יש למלא לפחות בידול אחד משמעותי.')
        setSaving(false)
        return
      }

      // בדיקת תועלות לקוח (חובה למלא לפחות אחד)
      const validCustomerBenefits = formData.customer_benefits.filter(b => b.trim())
      if (validCustomerBenefits.length === 0) {
        setError('יש למלא את תועלות הלקוח.')
        setSaving(false)
        return
      }

      // בדיקת תועלות לחברה (חובה למלא לפחות אחד)
      const validCompanyBenefits = formData.company_benefits.filter(b => b.trim())
      if (validCompanyBenefits.length === 0) {
        setError('יש למלא את תועלות החברה.')
        setSaving(false)
        return
      }

      // יצירת החברה
      const { data: companyData, error: companyError } = await supabase
        .from('companies')
        .insert({
          name: formData.name.trim(),
          sector: formData.sector.trim(),
        })
        .select()

      if (companyError) {
        throw new Error(`שגיאה ביצירת החברה: ${companyError.message}`)
      }

      const companyId = companyData[0].id

      // יצירת השאלון
      const questionnaireData = {
        company_id: companyId,
        name: formData.name.trim(),
        sector: formData.sector.trim(),
        product_info: formData.product_info.trim(),
        avg_product_cost: formData.avg_product_cost.trim(),
        product_types: [formData.product_types],
        audience: formData.audience,
        differentiators: validDifferentiators,
        customer_benefits: validCustomerBenefits,
        company_benefits: validCompanyBenefits,
        uploads_professional_materials: formData.uploads_professional_materials,
        is_complete: true,
        completion_score: 100,
      }

      const { error: questionnaireError } = await supabase
        .from('company_questionnaires')
        .insert(questionnaireData)

      if (questionnaireError) {
        throw new Error(`שגיאה ביצירת השאלון: ${questionnaireError.message}`)
      }

      setSuccessMessage('החברה והשאלון נוצרו בהצלחה!')

      // קריאה לפונקציה של הקומפוננט האב לרענון הרשימה
      onCompanyAdded()

      // סגירת המודל אחרי רגע
      setTimeout(() => {
        onClose()
      }, 2000)

    } catch (err) {
      console.error('Error creating company:', err)
      setError(err instanceof Error ? err.message : 'שגיאה לא ידועה')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="relative bg-white/95 backdrop-blur-xl rounded-3xl shadow-2xl border-2 border-glacier-neutral-200/50 w-full max-w-4xl max-h-[90vh] overflow-y-auto">
        
        {/* Header */}
        <div className="bg-gradient-to-r from-glacier-primary to-glacier-primary-dark p-6 md:p-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center">
                <Building2 className="w-8 h-8 text-white" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-white mb-1">הוספת חברה חדשה</h2>
                <p className="text-glacier-primary-100">יצירת חברה ושאלון מלא במערכת</p>
              </div>
            </div>
            
            <button
              onClick={onClose}
              className="p-3 hover:bg-white/20 rounded-xl transition-colors duration-200"
            >
              <X className="w-6 h-6 text-white" />
            </button>
          </div>
        </div>

        <div className="p-6 md:p-8">
          
          {/* Info Box */}
          <div className="mb-8 p-6 bg-gradient-to-r from-glacier-accent-50 to-glacier-secondary-50 border border-glacier-accent-200 rounded-2xl">
            <div className="flex items-start space-x-3">
              <div className="w-10 h-10 bg-glacier-accent rounded-xl flex items-center justify-center flex-shrink-0">
                <Info className="w-5 h-5 text-white" />
              </div>
              <div className="min-w-0 flex-1">
                <h3 className="text-lg font-bold text-neutral-900 mb-2">הנחיות למילוי השאלון</h3>
                <p className="text-neutral-700 text-sm">כל השדות הן חובה למעט העלאת חומרים מקצועיים</p>
              </div>
            </div>
          </div>

          {/* Messages */}
          {error && (
            <div className="mb-6 p-4 bg-gradient-to-r from-red-50 to-red-100 border border-red-200 rounded-2xl">
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 bg-red-500 rounded-lg flex items-center justify-center flex-shrink-0">
                  <AlertCircle className="w-4 h-4 text-white" />
                </div>
                <p className="text-red-700 font-medium">{error}</p>
              </div>
            </div>
          )}
          
          {successMessage && (
            <div className="mb-6 p-4 bg-gradient-to-r from-glacier-success-50 to-green-100 border border-glacier-success-200 rounded-2xl animate-in slide-in-from-top duration-500">
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 bg-glacier-success rounded-lg flex items-center justify-center flex-shrink-0">
                  <CheckCircle2 className="w-4 h-4 text-white" />
                </div>
                <p className="text-glacier-success-700 font-bold">{successMessage}</p>
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-8">
            
            {/* שם החברה */}
            <div className="space-y-3">
              <label htmlFor="name_add" className="text-lg font-bold text-neutral-900 mb-2 flex items-center gap-2">
                <Building2 className="w-5 h-5 text-glacier-primary" />
                שם החברה 
                <span className="text-red-500">*</span>
              </label>
              <input 
                type="text" 
                name="name" 
                id="name_add" 
                value={formData.name} 
                onChange={handleChange} 
                required 
                className="w-full p-4 border-2 border-glacier-neutral-200 rounded-xl focus:border-glacier-primary focus:outline-none transition-all duration-300 ease-out text-neutral-900 bg-white hover:border-glacier-primary-light hover:shadow-lg hover:scale-[1.02] focus:scale-[1.02] focus:shadow-xl transform-gpu"
                placeholder="הזן שם החברה..."
              />
            </div>
            
            {/* תחום/סגמנט */}
            <div className="space-y-3">
              <label htmlFor="sector_add" className="text-lg font-bold text-neutral-900 mb-2 flex items-center gap-2">
                <Target className="w-5 h-5 text-glacier-accent" />
                תחום/סגמנט 
                <span className="text-red-500">*</span>
              </label>
              <input 
                type="text" 
                name="sector" 
                id="sector_add" 
                value={formData.sector} 
                onChange={handleChange} 
                required
                className="w-full p-4 border-2 border-glacier-neutral-200 rounded-xl focus:border-glacier-primary focus:outline-none transition-all duration-300 ease-out text-neutral-900 bg-white hover:border-glacier-primary-light hover:shadow-lg hover:scale-[1.02] focus:scale-[1.02] focus:shadow-xl transform-gpu"
                placeholder="למשל: טכנולוגיה, מזון, אופנה..."
              />
            </div>
            
            {/* פרטים על המוצר/השירות */}
            <div className="space-y-3">
              <label htmlFor="product_info_add" className="text-lg font-bold text-neutral-900 mb-2 flex items-center gap-2">
                <Package className="w-5 h-5 text-glacier-secondary" />
                פרטים על המוצר/השירות 
                <span className="text-red-500">*</span>
              </label>
              <textarea 
                name="product_info" 
                id="product_info_add" 
                value={formData.product_info} 
                onChange={handleChange} 
                required
                rows={4}
                className="w-full p-4 border-2 border-glacier-neutral-200 rounded-xl focus:border-glacier-primary focus:outline-none transition-all duration-300 ease-out text-neutral-900 bg-white hover:border-glacier-primary-light hover:shadow-lg hover:scale-[1.02] focus:scale-[1.02] focus:shadow-xl transform-gpu resize-none"
                placeholder="תיאור מפורט של המוצר או השירות..."
              />
            </div>
            
            {/* עלות המוצר/שירות */}
            <div className="space-y-3">
              <label htmlFor="avg_product_cost_add" className="text-lg font-bold text-neutral-900 mb-2 flex items-center gap-2">
                <DollarSign className="w-5 h-5 text-glacier-warning" />
                עלות המוצר/שירות 
                <span className="text-red-500">*</span>
              </label>
              <input 
                type="text" 
                name="avg_product_cost" 
                id="avg_product_cost_add" 
                value={formData.avg_product_cost} 
                onChange={handleChange} 
                required
                className="w-full p-4 border-2 border-glacier-neutral-200 rounded-xl focus:border-glacier-primary focus:outline-none transition-all duration-300 ease-out text-neutral-900 bg-white hover:border-glacier-primary-light hover:shadow-lg hover:scale-[1.02] focus:scale-[1.02] focus:shadow-xl transform-gpu"
                placeholder="למשל: ₪100-500, ₪5,000, $20/חודש..."
              />
            </div>

            {/* סוגי מוצרים */}
            <div className="space-y-3">
              <label className="text-lg font-bold text-neutral-900 mb-2 flex items-center gap-2">
                <Grid3X3 className="w-5 h-5 text-glacier-primary" />
                סוג המוצר 
                <span className="text-red-500">*</span>
              </label>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {productTypeOptions.map((option) => (
                  <label key={option} className="relative">
                    <input
                      type="radio"
                      name="product_types"
                      value={option}
                      checked={formData.product_types === option}
                      onChange={handleChange}
                      className="sr-only"
                    />
                    <div className={`p-4 border-2 rounded-xl cursor-pointer transition-all duration-300 transform hover:scale-[1.02] ${
                      formData.product_types === option
                        ? 'border-glacier-primary bg-glacier-primary-light text-glacier-primary-600 shadow-lg'
                        : 'border-glacier-neutral-200 bg-white hover:border-glacier-primary-light hover:shadow-md'
                    }`}>
                      <div className="flex items-center justify-between">
                        <span className="font-medium">{option}</span>
                        {formData.product_types === option && (
                          <CheckCircle2 className="w-5 h-5 text-glacier-primary animate-scale-in" />
                        )}
                      </div>
                    </div>
                  </label>
                ))}
              </div>
            </div>

            {/* קהל יעד */}
            <div className="space-y-3">
              <label className="text-lg font-bold text-neutral-900 mb-2 flex items-center gap-2">
                <Users className="w-5 h-5 text-glacier-accent" />
                קהל יעד 
                <span className="text-red-500">*</span>
              </label>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {audienceOptions.map((option) => (
                  <label key={option} className="relative">
                    <input
                      type="radio"
                      name="audience"
                      value={option}
                      checked={formData.audience === option}
                      onChange={handleChange}
                      className="sr-only"
                    />
                    <div className={`p-4 border-2 rounded-xl cursor-pointer transition-all duration-300 transform hover:scale-[1.02] ${
                      formData.audience === option
                        ? 'border-glacier-accent bg-glacier-accent-light text-glacier-accent-600 shadow-lg'
                        : 'border-glacier-neutral-200 bg-white hover:border-glacier-accent-light hover:shadow-md'
                    }`}>
                      <div className="flex items-center justify-between">
                        <span className="font-medium">{option}</span>
                        {formData.audience === option && (
                          <CheckCircle2 className="w-5 h-5 text-glacier-accent animate-scale-in" />
                        )}
                      </div>
                    </div>
                  </label>
                ))}
              </div>
            </div>

            {/* בידולים משמעותיים */}
            <div className="space-y-4">
              <label className="text-lg font-bold text-neutral-900 mb-2 flex items-center gap-2">
                <Star className="w-5 h-5 text-glacier-warning" />
                בידולים משמעותיים מהמתחרים 
                <span className="text-red-500">*</span>
              </label>
              <p className="text-glacier-neutral-600 text-sm mb-4">מה הופך אתכם לייחודיים? (לפחות בידול אחד)</p>
              <div className="space-y-3">
                {formData.differentiators.map((diff, index) => (
                  <div key={index} className="relative">
                    <input
                      type="text"
                      value={diff}
                      onChange={(e) => handleArrayChange('differentiators', index, e.target.value)}
                      className="w-full p-4 border-2 border-glacier-neutral-200 rounded-xl focus:border-glacier-primary focus:outline-none transition-all duration-300 ease-out text-neutral-900 bg-white hover:border-glacier-primary-light hover:shadow-lg hover:scale-[1.02] focus:scale-[1.02] focus:shadow-xl transform-gpu"
                      placeholder={`בידול מספר ${index + 1}...`}
                    />
                    <div className="absolute right-3 top-1/2 transform -translate-y-1/2 text-glacier-neutral-400">
                      <Zap className="w-4 h-4" />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* תועלות ללקוח */}
            <div className="space-y-4">
              <label className="text-lg font-bold text-neutral-900 mb-2 flex items-center gap-2">
                <Heart className="w-5 h-5 text-red-500" />
                תועלות ללקוח 
                <span className="text-red-500">*</span>
              </label>
              <p className="text-glacier-neutral-600 text-sm mb-4">איך הלקוח נהנה מהמוצר/שירות שלכם?</p>
              <div className="space-y-3">
                {formData.customer_benefits.map((benefit, index) => (
                  <div key={index} className="relative">
                    <input
                      type="text"
                      value={benefit}
                      onChange={(e) => handleArrayChange('customer_benefits', index, e.target.value)}
                      className="w-full p-4 border-2 border-glacier-neutral-200 rounded-xl focus:border-glacier-primary focus:outline-none transition-all duration-300 ease-out text-neutral-900 bg-white hover:border-glacier-primary-light hover:shadow-lg hover:scale-[1.02] focus:scale-[1.02] focus:shadow-xl transform-gpu"
                      placeholder={`תועלת לקוח מספר ${index + 1}...`}
                    />
                    <div className="absolute right-3 top-1/2 transform -translate-y-1/2 text-glacier-neutral-400">
                      <Smile className="w-4 h-4" />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* תועלות לחברה */}
            <div className="space-y-4">
              <label className="text-lg font-bold text-neutral-900 mb-2 flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-glacier-secondary" />
                תועלות לחברה 
                <span className="text-red-500">*</span>
              </label>
              <p className="text-glacier-neutral-600 text-sm mb-4">איך החברה נהנית מהמוצר/שירות?</p>
              <div className="space-y-3">
                {formData.company_benefits.map((benefit, index) => (
                  <div key={index} className="relative">
                    <input
                      type="text"
                      value={benefit}
                      onChange={(e) => handleArrayChange('company_benefits', index, e.target.value)}
                      className="w-full p-4 border-2 border-glacier-neutral-200 rounded-xl focus:border-glacier-primary focus:outline-none transition-all duration-300 ease-out text-neutral-900 bg-white hover:border-glacier-primary-light hover:shadow-lg hover:scale-[1.02] focus:scale-[1.02] focus:shadow-xl transform-gpu"
                      placeholder={`תועלת לחברה מספר ${index + 1}...`}
                    />
                    <div className="absolute right-3 top-1/2 transform -translate-y-1/2 text-glacier-neutral-400">
                      <Building2 className="w-4 h-4" />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* שדה טעינת קבצים */}
            <div className="space-y-3">
              <label htmlFor="files_add" className="text-lg font-bold text-neutral-900 mb-2 flex items-center gap-2">
                <Paperclip className="w-5 h-5 text-glacier-info" />
                חומרים מקצועיים שלכם (לא חובה)
              </label>
              <p className="text-glacier-neutral-600 text-sm mb-4">
                יש לטעון כל חומר מקצועי שיכול לתת לנו יותר מידע על החברה, המוצר, השירות
              </p>
              <input
                type="file"
                id="files_add"
                multiple
                accept=".pdf,.doc,.docx,.txt,.jpg,.jpeg,.png"
                onChange={handleFileChange}
                className="w-full text-lg text-glacier-neutral-600 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-lg file:font-semibold file:bg-glacier-neutral-50 file:text-glacier-neutral-700 hover:file:bg-glacier-neutral-100"
              />
              {files.length > 0 && (
                <div className="mt-4">
                  <p className="text-lg text-glacier-neutral-600">קבצים נבחרו:</p>
                  <ul className="text-lg text-glacier-neutral-500">
                    {files.map((file, index) => (
                      <li key={index}>• {file.name}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            {/* Submit Buttons */}
            <div className="flex gap-4 pt-6 border-t border-glacier-neutral-200">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 px-6 py-4 bg-glacier-neutral-200 hover:bg-glacier-neutral-300 text-glacier-neutral-700 font-bold rounded-xl transition-all duration-300 hover:scale-[1.02] transform-gpu"
              >
                ביטול
              </button>
              <button
                type="submit"
                disabled={saving}
                className="flex-1 px-6 py-4 bg-gradient-to-r from-glacier-primary to-glacier-primary-dark text-white font-bold rounded-xl transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed hover:scale-[1.02] transform-gpu shadow-lg hover:shadow-xl disabled:hover:scale-100 flex items-center justify-center gap-2"
              >
                {saving ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                    <span>יוצר חברה...</span>
                  </>
                ) : (
                  <>
                    <Building2 className="w-5 h-5" />
                    <span>יצירת חברה</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
} 