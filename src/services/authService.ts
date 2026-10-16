import type { AuthChangeEvent, Session, User } from '@supabase/supabase-js'
import { supabase } from '../lib/supabase'

export async function signInStaff(email: string, password: string): Promise<{ user: User; session: Session }> {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password })

  if (error) {
    throw new Error(`Staff sign-in failed: ${error.message}`)
  }

  if (!data.user || !data.session) {
    throw new Error('Staff sign-in did not return an authenticated session.')
  }

  return { user: data.user, session: data.session }
}

export async function signOutStaff(): Promise<void> {
  const { error } = await supabase.auth.signOut()

  if (error) {
    throw new Error(`Staff sign-out failed: ${error.message}`)
  }
}

export async function getCurrentStaff(): Promise<User | null> {
  const { data, error } = await supabase.auth.getUser()

  if (error) {
    throw new Error(`Unable to verify the staff session: ${error.message}`)
  }

  return data.user
}

export function onStaffAuthStateChange(
  callback: (event: AuthChangeEvent, session: Session | null) => void,
): { unsubscribe: () => void } {
  const { data } = supabase.auth.onAuthStateChange(callback)
  return { unsubscribe: () => data.subscription.unsubscribe() }
}
