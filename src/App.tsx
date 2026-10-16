import { useEffect, useMemo, useState, type FormEvent } from 'react'
import {
  Activity, AlertCircle, ArrowRight, Baby, Bell, Bone, Brain, CalendarDays, CheckCircle2,
  ChevronDown, ChevronRight, Clock3, HeartPulse, LayoutDashboard, Menu, PanelLeftClose,
  PanelLeftOpen, LogOut, ScanFace, Settings, Stethoscope, UserRound, Users, X,
} from 'lucide-react'
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import type { Session } from '@supabase/supabase-js'
import { getAppointments, getDepartments, getDoctors, getPatients, updateAppointmentStatus } from './services/supabaseService'
import { onStaffAuthStateChange, signInStaff, signOutStaff } from './services/authService'
import { supabase } from './lib/supabase'
import type { Appointment, AppointmentStatus, Department, Doctor, Patient } from './types'

type Page = 'Overview' | 'Appointments' | 'Patients' | 'Doctors' | 'Departments' | 'Schedule Management' | 'Settings'
type LoadState<T> = { status: 'loading' } | { status: 'ready'; data: T } | { status: 'error'; message: string }

const statusLabel: Record<AppointmentStatus, string> = { pending_review: 'Pending Review', confirmed: 'Confirmed', cancelled: 'Cancelled' }
const navItems: { label: Page; icon: typeof LayoutDashboard }[] = [
  { label: 'Overview', icon: LayoutDashboard }, { label: 'Appointments', icon: CalendarDays },
  { label: 'Patients', icon: Users }, { label: 'Doctors', icon: Stethoscope },
  { label: 'Departments', icon: Activity }, { label: 'Schedule Management', icon: Clock3 }, { label: 'Settings', icon: Settings },
]
const formatDate = (value: string) => new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric' }).format(new Date(value))
const formatTime = (value: string) => new Intl.DateTimeFormat('en-US', { hour: 'numeric', minute: '2-digit' }).format(new Date(value))
const initials = (name: string) => name.split(' ').map((part) => part[0]).slice(0, 2).join('')

