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
  product_types?: any | null;
  audience?: string | null;
  differentiators?: any | null;
  customer_benefits?: any | null;
  company_benefits?: any | null;
  uploads_professional_materials?: boolean | null;
  is_poc?: boolean | null;
  status?: string;
  users_count?: number;
  questionnaire_complete: boolean;
  questionnaire_score: number;
  minutes_quota?: {
    total_minutes: number;
    used_minutes: number;
    available_minutes: number;
    usage_percentage: number;
  } | null;
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
      
      // ודא שהמשתמש מחובר לפני שנמשיך
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) {
        console.error('שגיאה בזיהוי המשתמש:', userError);
        setError('שגיאה בזיהוי המשתמש');
        return;
      }
      
      const { data, error } = await supabase
        .from('companies')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw new Error(error.message);
      
      // הוספת מספר המשתמשים, מצב השאלון ומכסת דקות לכל חברה
      const companiesWithMeta = await Promise.all(
        data.map(async (company) => {
          // ספירת משתמשים
          const { data: usersData, error: usersError } = await supabase
            .from('users')
            .select('id')
            .eq('company_id', company.id);
          
          // ציון ערכי ברירת מחדל
          let questionnaireComplete = false;
          let questionnaireScore = 0;
          let sectorFromQuestionnaire = null;
          let audienceFromQuestionnaire = null;
          
          // ניסיון זהיר לשלוף נתונים מטבלת השאלון
          try {
            // במקום לקרוא ישירות מהטבלה, נשתמש ב-API route
            const response = await fetch(`/api/companies/${company.id}/questionnaire`);
            if (response.ok) {
              const questionnaireData = await response.json();
              questionnaireComplete = questionnaireData.is_complete || false;
              questionnaireScore = questionnaireData.completion_score || 0;
              sectorFromQuestionnaire = questionnaireData.sector;
              audienceFromQuestionnaire = questionnaireData.audience;
            }
          } catch (err) {
            // אם יש שגיאה, נשתמש בערכי ברירת מחדל
            console.warn(`לא ניתן לטעון שאלון עבור חברה ${company.name}:`, err);
          }

          // שליפת מכסת דקות
          let minutesQuota = null;
          try {
            const { data: quotaData, error: quotaError } = await supabase
              .rpc('get_company_minutes_quota', { p_company_id: company.id });
              
            if (!quotaError && quotaData && quotaData.length > 0) {
              minutesQuota = quotaData[0];
            }
          } catch (err) {
            console.warn(`לא ניתן לטעון מכסת דקות עבור חברה ${company.name}:`, err);
          }
          
          return {
            ...company,
            status: 'פעיל',
            users_count: usersError ? 0 : (usersData?.length || 0),
            questionnaire_complete: questionnaireComplete,
            questionnaire_score: questionnaireScore,
            minutes_quota: minutesQuota,
            // נתונים מהשאלון החדש או מהטבלה הישנה
            sector: sectorFromQuestionnaire || company.sector || '-',
            audience: audienceFromQuestionnaire || company.audience || '-',
            product_types: company.product_types || []
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
                    סוג חשבון
                  </th>
                  <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    תחום עיסוק
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
                  <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    דקות
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
                    <td className="px-6 py-4 text-sm">
                      {company.is_poc ? (
                        <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-blue-100 text-blue-800">
                          ⭐ POC
                        </span>
                      ) : (
                        <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                          🏢 מלא
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500">
                      {company.sector || '-'}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500">
                      {company.audience || '-'}
                    </td>
                    <td className="px-6 py-4 text-sm">
                      {company.questionnaire_complete ? (
                        <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                          ✓ הושלם ({company.questionnaire_score}%)
                        </span>
                      ) : (
                        <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-yellow-100 text-yellow-800">
                          חלקי ({company.questionnaire_score}%)
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {company.users_count || 0}
                    </td>
                    <td className="px-6 py-4 text-sm">
                      {company.minutes_quota ? (
                        <div className="space-y-1">
                          <div className="flex justify-between text-xs">
                            <span>בשימוש: {company.minutes_quota.used_minutes.toLocaleString()}</span>
                            <span>זמין: {company.minutes_quota.available_minutes.toLocaleString()}</span>
                          </div>
                          <div className="w-full bg-gray-200 rounded-full h-2">
                            <div 
                              className={`h-2 rounded-full transition-all ${
                                company.minutes_quota.usage_percentage >= 90 ? 'bg-red-500' :
                                company.minutes_quota.usage_percentage >= 75 ? 'bg-orange-500' :
                                'bg-green-500'
                              }`}
                              style={{ width: `${Math.min(company.minutes_quota.usage_percentage, 100)}%` }}
                            ></div>
                          </div>
                          <div className="text-xs text-center">
                            {company.minutes_quota.usage_percentage.toFixed(1)}% ({company.minutes_quota.total_minutes.toLocaleString()} סה"כ)
                          </div>
                        </div>
                      ) : (
                        <span className="text-xs text-gray-400">לא הוגדר</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm space-x-3 text-center">
                      <Link
                        href={`/dashboard/admin/companies/${company.id}/view-questionnaire`}
                        className="text-indigo-600 hover:text-indigo-900 inline-block"
                        title="צפה בפרטי השאלון המלא"
                      >
                        צפה בשאלון
                      </Link>
                      <Link
                        href={`/dashboard/admin/companies/${company.id}/edit-questionnaire`}
                        className="text-blue-600 hover:text-blue-900 inline-block"
                        title="ערוך את שאלון החברה"
                      >
                        ערוך שאלון
                      </Link>
                      <button 
                        onClick={() => window.open(`/dashboard/admin/companies/${company.id}/manage-minutes`, '_blank')}
                        className="text-green-600 hover:text-green-900 inline-block"
                        title="נהל מכסת דקות"
                      >
                        {company.is_poc ? 'POC מכסה' : 'נהל דקות'}
                      </button>
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