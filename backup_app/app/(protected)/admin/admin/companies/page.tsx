'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function AdminCompaniesRedirect() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/dashboard/admin/companies');
  }, [router]);

  return <div className="p-6">מעביר לדף ניהול חברות...</div>;
} 