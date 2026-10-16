import type { Appointment, AppointmentStatus, Department, Doctor, DoctorSchedule, Patient } from '../types'
import { supabase } from '../lib/supabase'
import { getCurrentStaff } from './authService'

async function requireStaffSession(): Promise<void> {
  const user = await getCurrentStaff()

  if (!user) {
    throw new Error('An authenticated staff session is required to access private clinic records.')
  }
}

export async function getDepartments(): Promise<Department[]> {
  const { data, error } = await supabase
    .schema('public')
    .from('departments')
    .select('id,name,description,is_active')

  if (error) {
    throw new Error(`Unable to load public departments (${error.code ?? 'query_error'}): ${error.message}`)
  }

  return data.map((row) => ({
    id: String(row.id),
    name: String(row.name ?? 'Unnamed department'),
    description: String(row.description ?? ''),
    doctorCount: 0,
    active: row.is_active !== false,
    color: '#0f9b8e',
    icon: 'heart-pulse',
  }))
}

export async function getDoctors(): Promise<Doctor[]> {
  const { data, error } = await supabase
    .schema('public')
    .from('doctors')
    .select('id,full_name,specialization,department_id,is_active')

  if (error) {
    throw new Error(`Unable to load public doctors (${error.code ?? 'query_error'}): ${error.message}`)
  }

  return data.map((row) => ({
    id: String(row.id),
    name: String(row.full_name ?? 'Unnamed doctor'),
    specialty: String(row.specialization ?? ''),
    departmentId: String(row.department_id ?? ''),
    experience: 0,
    active: row.is_active !== false,
    initials: String(row.full_name ?? 'DR').split(/\s+/).map((part: string) => part[0]).slice(0, 2).join(''),
    color: '#dff5f1',
    bio: '',
  }))
}

export async function getAppointments(): Promise<Appointment[]> {
  await requireStaffSession()
  const { data, error } = await supabase
    .from('appointments')
    .select('id,booking_reference,patient_id,doctor_id,conversation_id,starts_at,ends_at,status,source,created_at,updated_at')
    .order('starts_at')

  if (error) {
    const context = [error.code, error.details, error.hint].filter(Boolean).join(' | ')
    throw new Error(`Unable to load appointments${context ? ` (${context})` : ''}: ${error.message}`)
  }

  return data as Appointment[]
}

export async function getPatients(): Promise<Patient[]> {
  await requireStaffSession()
  const { data, error } = await supabase
    .from('patients')
    .select('id,full_name,phone,email,created_at')
    .order('full_name')

  if (error) {
    const context = [error.code, error.details, error.hint].filter(Boolean).join(' | ')
    throw new Error(`Unable to load patients${context ? ` (${context})` : ''}: ${error.message}`)
  }

  return data as Patient[]
}

export async function getDoctorSchedules(): Promise<DoctorSchedule[]> {
  await requireStaffSession()
  const { data, error } = await supabase.from('doctor_schedules').select('*').order('doctor_id')

  if (error) {
    throw new Error(`Unable to load doctor schedules: ${error.message}`)
  }

  return data as DoctorSchedule[]
}

export async function getScheduleExceptions(): Promise<Record<string, unknown>[]> {
  await requireStaffSession()
  const { data, error } = await supabase.from('schedule_exceptions').select('*').order('date')

  if (error) {
    throw new Error(`Unable to load schedule exceptions: ${error.message}`)
  }

  return data
}

export async function getConversations(): Promise<Record<string, unknown>[]> {
  await requireStaffSession()
  const { data, error } = await supabase.from('conversations').select('*').order('created_at', { ascending: false })

  if (error) {
    throw new Error(`Unable to load conversations: ${error.message}`)
  }

  return data
}

export async function getMessages(conversationId?: string): Promise<Record<string, unknown>[]> {
  await requireStaffSession()
  let query = supabase.from('messages').select('*').order('created_at')
  if (conversationId) query = query.eq('conversation_id', conversationId)
  const { data, error } = await query

  if (error) {
    throw new Error(`Unable to load messages: ${error.message}`)
  }

  return data
}

export async function updateAppointmentStatus(id: string, status: AppointmentStatus): Promise<Appointment> {
  await requireStaffSession()
  const { data, error } = await supabase
    .from('appointments')
    .update({ status })
    .eq('id', id)
    .select('*')
    .single()

  if (error) {
    throw new Error(`Unable to update appointment: ${error.message}`)
  }

  return data as Appointment
}