function App() {
  const [session, setSession] = useState<Session | null>(null)
  const [authReady, setAuthReady] = useState(false)
  const [page, setPage] = useState<Page>('Overview')
  const [doctors, setDoctors] = useState<LoadState<Doctor[]>>({ status: 'loading' })
  const [departments, setDepartments] = useState<LoadState<Department[]>>({ status: 'loading' })
  const [appointments, setAppointments] = useState<LoadState<Appointment[]>>({ status: 'loading' })
  const [patients, setPatients] = useState<LoadState<Patient[]>>({ status: 'loading' })
  const [mobileNavOpen, setMobileNavOpen] = useState(false)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [toast, setToast] = useState<string | null>(null)

  useEffect(() => {
    let mounted = true
    const subscription = onStaffAuthStateChange((_event, nextSession) => {
      if (!mounted) return
      setSession(nextSession)
      if (!nextSession) {
        setPage('Overview')
        setMobileNavOpen(false)
      }
    })

    void supabase.auth.getSession().then(({ data, error }) => {
      if (!mounted) return
      if (error) {
        console.error('[Supabase] Unable to restore the staff session.', error)
        setSession(null)
      } else {
        setSession(data.session)
      }
      setAuthReady(true)
    })

    return () => {
      mounted = false
      subscription.unsubscribe()
    }
  }, [])

  useEffect(() => {
    if (!session) return
    void Promise.allSettled([getDoctors(), getDepartments(), getAppointments(), getPatients()]).then(([doctorResult, departmentResult, appointmentResult, patientResult]) => {
      setDoctors(doctorResult.status === 'fulfilled' ? { status: 'ready', data: doctorResult.value } : { status: 'error', message: doctorResult.reason instanceof Error ? doctorResult.reason.message : 'Unable to load doctors.' })
      setDepartments(departmentResult.status === 'fulfilled' ? { status: 'ready', data: departmentResult.value } : { status: 'error', message: departmentResult.reason instanceof Error ? departmentResult.reason.message : 'Unable to load departments.' })
      setAppointments(appointmentResult.status === 'fulfilled' ? { status: 'ready', data: appointmentResult.value } : { status: 'error', message: appointmentResult.reason instanceof Error ? appointmentResult.reason.message : 'Unable to load appointments.' })
      setPatients(patientResult.status === 'fulfilled' ? { status: 'ready', data: patientResult.value } : { status: 'error', message: patientResult.reason instanceof Error ? patientResult.reason.message : 'Unable to load patients.' })
    })
  }, [session])

  const notify = (message: string) => { setToast(message); window.setTimeout(() => setToast(null), 3200) }
  const updateStatus = async (id: string, status: AppointmentStatus) => {
    try {
      const updated = await updateAppointmentStatus(id, status)
      if (appointments.status === 'ready') setAppointments({ status: 'ready', data: appointments.data.map((item) => item.id === id ? updated : item) })
      notify(`Appointment marked ${statusLabel[status].toLowerCase()}.`)
    } catch (error) { notify(error instanceof Error ? error.message : 'Unable to update appointment.') }
  }
  const publicData = doctors.status === 'ready' && departments.status === 'ready'
  if (!authReady) return <div className="auth-loading"><div className="brand-mark"><HeartPulse size={23} /></div><strong>Checking your secure session...</strong></div>
  if (!session) return <LoginPage />
  return <div className="app-shell">
    <Sidebar page={page} setPage={setPage} collapsed={sidebarCollapsed} setCollapsed={setSidebarCollapsed} mobileOpen={mobileNavOpen} closeMobile={() => setMobileNavOpen(false)} />
    <div className={`main-shell ${sidebarCollapsed ? 'main-shell-collapsed' : ''}`}><Header page={page} onMenu={() => setMobileNavOpen(true)} onLogout={async () => {
      try {
        await signOutStaff()
        window.history.replaceState(null, '', window.location.href)
      } catch (error) {
        notify(error instanceof Error ? error.message : 'Unable to sign out.')
      }
    }} /><main className="page-content">
      {page === 'Overview' && <Overview doctors={doctors} departments={departments} appointments={appointments} patients={patients} setPage={setPage} />}
      {page === 'Doctors' && <DoctorsPage state={doctors} departments={departments} />}
      {page === 'Departments' && <DepartmentsPage state={departments} doctors={doctors} />}
      {page === 'Appointments' && <AppointmentsPage state={appointments} patients={patients} doctors={doctors} onStatusChange={updateStatus} />}
      {page === 'Patients' && <PatientsPage state={patients} />}
      {page === 'Schedule Management' && <PrivatePage title="Schedule management" message="Schedule details are available to authenticated staff only." />}
      {page === 'Settings' && <PrivatePage title="Settings" message="Settings are available to authenticated staff only." />}
    </main></div>
    {toast && <div className="toast"><CheckCircle2 size={18} />{toast}</div>}
  </div>
}

