'use client'

import React, { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import EditUserModal from '@/components/admin/EditUserModal'
import AddUserModal from '@/components/admin/AddUserModal'

interface User {
  id: string;
  email: string | null;
  full_name: string | null;
  role: string | null;
  company_id: string | null;
  is_approved: boolean;
  company_name?: string; 
  companies?: { name: string } | { name: string }[] | null; // Supabase join יכול להחזיר גם אובייקט וגם מערך
}

// טיפוס עזר לנתונים שמתקבלים מהשרת לפני ההמרה לטיפוס User
interface UserRaw {
  id: string;
  email: string | null;
  full_name: string | null;
  role: string | null;
  company_id: string | null;
  is_approved: boolean;
  companies?: any; // נתונים גולמיים מהשרת
}

interface Company {
  id: string;
  name: string;
}

const AVAILABLE_ROLES_FOR_ASSIGNMENT: Array<User['role']> = ['agent', 'manager', 'owner'];
const AVAILABLE_ROLES_FOR_FILTER: Array<User['role']> = ['agent', 'manager', 'owner', 'admin'];

export default function AdminUsersPage() {
  const router = useRouter()
  const supabase = createClient()
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const [users, setUsers] = useState<User[]>([]) 
  const [allUsers, setAllUsers] = useState<User[]>([]) 
  const [companies, setCompanies] = useState<Company[]>([]); 
  const [currentUserEmail, setCurrentUserEmail] = useState<string | null>(null)
  const [selectedRoles, setSelectedRoles] = useState<Record<string, string | null>>({});
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  const [searchTerm, setSearchTerm] = useState('');
  const [filterRole, setFilterRole] = useState('');
  const [filterApproved, setFilterApproved] = useState('');
  const [filterCompany, setFilterCompany] = useState('');
  
  // פונקציה לרענון נתונים - שימוש בדרישות שרת חדשות כל פעם למניעת קישוי
  const refreshData = useCallback(async () => {
    try {
      console.log('מרענן נתונים מהשרת...');
      // השתמש במשתנה זמן כדי למנוע קישוי
      const timestamp = new Date().getTime();
      
      const { data: companiesData, error: companiesError } = await supabase
        .from('companies')
        .select('id, name');
      if (companiesError) console.error("Error fetching companies for filter:", companiesError);
      setCompanies(companiesData || []);

      // נוסיף פרמטר שינוי למניעת קישוי
      const { data: usersData, error: usersError } = await supabase
        .from('users')
        .select(`id, email, full_name, role, company_id, is_approved, companies ( name )`)
        .order('created_at', { ascending: false });

      if (usersError) {
        console.error("Error fetching users:", usersError);
        setError(`שגיאה בטעינת רשימת המשתמשים: ${usersError.message}`);
        setAllUsers([]);
      } else if (usersData) {
        console.log(`נטענו ${usersData.length} משתמשים מהשרת`);
        const formattedUsers = usersData.map((u: UserRaw) => {
          let companyName;
          if (u.companies) {
            if (Array.isArray(u.companies)) {
              companyName = u.companies.length > 0 ? u.companies[0].name : undefined;
            } else {
              companyName = u.companies.name;
            }
          }
          
          return {
            ...u,
            company_name: companyName || undefined,
          };
        }); 
        setAllUsers(formattedUsers as User[]);
        setError(null);
        const initialRoles: Record<string, string | null> = {};
        formattedUsers.forEach(user => {
          initialRoles[user.id] = user.role;
        });
        setSelectedRoles(initialRoles);
      }
    } catch (err) {
      console.error("Unexpected error fetching data:", err);
      setError(`שגיאה לא צפויה בטעינת נתונים: ${err instanceof Error ? err.message : String(err)}`);
    }
  }, [supabase]);

  // מחליף את fetchUsersAndCompanies ברפרש דאטה
  const fetchUsersAndCompanies = refreshData;

  // רענון הדף בכל פעם שהוא נטען
  useEffect(() => {
    console.log('דף המשתמשים נטען או התרענן');
    const refreshOnFocus = () => {
      console.log('החלון קיבל פוקוס - מרענן נתונים');
      refreshData();
    };

    // האזנה לאירוע פוקוס של החלון כדי לרענן נתונים כשחוזרים לדף
    window.addEventListener('focus', refreshOnFocus);
    
    return () => {
      window.removeEventListener('focus', refreshOnFocus);
    };
  }, [refreshData]);

  useEffect(() => {
    async function initialLoad() {
      setLoading(true);
      setError(null);
      setSuccessMessage(null);
      try {
        const { data: { user: authUser }, error: authError } = await supabase.auth.getUser();
        if (authError || !authUser) {
          router.push('/login');
          return;
        }
        setCurrentUserEmail(authUser.email || null);

        if (authUser.email !== 'ido.segev23@gmail.com') {
          const { data: userData, error: userDbError } = await supabase
            .from('users')
            .select('role')
            .eq('id', authUser.id)
            .single();
          
          if (userDbError || !userData || userData.role !== 'admin') {
            setError('אין לך הרשאה לגשת לדף זה.');
            setLoading(false);
            return;
          }
        }
        
        // בדוק אם יש פרמטר בכתובת שמציין שצריך להציג משתמשים לא מאושרים
        const urlParams = new URLSearchParams(window.location.search);
        const showParam = urlParams.get('show');
        if (showParam === 'not_approved') {
          setFilterApproved('false');
        }
        
        await refreshData();
      } catch (err) {
        console.error("Unexpected error during initial load:", err);
        setError(`שגיאה לא צפויה: ${err instanceof Error ? err.message : String(err)}`);
      } finally {
        setLoading(false);
      }
    }
    initialLoad();
  }, [router, supabase, refreshData]);

  useEffect(() => {
    let filteredData = [...allUsers];
    if (searchTerm) {
      const lowerSearchTerm = searchTerm.toLowerCase();
      filteredData = filteredData.filter(user =>
        (user.full_name && user.full_name.toLowerCase().includes(lowerSearchTerm)) ||
        (user.email && user.email.toLowerCase().includes(lowerSearchTerm))
      );
    }
    if (filterRole) {
      filteredData = filteredData.filter(user => user.role === filterRole);
    }
    if (filterApproved !== '') {
      filteredData = filteredData.filter(user => user.is_approved === (filterApproved === 'true'));
    }
    if (filterCompany) {
      filteredData = filteredData.filter(user => user.company_id === filterCompany);
    }
    setUsers(filteredData);
  }, [searchTerm, filterRole, filterApproved, filterCompany, allUsers]);
  
  const handleOpenEditModal = (userToEdit: User) => {
    setEditingUser(userToEdit);
    setIsEditModalOpen(true);
    setError(null); 
    setSuccessMessage(null);
  };

  const handleCloseEditModal = () => {
    setEditingUser(null);
    setIsEditModalOpen(false);
  };

  const handleOpenAddModal = () => {
    setIsAddModalOpen(true);
    setError(null); 
    setSuccessMessage(null);
  };

  const handleCloseAddModal = () => {
    setIsAddModalOpen(false);
  };

  const handleRoleChange = (userId: string, newRole: string | null) => {
    setSelectedRoles(prev => ({ ...prev, [userId]: newRole }));
  };

  const updateUserRole = async (userId: string) => {
    const newRole = selectedRoles[userId];
    if (!newRole) {
      setError("לא נבחר תפקיד.");
      return;
    }
    
    // ולידציה: בדיקה שמנהלים ונציגים חייבים להיות משויכים לחברה
    if ((newRole === 'manager' || newRole === 'agent')) {
      // מציאת המשתמש ברשימה הנוכחית
      const userToUpdate = allUsers.find(u => u.id === userId);
      if (userToUpdate && !userToUpdate.company_id) {
        setError(`לא ניתן לשנות תפקיד ל"${newRole === 'manager' ? 'מנהל' : 'נציג'}" כאשר המשתמש לא משויך לחברה. אנא ערוך תחילה את המשתמש ושייך אותו לחברה.`);
        return;
      }
    }
    
    setActionLoading(`role-${userId}`);
    setError(null);
    setSuccessMessage(null);
    try {
      const { error: updateError } = await supabase
        .from('users')
        .update({ role: newRole })
        .eq('id', userId);
      if (updateError) throw updateError;
      setSuccessMessage(`תפקיד המשתמש עודכן בהצלחה ל: ${newRole}.`);
      await fetchUsersAndCompanies(); 
    } catch (err) {
      console.error("Error updating user role:", err);
      const supabaseError = err as any;
      setError(`שגיאה בעדכון תפקיד: ${supabaseError.message || 'שגיאה לא ידועה'}`);
    } finally {
      setActionLoading(null);
    }
  };

  const toggleUserApproval = async (userId: string, currentApprovalStatus: boolean) => {
    setActionLoading(`approval-${userId}`);
    setError(null);
    setSuccessMessage(null);
    try {
      const { error: updateError } = await supabase
        .from('users')
        .update({ is_approved: !currentApprovalStatus })
        .eq('id', userId);
      if (updateError) throw updateError;
      setSuccessMessage(`סטטוס האישור של המשתמש עודכן בהצלחה.`);
      await fetchUsersAndCompanies();
    } catch (err) {
      console.error("Unexpected error toggling approval:", err);
      const supabaseError = err as any;
      setError(`שגיאה לא צפויה: ${supabaseError.message || 'שגיאה לא ידועה'}`);
    } finally {
      setActionLoading(null);
    }
  };
 
  const deleteUser = async (userId: string, userEmail: string | null) => {
    if (!window.confirm(`האם אתה בטוח שברצונך למחוק את המשתמש ${userEmail || userId}? פעולה זו אינה הפיכה וכרגע תמחק רק את הרשומה מטבלת הנתונים הציבורית.`)) {
      return;
    }
    setActionLoading(`delete-${userId}`);
    setError(null);
    setSuccessMessage(null);
    try {
      const { error: publicDeleteError } = await supabase
        .from('users')
        .delete()
        .eq('id', userId);
      if (publicDeleteError) {
        throw new Error(`שגיאה במחיקת משתמש מטבלת users: ${publicDeleteError.message}`);
      }
      setSuccessMessage(`המשתמש (מרשומת public.users) ${userEmail || userId} נמחק בהצלחה.`);
      await fetchUsersAndCompanies(); 
    } catch (err) {
      console.error("Error deleting user:", err);
      const errorMessage = err instanceof Error ? err.message : "שגיאה לא צפויה במחיקת המשתמש.";
      setError(errorMessage);
    } finally {
      setActionLoading(null);
    }
  };

  if (loading) {
    return <div className="flex min-h-screen items-center justify-center">טוען נתונים...</div>;
  }

  return (
    <div className="container mx-auto p-6">
      <div className="mb-6 flex justify-between items-center">
        <h1 className="text-3xl font-bold">ניהול משתמשים</h1>
        <div className="flex space-x-2 rtl:space-x-reverse">
          <button 
            onClick={() => {
              refreshData();
              setSuccessMessage("הנתונים רועננו בהצלחה");
            }}
            className="bg-blue-500 hover:bg-blue-600 text-white py-1 px-3 rounded-md text-sm mr-2"
          >
            רענן נתונים
          </button>
          <Link href="/dashboard" className="text-blue-500 hover:underline">
            &larr; חזרה לדשבורד
          </Link>
        </div>
      </div>
      {currentUserEmail && (
        <div className="mb-4 p-2 bg-blue-50 rounded-md text-sm text-blue-700">
          אתה מחובר כסופר-אדמין: {currentUserEmail}
        </div>
      )}

      {error && (
        <div className="mb-4 bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative" role="alert">
          <strong className="font-bold">שגיאה: </strong>
          <span className="block sm:inline">{error}</span>
        </div>
      )}
      {successMessage && (
        <div className="mb-4 bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded relative" role="alert">
          <strong className="font-bold">הצלחה: </strong>
          <span className="block sm:inline">{successMessage}</span>
        </div>
      )}

      <div className="mb-6 p-4 bg-gray-50 rounded-lg shadow">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 items-end">
          <div>
            <label htmlFor="searchTerm" className="block text-sm font-medium text-gray-700">חיפוש (שם/אימייל)</label>
            <input 
              type="text"
              id="searchTerm"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="הקלד לחיפוש..."
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
            />
          </div>
          <div>
            <label htmlFor="filterRole" className="block text-sm font-medium text-gray-700">סנן לפי תפקיד</label>
            <select 
              id="filterRole" 
              value={filterRole} 
              onChange={(e) => setFilterRole(e.target.value)}
              className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md"
            >
              <option value="">כל התפקידים</option>
              {AVAILABLE_ROLES_FOR_FILTER.map(role => <option key={role} value={role || ''}>{role}</option>)}
            </select>
          </div>
          <div>
            <label htmlFor="filterApproved" className="block text-sm font-medium text-gray-700">סנן לפי סטטוס אישור</label>
            <select 
              id="filterApproved" 
              value={filterApproved} 
              onChange={(e) => setFilterApproved(e.target.value)}
              className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md"
            >
              <option value="">הכל</option>
              <option value="true">מאושר</option>
              <option value="false">לא מאושר</option>
            </select>
          </div>
          <div>
            <label htmlFor="filterCompany" className="block text-sm font-medium text-gray-700">סנן לפי חברה</label>
            <select 
              id="filterCompany" 
              value={filterCompany} 
              onChange={(e) => setFilterCompany(e.target.value)}
              className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md"
              disabled={companies.length === 0}
            >
              <option value="">כל החברות</option>
              {companies.map(company => <option key={company.id} value={company.id}>{company.name}</option>)}
            </select>
          </div>
        </div>
      </div>
      
      <div className="flex justify-between items-center mb-4">
        <p className="text-sm text-gray-700">מציג {users.length} מתוך {allUsers.length} משתמשים</p>
        <div className="space-x-2 rtl:space-x-reverse">
          <button 
            onClick={handleOpenAddModal}
            className="bg-green-500 text-white py-2 px-4 rounded-md hover:bg-green-600"
          >
            הוסף משתמש חדש
          </button>
          <Link 
            href="/dashboard/admin/approve-user"
            className="bg-blue-500 text-white py-2 px-4 rounded-md hover:bg-blue-600 inline-block"
          >
            אישור משתמשים ב-bulk
          </Link>
        </div>
      </div>

      {users.length === 0 && !loading && !error && (searchTerm || filterRole || filterApproved || filterCompany) ? (
         <div className="bg-white p-6 rounded-lg shadow-md text-center">
          <p className="text-gray-700">לא נמצאו משתמשים התואמים לסינון הנוכחי.</p>
        </div>
      ) : users.length === 0 && !loading && !error ? (
        <div className="bg-white p-6 rounded-lg shadow-md text-center">
          <p className="text-gray-700">לא קיימים משתמשים במערכת.</p>
        </div>
      ) : (
        <div className="overflow-x-auto bg-white rounded-lg shadow-md">
          <table className="min-w-full table-auto">
            <thead className="bg-gray-100">
              <tr>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">שם מלא</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">אימייל</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">תפקיד נוכחי</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">חברה</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">מאושר</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">פעולות</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {users.map((user) => (
                <tr key={user.id}>
                  <td className="px-4 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{user.full_name || '-'}</td>
                  <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">{user.email || '-'}</td>
                  <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">{user.role || '-'}</td>
                  <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">{user.company_name || (user.company_id ? 'חברה לא מזוהה' : 'לא משויך')}</td>
                  <td className="px-4 py-4 whitespace-nowrap text-sm">
                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${user.is_approved ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                      {user.is_approved ? 'מאושר' : 'לא מאושר'}
                    </span>
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap text-sm font-medium space-x-2 rtl:space-x-reverse">
                    <button 
                      onClick={() => handleOpenEditModal(user)}
                      className="text-indigo-600 hover:text-indigo-900 disabled:opacity-50"
                      disabled={actionLoading === `edit-${user.id}` || user.email === 'ido.segev23@gmail.com' || !!actionLoading}
                    >
                      ערוך
                    </button>
                    {user.email !== 'ido.segev23@gmail.com' && (
                      <>
                        <button 
                            onClick={() => toggleUserApproval(user.id, user.is_approved)}
                            className={`${user.is_approved ? 'text-yellow-600 hover:text-yellow-900' : 'text-green-600 hover:text-green-900'} disabled:opacity-50`}
                            disabled={!!actionLoading} 
                        >
                            {actionLoading === `approval-${user.id}` ? 'מעדכן...' : (user.is_approved ? 'בטל אישור' : 'אשר' )}
                        </button>
                        <button
                          onClick={() => deleteUser(user.id, user.email)}
                          className="text-red-600 hover:text-red-900 disabled:opacity-50"
                          disabled={!!actionLoading} 
                        >
                          מחק
                        </button>
                      </>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      
      <EditUserModal 
        isOpen={isEditModalOpen}
        onClose={handleCloseEditModal}
        userToEdit={editingUser}
        onUserUpdated={() => {
          fetchUsersAndCompanies();
          setSuccessMessage("פרטי המשתמש עודכנו בהצלחה.");
        }}
      />

      <AddUserModal 
        isOpen={isAddModalOpen}
        onClose={handleCloseAddModal}
        onUserAdded={() => {
          fetchUsersAndCompanies();
          setSuccessMessage("משתמש חדש נוסף בהצלחה.");
        }}
      />
    </div>
  )
} 