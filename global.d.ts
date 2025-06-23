// Types for NextJS and Supabase
import { Database } from '@/types/database.types'

declare global {
  namespace App {
    interface PageProps {
      params: Record<string, string | string[]>
      searchParams?: Record<string, string | string[] | undefined>
    }
  }
  
  type UserRole = 'manager' | 'agent';
  
  interface UserDetails {
    id: string;
    role: UserRole;
    company_id?: string;
    full_name?: string;
    email: string;
    created_at: string;
  }
} 