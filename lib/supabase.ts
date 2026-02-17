import { createClient } from '@supabase/supabase-js'

// Prioritize internal URL (for Docker server-side) over public URL (for Client)
const supabaseUrl = process.env.SUPABASE_INTERNAL_URL || process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Supabase URL and Key must be provided in environment variables.')
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
