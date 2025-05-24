'use client'

import React, { useEffect, useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

interface Company {
  id: string;
  name: string;
  created_at: string;
  status?: string;
  users_count?: number;
}

export default function AdminCompaniesPage() {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchCompanies() {
      try {
        setLoading(true);
        const supabase = createClient();
        
        const { data, error } = await supabase
          .from('companies')
          .select('*')
          .order('created_at', { ascending: false });

        if (error) throw new Error(error.message);
        
        // כאן אפשר להוסיף בקשה נוספת לקבלת מספר המשתמשים בכל חברה
        // זו רק דוגמה
        const companiesWithMeta = data.map(company => ({
          ...company,
          status: 'פעיל', // לדוגמה בלבד
          users_count: Math.floor(Math.random() * 10) // לדוגמה בלבד
        }));

        setCompanies(companiesWithMeta);
      } catch (err) {
        console.error('שגיאה בטעינת חברות:', err);
        setError('שגיאה בטעינת נתוני החברות');
      } finally {
        setLoading(false);
      }
    }

    fetchCompanies();
  }, []);

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

      <div className="bg-white rounded-lg shadow-md mb-6 p-4">
        <div className="flex justify-between items-center">
          <h2 className="text-xl font-semibold">רשימת החברות</h2>
          <button className="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600">
            הוסף חברה חדשה
          </button>
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
                    תאריך הצטרפות
                  </th>
                  <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    סטטוס
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
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {company.name}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(company.created_at).toLocaleDateString('he-IL')}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                        {company.status || 'פעיל'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {company.users_count || 0}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-right space-x-3 text-center">
                      <button className="text-indigo-600 hover:text-indigo-900">עריכה</button>
                      <button className="text-red-600 hover:text-red-900">מחיקה</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
} 