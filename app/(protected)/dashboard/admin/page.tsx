'use client'

import React, { useEffect, useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

export default function AdminDashboardPage() {
  const [pendingUsersCount, setPendingUsersCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchPendingUsers() {
      try {
        const supabase = createClient();
        const { data, error } = await supabase
          .from('users')
          .select('id')
          .eq('is_approved', false);
        
        if (error) throw error;
        setPendingUsersCount(data.length);
      } catch (error) {
        console.error('שגיאה בטעינת משתמשים ממתינים:', error);
      } finally {
        setLoading(false);
      }
    }

    fetchPendingUsers();
  }, []);

  return (
    <div className="container mx-auto p-6">
      <h1 className="text-3xl font-bold mb-8">לוח בקרה למנהל מערכת</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <Link href="/dashboard/admin/users" className="block p-6 bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow">
          <h2 className="text-xl font-semibold mb-2">ניהול משתמשים</h2>
          <p className="text-gray-600 mb-4">הוספה, עריכה ומחיקה של משתמשים במערכת</p>
          {!loading && pendingUsersCount > 0 && (
            <div className="flex items-center text-yellow-600">
              <span className="mr-2 px-2 py-1 bg-yellow-100 text-yellow-800 text-xs font-semibold rounded-full">
                {pendingUsersCount}
              </span>
              <span>משתמשים ממתינים לאישור</span>
            </div>
          )}
        </Link>

        <Link href="/dashboard/admin/companies" className="block p-6 bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow">
          <h2 className="text-xl font-semibold mb-2">ניהול חברות</h2>
          <p className="text-gray-600">הוספה, עריכה ומחיקה של חברות במערכת</p>
        </Link>

        <div className="block p-6 bg-white rounded-lg shadow-md">
          <h2 className="text-xl font-semibold mb-2">ניהול מנויים</h2>
          <p className="text-gray-600">בקרוב - ניהול מנויים לחברות</p>
        </div>
      </div>
    </div>
  )
} 