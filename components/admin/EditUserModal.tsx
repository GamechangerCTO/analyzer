'use client'

import React, { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';

interface User {
  id: string;
  email: string | null;
  full_name: string | null;
  role: string | null;
  company_id: string | null;
  is_approved: boolean;
}

interface Company {
  id: string;
  name: string;
}

interface EditUserModalProps {
  isOpen: boolean;
  onClose: () => void;
  userToEdit: User | null;
  onUserUpdated: () => void; // Callback to refresh the user list
}

export default function EditUserModal({ isOpen, onClose, userToEdit, onUserUpdated }: EditUserModalProps) {
  const supabase = createClient();
  const [formData, setFormData] = useState<{ full_name: string; company_id: string }>({ full_name: '', company_id: '' });
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loadingCompanies, setLoadingCompanies] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchCompanies() {
      if (!isOpen) return;
      setLoadingCompanies(true);
      setError(null);
      try {
        const { data, error } = await supabase.from('companies').select('id, name');
        if (error) throw error;
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
    if (userToEdit) {
      setFormData({
        full_name: userToEdit.full_name || '',
        company_id: userToEdit.company_id || ''
      });
    } else {
      // Reset form if no user is being edited (e.g., modal closed and reopened for new user)
      setFormData({ full_name: '', company_id: '' });
    }
    setError(null); // Clear errors when user changes or modal opens/closes
  }, [userToEdit]);

  if (!isOpen || !userToEdit) return null;

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userToEdit) return;
    setSaving(true);
    setError(null);
    
    try {
      // ולידציה: בדיקה שמנהלים ונציגים חייבים להיות משויכים לחברה
      if ((userToEdit.role === 'manager' || userToEdit.role === 'agent') && !formData.company_id) {
        setError('נציגים ומנהלים חייבים להיות משויכים לחברה. אנא בחר חברה.');
        setSaving(false);
        return;
      }

      const { error: updateError } = await supabase
        .from('users')
        .update({
          full_name: formData.full_name,
          company_id: formData.company_id || null, // Handle empty string as null if company is optional
        })
        .eq('id', userToEdit.id);

      if (updateError) throw updateError;
      
      onUserUpdated(); // Call callback to refresh user list in parent
      onClose(); // Close modal on success
    } catch (err) {
      console.error("Error updating user:", err);
      const supabaseError = err as any; // Type assertion to access Supabase error properties
      setError(`שגיאה בעדכון המשתמש: ${supabaseError.message || 'שגיאה לא ידועה'}`);
    } finally {
      setSaving(false);
    }
  };

  // פונקציה עזר לקביעת האם החברה חובה
  const isCompanyRequired = () => {
    return userToEdit?.role === 'manager' || userToEdit?.role === 'agent';
  };

  // פונקציה עזר לקביעת טקסט התווית
  const getCompanyLabel = () => {
    return isCompanyRequired() ? 'חברה (חובה)' : 'חברה (אופציונלי)';
  };

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50 flex items-center justify-center">
      <div className="relative p-5 border w-full max-w-md shadow-lg rounded-md bg-white">
        <h3 className="text-lg font-medium leading-6 text-gray-900 mb-4">עריכת משתמש: {userToEdit.full_name || userToEdit.email}</h3>
        
        {error && (
          <div className="mb-3 p-3 bg-red-100 text-red-700 rounded-md">
            <p>{error}</p>
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label htmlFor="full_name" className="block text-sm font-medium text-gray-700">שם מלא</label>
            <input 
              type="text" 
              name="full_name" 
              id="full_name"
              value={formData.full_name}
              onChange={handleChange}
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
            />
          </div>

          <div className="mb-4">
            <label htmlFor="company_id" className={`block text-sm font-medium ${isCompanyRequired() ? 'text-red-700' : 'text-gray-700'}`}>
              {getCompanyLabel()}
              {isCompanyRequired() && <span className="text-red-500 mr-1">*</span>}
            </label>
            {loadingCompanies ? (
              <p>טוען חברות...</p>
            ) : (
              <select 
                name="company_id" 
                id="company_id"
                value={formData.company_id}
                onChange={handleChange}
                required={isCompanyRequired()}
                className={`mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md ${isCompanyRequired() && !formData.company_id ? 'border-red-300 focus:border-red-500' : ''}`}
              >
                <option value="">
                  {isCompanyRequired() ? 'יש לבחור חברה...' : 'ללא חברה'}
                </option>
                {companies.map(company => (
                  <option key={company.id} value={company.id}>{company.name}</option>
                ))}
              </select>
            )}
          </div>

          <div className="items-center pt-3 border-t border-gray-200">
            <button
              type="submit"
              disabled={saving || loadingCompanies}
              className="px-4 py-2 bg-blue-500 text-white text-base font-medium rounded-md w-full shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-400"
            >
              {saving ? 'שומר...' : 'שמור שינויים'}
            </button>
            <button 
              type="button"
              onClick={onClose}
              disabled={saving}
              className="mt-2 px-4 py-2 bg-gray-200 text-gray-800 text-base font-medium rounded-md w-full shadow-sm hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-300 disabled:opacity-50"
            >
              ביטול
            </button>
          </div>
        </form>
      </div>
    </div>
  );
} 