import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import './index.css'
import { runSupabaseConnectionTest } from './lib/supabaseConnectionTest'

createRoot(document.getElementById('root')!).render(
  <StrictMode><App /></StrictMode>,
)

void runSupabaseConnectionTest().catch((error: unknown) => {
  console.error('[Supabase] Connection test failed.', error)
})
