'use client'

import React, { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';

interface AddCompanyModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCompanyAdded: () => void; // Callback to refresh the company list
}

export default function AddCompanyModal({ isOpen, onClose, onCompanyAdded }: AddCompanyModalProps) {
  const supabase = createClient();
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
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [files, setFiles] = useState<File[]>([]);

  // אפשרויות סוגי מוצרים
  const productTypeOptions = [
    'מוצרי מדף לצרכן הסופי',
    'מוצרים פיזיים', 
    'שירותים',
    'מוצרים דיגיטליים'
  ];

  // אפשרויות קהל יעד
  const audienceOptions = [
    'קהל C2B (לצרכן)',
    'קהל עסקי B2B'
  ];

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
        });
        setFiles([]);
        setError(null);
        setSuccessMessage(null);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    if (type === 'checkbox') {
      const checkbox = e.target as HTMLInputElement;
      setFormData(prev => ({ 
          ...prev, 
          [name]: checkbox.checked
      }));
    } else {
      setFormData(prev => ({ 
          ...prev, 
          [name]: value 
      }));
    }
  };

  const handleArrayChange = (index: number, field: 'differentiators' | 'customer_benefits' | 'company_benefits', value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: prev[field].map((item, i) => i === index ? value : item)
    }));
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setFiles(Array.from(e.target.files));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setSuccessMessage(null);

    try {
      // בדיקה שהשם לא ריק
      if (!formData.name.trim()) {
        setError('שם החברה הוא שדה חובה.');
        setSaving(false);
        return;
      }

      // בדיקת שדות חובה נוספים
      if (!formData.sector.trim()) {
        setError('תחום/סגמנט הוא שדה חובה.');
        setSaving(false);
        return;
      }

      if (!formData.product_info.trim()) {
        setError('פרטים על המוצר/השירות הוא שדה חובה.');
        setSaving(false);
        return;
      }

      if (!formData.avg_product_cost.trim()) {
        setError('עלות המוצר/שירות הוא שדה חובה.');
        setSaving(false);
        return;
      }

      if (!formData.product_types) {
        setError('יש לבחור סוג מוצר.');
        setSaving(false);
        return;
      }

      if (!formData.audience) {
        setError('יש לבחור קהל יעד.');
        setSaving(false);
        return;
      }

      // בדיקת שדות הבידולים (חובה למלא לפחות אחד)
      const validDifferentiators = formData.differentiators.filter(d => d.trim());
      if (validDifferentiators.length === 0) {
        setError('יש למלא לפחות בידול אחד משמעותי.');
        setSaving(false);
        return;
      }

      // בדיקת תועלות לקוח (חובה למלא לפחות אחד)
      const validCustomerBenefits = formData.customer_benefits.filter(b => b.trim());
      if (validCustomerBenefits.length === 0) {
        setError('יש למלא לפחות תועלת אחת עבור הלקוח.');
        setSaving(false);
        return;
      }

      // בדיקת תועלות חברה (חובה למלא לפחות אחד)
      const validCompanyBenefits = formData.company_benefits.filter(b => b.trim());
      if (validCompanyBenefits.length === 0) {
        setError('יש למלא לפחות תועלת אחת עבור החברה.');
        setSaving(false);
        return;
      }

      // העלאת קבצים לStorage אם קיימים
      let uploadedFiles: string[] = [];
      if (files.length > 0) {
        for (const file of files) {
          const fileExt = file.name.split('.').pop();
          const fileName = `company-materials/${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;
          
          const { error: uploadError } = await supabase.storage
            .from('audio_files')
            .upload(fileName, file);
          
          if (uploadError) {
            console.warn('שגיאה בהעלאת קובץ:', uploadError);
          } else {
            uploadedFiles.push(fileName);
          }
        }
      }

      // יצירת החברה החדשה
      const { data, error: insertError } = await supabase
        .from('companies')
        .insert({
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
          // professional_files: uploadedFiles.length > 0 ? uploadedFiles : null, // אם יש שדה כזה
        })
        .select()
        .single();

      if (insertError) {
        throw new Error(insertError.message);
      }
      
      setSuccessMessage(`החברה "${formData.name}" נוספה בהצלחה עם שאלון מלא.`);
      onCompanyAdded();
      
      // Reset form for next entry
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
      });
      setFiles([]);

    } catch (err) {
      console.error("Error creating company:", err);
      const errorMessage = err instanceof Error ? err.message : 'שגיאה לא ידועה';
      setError(`שגיאה ביצירת החברה: ${errorMessage}`);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50 flex items-center justify-center">
      <div className="relative p-5 border w-full max-w-2xl shadow-lg rounded-md bg-white max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-medium leading-6 text-gray-900">שאלון לקוח בהקמת חשבון חדש</h3>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
                <span className="sr-only">Close</span>
                &times;
            </button>
        </div>
        
        <div className="mb-4 p-3 bg-blue-50 text-blue-800 rounded-md text-sm">
          <p>כל השדות הן חובה למעט העלאת חומרים מקצועיים</p>
        </div>

        {error && (
          <div className="mb-3 p-3 bg-red-100 text-red-700 rounded-md">
            <p>{error}</p>
          </div>
        )}
        {successMessage && (
          <div className="mb-3 p-3 bg-green-100 text-green-700 rounded-md">
            <p>{successMessage}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* שם החברה */}
          <div>
            <label htmlFor="name_add" className="block text-sm font-medium text-gray-700">
              שם החברה <span className="text-red-500">*</span>
            </label>
            <input 
              type="text" 
              name="name" 
              id="name_add" 
              value={formData.name} 
              onChange={handleChange} 
              required 
              className="mt-1 input-class" 
              placeholder="הזן שם החברה..."
            />
          </div>
          
          {/* תחום/סגמנט */}
          <div>
            <label htmlFor="sector_add" className="block text-sm font-medium text-gray-700">
              תחום/סגמנט <span className="text-red-500">*</span>
            </label>
            <input 
              type="text" 
              name="sector" 
              id="sector_add" 
              value={formData.sector} 
              onChange={handleChange} 
              required
              className="mt-1 input-class" 
              placeholder="למשל: טכנולוגיה, מזון, אופנה..."
            />
          </div>
          
          {/* פרטים על המוצר/השירות */}
          <div>
            <label htmlFor="product_info_add" className="block text-sm font-medium text-gray-700">
              פרטים על המוצר/השירות <span className="text-red-500">*</span>
            </label>
            <textarea 
              name="product_info" 
              id="product_info_add" 
              value={formData.product_info} 
              onChange={handleChange} 
              required
              rows={3}
              className="mt-1 input-class" 
              placeholder="תיאור מפורט של המוצר או השירות..."
            />
          </div>
          
          {/* עלות המוצר/שירות */}
          <div>
            <label htmlFor="avg_product_cost_add" className="block text-sm font-medium text-gray-700">
              עלות המוצר/שירות <span className="text-red-500">*</span>
            </label>
            <input 
              type="text" 
              name="avg_product_cost" 
              id="avg_product_cost_add" 
              value={formData.avg_product_cost} 
              onChange={handleChange} 
              required
              className="mt-1 input-class" 
              placeholder="למשל: 100-500 ש״ח, 1000-5000 ש״ח..."
            />
          </div>

          {/* סוגי מוצרים */}
          <div>
            <label htmlFor="product_types_add" className="block text-sm font-medium text-gray-700">
              סוגי מוצרים <span className="text-red-500">*</span>
            </label>
            <select 
              name="product_types" 
              id="product_types_add" 
              value={formData.product_types} 
              onChange={handleChange} 
              required
              className="mt-1 input-class"
            >
              <option value="">בחר סוג מוצר...</option>
              {productTypeOptions.map(option => (
                <option key={option} value={option}>{option}</option>
              ))}
            </select>
          </div>
          
          {/* קהל יעד */}
          <div>
            <label htmlFor="audience_add" className="block text-sm font-medium text-gray-700">
              קהל יעד פרטי/עסקי <span className="text-red-500">*</span>
            </label>
            <select 
              name="audience" 
              id="audience_add" 
              value={formData.audience} 
              onChange={handleChange} 
              required
              className="mt-1 input-class"
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
                  className="w-full input-class"
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
                  className="w-full input-class"
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
                  className="w-full input-class"
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
              id="uploads_professional_materials_add" 
              checked={formData.uploads_professional_materials} 
              onChange={handleChange} 
              className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
            />
            <label htmlFor="uploads_professional_materials_add" className="mr-2 block text-sm text-gray-900">
              מעוניין לטעון חומרים מקצועיים שלכם נוספים שעשויים להיות רלוונטי לטובת תהליך לשיפור ביצועים?
            </label>
          </div>

          {/* שדה טעינת קבצים */}
          {formData.uploads_professional_materials && (
            <div>
              <label htmlFor="files_add" className="block text-sm font-medium text-gray-700 mb-2">
                חומרים מקצועיים שלכם (לא חובה)
              </label>
              <p className="text-sm text-gray-600 mb-2">
                יש לטעון כל חומר מקצועי שיכול לתת לנו יותר מידע על החברה, המוצר, השירות, האתגרים, אוגדן מכירות/שירות ו/או כל חומר שעשוי להיות רלוונטי לטובת התהליך לשיפור ביצועים
              </p>
              <input
                type="file"
                id="files_add"
                multiple
                accept=".pdf,.doc,.docx,.txt,.jpg,.jpeg,.png"
                onChange={handleFileChange}
                className="mt-1 block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
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
          )}
          
          <div className="pt-3 border-t border-gray-200">
            <button type="submit" disabled={saving} className="btn-primary w-full disabled:bg-gray-400">
              {saving ? 'יוצר חברה עם שאלון מלא...' : 'צור חברה'}
            </button>
            <button type="button" onClick={onClose} disabled={saving} className="btn-secondary w-full mt-2 disabled:opacity-50">
              סגור
            </button>
          </div>
        </form>
        
        <style jsx>{`
          .input-class {
            display: block; 
            width: 100%; 
            padding-left: 0.75rem; 
            padding-right: 0.75rem; 
            padding-top: 0.5rem; 
            padding-bottom: 0.5rem; 
            font-size: 0.875rem; 
            line-height: 1.25rem; 
            border-width: 1px; 
            border-color: #D1D5DB; 
            border-radius: 0.375rem; 
            box-shadow: 0 1px 2px 0 rgba(0, 0, 0, 0.05);
          }
          .input-class:focus {
            outline: 2px solid transparent; 
            outline-offset: 2px; 
            border-color: #6366F1; 
            ring-color: #6366F1;
          }
          .btn-primary {
             padding-left: 1rem; 
             padding-right: 1rem; 
             padding-top: 0.5rem; 
             padding-bottom: 0.5rem; 
             background-color: #4F46E5; 
             color: white; 
             font-size: 0.875rem; 
             line-height: 1.25rem; 
             font-weight: 500; 
             border-radius: 0.375rem; 
             box-shadow: 0 1px 2px 0 rgba(0, 0, 0, 0.05);
          }
          .btn-primary:hover {
            background-color: #4338CA;
          }
          .btn-secondary {
            padding-left: 1rem; 
            padding-right: 1rem; 
            padding-top: 0.5rem; 
            padding-bottom: 0.5rem; 
            background-color: #E5E7EB; 
            color: #1F2937; 
            font-size: 0.875rem; 
            line-height: 1.25rem; 
            font-weight: 500; 
            border-radius: 0.375rem; 
            box-shadow: 0 1px 2px 0 rgba(0, 0, 0, 0.05);
          }
          .btn-secondary:hover {
            background-color: #D1D5DB;
          }
        `}</style>
      </div>
    </div>
  );
} 