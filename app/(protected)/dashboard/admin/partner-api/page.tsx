'use client';

/**
 * Partner API Management - Admin Interface
 * ממשק לניהול Partner API Keys (רק לsuper_admin)
 */

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Key, Plus, Copy, CheckCircle, XCircle, RefreshCw } from 'lucide-react';

interface PartnerApiKey {
  id: string;
  partner_name: string;
  environment: 'sandbox' | 'production';
  company_id: string | null;
  is_active: boolean;
  created_at: string;
  last_used_at: string | null;
  expires_at: string | null;
  api_key_preview: string; // סיום המפתח בלבד
}

export default function PartnerApiManagement() {
  const [keys, setKeys] = useState<PartnerApiKey[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [newKeyData, setNewKeyData] = useState<{
    api_key: string;
    api_secret: string;
  } | null>(null);
  
  // טופס יצירת API key חדש
  const [newKeyForm, setNewKeyForm] = useState({
    partner_name: '',
    environment: 'sandbox' as 'sandbox' | 'production',
    expires_in_days: 365,
    company_id: '',
  });
  
  // רשימת חברות לבחירה
  const [availableCompanies, setAvailableCompanies] = useState<Array<{id: string, name: string}>>([]);
  
  const supabase = createClient();
  
  useEffect(() => {
    loadKeys();
    loadCompanies();
  }, []);
  
  async function loadCompanies() {
    try {
      const { data, error } = await supabase
        .from('companies')
        .select('id, name')
        .order('name');
      
      if (error) throw error;
      setAvailableCompanies(data || []);
    } catch (error) {
      console.error('Error loading companies:', error);
    }
  }
  
  async function loadKeys() {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('partner_api_keys')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      
      setKeys(data || []);
    } catch (error: any) {
      console.error('Error loading keys:', error);
      alert('שגיאה בטעינת מפתחות');
    } finally {
      setIsLoading(false);
    }
  }
  
  async function createNewKey() {
    if (!newKeyForm.partner_name) {
      alert('יש למלא שם שותף');
      return;
    }
    
    setIsCreating(true);
    try {
      const { data, error } = await supabase
        .rpc('generate_partner_api_key', {
          p_partner_name: newKeyForm.partner_name,
          p_environment: newKeyForm.environment,
          p_company_id: newKeyForm.company_id || null,
          p_expires_in_days: newKeyForm.expires_in_days,
        });
      
      if (error) throw error;
      
      // השתמש בטיפוס מותאם מכיוון שהפונקציה מחזירה טבלה
      if (data && data.length > 0) {
        setNewKeyData({
          api_key: data[0].api_key,
          api_secret: data[0].api_secret,
        });
      }
      
      // רענון הרשימה
      await loadKeys();
      
      // איפוס הטופס
      setNewKeyForm({
        partner_name: '',
        environment: 'sandbox',
        expires_in_days: 365,
        company_id: '',
      });
    } catch (error: any) {
      console.error('Error creating key:', error);
      alert(`שגיאה ביצירת מפתח: ${error.message}`);
    } finally {
      setIsCreating(false);
    }
  }
  
  async function toggleKeyStatus(keyId: string, currentStatus: boolean) {
    try {
      const { error } = await supabase
        .from('partner_api_keys')
        .update({ is_active: !currentStatus })
        .eq('id', keyId);
      
      if (error) throw error;
      
      await loadKeys();
    } catch (error: any) {
      console.error('Error toggling key:', error);
      alert('שגיאה בעדכון סטטוס');
    }
  }
  
  function copyToClipboard(text: string) {
    navigator.clipboard.writeText(text);
    alert('הועתק ללוח!');
  }
  
  return (
    <div className="p-8 max-w-7xl mx-auto" dir="rtl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">ניהול Partner API</h1>
        <p className="text-gray-600">יצירה וניהול של מפתחות API לשותפים עסקיים</p>
      </div>
      
      {/* הצגת מפתח חדש שנוצר */}
      {newKeyData && (
        <div className="mb-8 p-6 bg-green-50 border-2 border-green-500 rounded-xl">
          <div className="flex items-center gap-2 mb-4">
            <CheckCircle className="w-6 h-6 text-green-600" />
            <h2 className="text-xl font-bold text-green-900">מפתח חדש נוצר בהצלחה!</h2>
          </div>
          <div className="bg-white p-4 rounded-lg mb-4">
            <p className="text-sm text-red-600 font-semibold mb-2">
              ⚠️ שמור את המפתחות במקום מאובטח! הם מוצגים פעם אחת בלבד!
            </p>
            <div className="space-y-3">
              <div>
                <label className="text-sm font-semibold text-gray-700">API Key:</label>
                <div className="flex gap-2 mt-1">
                  <code className="flex-1 p-2 bg-gray-100 rounded font-mono text-sm break-all">
                    {newKeyData.api_key}
                  </code>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => copyToClipboard(newKeyData.api_key)}
                  >
                    <Copy className="w-4 h-4" />
                  </Button>
                </div>
              </div>
              <div>
                <label className="text-sm font-semibold text-gray-700">API Secret:</label>
                <div className="flex gap-2 mt-1">
                  <code className="flex-1 p-2 bg-gray-100 rounded font-mono text-sm break-all">
                    {newKeyData.api_secret}
                  </code>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => copyToClipboard(newKeyData.api_secret)}
                  >
                    <Copy className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </div>
          </div>
          <Button
            onClick={() => setNewKeyData(null)}
            className="w-full"
          >
            הבנתי, סגור הודעה זו
          </Button>
        </div>
      )}
      
      {/* טופס יצירת מפתח חדש */}
      <div className="mb-8 p-6 bg-white border rounded-xl shadow-sm">
        <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
          <Plus className="w-5 h-5" />
          יצירת מפתח חדש
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <div>
            <label className="block text-sm font-medium mb-1">שם השותף</label>
            <input
              type="text"
              value={newKeyForm.partner_name}
              onChange={(e) => setNewKeyForm({ ...newKeyForm, partner_name: e.target.value })}
              className="w-full p-2 border rounded"
              placeholder="לדוגמה: CompanyX Call Center"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">
              חברה (אופציונלי)
              <span className="text-xs text-gray-500 mr-1">- קשר לחברה ספציפית</span>
            </label>
            <select
              value={newKeyForm.company_id}
              onChange={(e) => setNewKeyForm({ ...newKeyForm, company_id: e.target.value })}
              className="w-full p-2 border rounded"
            >
              <option value="">ללא קישור (גישה לכל החברות)</option>
              {availableCompanies.map(company => (
                <option key={company.id} value={company.id}>
                  {company.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">סביבה</label>
            <select
              value={newKeyForm.environment}
              onChange={(e) => setNewKeyForm({ ...newKeyForm, environment: e.target.value as any })}
              className="w-full p-2 border rounded"
            >
              <option value="sandbox">Sandbox (בדיקות)</option>
              <option value="production">Production (ייצור)</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">תוקף (ימים)</label>
            <input
              type="number"
              value={newKeyForm.expires_in_days}
              onChange={(e) => setNewKeyForm({ ...newKeyForm, expires_in_days: parseInt(e.target.value) })}
              className="w-full p-2 border rounded"
              min="1"
              max="3650"
            />
          </div>
        </div>
        <Button
          onClick={createNewKey}
          disabled={isCreating}
          className="w-full"
        >
          {isCreating ? 'יוצר...' : 'צור מפתח חדש'}
        </Button>
      </div>
      
      {/* רשימת מפתחות קיימים */}
      <div className="bg-white border rounded-xl shadow-sm">
        <div className="p-6 border-b flex items-center justify-between">
          <h2 className="text-xl font-bold flex items-center gap-2">
            <Key className="w-5 h-5" />
            מפתחות קיימים
          </h2>
          <Button size="sm" variant="outline" onClick={loadKeys}>
            <RefreshCw className="w-4 h-4 ml-2" />
            רענן
          </Button>
        </div>
        
        {isLoading ? (
          <div className="p-8 text-center text-gray-500">טוען...</div>
        ) : keys.length === 0 ? (
          <div className="p-8 text-center text-gray-500">אין מפתחות עדיין</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="p-4 text-right text-sm font-semibold">שותף</th>
                  <th className="p-4 text-right text-sm font-semibold">סביבה</th>
                  <th className="p-4 text-right text-sm font-semibold">סטטוס</th>
                  <th className="p-4 text-right text-sm font-semibold">נוצר</th>
                  <th className="p-4 text-right text-sm font-semibold">שימוש אחרון</th>
                  <th className="p-4 text-right text-sm font-semibold">תוקף עד</th>
                  <th className="p-4 text-right text-sm font-semibold">פעולות</th>
                </tr>
              </thead>
              <tbody>
                {keys.map((key) => (
                  <tr key={key.id} className="border-t hover:bg-gray-50">
                    <td className="p-4 font-medium">{key.partner_name}</td>
                    <td className="p-4">
                      <span className={`inline-block px-2 py-1 rounded text-xs font-semibold ${
                        key.environment === 'production' 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-blue-100 text-blue-800'
                      }`}>
                        {key.environment}
                      </span>
                    </td>
                    <td className="p-4">
                      {key.is_active ? (
                        <span className="inline-flex items-center gap-1 text-green-600 text-sm">
                          <CheckCircle className="w-4 h-4" />
                          פעיל
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-red-600 text-sm">
                          <XCircle className="w-4 h-4" />
                          לא פעיל
                        </span>
                      )}
                    </td>
                    <td className="p-4 text-sm text-gray-600">
                      {new Date(key.created_at).toLocaleDateString('he-IL')}
                    </td>
                    <td className="p-4 text-sm text-gray-600">
                      {key.last_used_at 
                        ? new Date(key.last_used_at).toLocaleDateString('he-IL')
                        : 'מעולם לא'}
                    </td>
                    <td className="p-4 text-sm text-gray-600">
                      {key.expires_at 
                        ? new Date(key.expires_at).toLocaleDateString('he-IL')
                        : 'אין תפוגה'}
                    </td>
                    <td className="p-4">
                      <Button
                        size="sm"
                        variant={key.is_active ? 'destructive' : 'default'}
                        onClick={() => toggleKeyStatus(key.id, key.is_active)}
                      >
                        {key.is_active ? 'השבת' : 'הפעל'}
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
      
      {/* הוראות שימוש */}
      <div className="mt-8 p-6 bg-blue-50 border-2 border-blue-200 rounded-xl">
        <h3 className="font-bold mb-2 text-blue-900">💡 הוראות שימוש</h3>
        <ul className="text-sm text-blue-800 space-y-1">
          <li>• מפתחות Sandbox מיועדים לבדיקות ופיתוח בלבד</li>
          <li>• מפתחות Production מיועדים לשימוש אמיתי עם נתונים אמיתיים</li>
          <li>• <strong>קישור לחברה:</strong> אם תקשר מפתח לחברה ספציפית, השותף יוכל לגשת רק לחברה זו</li>
          <li>• <strong>ללא קישור:</strong> השותף יוכל לגשת לכל החברות (דורש Company ID בכל בקשה)</li>
          <li>• לגילוי Company IDs: <a href="/dashboard/admin/companies-list" className="underline font-semibold">לחץ כאן</a></li>
          <li>• אחרי יצירת מפתח, שלח אותו לשותף במייל מאובטח</li>
          <li>• תמיד כלול גם את ה-API Key וגם את ה-API Secret</li>
          <li>• ניתן להשבית מפתח בכל עת מבלי למחוק אותו</li>
        </ul>
      </div>
    </div>
  );
}