function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError(null)
    setLoading(true)
    try {
      await signInStaff(email.trim(), password)
    } catch (signInError) {
      setError(signInError instanceof Error ? signInError.message.replace(/^Staff sign-in failed:\s*/, '') : 'Unable to sign in. Please check your credentials and try again.')
    } finally {
      setLoading(false)
    }
  }

  return <main className="login-shell">
    <section className="login-panel">
      <div className="login-brand"><div className="brand-mark"><HeartPulse size={25} strokeWidth={2.5} /></div><div><strong>Harborview</strong><span>CLINIC ADMIN</span></div></div>
      <div className="login-heading"><p className="eyebrow">Staff workspace</p><h1>Welcome back</h1><p>Sign in to manage your clinic operations securely.</p></div>
      <form className="login-form" onSubmit={handleSubmit}>
        <label htmlFor="staff-email">Work email</label>
        <input id="staff-email" type="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="you@harborviewclinic.com" required />
        <div className="login-label-row"><label htmlFor="staff-password">Password</label><span>Staff access only</span></div>
        <div className="password-field"><input id="staff-password" type={showPassword ? 'text' : 'password'} autoComplete="current-password" value={password} onChange={(event) => setPassword(event.target.value)} placeholder="Enter your password" required /><button type="button" className="password-toggle" onClick={() => setShowPassword(!showPassword)}>{showPassword ? 'Hide' : 'Show'}</button></div>
        {error && <div className="login-error" role="alert"><AlertCircle size={16} />{error}</div>}
        <button className="primary-button full login-submit" type="submit" disabled={loading}>{loading ? 'Signing in...' : 'Sign in'} {!loading && <ArrowRight size={16} />}</button>
      </form>
      <p className="login-footer">Authorized Harborview Clinic staff only</p>
    </section>
    <aside className="login-aside"><div className="login-aside-content"><div className="login-aside-icon"><HeartPulse size={31} /></div><h2>Care, coordinated.</h2><p>A secure workspace for the teams who keep every patient visit moving forward.</p><div className="login-aside-status"><span /> Supabase protected staff access</div></div></aside>
  </main>
}

function Sidebar({ page, setPage, collapsed, setCollapsed, mobileOpen, closeMobile }: { page: Page; setPage: (page: Page) => void; collapsed: boolean; setCollapsed: (value: boolean) => void; mobileOpen: boolean; closeMobile: () => void }) {
  return <><>{mobileOpen && <div className="mobile-overlay" onClick={closeMobile} />}</><aside className={`sidebar ${collapsed ? 'sidebar-collapsed' : ''} ${mobileOpen ? 'sidebar-mobile-open' : ''}`}><div className="brand"><div className="brand-mark"><HeartPulse size={23} strokeWidth={2.5} /></div>{!collapsed && <div><strong>Harborview</strong><span>CLINIC ADMIN</span></div>}<button className="icon-button sidebar-close-mobile" onClick={closeMobile} aria-label="Close navigation"><X size={19} /></button></div><div className="workspace-label">{!collapsed && 'Workspace'}</div><nav className="nav-list">{navItems.map(({ label, icon: Icon }) => <button key={label} className={`nav-item ${page === label ? 'nav-item-active' : ''}`} onClick={() => { setPage(label); closeMobile() }} title={collapsed ? label : undefined}><Icon size={19} /><span>{!collapsed && label}</span></button>)}</nav><div className={`sidebar-footer ${collapsed ? 'sidebar-footer-collapsed' : ''}`}>{!collapsed && <div className="support-card"><div className="support-icon"><AlertCircle size={17} /></div><div><strong>Need assistance?</strong><p>Contact your workspace admin</p></div></div>}<button className="collapse-button" onClick={() => setCollapsed(!collapsed)}>{collapsed ? <PanelLeftOpen size={18} /> : <PanelLeftClose size={18} />} {!collapsed && 'Collapse menu'}</button></div></aside></>
}

function Header({ page, onMenu, onLogout }: { page: Page; onMenu: () => void; onLogout: () => Promise<void> }) {
  const [menuOpen, setMenuOpen] = useState(false)
  return <header className="topbar"><div className="topbar-left"><button className="icon-button mobile-menu-button" onClick={onMenu}><Menu size={21} /></button><div><div className="breadcrumb"><span>Workspace</span><ChevronRight size={13} /><strong>{page}</strong></div><h1>{page === 'Overview' ? 'Harborview Clinic' : page}</h1></div></div><div className="topbar-actions"><div className="profile-menu"><button className="profile" onClick={() => setMenuOpen(!menuOpen)} aria-expanded={menuOpen}><div className="avatar avatar-admin"><HeartPulse size={17} /></div><div className="profile-copy"><strong>Staff workspace</strong><span>Authenticated staff</span></div><ChevronDown size={15} /></button>{menuOpen && <div className="profile-dropdown"><button onClick={() => { setMenuOpen(false); void onLogout() }}><LogOut size={16} /> Sign out</button></div>}</div></div></header>
}

