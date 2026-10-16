export type AppointmentStatus = 'pending_review' | 'confirmed' | 'cancelled'

export interface Patient {
  id: string
  full_name: string
  phone: string
  email: string
  created_at: string
}

export interface Doctor {
  id: string
  name: string
  specialty: string
  departmentId: string
  experience: number
  active: boolean
  initials: string
  color: string
  bio: string
}

export interface Department {
  id: string
  name: string
  description: string
  doctorCount: number
  active: boolean
  color: string
  icon: string
}

export interface Appointment {
  id: string
  patient_id: string
  doctor_id: string
  conversation_id: string | null
  starts_at: string
  ends_at: string
  status: AppointmentStatus
  booking_reference: string
  source: 'chatbot' | 'staff' | 'phone'
  created_at: string
  updated_at: string
}

export interface DoctorSchedule {
  id: string
  doctorId: string
  workingDays: string[]
  startTime: string
  endTime: string
  slotDuration: number
  exceptions: { date: string; reason: string }[]
}
