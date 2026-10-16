import { supabase } from './supabase'

export interface SupabaseTableCheck {
  table: 'departments' | 'doctors'
  rowCount: number | null
  error: string | null
}

export interface SupabaseConnectionTestResult {
  departments: SupabaseTableCheck
  doctors: SupabaseTableCheck
}

async function checkTable(table: SupabaseTableCheck['table']): Promise<SupabaseTableCheck> {
  const columns = table === 'doctors'
    ? 'id,full_name,specialization,department_id,is_active'
    : 'id,name,description,is_active'
  const { data, error } = await supabase.schema('public').from(table).select(columns)

  return {
    table,
    rowCount: error ? null : data.length,
    error: error ? `${error.code ?? 'query_error'}: ${error.message}` : null,
  }
}

export async function runSupabaseConnectionTest(): Promise<SupabaseConnectionTestResult> {
  console.info('[Supabase] Testing departments and doctors access...')

  const [departments, doctors] = await Promise.all([
    checkTable('departments'),
    checkTable('doctors'),
  ])
  const result = { departments, doctors }

  console.info('[Supabase] Departments check:', {
    rows: departments.rowCount,
    error: departments.error,
  })
  console.info('[Supabase] Doctors check:', {
    rows: doctors.rowCount,
    error: doctors.error,
  })

  return result
}