function StateMessage({ state, empty = 'No records found.' }: { state: LoadState<unknown>; empty?: string }) {
  if (state.status === 'loading') return <div className="empty-state"><h3>Loading...</h3><p>Fetching current records from Supabase.</p></div>
  if (state.status === 'error') return <div className="empty-state"><h3>Unable to load records</h3><p>{state.message}</p></div>
  if (Array.isArray(state.data) && state.data.length === 0) return <div className="empty-state"><h3>No records found</h3><p>{empty}</p></div>
  return null
}

function MetricCard({ label, value, icon: Icon, tone }: { label: string; value: string; icon: typeof CalendarDays; tone: string }) {
  return <div className="metric-card"><div className="metric-top"><span>{label}</span><div className={`metric-icon ${tone}`}><Icon size={19} /></div></div><div className="metric-value">{value}</div><div className="metric-foot"><span>Current Supabase data</span></div></div>
}

function Overview({ doctors, departments, appointments, patients, setPage }: { doctors: LoadState<Doctor[]>; departments: LoadState<Department[]>; appointments: LoadState<Appointment[]>; patients: LoadState<Patient[]>; setPage: (page: Page) => void }) {
  const appointmentData = appointments.status === 'ready' ? appointments.data : []
  const today = new Date()
  const todayCount = appointmentData.filter((item) => new Date(item.starts_at).toDateString() === today.toDateString()).length
  const chartData = useMemo(() => Array.from({ length: 7 }, (_, index) => { const date = new Date(today); date.setDate(today.getDate() - today.getDay() + index); return { day: date.toLocaleDateString('en-US', { weekday: 'short' }), appointments: appointmentData.filter((item) => new Date(item.starts_at).toDateString() === date.toDateString()).length } }), [appointments])
  const counts = { confirmed: appointmentData.filter((item) => item.status === 'confirmed').length, pending: appointmentData.filter((item) => item.status === 'pending_review').length, cancelled: appointmentData.filter((item) => item.status === 'cancelled').length }
  return <div className="content-wrap"><PageHeading eyebrow={today.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })} title="Your clinic at a glance" description="Live public metrics from the Harborview Supabase project." action={<button className="primary-button" onClick={() => setPage('Doctors')}><Stethoscope size={17} />View care team</button>} /><div className="metrics-grid"><MetricCard label="Today's appointments" value={appointments.status === 'ready' ? String(todayCount) : '—'} icon={CalendarDays} tone="teal" /><MetricCard label="Pending requests" value={appointments.status === 'ready' ? String(counts.pending) : '—'} icon={Clock3} tone="amber" /><MetricCard label="Confirmed appointments" value={appointments.status === 'ready' ? String(counts.confirmed) : '—'} icon={CheckCircle2} tone="green" /><MetricCard label="Public doctors" value={doctors.status === 'ready' ? String(doctors.data.length) : '—'} icon={Users} tone="purple" /></div><div className="dashboard-grid"><section className="card chart-card"><div className="card-heading"><div><h3>Appointments overview</h3><p>Counts from accessible appointment records</p></div></div>{appointments.status === 'ready' && appointments.data.length > 0 ? <ResponsiveContainer width="100%" height={250}><BarChart data={chartData} margin={{ top: 8, right: 0, left: -25, bottom: 0 }}><CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e9eef2" /><XAxis dataKey="day" axisLine={false} tickLine={false} /><YAxis allowDecimals={false} axisLine={false} tickLine={false} /><Tooltip /><Bar dataKey="appointments" fill="#0f9b8e" radius={[5, 5, 0, 0]} barSize={20} /></BarChart></ResponsiveContainer> : <StateMessage state={appointments} empty="No appointment records are available to the public dashboard." />}</section><section className="card breakdown-card"><div className="card-heading"><div><h3>Status breakdown</h3><p>Accessible appointment records only</p></div></div>{appointments.status === 'ready' && appointments.data.length > 0 ? <div className="breakdown-list"><span>Confirmed <strong>{counts.confirmed}</strong></span><span>Pending <strong>{counts.pending}</strong></span><span>Cancelled <strong>{counts.cancelled}</strong></span></div> : <StateMessage state={appointments} empty="Status data is protected until staff authentication is configured." />}</section></div><div className="dashboard-grid lower-grid"><section className="card requests-card"><div className="card-heading"><div><h3>Public care team</h3><p>Doctors and departments available for public viewing</p></div><button className="text-button" onClick={() => setPage('Doctors')}>View all <ArrowRight size={15} /></button></div><PublicSummary state={doctors} label="doctors" /></section><section className="card upcoming-card"><div className="card-heading"><div><h3>Departments</h3><p>Current public department directory</p></div><button className="text-button" onClick={() => setPage('Departments')}>View all <ArrowRight size={15} /></button></div><PublicSummary state={departments} label="departments" /></section></div><p className="page-description">{patients.status === 'error' ? patients.message : 'Patient records are not displayed on this public dashboard.'}</p></div>
}

