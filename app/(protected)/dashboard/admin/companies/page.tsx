'use client'

import React, { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import AddCompanyModal from '@/components/admin/AddCompanyModal'

interface Company {
  id: string;
  name: string;
  created_at: string;
  sector?: string | null;
  product_info?: string | null;
  avg_product_cost?: string | null;
  product_types?: string[] | null;
  audience?: string | null;
  differentiators?: string[] | null;
  customer_benefits?: string[] | null;
  company_benefits?: string[] | null;
  uploads_professional_materials?: boolean;
  status?: string;
  users_count?: number;
}

export default function AdminCompaniesPage() {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  const fetchCompanies = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const supabase = createClient();
      
      const { data, error } = await supabase
        .from('companies')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw new Error(error.message);
      
      // הוספת מספר המשתמשים בכל חברה
      const companiesWithMeta = await Promise.all(
        data.map(async (company) => {
          const { data: usersData, error: usersError } = await supabase
            .from('users')
            .select('id')
            .eq('company_id', company.id);
          
          return {
            ...company,
            status: 'פעיל', // לדוגמה בלבד
            users_count: usersError ? 0 : (usersData?.length || 0)
          };
        })
      );

      setCompanies(companiesWithMeta);
    } catch (err) {
      console.error('שגיאה בטעינת חברות:', err);
      setError('שגיאה בטעינת נתוני החברות');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCompanies();
  }, [fetchCompanies]);

  const handleOpenAddModal = () => {
    setIsAddModalOpen(true);
    setError(null);
    setSuccessMessage(null);
  };

  const handleCloseAddModal = () => {
    setIsAddModalOpen(false);
  };

  const handleCompanyAdded = () => {
    fetchCompanies();
    setSuccessMessage("חברה חדשה נוספה בהצלחה.");
  };

  return (
    <div className="container mx-auto p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">ניהול חברות</h1>
        <Link href="/dashboard/admin" className="text-blue-500 hover:underline">
          &larr; חזרה ללוח הבקרה
        </Link>
      </div>

      {error && (
        <div className="mb-4 bg-red-100 text-red-700 p-3 rounded-md">
          {error}
        </div>
      )}

      {successMessage && (
        <div className="mb-4 bg-green-100 text-green-700 p-3 rounded-md">
          {successMessage}
        </div>
      )}

      <div className="bg-white rounded-lg shadow-md mb-6 p-4">
        <div className="flex justify-between items-center">
          <h2 className="text-xl font-semibold">רשימת החברות</h2>
          <div className="space-x-2 rtl:space-x-reverse">
            <button 
              onClick={() => {
                fetchCompanies();
                setSuccessMessage("הנתונים רועננו בהצלחה");
              }}
              className="bg-blue-500 hover:bg-blue-600 text-white py-1 px-3 rounded-md text-sm"
            >
              רענן נתונים
            </button>
            <button 
              onClick={handleOpenAddModal}
              className="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600"
            >
              הוסף חברה חדשה
            </button>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-8">טוען נתונים...</div>
      ) : companies.length === 0 ? (
        <div className="text-center py-8 bg-white rounded-lg shadow-md">
          <p className="text-gray-500">אין חברות רשומות במערכת</p>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow-md overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    שם החברה
                  </th>
                  <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    תחום עיסוק
                  </th>
                  <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    סוג מוצר
                  </th>
                  <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    קהל יעד
                  </th>
                  <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    שאלון מלא
                  </th>
                  <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    משתמשים
                  </th>
                  <th scope="col" className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                    פעולות
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {companies.map((company) => (
                  <tr key={company.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 text-sm font-medium text-gray-900">
                      <div>
                        <div className="font-medium">{company.name}</div>
                        <div className="text-xs text-gray-500">
                          {new Date(company.created_at).toLocaleDateString('he-IL')}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500">
                      {company.sector || '-'}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500">
                      {company.product_types && company.product_types.length > 0 
                        ? company.product_types[0] 
                        : '-'}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500">
                      {company.audience || '-'}
                    </td>
                    <td className="px-6 py-4 text-sm">
                      {company.differentiators && company.customer_benefits && company.company_benefits ? (
                        <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                          ✓ הושלם
                        </span>
                      ) : (
                        <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-yellow-100 text-yellow-800">
                          חלקי
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {company.users_count || 0}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm space-x-3 text-center">
                      <button 
                        className="text-indigo-600 hover:text-indigo-900"
                        title="צפה בפרטי השאלון המלא"
                      >
                        צפה
                      </button>
                      <button className="text-blue-600 hover:text-blue-900">עריכה</button>
                      <button className="text-red-600 hover:text-red-900">מחיקה</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <AddCompanyModal 
        isOpen={isAddModalOpen}
        onClose={handleCloseAddModal}
        onCompanyAdded={handleCompanyAdded}
      />
    </div>
  );
} 