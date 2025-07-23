'use client'

import { useState, useEffect } from 'react'
import { getSupabaseClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { Info, AlertCircle, CheckCircle2, Building2, Target, Package, DollarSign, Grid3X3, Users, Star, Zap, Smile, TrendingUp, Heart, Paperclip } from 'lucide-react'

interface CompanyQuestionnaireFormProps {
  companyId: string
  companyData: any
  isAdminEdit?: boolean
  isFirstLogin?: boolean
  isView?: boolean
}

export default function CompanyQuestionnaireForm({ 
  companyId, 
  companyData, 
  isAdminEdit = false,
  isFirstLogin = false,
  isView = false
}: CompanyQuestionnaireFormProps) {
  const supabase = getSupabaseClient()
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
    const loadQuestionnaireData = async () => {
      try {
        // טעינת נתוני השאלון מהטבלה החדשה
        const { data: questionnaireData, error } = await supabase
          .from('company_questionnaires')
          .select('*')
          .eq('company_id', companyId)
          .single();

        if (error && error.code !== 'PGRST116') { // PGRST116 = no rows found
          console.error('Error loading questionnaire data:', error);
          return;
        }

        if (questionnaireData) {
          // עדכון הטופס עם הנתונים הקיימים
          setFormData({
            name: questionnaireData.name || '',
            sector: questionnaireData.sector || '',
            product_info: questionnaireData.product_info || '',
            avg_product_cost: questionnaireData.avg_product_cost || '',
            product_types: questionnaireData.product_types?.[0] || '',
            audience: questionnaireData.audience || '',
            differentiators: Array.isArray(questionnaireData.differentiators) 
              ? questionnaireData.differentiators.slice(0, 3).concat(['', '', '']).slice(0, 3)
              : ['', '', ''],
            customer_benefits: Array.isArray(questionnaireData.customer_benefits)
              ? questionnaireData.customer_benefits.slice(0, 3).concat(['', '', '']).slice(0, 3)
              : ['', '', ''],
            company_benefits: Array.isArray(questionnaireData.company_benefits)
              ? questionnaireData.company_benefits.slice(0, 3).concat(['', '', '']).slice(0, 3)
              : ['', '', ''],
            uploads_professional_materials: questionnaireData.uploads_professional_materials || false
          });
        } else {
          // אם אין נתונים, נטען נתונים בסיסיים מטבלת החברות
          setFormData(prev => ({
            ...prev,
            name: companyData?.name || ''
          }));
        }
      } catch (err) {
        console.error('Error in loadQuestionnaireData:', err);
      }
    };

    loadQuestionnaireData();
  }, [companyId, companyData]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? (e.target as HTMLInputElement).checked : value
    }))
  }

  const handleArrayChange = (field: 'differentiators' | 'customer_benefits' | 'company_benefits', index: number, value: string) => {
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
        setError('יש למלא את תועלות הלקוח.')
        setSaving(false)
        return
      }

      console.log('✅ Validation passed. Valid data:', {
        validDifferentiators,
        validCustomerBenefits,
        formData: {
          name: formData.name,
          sector: formData.sector,
          product_info: formData.product_info,
          avg_product_cost: formData.avg_product_cost,
          product_types: formData.product_types,
          audience: formData.audience
        }
      })

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
      console.log('🔄 Starting company questionnaire save with data:', {
        company_id: companyId,
        name: formData.name.trim(),
        sector: formData.sector.trim(),
        product_info: formData.product_info.trim(),
        avg_product_cost: formData.avg_product_cost.trim(),
        product_types: [formData.product_types],
        audience: formData.audience,
        differentiators: validDifferentiators,
        customer_benefits: validCustomerBenefits,
        company_benefits: [],
        uploads_professional_materials: formData.uploads_professional_materials,
        professional_materials_files: uploadedFiles
      })

      // שמירה בטבלה החדשה company_questionnaires
      const { data: questionnaireData, error: questionnaireError } = await supabase
        .from('company_questionnaires')
        .upsert({
          company_id: companyId,
          name: formData.name.trim(),
          sector: formData.sector.trim(),
          product_info: formData.product_info.trim(),
          avg_product_cost: formData.avg_product_cost.trim(),
          product_types: [formData.product_types],
          audience: formData.audience,
          differentiators: validDifferentiators,
          customer_benefits: validCustomerBenefits,
          company_benefits: [],
          uploads_professional_materials: formData.uploads_professional_materials,
          professional_materials_files: uploadedFiles,
          is_complete: true,
          completion_score: 100,
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'company_id'
        })
        .select()

      console.log('✅ Questionnaire save result:', { questionnaireData, questionnaireError })

      if (questionnaireError) {
        console.error('❌ Questionnaire save error:', questionnaireError)
        throw new Error(questionnaireError.message)
      }

      // גם נעדכן את השם בטבלת החברות (רק השם, כי השאר עבר לטבלה החדשה)
      const { data: companyUpdateData, error: companyUpdateError } = await supabase
        .from('companies')
        .update({
          name: formData.name.trim()
        })
        .eq('id', companyId)
        .select()

      console.log('✅ Company name update result:', { companyUpdateData, companyUpdateError })

      if (companyUpdateError) {
        console.warn('⚠️ Company name update warning:', companyUpdateError)
        // לא נעצור את התהליך אם רק השם לא התעדכן
      }

      // בדיקה מיידית של הנתונים שנשמרו
      const { data: verifyData, error: verifyError } = await supabase
        .from('company_questionnaires')
        .select('*')
        .eq('company_id', companyId)
        .single()

      console.log('🔍 Verification of saved questionnaire data:', { verifyData, verifyError })
      
      if (isFirstLogin) {
        setSuccessMessage(`ברוך הבא! פרטי החברה "${formData.name}" נשמרו בהצלחה. מעבר לדשבורד...`)
      } else {
        setSuccessMessage(`שאלון החברה "${formData.name}" עודכן בהצלחה!`)
      }
      
      // חזרה לדשבורד לאחר 2 שניות
      setTimeout(() => {
        if (isAdminEdit) {
          router.push('/dashboard/admin/companies')
        } else {
          router.push('/dashboard/manager')
        }
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
    <div className="bg-white/95 backdrop-blur-xl rounded-3xl shadow-2xl border-2 border-glacier-neutral-200/50 p-8 md:p-12">
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
            <div>
              <p className="text-glacier-success-700 font-bold">{successMessage}</p>
              <p className="text-glacier-success-600 text-sm mt-1">מעביר אותך חזרה לדשבורד...</p>
            </div>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-8">
        {/* שם החברה */}
        <div className="space-y-3">
          <label htmlFor="name" className="text-lg font-bold text-neutral-900 mb-2 flex items-center gap-2">
            <Building2 className="w-5 h-5 text-glacier-primary" />
            שם החברה 
            <span className="text-red-500">*</span>
          </label>
          <input 
            type="text" 
            name="name" 
            id="name" 
            value={formData.name} 
            onChange={handleChange} 
            required 
            className="w-full p-4 border-2 border-glacier-neutral-200 rounded-xl focus:border-glacier-primary focus:outline-none transition-all duration-300 ease-out text-neutral-900 bg-white hover:border-glacier-primary-light hover:shadow-lg hover:scale-[1.02] focus:scale-[1.02] focus:shadow-xl transform-gpu"
            placeholder="הזן שם החברה..."
          />
        </div>
        
        {/* תחום/סגמנט */}
        <div className="space-y-3">
          <label htmlFor="sector" className="text-lg font-bold text-neutral-900 mb-2 flex items-center gap-2">
            <Target className="w-5 h-5 text-glacier-accent" />
            תחום/סגמנט 
            <span className="text-red-500">*</span>
          </label>
          <input 
            type="text" 
            name="sector" 
            id="sector" 
            value={formData.sector} 
            onChange={handleChange} 
            required
            className="w-full p-4 border-2 border-glacier-neutral-200 rounded-xl focus:border-glacier-primary focus:outline-none transition-all duration-300 ease-out text-neutral-900 bg-white hover:border-glacier-primary-light hover:shadow-lg hover:scale-[1.02] focus:scale-[1.02] focus:shadow-xl transform-gpu"
            placeholder="למשל: טכנולוגיה, מזון, אופנה..."
          />
        </div>
        
        {/* פרטים על המוצר/השירות */}
        <div className="space-y-3">
          <label htmlFor="product_info" className="text-lg font-bold text-neutral-900 mb-2 flex items-center gap-2">
            <Package className="w-5 h-5 text-glacier-secondary" />
            פרטים על המוצר/השירות 
            <span className="text-red-500">*</span>
          </label>
          <textarea 
            name="product_info" 
            id="product_info" 
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
          <label htmlFor="avg_product_cost" className="text-lg font-bold text-neutral-900 mb-2 flex items-center gap-2">
            <DollarSign className="w-5 h-5 text-glacier-warning" />
            עלות המוצר/שירות 
            <span className="text-red-500">*</span>
          </label>
          <input 
            type="text" 
            name="avg_product_cost" 
            id="avg_product_cost" 
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
        <div>
          <label htmlFor="files" className="text-lg font-bold text-neutral-900 mb-2 flex items-center gap-2">
            <Paperclip className="w-5 h-5 text-glacier-info" />
            חומרים מקצועיים שלכם (לא חובה)
          </label>
          <p className="text-glacier-neutral-600 text-sm mb-4">
            יש לטעון כל חומר מקצועי שיכול לתת לנו יותר מידע על החברה, המוצר, השירות להלן פירוט חומרים: 
            אוגדן מכירות/שירות – כולל תסריטי שיחה, בנק התנגדויות, בנק שאלות בירור צורך, יתרונות וייחודיות של המוצר/שירות מול מתחרים, 
            ו/או כל חומר שעשוי להיות רלוונטי לטובת התהליך לשיפור ביצועים בתחום המכירות והשירות
          </p>
          <input
            type="file"
            id="files"
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
        
        <div className="pt-6 border-t border-gray-200">
          <button 
            type="submit" 
            disabled={saving} 
            className="w-full bg-glacier-primary hover:bg-glacier-primary-dark text-white font-bold py-4 px-6 rounded-xl transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
          >
            {saving 
              ? (isFirstLogin ? 'משלים הרשמה...' : 'שומר שאלון...') 
              : (isFirstLogin ? 'השלמת ההרשמה' : 'שמור שאלון')
            }
          </button>
          
          {!isFirstLogin && (
            <button 
              type="button" 
              onClick={() => {
                if (isAdminEdit) {
                  router.push('/dashboard/admin/companies')
                } else {
                  router.push('/dashboard/manager')
                }
              }} 
              disabled={saving} 
              className="w-full mt-4 bg-glacier-neutral-200 hover:bg-glacier-neutral-300 text-glacier-700 font-bold py-4 px-6 rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isAdminEdit ? 'חזור לרשימת החברות' : 'חזור לדשבורד'}
            </button>
          )}
          
          {isFirstLogin && (
            <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
              <p className="text-yellow-800 text-sm">
                ⚠️ עליך להשלים את השאלון כדי להמשיך למערכת
              </p>
            </div>
          )}
        </div>
      </form>
    </div>
  )
} 