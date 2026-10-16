import { createClient } from '@supabase/supabase-js'

const configuredUrl = import.meta.env.VITE_SUPABASE_URL?.trim()
const publishableKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY?.trim()

if (!configuredUrl) {
  throw new Error('Missing VITE_SUPABASE_URL. Add it to .env.local and restart the Vite server.')
}

if (!publishableKey) {
  throw new Error('Missing VITE_SUPABASE_PUBLISHABLE_KEY. Add it to .env.local and restart the Vite server.')
}

const projectUrl = configuredUrl.replace(/\/rest\/v1\/?$/, '')

if (projectUrl !== 'https://cblflflemhsbakoofbix.supabase.co') {
  throw new Error('VITE_SUPABASE_URL must point to the Harborview Supabase project.')
}

export const supabase = createClient(projectUrl, publishableKey)
