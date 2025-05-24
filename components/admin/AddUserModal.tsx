'use client'

import React, { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { createUserWithServiceRole } from '@/lib/actions/users';

interface Company {
  id: string;
  name: string;
}

const AVAILABLE_ROLES = [
  { value: 'admin', label: 'מנהל מערכת' },
  { value: 'manager', label: 'מנהל' },
  { value: 'agent', label: 'נציג' },
];

interface AddUserModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUserAdded: () => void; // Callback to refresh the user list
}

export default function AddUserModal({ isOpen, onClose, onUserAdded }: AddUserModalProps) {
  const supabase = createClient();
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    full_name: '',
    role: 'agent', // Default role
    company_id: '',
  });
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loadingCompanies, setLoadingCompanies] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    async function fetchCompanies() {
      if (!isOpen) return;
      setLoadingCompanies(true);
      setError(null);
      setSuccessMessage(null);
      try {
        const { data, error: companiesError } = await supabase.from('companies').select('id, name');
        if (companiesError) throw companiesError;
        setCompanies(data || []);
      } catch (e) {
        console.error("Failed to fetch companies:", e);
        setError("שגיאה בטעינת רשימת החברות.");
      } finally {
        setLoadingCompanies(false);
      }
    }
    fetchCompanies();
  }, [isOpen, supabase]);

  useEffect(() => {
    // Reset form when modal is opened/closed or on error/success
    if (isOpen) {
        setFormData({
            email: '',
            password: '',
            full_name: '',
            role: 'agent',
            company_id: '',
        });
        setError(null);
        setSuccessMessage(null);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    setFormData(prev => ({ 
        ...prev, 
        [name]: value 
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setSuccessMessage(null);

    try {
      // ולידציה: בדיקה שמנהלים ונציגים חייבים להיות משויכים לחברה
      if ((formData.role === 'manager' || formData.role === 'agent') && !formData.company_id) {
        setError('נציגים ומנהלים חייבים להיות משויכים לחברה. אנא בחר חברה.');
        setSaving(false);
        return;
      }

      // שימוש בפעולת השרת המשתמשת ב-service_role
      const result = await createUserWithServiceRole({
        email: formData.email,
        password: formData.password,
        full_name: formData.full_name,
        role: formData.role,
        company_id: formData.company_id || null,
      });

      if (!result.success) {
        throw new Error(result.error);
      }
      
      // הצגת הודעה מתאימה בהתאם לסטטוס האישור ואם המשתמש קיים
      if (result.isExisting) {
        setSuccessMessage(`משתמש ${formData.email} עודכן בהצלחה.`);
      } else if (result.is_approved) {
        setSuccessMessage(`משתמש ${formData.email} נוצר בהצלחה ואושר אוטומטית.`);
      } else {
        setSuccessMessage(`משתמש ${formData.email} נוצר בהצלחה וממתין לאישור מנהל מערכת.`);
      }
      
      onUserAdded();
      
      // Reset form for next entry
      setFormData({
          email: '',
          password: '',
          full_name: '',
          role: 'agent',
          company_id: '',
      });

    } catch (err) {
      console.error("Error creating user:", err);
      const errorMessage = err instanceof Error ? err.message : 'שגיאה לא ידועה';
      setError(`שגיאה ביצירת המשתמש: ${errorMessage}`);
    } finally {
      setSaving(false);
    }
  };

  // פונקציה עזר לקביעת האם החברה חובה
  const isCompanyRequired = () => {
    return formData.role === 'manager' || formData.role === 'agent';
  };

  // פונקציה עזר לקביעת טקסט התווית
  const getCompanyLabel = () => {
    return isCompanyRequired() ? 'חברה (חובה)' : 'חברה (אופציונלי)';
  };

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50 flex items-center justify-center">
      <div className="relative p-5 border w-full max-w-lg shadow-lg rounded-md bg-white">
        <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-medium leading-6 text-gray-900">הוספת משתמש חדש</h3>
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
            <label htmlFor="email_add" className="block text-sm font-medium text-gray-700">אימייל</label>
            <input type="email" name="email" id="email_add" value={formData.email} onChange={handleChange} required className="mt-1 input-class" />
          </div>
          <div>
            <label htmlFor="password_add" className="block text-sm font-medium text-gray-700">סיסמה</label>
            <input type="password" name="password" id="password_add" value={formData.password} onChange={handleChange} required minLength={6} className="mt-1 input-class" />
          </div>
          <div>
            <label htmlFor="full_name_add" className="block text-sm font-medium text-gray-700">שם מלא</label>
            <input type="text" name="full_name" id="full_name_add" value={formData.full_name} onChange={handleChange} required className="mt-1 input-class" />
          </div>
          <div>
            <label htmlFor="role_add" className="block text-sm font-medium text-gray-700">תפקיד</label>
            <select name="role" id="role_add" value={formData.role} onChange={handleChange} className="mt-1 select-class">
              {AVAILABLE_ROLES.map(role => <option key={role.value} value={role.value}>{role.label}</option>)}
            </select>
          </div>
          <div>
            <label htmlFor="company_id_add" className={`block text-sm font-medium ${isCompanyRequired() ? 'text-red-700' : 'text-gray-700'}`}>
              {getCompanyLabel()}
              {isCompanyRequired() && <span className="text-red-500 mr-1">*</span>}
            </label>
            {loadingCompanies ? <p>טוען חברות...</p> : (
              <select 
                name="company_id" 
                id="company_id_add" 
                value={formData.company_id} 
                onChange={handleChange} 
                required={isCompanyRequired()}
                className={`mt-1 select-class ${isCompanyRequired() && !formData.company_id ? 'border-red-300 focus:border-red-500' : ''}`}
              >
                <option value="">
                  {isCompanyRequired() ? 'יש לבחור חברה...' : 'בחר חברה...'}
                </option>
                {companies.map(company => <option key={company.id} value={company.id}>{company.name}</option>)}
              </select>
            )}
          </div>
          
          <div className="pt-3 border-t border-gray-200">
            <p className="text-sm text-gray-600 mb-2">
              * משתמשים שנוספים על ידי מנהל מערכת יאושרו אוטומטית.
              משתמשים שנוספים על ידי מנהל רגיל ידרשו אישור של מנהל מערכת.
            </p>
            <button type="submit" disabled={saving} className="btn-primary w-full disabled:bg-gray-400">
              {saving ? 'יוצר משתמש...' : 'צור משתמש'}
            </button>
            <button type="button" onClick={onClose} disabled={saving} className="btn-secondary w-full mt-2 disabled:opacity-50">
              סגור
            </button>
          </div>
        </form>
        <style jsx>{`
          .input-class {
            display: block; w-full; padding-left: 0.75rem; padding-right: 0.75rem; padding-top: 0.5rem; padding-bottom: 0.5rem; font-size: 0.875rem; line-height: 1.25rem; border-width: 1px; border-color: #D1D5DB; border-radius: 0.375rem; box-shadow: 0 1px 2px 0 rgba(0, 0, 0, 0.05);
          }
          .input-class:focus {
            outline: 2px solid transparent; outline-offset: 2px; border-color: #6366F1; ring-color: #6366F1;
          }
          .select-class {
            display: block; w-full; padding-left: 0.75rem; padding-right: 2.5rem; padding-top: 0.5rem; padding-bottom: 0.5rem; font-size: 1rem; line-height: 1.25rem; border-width: 1px; border-color: #D1D5DB; border-radius: 0.375rem;
          }
          .btn-primary {
             padding-left: 1rem; padding-right: 1rem; padding-top: 0.5rem; padding-bottom: 0.5rem; background-color: #4F46E5; color: white; font-size: 0.875rem; line-height: 1.25rem; font-weight: 500; border-radius: 0.375rem; box-shadow: 0 1px 2px 0 rgba(0, 0, 0, 0.05);
          }
          .btn-primary:hover {
            background-color: #4338CA;
          }
          .btn-secondary {
            padding-left: 1rem; padding-right: 1rem; padding-top: 0.5rem; padding-bottom: 0.5rem; background-color: #E5E7EB; color: #1F2937; font-size: 0.875rem; line-height: 1.25rem; font-weight: 500; border-radius: 0.375rem; box-shadow: 0 1px 2px 0 rgba(0, 0, 0, 0.05);
          }
          .btn-secondary:hover {
            background-color: #D1D5DB;
          }
        `}</style>
      </div>
    </div>
  );
} 