function PublicSummary({ state, label }: { state: LoadState<unknown[]>; label: string }) { return <div className="request-list"><StateMessage state={state} empty={`No public ${label} are available.`} />{state.status === 'ready' && state.data.length > 0 && <p>{state.data.length} {label}</p>}</div> }
function PageHeading({ eyebrow, title, description, action }: { eyebrow?: string; title: string; description?: string; action?: React.ReactNode }) { return <div className="page-heading"><div>{eyebrow && <p className="eyebrow">{eyebrow}</p>}<h2>{title}</h2>{description && <p className="page-description">{description}</p>}</div>{action}</div> }

function DoctorsPage({ state, departments }: { state: LoadState<Doctor[]>; departments: LoadState<Department[]> }) {
  return <div className="content-wrap"><PageHeading eyebrow="Care team" title="Doctors" description="Public doctor directory loaded from Supabase." /><div className="doctor-grid"><StateMessage state={state} empty="No doctors are visible to the public role." />{state.status === 'ready' && state.data.map((doctor) => <div className="card doctor-card" key={doctor.id}><div className="doctor-card-top"><div className="avatar avatar-large" style={{ background: doctor.color }}>{doctor.initials}</div><span className={`availability ${doctor.active ? 'is-active' : ''}`}><i />{doctor.active ? 'Active' : 'Inactive'}</span></div><h3>{doctor.name}</h3><p>{doctor.specialty}</p><div className="doctor-meta"><span>{departments.status === 'ready' ? departments.data.find((item) => item.id === doctor.departmentId)?.name ?? 'Department unavailable' : 'Department loading'}</span><span>{doctor.experience ? `${doctor.experience} yrs experience` : 'Experience unavailable'}</span></div></div>)}</div></div>
}

function DepartmentsPage({ state, doctors }: { state: LoadState<Department[]>; doctors: LoadState<Doctor[]> }) {
  const icons = { brain: Brain, bone: Bone, baby: Baby, 'scan-face': ScanFace, 'heart-pulse': HeartPulse }
  return <div className="content-wrap"><PageHeading eyebrow="Clinic structure" title="Departments" description="Public department directory loaded from Supabase." /><div className="department-grid"><StateMessage state={state} empty="No departments are visible to the public role." />{state.status === 'ready' && state.data.map((department) => { const Icon = icons[department.icon as keyof typeof icons] ?? HeartPulse; const count = doctors.status === 'ready' ? doctors.data.filter((doctor) => doctor.departmentId === department.id).length : department.doctorCount; return <div className="card department-card" key={department.id}><div className="department-top"><div className="department-icon" style={{ color: department.color, background: `${department.color}18` }}><Icon size={21} /></div><span className={`availability ${department.active ? 'is-active' : ''}`}><i />{department.active ? 'Active' : 'Inactive'}</span></div><h3>{department.name}</h3><p>{department.description || 'Department information is not available.'}</p><div className="department-footer"><span><Users size={15} />{count} doctors</span></div></div> })}</div></div>
}

