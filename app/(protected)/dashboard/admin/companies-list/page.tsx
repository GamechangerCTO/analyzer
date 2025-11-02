'use client';

/**
 * Companies List - Admin Discovery
 * ממשק לגילוי חברות ו-IDs שלהן (לצורך Partner API)
 */

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Building2, Copy, CheckCircle, Search, RefreshCw, Users, Phone } from 'lucide-react';

interface Company {
  id: string;
  name: string;
  industry: string | null;
  created_at: string;
  total_agents: number;
  total_calls: number;
  contact_email: string | null;
}

export default function CompaniesListPage() {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [filteredCompanies, setFilteredCompanies] = useState<Company[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  
  const supabase = createClient();
  
  useEffect(() => {
    loadCompanies();
  }, []);
  
  useEffect(() => {
    // סינון לפי חיפוש
    if (searchTerm) {
      const filtered = companies.filter(company => 
        company.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        company.id.includes(searchTerm) ||
        (company.industry && company.industry.toLowerCase().includes(searchTerm.toLowerCase()))
      );
      setFilteredCompanies(filtered);
    } else {
      setFilteredCompanies(companies);
    }
  }, [searchTerm, companies]);
  
  async function loadCompanies() {
    setIsLoading(true);
    try {
      // שליפת כל החברות
      const { data: companiesData, error: companiesError } = await supabase
        .from('companies')
        .select('id, name, industry, created_at')
        .order('created_at', { ascending: false });
      
      if (companiesError) throw companiesError;
      
      // עבור כל חברה, שלוף סטטיסטיקות
      const companiesWithStats = await Promise.all(
        (companiesData || []).map(async (company) => {
          // ספירת אג'נטים
          const { count: agentCount } = await supabase
            .from('auth.users')
            .select('*', { count: 'exact', head: true })
            .eq('raw_user_meta_data->>company_id', company.id);
          
          // ספירת שיחות
          const { count: callCount } = await supabase
            .from('calls')
            .select('*', { count: 'exact', head: true })
            .eq('company_id', company.id);
          
          // שליפת שאלון (אם קיים)
          const { data: questionnaire } = await supabase
            .from('company_questionnaires')
            .select('contact_email')
            .eq('company_id', company.id)
            .single();
          
          return {
            ...company,
            total_agents: agentCount || 0,
            total_calls: callCount || 0,
            contact_email: questionnaire?.contact_email || null,
          };
        })
      );
      
      setCompanies(companiesWithStats);
      setFilteredCompanies(companiesWithStats);
      
    } catch (error: any) {
      console.error('Error loading companies:', error);
      alert('שגיאה בטעינת חברות');
    } finally {
      setIsLoading(false);
    }
  }
  
  function copyToClipboard(text: string, companyId: string) {
    navigator.clipboard.writeText(text);
    setCopiedId(companyId);
    setTimeout(() => setCopiedId(null), 2000);
  }
  
  function formatDate(dateString: string) {
    return new Date(dateString).toLocaleDateString('he-IL', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  }
  
  return (
    <div className="p-8 max-w-7xl mx-auto" dir="rtl">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2 flex items-center gap-2">
          <Building2 className="w-8 h-8" />
          רשימת חברות
        </h1>
        <p className="text-gray-600">
          גלה את ה-Company IDs לשימוש ב-Partner API או ניהול כללי
        </p>
      </div>
      
      {/* Search and Actions */}
      <div className="mb-6 flex gap-4 items-center">
        <div className="flex-1 relative">
          <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="חפש לפי שם, תעשייה או ID..."
            className="w-full pr-10 pl-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>
        <Button
          onClick={loadCompanies}
          variant="outline"
          size="sm"
        >
          <RefreshCw className="w-4 h-4 ml-2" />
          רענן
        </Button>
      </div>
      
      {/* Stats Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-blue-50 border-2 border-blue-200 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-blue-600 font-semibold">סה"כ חברות</p>
              <p className="text-3xl font-bold text-blue-900">{companies.length}</p>
            </div>
            <Building2 className="w-8 h-8 text-blue-400" />
          </div>
        </div>
        
        <div className="bg-green-50 border-2 border-green-200 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-green-600 font-semibold">סה"כ אג'נטים</p>
              <p className="text-3xl font-bold text-green-900">
                {companies.reduce((sum, c) => sum + c.total_agents, 0)}
              </p>
            </div>
            <Users className="w-8 h-8 text-green-400" />
          </div>
        </div>
        
        <div className="bg-purple-50 border-2 border-purple-200 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-purple-600 font-semibold">סה"כ שיחות</p>
              <p className="text-3xl font-bold text-purple-900">
                {companies.reduce((sum, c) => sum + c.total_calls, 0)}
              </p>
            </div>
            <Phone className="w-8 h-8 text-purple-400" />
          </div>
        </div>
      </div>
      
      {/* Companies Table */}
      <div className="bg-white border rounded-xl shadow-sm overflow-hidden">
        <div className="p-6 border-b bg-gray-50">
          <h2 className="text-xl font-bold">
            חברות ({filteredCompanies.length})
          </h2>
        </div>
        
        {isLoading ? (
          <div className="p-8 text-center text-gray-500">טוען...</div>
        ) : filteredCompanies.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            {searchTerm ? 'לא נמצאו חברות התואמות לחיפוש' : 'אין חברות עדיין'}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="p-4 text-right text-sm font-semibold">שם החברה</th>
                  <th className="p-4 text-right text-sm font-semibold">Company ID</th>
                  <th className="p-4 text-right text-sm font-semibold">תעשייה</th>
                  <th className="p-4 text-right text-sm font-semibold">אג'נטים</th>
                  <th className="p-4 text-right text-sm font-semibold">שיחות</th>
                  <th className="p-4 text-right text-sm font-semibold">תאריך יצירה</th>
                  <th className="p-4 text-right text-sm font-semibold">פעולות</th>
                </tr>
              </thead>
              <tbody>
                {filteredCompanies.map((company) => (
                  <tr key={company.id} className="border-b hover:bg-gray-50 transition-colors">
                    <td className="p-4">
                      <div>
                        <p className="font-semibold text-gray-900">{company.name}</p>
                        {company.contact_email && (
                          <p className="text-sm text-gray-500">{company.contact_email}</p>
                        )}
                      </div>
                    </td>
                    <td className="p-4">
                      <div className="flex items-center gap-2">
                        <code className="text-xs bg-gray-100 px-2 py-1 rounded font-mono text-gray-700">
                          {company.id.substring(0, 8)}...
                        </code>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => copyToClipboard(company.id, company.id)}
                          className="p-1 h-auto"
                        >
                          {copiedId === company.id ? (
                            <CheckCircle className="w-4 h-4 text-green-600" />
                          ) : (
                            <Copy className="w-4 h-4 text-gray-400" />
                          )}
                        </Button>
                      </div>
                    </td>
                    <td className="p-4">
                      {company.industry ? (
                        <span className="inline-block px-2 py-1 rounded text-xs font-semibold bg-blue-100 text-blue-800">
                          {company.industry}
                        </span>
                      ) : (
                        <span className="text-gray-400 text-sm">לא צוין</span>
                      )}
                    </td>
                    <td className="p-4 text-center">
                      <span className="inline-flex items-center gap-1 text-sm">
                        <Users className="w-4 h-4 text-gray-400" />
                        {company.total_agents}
                      </span>
                    </td>
                    <td className="p-4 text-center">
                      <span className="inline-flex items-center gap-1 text-sm">
                        <Phone className="w-4 h-4 text-gray-400" />
                        {company.total_calls}
                      </span>
                    </td>
                    <td className="p-4 text-sm text-gray-600">
                      {formatDate(company.created_at)}
                    </td>
                    <td className="p-4">
                      <Button
                        size="sm"
                        onClick={() => {
                          const fullInfo = `Company: ${company.name}\nID: ${company.id}\nIndustry: ${company.industry || 'N/A'}\nAgents: ${company.total_agents}\nCalls: ${company.total_calls}`;
                          copyToClipboard(fullInfo, `full-${company.id}`);
                        }}
                        variant="outline"
                      >
                        {copiedId === `full-${company.id}` ? (
                          <>
                            <CheckCircle className="w-4 h-4 ml-1" />
                            הועתק!
                          </>
                        ) : (
                          <>
                            <Copy className="w-4 h-4 ml-1" />
                            העתק הכל
                          </>
                        )}
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
      
      {/* Info Box */}
      <div className="mt-8 p-6 bg-blue-50 border-2 border-blue-200 rounded-xl">
        <h3 className="font-bold mb-2 text-blue-900 flex items-center gap-2">
          <Building2 className="w-5 h-5" />
          💡 איך להשתמש ב-Company ID
        </h3>
        <ul className="text-sm text-blue-800 space-y-2">
          <li>
            <strong>ב-Partner API:</strong> כשאתה יוצר API key לשותף, תוכל לקשר אותו לחברה ספציפית. 
            השתמש ב-Company ID שהעתקת מכאן.
          </li>
          <li>
            <strong>בקריאות API:</strong> השותף יצטרך את ה-Company ID כדי ליצור אג'נטים ולהעלות שיחות.
          </li>
          <li>
            <strong>טיפ:</strong> לחץ על "העתק הכל" כדי להעתיק את כל המידע של החברה בפורמט נוח.
          </li>
        </ul>
      </div>
    </div>
  );
}

