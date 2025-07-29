import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { Database } from '@/types/database.types'

let supabaseClient: ReturnType<typeof createClientComponentClient<Database>> | null = null

export function createClient() {
  if (!supabaseClient) {
    supabaseClient = createClientComponentClient<Database>()
  }
  return supabaseClient!
}

// Function to clear all auth-related storage
export function clearAuthStorage() {
  if (typeof window !== 'undefined') {
    console.log('[AUTH] Clearing all authentication storage...')
    
    // Clear localStorage
    const keysToRemove = []
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i)
      if (key && (key.includes('supabase') || key.includes('sb-'))) {
        keysToRemove.push(key)
      }
    }
    keysToRemove.forEach(key => {
      localStorage.removeItem(key)
      console.log(`[AUTH] Removed localStorage: ${key}`)
    })

    // Clear sessionStorage
    const sessionKeysToRemove = []
    for (let i = 0; i < sessionStorage.length; i++) {
      const key = sessionStorage.key(i)
      if (key && (key.includes('supabase') || key.includes('sb-'))) {
        sessionKeysToRemove.push(key)
      }
    }
    sessionKeysToRemove.forEach(key => {
      sessionStorage.removeItem(key)
      console.log(`[AUTH] Removed sessionStorage: ${key}`)
    })

    // Clear cookies
    document.cookie.split(";").forEach(function(c) { 
      document.cookie = c.replace(/^ +/, "").replace(/=.*/, "=;expires=" + new Date().toUTCString() + ";path=/"); 
    })

    console.log('[AUTH] ✅ All authentication storage cleared!')
  }
}

// Export של הפונקציה הישנה לתאימות לאחור
export function getSupabaseClient() {
  return createClient()
}

export { supabaseClient } 