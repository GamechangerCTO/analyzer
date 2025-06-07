import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { Database } from '@/types/database.types'

// יצירת instance יחיד של Supabase client
let supabaseClient: ReturnType<typeof createClientComponentClient<Database>> | null = null

export function getSupabaseClient() {
  if (!supabaseClient) {
    supabaseClient = createClientComponentClient<Database>()
  }
  return supabaseClient
}

// Export של הפונקציה הישנה לתאימות לאחור
export function createClient() {
  return getSupabaseClient()
}

export { supabaseClient } 