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
    audience: '',
    uploads_professional_materials: false,
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    // Reset form when modal is opened/closed or on error/success
    if (isOpen) {
        setFormData({
            name: '',
            sector: '',
            product_info: '',
            avg_product_cost: '',
            audience: '',
            uploads_professional_materials: false,
        });
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

      // יצירת החברה החדשה
      const { data, error: insertError } = await supabase
        .from('companies')
        .insert({
          name: formData.name.trim(),
          sector: formData.sector.trim() || null,
          product_info: formData.product_info.trim() || null,
          avg_product_cost: formData.avg_product_cost.trim() || null,
          audience: formData.audience.trim() || null,
          uploads_professional_materials: formData.uploads_professional_materials,
        })
        .select()
        .single();

      if (insertError) {
        throw new Error(insertError.message);
      }
      
      setSuccessMessage(`החברה "${formData.name}" נוספה בהצלחה.`);
      onCompanyAdded();
      
      // Reset form for next entry
      setFormData({
          name: '',
          sector: '',
          product_info: '',
          avg_product_cost: '',
          audience: '',
          uploads_professional_materials: false,
      });

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
      <div className="relative p-5 border w-full max-w-lg shadow-lg rounded-md bg-white">
        <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-medium leading-6 text-gray-900">הוספת חברה חדשה</h3>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
                <span className="sr-only">Close</span>
                &times;
            </button>
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
          
          <div>
            <label htmlFor="sector_add" className="block text-sm font-medium text-gray-700">תחום עיסוק</label>
            <input 
              type="text" 
              name="sector" 
              id="sector_add" 
              value={formData.sector} 
              onChange={handleChange} 
              className="mt-1 input-class" 
              placeholder="למשל: טכנולוגיה, מזון, אופנה..."
            />
          </div>
          
          <div>
            <label htmlFor="product_info_add" className="block text-sm font-medium text-gray-700">מידע על המוצר</label>
            <textarea 
              name="product_info" 
              id="product_info_add" 
              value={formData.product_info} 
              onChange={handleChange} 
              rows={3}
              className="mt-1 input-class" 
              placeholder="תיאור כללי של המוצר או השירות..."
            />
          </div>
          
          <div>
            <label htmlFor="avg_product_cost_add" className="block text-sm font-medium text-gray-700">עלות ממוצעת של המוצר</label>
            <input 
              type="text" 
              name="avg_product_cost" 
              id="avg_product_cost_add" 
              value={formData.avg_product_cost} 
              onChange={handleChange} 
              className="mt-1 input-class" 
              placeholder="למשל: 100-500 ש״ח, 1000-5000 ש״ח..."
            />
          </div>
          
          <div>
            <label htmlFor="audience_add" className="block text-sm font-medium text-gray-700">קהל יעד</label>
            <input 
              type="text" 
              name="audience" 
              id="audience_add" 
              value={formData.audience} 
              onChange={handleChange} 
              className="mt-1 input-class" 
              placeholder="למשל: אנשי עסקים, מובטלים, סטודנטים..."
            />
          </div>
          
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
              מעלה חומרים מקצועיים
            </label>
          </div>
          
          <div className="pt-3 border-t border-gray-200">
            <button type="submit" disabled={saving} className="btn-primary w-full disabled:bg-gray-400">
              {saving ? 'יוצר חברה...' : 'צור חברה'}
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