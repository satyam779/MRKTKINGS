import type { SupabaseClient } from '@supabase/supabase-js'

// Both values live in .env. The publishable (anon) key is meant to be public: what it can do is limited
// by the row-level security rules in supabase/schema.sql.
const url: string | undefined = import.meta.env.VITE_SUPABASE_URL
const key: string | undefined = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY

export const supabaseConfigured = Boolean(url && key)

// The client library loads on first use, so pages that never talk to Supabase don't download it.
let client: Promise<SupabaseClient> | undefined
export function getSupabase(): Promise<SupabaseClient> {
  if (!url || !key) return Promise.reject(new Error('Supabase is not configured. Set VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY in .env.'))
  client ??= import('@supabase/supabase-js').then(({ createClient }) => createClient(url, key))
  return client
}

export type BookingStatus = 'new' | 'confirmed' | 'completed' | 'cancelled'

// One row of public.bookings.
export type BookingRow = {
  id: string
  created_at: string
  updated_at: string
  name: string
  company: string | null
  email: string
  phone: string | null
  interests: string[]
  budget: string | null
  message: string | null
  call_start: string
  call_minutes: number
  visitor_time_zone: string | null
  status: BookingStatus
  notes: string | null
}
