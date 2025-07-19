import { createServerComponentClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import ManagerDashboardContent from './ManagerDashboardContent';

export default async function ManagerDashboardPage() {
  const supabase = createServerComponentClient({ cookies });

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  // Get user details to ensure they are a manager
  const { data: userData, error: userError } = await supabase
    .from('users')
    .select('*')
    .eq('email', user.email)
    .single();

  if (userError || !userData) {
    console.error('Error fetching user data:', userError);
    redirect('/login');
  }

  if (userData.role !== 'manager') {
    redirect('/dashboard');
  }

  if (!userData.is_approved) {
    redirect('/not-approved');
  }

  return <ManagerDashboardContent />;
} 