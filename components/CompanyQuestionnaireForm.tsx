'use client'

import { useState, useEffect } from 'react'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { useRouter } from 'next/navigation'

interface CompanyQuestionnaireFormProps {
  companyId: string
  companyData: any
}

export default function CompanyQuestionnaireForm({ companyId, companyData }: CompanyQuestionnaireFormProps) {
  const supabase = createClientComponentClient()
  const router = useRouter()
  
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

  // טעינת נתוני החברה הקיימים
  useEffect(() => {
    if (companyData) {
      setFormData({
        name: companyData.name || '',
        sector: companyData.sector || '',
        product_info: companyData.product_info || '',
        avg_product_cost: companyData.avg_product_cost || '',
        product_types: Array.isArray(companyData.product_types) ? companyData.product_types[0] || '' : companyData.product_types || '',
        audience: companyData.audience || '',
        differentiators: Array.isArray(companyData.differentiators) ? 
          [...companyData.differentiators, '', '', ''].slice(0, 3) : 
          ['', '', ''],
        customer_benefits: Array.isArray(companyData.customer_benefits) ? 
          [...companyData.customer_benefits, '', '', ''].slice(0, 3) : 
          ['', '', ''],
        company_benefits: Array.isArray(companyData.company_benefits) ? 
          [...companyData.company_benefits, '', '', ''].slice(0, 3) : 
          ['', '', ''],
        uploads_professional_materials: companyData.uploads_professional_materials || false,
      })
    }
  }, [companyData])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? (e.target as HTMLInputElement).checked : value
    }))
  }

  const handleArrayChange = (index: number, field: 'differentiators' | 'customer_benefits' | 'company_benefits', value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: prev[field].map((item, i) => i === index ? value : item)
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
        setError('יש למלא לפחות תועלת אחת עבור הלקוח.')
        setSaving(false)
        return
      }

      // בדיקת תועלות חברה (חובה למלא לפחות אחד)
      const validCompanyBenefits = formData.company_benefits.filter(b => b.trim())
      if (validCompanyBenefits.length === 0) {
        setError('יש למלא לפחות תועלת אחת עבור החברה.')
        setSaving(false)
        return
      }

      // העלאת קבצים לStorage אם קיימים
      let uploadedFiles: string[] = []
      if (files.length > 0) {
        for (const file of files) {
          const fileExt = file.name.split('.').pop()
          const fileName = `company-materials/${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`
          
          const { error: uploadError } = await supabase.storage
            .from('audio_files')
            .upload(fileName, file)
          
          if (uploadError) {
            console.warn('שגיאה בהעלאת קובץ:', uploadError)
          } else {
            uploadedFiles.push(fileName)
          }
        }
      }

      // עדכון החברה הקיימת
      const { error: updateError } = await supabase
        .from('companies')
        .update({
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
        })
        .eq('id', companyId)

      if (updateError) {
        throw new Error(updateError.message)
      }
      
      setSuccessMessage(`שאלון החברה "${formData.name}" עודכן בהצלחה!`)
      
      // חזרה לדשבורד לאחר 2 שניות
      setTimeout(() => {
        router.push('/dashboard/manager')
      }, 2000)

    } catch (err) {
      console.error("Error updating company:", err)
      const errorMessage = err instanceof Error ? err.message : 'שגיאה לא ידועה'
      setError(`שגיאה בעדכון החברה: ${errorMessage}`)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="bg-white rounded-xl shadow-lg p-8">
      <div className="mb-6 p-4 bg-blue-50 text-blue-800 rounded-md text-sm">
        <p>כל השדות הן חובה למעט העלאת חומרים מקצועיים</p>
      </div>

      {error && (
        <div className="mb-4 p-4 bg-red-100 text-red-700 rounded-md">
          <p>{error}</p>
        </div>
      )}
      
      {successMessage && (
        <div className="mb-4 p-4 bg-green-100 text-green-700 rounded-md">
          <p>{successMessage}</p>
          <p className="text-sm mt-2">מעביר אותך חזרה לדשבורד...</p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* שם החברה */}
        <div>
          <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-2">
            שם החברה <span className="text-red-500">*</span>
          </label>
          <input 
            type="text" 
            name="name" 
            id="name" 
            value={formData.name} 
            onChange={handleChange} 
            required 
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            placeholder="הזן שם החברה..."
          />
        </div>
        
        {/* תחום/סגמנט */}
        <div>
          <label htmlFor="sector" className="block text-sm font-medium text-gray-700 mb-2">
            תחום/סגמנט <span className="text-red-500">*</span>
          </label>
          <input 
            type="text" 
            name="sector" 
            id="sector" 
            value={formData.sector} 
            onChange={handleChange} 
            required
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            placeholder="למשל: טכנולוגיה, מזון, אופנה..."
          />
        </div>
        
        {/* פרטים על המוצר/השירות */}
        <div>
          <label htmlFor="product_info" className="block text-sm font-medium text-gray-700 mb-2">
            פרטים על המוצר/השירות <span className="text-red-500">*</span>
          </label>
          <textarea 
            name="product_info" 
            id="product_info" 
            value={formData.product_info} 
            onChange={handleChange} 
            required
            rows={4}
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            placeholder="תיאור מפורט של המוצר או השירות..."
          />
        </div>
        
        {/* עלות המוצר/שירות */}
        <div>
          <label htmlFor="avg_product_cost" className="block text-sm font-medium text-gray-700 mb-2">
            עלות המוצר/שירות <span className="text-red-500">*</span>
          </label>
          <input 
            type="text" 
            name="avg_product_cost" 
            id="avg_product_cost" 
            value={formData.avg_product_cost} 
            onChange={handleChange} 
            required
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            placeholder="למשל: 100-500 ש״ח, 1000-5000 ש״ח..."
          />
        </div>

        {/* סוגי מוצרים */}
        <div>
          <label htmlFor="product_types" className="block text-sm font-medium text-gray-700 mb-2">
            סוגי מוצרים <span className="text-red-500">*</span>
          </label>
          <select 
            name="product_types" 
            id="product_types" 
            value={formData.product_types} 
            onChange={handleChange} 
            required
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="">בחר סוג מוצר...</option>
            {productTypeOptions.map(option => (
              <option key={option} value={option}>{option}</option>
            ))}
          </select>
        </div>
        
        {/* קהל יעד */}
        <div>
          <label htmlFor="audience" className="block text-sm font-medium text-gray-700 mb-2">
            קהל יעד פרטי/עסקי <span className="text-red-500">*</span>
          </label>
          <select 
            name="audience" 
            id="audience" 
            value={formData.audience} 
            onChange={handleChange} 
            required
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="">בחר קהל יעד...</option>
            {audienceOptions.map(option => (
              <option key={option} value={option}>{option}</option>
            ))}
          </select>
        </div>

        {/* 3 בידולים ויתרונות משמעותיים */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            3 בידולים ויתרונות משמעותיים על פני מתחרים - במשפט אחד <span className="text-red-500">*</span>
          </label>
          {[0, 1, 2].map(index => (
            <div key={index} className="mb-2">
              <input
                type="text"
                value={formData.differentiators[index]}
                onChange={(e) => handleArrayChange(index, 'differentiators', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                placeholder={`בידול ${index + 1}...`}
                required={index === 0} // רק הראשון חובה
              />
            </div>
          ))}
        </div>

        {/* תועלות המוצר/השירות ייחודיות */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            תועלות המוצר/השירות ייחודיות - עד 3 תועלות עבור הלקוח <span className="text-red-500">*</span>
          </label>
          {[0, 1, 2].map(index => (
            <div key={index} className="mb-2">
              <input
                type="text"
                value={formData.customer_benefits[index]}
                onChange={(e) => handleArrayChange(index, 'customer_benefits', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                placeholder={`תועלת לקוח ${index + 1}...`}
                required={index === 0} // רק הראשון חובה
              />
            </div>
          ))}
        </div>

        {/* תועלות החברה ייחודיות */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            תועלות החברה ייחודיות - עד 3 תועלות <span className="text-red-500">*</span>
          </label>
          {[0, 1, 2].map(index => (
            <div key={index} className="mb-2">
              <input
                type="text"
                value={formData.company_benefits[index]}
                onChange={(e) => handleArrayChange(index, 'company_benefits', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                placeholder={`תועלת חברה ${index + 1}...`}
                required={index === 0} // רק הראשון חובה
              />
            </div>
          ))}
        </div>

        {/* מעוניין לטעון חומרים מקצועיים */}
        <div className="flex items-center">
          <input 
            type="checkbox" 
            name="uploads_professional_materials" 
            id="uploads_professional_materials" 
            checked={formData.uploads_professional_materials} 
            onChange={handleChange} 
            className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded ml-2"
          />
          <label htmlFor="uploads_professional_materials" className="block text-sm text-gray-900">
            מעוניין לטעון חומרים מקצועיים שלכם נוספים שעשויים להיות רלוונטי לטובת תהליך לשיפור ביצועים?
          </label>
        </div>

        {/* שדה טעינת קבצים */}
        <div>
          <label htmlFor="files" className="block text-sm font-medium text-gray-700 mb-2">
            חומרים מקצועיים שלכם (לא חובה)
          </label>
          <p className="text-sm text-gray-600 mb-2">
            יש לטעון כל חומר מקצועי שיכול לתת לנו יותר מידע על החברה, המוצר, השירות, האתגרים, אוגדן מכירות/שירות ו/או כל חומר שעשוי להיות רלוונטי לטובת התהליך לשיפור ביצועים
          </p>
          <input
            type="file"
            id="files"
            multiple
            accept=".pdf,.doc,.docx,.txt,.jpg,.jpeg,.png"
            onChange={handleFileChange}
            className="w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
          />
          {files.length > 0 && (
            <div className="mt-2">
              <p className="text-sm text-gray-600">קבצים נבחרו:</p>
              <ul className="text-sm text-gray-500">
                {files.map((file, index) => (
                  <li key={index}>• {file.name}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
        
        <div className="pt-6 border-t border-gray-200">
          <button 
            type="submit" 
            disabled={saving} 
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-4 rounded-lg transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
          >
            {saving ? 'שומר שאלון...' : 'שמור שאלון'}
          </button>
          
          <button 
            type="button" 
            onClick={() => router.push('/dashboard/manager')} 
            disabled={saving} 
            className="w-full mt-3 bg-gray-300 hover:bg-gray-400 text-gray-700 font-bold py-3 px-4 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            חזור לדשבורד
          </button>
        </div>
      </form>
    </div>
  )
} 