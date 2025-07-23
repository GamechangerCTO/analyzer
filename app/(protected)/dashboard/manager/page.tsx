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

  if (!userData.company_id) {
    redirect('/dashboard');
  }

  // Check if company questionnaire is complete
  const { data: questionnaireData, error: questionnaireError } = await supabase
    .from('company_questionnaires')
    .select('is_complete, completion_score')
    .eq('company_id', userData.company_id)
    .maybeSingle();

  // If no questionnaire exists or it's not complete, redirect to questionnaire
  if (!questionnaireData || !questionnaireData.is_complete) {
    redirect('/company-questionnaire?first_login=true');
  }

  return <ManagerDashboardContent />;
} 