function PrivatePage({ title, message }: { title: string; message: string }) { return <div className="content-wrap"><PageHeading eyebrow="Restricted workspace" title={title} description="This section is not exposed on the public dashboard." /><div className="card"><div className="empty-state"><h3>Staff authentication required</h3><p>{message}</p></div></div></div> }

function PatientsPage({ state }: { state: LoadState<Patient[]> }) {
  return <div className="content-wrap"><PageHeading eyebrow="Restricted workspace" title="Patients" description="Patient records available to authenticated staff only." /><div className="card table-card">
    <StateMessage state={state} empty="No patient records are available for this staff workspace." />
    {state.status === 'ready' && state.data.length > 0 && <><div className="patient-directory-head"><span>Patient</span><span>Contact</span><span>Registered</span><span /><span /></div>{state.data.map((patient) => <div className="directory-row" key={patient.id}><div className="contact-cell"><strong>{patient.full_name}</strong></div><div className="contact-cell"><strong>{patient.email || 'Email unavailable'}</strong><span>{patient.phone || 'Phone unavailable'}</span></div><span>{patient.created_at ? formatDate(patient.created_at) : 'Not provided'}</span><span /><span /></div>)}</>}
  </div></div>
}

function AppointmentsPage({ state, patients, doctors, onStatusChange }: { state: LoadState<Appointment[]>; patients: LoadState<Patient[]>; doctors: LoadState<Doctor[]>; onStatusChange: (id: string, status: AppointmentStatus) => Promise<void> }) {
  const patientNames = patients.status === 'ready' ? new Map(patients.data.map((patient) => [patient.id, patient.full_name])) : new Map<string, string>()
  const doctorNames = doctors.status === 'ready' ? new Map(doctors.data.map((doctor) => [doctor.id, doctor.name])) : new Map<string, string>()
  return <div className="content-wrap"><PageHeading eyebrow="Restricted workspace" title="Appointments" description="Appointment records available to authenticated staff only." /><div className="card table-card">
    <StateMessage state={state} empty="No appointment records are available for this staff workspace." />
    {state.status === 'ready' && state.data.length > 0 && <><div className="table-head"><span>Booking</span><span>Patient</span><span>Doctor</span><span>Date & time</span><span>Status</span><span>Source</span><span /></div>{state.data.map((appointment) => <div className="table-row" key={appointment.id}><div className="appointment-row"><div className="contact-cell"><strong>{appointment.booking_reference}</strong><span>{appointment.id}</span></div><div className="contact-cell"><strong>{patientNames.get(appointment.patient_id) ?? 'Patient unavailable'}</strong><span>{appointment.patient_id}</span></div><div className="contact-cell"><strong>{doctorNames.get(appointment.doctor_id) ?? 'Doctor unavailable'}</strong><span>{appointment.doctor_id}</span></div><div className="contact-cell"><strong>{formatDate(appointment.starts_at)}</strong><span>{formatTime(appointment.starts_at)} - {formatTime(appointment.ends_at)}</span></div><div><StatusBadge status={appointment.status} /><select className="appointment-status-select" aria-label={`Update status for ${appointment.booking_reference}`} value={appointment.status} onChange={(event) => void onStatusChange(appointment.id, event.target.value as AppointmentStatus)}><option value="pending_review">Pending Review</option><option value="confirmed">Confirmed</option><option value="cancelled">Cancelled</option></select></div><span>{appointment.source}</span><span /></div></div>)}</>}
  </div></div>
}

function StatusBadge({ status }: { status: AppointmentStatus }) { return <span className={`status-badge status-${status}`}><i />{statusLabel[status]}</span> }

export default App
