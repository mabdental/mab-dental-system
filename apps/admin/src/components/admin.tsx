'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  Activity,
  ArrowLeft,
  ArrowRight,
  BarChart3,
  Bell,
  BriefcaseBusiness,
  CalendarDays,
  Check,
  ChevronRight,
  ClipboardList,
  CreditCard,
  Database,
  DoorOpen,
  FileText,
  HeartPulse,
  LayoutDashboard,
  Menu,
  Package,
  Search,
  Settings,
  ShieldCheck,
  Stethoscope,
  UsersRound,
  X,
} from 'lucide-react'
import { BRANCHES, BUSINESS, SERVICES, type AppointmentStatus, type Role } from '@mab/shared'

type PageKind = 'dashboard' | 'appointments' | 'appointment-detail' | 'calendar' | 'patients' | 'patient-detail' | 'staff' | 'services' | 'branches' | 'billing' | 'inventory' | 'reports' | 'settings'

type AppointmentRecord = {
  id: string
  publicCode: string
  status: AppointmentStatus
  branchId: string
  requestedStartAt: string
  confirmedStartAt?: string
  durationMinutes: number
  createdAt?: string
  completedAt?: string
  patient?: { id: string; fullName: string; phone: string; email?: string }
  branch?: { id: string; name: string; slug: string }
  service?: { name: string; slug: string }
  payments?: { amount: number; status: string }[]
  statusHistory?: { id: string; fromStatus?: AppointmentStatus; toStatus: AppointmentStatus; note?: string; createdAt: string }[]
  patientMessage?: string
  concernText?: string
}

type ScheduleDialogState = {
  appointmentId: string
  action: 'suggest' | 'reschedule'
  value: string
}

type MovementDialogState = {
  itemId: string
  branchId: string
  type: 'IN' | 'OUT'
  quantity: string
  reason: string
}

const navItems: { href: string; label: string; icon: typeof LayoutDashboard }[] = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/appointments', label: 'Appointments', icon: ClipboardList },
  { href: '/calendar', label: 'Calendar', icon: CalendarDays },
  { href: '/patients', label: 'Patients', icon: UsersRound },
  { href: '/staff', label: 'Staff', icon: BriefcaseBusiness },
  { href: '/services', label: 'Services', icon: Stethoscope },
  { href: '/branches', label: 'Branches', icon: HeartPulse },
  { href: '/billing', label: 'Billing', icon: CreditCard },
  { href: '/inventory', label: 'Inventory', icon: Package },
  { href: '/reports', label: 'Reports', icon: BarChart3 },
  { href: '/settings', label: 'Settings', icon: Settings },
]

const roleDescriptions: { role: Role; description: string }[] = [
  { role: 'SUPER_ADMIN', description: 'Full clinic operations and configuration access.' },
  { role: 'BRANCH_MANAGER', description: 'Authorized branch appointments, reports, inventory, and billing.' },
  { role: 'RECEPTIONIST', description: 'Appointments, calendar, contact details, check-in, and patient history.' },
  { role: 'DENTIST', description: 'Assigned schedule and permitted treatment-state updates.' },
  { role: 'CASHIER', description: 'Payment records with only the identity needed to reconcile a visit.' },
  { role: 'INVENTORY_STAFF', description: 'Inventory items and branch stock movements.' },
]

async function requestJson<T>(url: string, init?: RequestInit) {
  const response = await fetch(url, init)
  const body = await response.json().catch(() => ({}))
  if (!response.ok) throw new Error(body.error || 'The request could not be completed.')
  return body as T
}

function formatDate(value?: string) {
  if (!value) return '—'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '—'
  return new Intl.DateTimeFormat('en-PH', { dateStyle: 'medium', timeStyle: 'short', timeZone: BUSINESS.timezone }).format(date)
}

function formatMoney(value: number) {
  return new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' }).format(value)
}

function statusLabel(status: string) {
  return status.replaceAll('_', ' ').toLowerCase().replace(/(^|\s)\S/g, (letter) => letter.toUpperCase())
}

export function LoginScreen() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  async function submit(event: React.FormEvent) {
    event.preventDefault()
    setError('')
    setLoading(true)
    try {
      await requestJson('/api/auth/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email, password }) })
      router.replace('/dashboard')
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Unable to sign in.')
    } finally {
      setLoading(false)
    }
  }
  return <main className="login-page"><div className="login-panel"><div className="admin-logo"><span className="admin-logo-mark">M.A.B</span><span>Dental Clinic</span></div><p className="eyebrow">CLINIC ADMIN</p><h1>Welcome back.</h1><p className="login-lede">Sign in to manage appointments, patients, and the day-to-day details of the clinic.</p><form onSubmit={submit} className="login-form"><label><span>Email</span><input type="email" autoComplete="username" value={email} onChange={(event) => setEmail(event.target.value)} required /></label><label><span>Password</span><div className="password-control"><input aria-label="Password" type={showPassword ? "text" : "password"} autoComplete="current-password" value={password} onChange={(event) => setPassword(event.target.value)} required /><button type="button" aria-label={showPassword ? "Hide" : "Show"} aria-pressed={showPassword} onClick={() => setShowPassword(!showPassword)}>{showPassword ? "Hide" : "Show"}</button></div></label>{error && <div className="admin-error" role="alert">{error}</div>}<button className="admin-button admin-button-primary admin-button-wide" type="submit" disabled={loading}>{loading ? 'Signing in…' : 'Sign in'} <ArrowRight size={17} /></button></form><p className="login-footnote"><ShieldCheck size={15} /> Authorized clinic staff only. No public signup.</p></div><div className="login-aside"><div className="login-aside-art"><HeartPulse size={46} /><span>Clear operations.<br />Thoughtful care.</span></div><p>{BUSINESS.tagline}</p></div></main>
}

export function AdminShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()
  const [mobileOpen, setMobileOpen] = useState(false)
  const [collapsed, setCollapsed] = useState(false)
  useEffect(() => { setCollapsed(localStorage.getItem('mab-nav-collapsed') === 'true') }, [])
  function toggleNavigation() { setCollapsed(value => { localStorage.setItem('mab-nav-collapsed', String(!value)); return !value }) }
  const [profile, setProfile] = useState<{ email: string; role: Role } | null>(null)
  const [checking, setChecking] = useState(true)
  useEffect(() => {
    requestJson<{ profile: { email: string; role: Role } }>('/api/auth/session').then((body) => setProfile(body.profile)).catch(() => router.replace('/login')).finally(() => setChecking(false))
  }, [router])
  useEffect(() => setMobileOpen(false), [pathname])
  async function logout() {
    await fetch('/api/auth/logout', { method: 'POST' })
    router.replace('/login')
  }
  if (checking || !profile) return <div className="admin-loading"><div className="loading-mark">M.A.B</div><span>Loading clinic workspace…</span></div>
  return <div className={'admin-shell' + (collapsed ? ' nav-collapsed' : '')}><aside className={'admin-sidebar' + (mobileOpen ? ' open' : '')}><div className="sidebar-brand"><div className="admin-logo"><span className="admin-logo-mark">M.A.B</span><span>Dental Clinic</span></div><button className="sidebar-close" type="button" onClick={() => setMobileOpen(false)} aria-label="Close navigation"><X size={19} /></button></div><button className="nav-collapse" type="button" onClick={toggleNavigation} aria-label={collapsed ? "Expand navigation" : "Minimize navigation"} aria-expanded={!collapsed}><Menu size={18} /><span>Minimize menu</span></button><p className="sidebar-label">OPERATIONS</p><nav>{navItems.map((item) => { const Icon = item.icon; const active = pathname === item.href || pathname.startsWith(item.href + '/'); return <Link href={item.href} key={item.href} title={item.label} aria-label={item.label} className={'sidebar-link' + (active ? ' active' : '')}><Icon size={17} /><span>{item.label}</span>{active && <ChevronRight size={14} />}</Link> })}</nav><div className="sidebar-bottom"><span className="sidebar-status"><Activity size={15} /> Supabase operations</span><button className="sidebar-logout" type="button" onClick={logout}><DoorOpen size={16} /> Sign out</button></div></aside><div className="admin-main"><header className="admin-topbar"><button className="sidebar-open" type="button" onClick={() => setMobileOpen(true)} aria-label="Open navigation"><Menu size={22} /></button><div><span className="topbar-kicker">M.A.B. DENTAL CLINIC</span><strong>{pageTitle(pathname)}</strong></div><div className="topbar-profile"><Bell size={18} /><span><strong>{profile.email}</strong><small>{statusLabel(profile.role)}</small></span></div></header><div className="admin-content">{children}</div></div>{mobileOpen && <button className="sidebar-scrim" aria-label="Close navigation" type="button" onClick={() => setMobileOpen(false)} />}</div>
}

function pageTitle(pathname: string) {
  if (pathname.startsWith('/appointments/')) return 'Appointment detail'
  if (pathname.startsWith('/patients/')) return 'Patient detail'
  const match = navItems.find((item) => pathname === item.href || pathname.startsWith(item.href + '/'))
  return match?.label || 'Dashboard'
}

export function AdminWorkspace({ page, recordId }: { page: PageKind; recordId?: string }) {
  const [data, setData] = useState<Record<string, any> | null>(null)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [reloadKey, setReloadKey] = useState(0)
  const [scheduleDialog, setScheduleDialog] = useState<ScheduleDialogState | null>(null)
  const [scheduleError, setScheduleError] = useState('')
  const reload = useCallback(async () => {
    setError('')
    try {
      if (page === 'dashboard') setData(await requestJson('/api/dashboard'))
      else if (page === 'appointments') setData(await requestJson('/api/appointments'))
      else if (page === 'appointment-detail' && recordId) setData(await requestJson('/api/appointments/' + recordId))
      else if (page === 'calendar') setData(await requestJson('/api/appointments'))
      else if (page === 'patients') setData(await requestJson('/api/patients'))
      else if (page === 'patient-detail' && recordId) setData(await requestJson('/api/patients/' + recordId))
      else if (page === 'services') setData(await requestJson('/api/services'))
      else if (page === 'branches') setData(await requestJson('/api/branches'))
      else if (page === 'billing') setData(await requestJson('/api/payments'))
      else if (page === 'inventory') setData(await requestJson('/api/inventory'))
      else if (page === 'reports') setData(await requestJson('/api/reports'))
      else if (page === 'staff') setData(await requestJson('/api/staff'))
      else setData({})
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Unable to load this workspace.')
    }
  }, [page, recordId, reloadKey])
  useEffect(() => { void reload() }, [reload])
  useEffect(() => {
    if (!['dashboard', 'appointments', 'calendar'].includes(page)) return
    const timer = window.setInterval(() => { void reload() }, 15000)
    return () => window.clearInterval(timer)
  }, [page, reload])
  function refresh(message?: string) {
    if (message) {
      setNotice(message)
      window.setTimeout(() => setNotice(''), 3500)
    }
    setReloadKey((value) => value + 1)
  }
  async function appointmentAction(id: string, action: string) {
    if (action === 'suggest' || action === 'reschedule') {
      setScheduleError('')
      setScheduleDialog({ appointmentId: id, action, value: '' })
      return
    }
    if (['cancel', 'decline', 'no-show'].includes(action) && !window.confirm('Are you sure you want to ' + action.replace('-', ' ') + ' this appointment?')) return
    try {
      await requestJson('/api/appointments/' + id, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action }) })
      refresh('Appointment updated.')
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Unable to update appointment.')
    }
  }
  async function submitSchedule(event: React.FormEvent) {
    event.preventDefault()
    if (!scheduleDialog) return
    const proposed = new Date(scheduleDialog.value + ':00+08:00')
    if (!scheduleDialog.value || Number.isNaN(proposed.getTime())) {
      setScheduleError('Choose a valid local date and time.')
      return
    }
    setScheduleError('')
    try {
      await requestJson('/api/appointments/' + scheduleDialog.appointmentId, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: scheduleDialog.action, startAt: proposed.toISOString() }) })
      setScheduleDialog(null)
      refresh('Appointment updated.')
    } catch (caught) {
      setScheduleError(caught instanceof Error ? caught.message : 'Unable to update appointment.')
    }
  }
  if (error) return <div className="workspace-state"><div className="state-icon"><Database size={24} /></div><h2>Could not load this view.</h2><p>{error}</p><button className="admin-button admin-button-primary" type="button" onClick={() => { setError(''); refresh() }}>Try again <ArrowRight size={16} /></button></div>
  if (!data) return <div className="workspace-state"><div className="spinner" /><p>Loading workspace…</p></div>
  return <>{notice && <div className="admin-toast" role="status"><Check size={16} /> {notice}</div>}{page === 'dashboard' && <DashboardView data={data} onAction={appointmentAction} />} {page === 'appointments' && <AppointmentsView data={data} onAction={appointmentAction} />} {page === 'appointment-detail' && <AppointmentDetailView data={data} onAction={appointmentAction} onRefresh={refresh} />} {page === 'calendar' && <CalendarView data={data} />} {page === 'patients' && <PatientsView data={data} />} {page === 'patient-detail' && <PatientDetailView data={data} onAction={appointmentAction} />} {page === 'services' && <ServicesView data={data} onRefresh={refresh} />} {page === 'branches' && <BranchesView data={data} onRefresh={refresh} />} {page === 'billing' && <BillingView data={data} />} {page === 'inventory' && <InventoryView data={data} onRefresh={refresh} />} {page === 'reports' && <ReportsView data={data} />} {page === 'staff' && <StaffView data={data} />} {page === 'settings' && <SettingsView />}{scheduleDialog && <AdminDialog title={scheduleDialog.action === 'suggest' ? 'Suggest a new time' : 'Reschedule appointment'} description="Choose the new local clinic date and time." onClose={() => setScheduleDialog(null)}><form className="modal-form" onSubmit={submitSchedule}><label>New local date and time<input type="datetime-local" value={scheduleDialog.value} onChange={(event) => setScheduleDialog({ ...scheduleDialog, value: event.target.value })} required /></label>{scheduleError && <div className="admin-error" role="alert">{scheduleError}</div>}<div className="modal-actions"><button type="button" className="admin-button admin-button-quiet" onClick={() => setScheduleDialog(null)}>Cancel</button><button type="submit" className="admin-button admin-button-primary">Save schedule</button></div></form></AdminDialog>}</>
}

function AdminDialog({ title, description, children, onClose }: { title: string; description: string; children: React.ReactNode; onClose: () => void }) {
  const titleId = 'admin-dialog-title'
  return <div className="admin-modal-backdrop" role="presentation" onMouseDown={onClose}><section className="admin-modal" role="dialog" aria-modal="true" aria-labelledby={titleId} onMouseDown={(event) => event.stopPropagation()}><div className="modal-heading"><div><p className="eyebrow">CLINIC WORKSPACE</p><h2 id={titleId}>{title}</h2><p>{description}</p></div><button type="button" className="admin-button admin-button-quiet modal-close" aria-label="Close dialog" onClick={onClose}><X size={18} /></button></div>{children}</section></div>
}

function WorkspaceHeader({ eyebrow, title, description, action }: { eyebrow: string; title: string; description?: string; action?: React.ReactNode }) {
  return <div className="workspace-header"><div><p className="eyebrow">{eyebrow}</p><h1>{title}</h1>{description && <p>{description}</p>}</div>{action}</div>
}

function MetricCard({ label, value, detail, tone = 'navy' }: { label: string; value: string | number; detail: string; tone?: string }) {
  return <div className={'metric-card metric-' + tone}><span>{label}</span><strong>{value}</strong><small>{detail}</small></div>
}

function DashboardView({ data, onAction }: { data: Record<string, any>; onAction: (id: string, action: string) => void }) {
  const counts = data.snapshot?.counts || {}
  const pending = (data.pending || []) as AppointmentRecord[]
  return <div><WorkspaceHeader eyebrow="TODAY" title="Good morning, clinic team." description="A clear view of what needs attention across M.A.B. Dental Clinic." action={<Link className="admin-button admin-button-primary" href="/appointments">View all appointments <ArrowRight size={16} /></Link>} /><div className="metric-grid"><MetricCard label="Today's appointments" value={counts.today || 0} detail="All statuses" /><MetricCard label="Pending requests" value={counts.pending || 0} detail="Needs clinic review" tone="gold" /><MetricCard label="Confirmed today" value={counts.confirmed || 0} detail="On the schedule" tone="green" /><MetricCard label="Completed today" value={counts.completed || 0} detail="Finished visits" tone="soft" /><MetricCard label="Checked in" value={counts.checkedIn || 0} detail="Currently arriving" tone="soft" /><MetricCard label="No shows" value={counts.noShow || 0} detail="Today's records" tone="soft" /><MetricCard label="Recorded payments" value={formatMoney(counts.payments || 0)} detail="Paid status only" tone="soft" /><MetricCard label="Low stock items" value={counts.lowStock || 0} detail="At reorder level" tone="gold" /></div><div className="dashboard-columns"><section className="admin-card"><div className="card-heading"><div><p className="eyebrow">NEW REQUESTS</p><h2>Needs your review</h2></div><Link href="/appointments?status=PENDING_REVIEW" className="text-link">See all <ArrowRight size={15} /></Link></div>{pending.length ? <div className="compact-list">{pending.map((appointment) => <div className="compact-row" key={appointment.id}><div><strong>{appointment.patient?.fullName || 'Patient request'}</strong><span>{appointment.service?.name || 'Consultation'} · {appointment.branch?.name}</span><small>{formatDate(appointment.requestedStartAt)}</small></div><div className="row-actions"><StatusBadge status={appointment.status} /><button type="button" className="admin-button admin-button-small admin-button-primary" onClick={() => onAction(appointment.id, 'confirm')}>Confirm</button><Link className="icon-link" href={'/appointments/' + appointment.id} aria-label="Open appointment"><ChevronRight size={17} /></Link></div></div>)}</div> : <EmptyAdminState title="No pending requests" text="New public appointment requests will appear here." />}</section><section className="admin-card"><div className="card-heading"><div><p className="eyebrow">TODAY'S FLOW</p><h2>At a glance</h2></div><CalendarDays size={19} /></div><div className="flow-list"><div><span className="flow-dot gold" /><span>Requests awaiting review</span><strong>{counts.pending || 0}</strong></div><div><span className="flow-dot navy" /><span>Confirmed for today</span><strong>{counts.confirmed || 0}</strong></div><div><span className="flow-dot green" /><span>Completed today</span><strong>{counts.completed || 0}</strong></div><div><span className="flow-dot muted" /><span>Low-stock alerts</span><strong>{counts.lowStock || 0}</strong></div></div><Link href="/calendar" className="admin-inline-link">Open calendar <ArrowRight size={15} /></Link></section></div></div>
}

function AppointmentsView({ data, onAction }: { data: Record<string, any>; onAction: (id: string, action: string) => void }) {
  const [query, setQuery] = useState('')
  const [status, setStatus] = useState('ALL')
  const appointments = ((data.appointments || []) as AppointmentRecord[]).filter((appointment) => {
    const haystack = [appointment.publicCode, appointment.patient?.fullName, appointment.patient?.phone, appointment.service?.name, appointment.branch?.name].join(' ').toLowerCase()
    return (!query || haystack.includes(query.toLowerCase())) && (status === 'ALL' || appointment.status === status)
  })
  return <div><WorkspaceHeader eyebrow="APPOINTMENTS" title="Appointment inbox." description="Review requests, protect the schedule, and move every visit through a clear status." action={<Link className="admin-button admin-button-primary" href="/calendar"><CalendarDays size={16} /> Open calendar</Link>} /><div className="filter-bar"><label className="search-field"><Search size={17} /><input placeholder="Search name, reference, or phone" value={query} onChange={(event) => setQuery(event.target.value)} /></label><select value={status} onChange={(event) => setStatus(event.target.value)}><option value="ALL">All statuses</option>{['PENDING_REVIEW', 'CONFIRMED', 'RESCHEDULE_PROPOSED', 'CHECKED_IN', 'IN_TREATMENT', 'COMPLETED', 'CANCELLED', 'DECLINED', 'NO_SHOW'].map((item) => <option key={item} value={item}>{statusLabel(item)}</option>)}</select><select defaultValue="ALL"><option value="ALL">All branches</option>{BRANCHES.map((branch) => <option key={branch.id}>{branch.name}</option>)}</select></div><section className="admin-card table-card"><div className="table-meta"><span><strong>{appointments.length}</strong> records</span><span>All times in {BUSINESS.timezone}</span></div><AppointmentTable appointments={appointments} onAction={onAction} /></section></div>
}

function AppointmentTable({ appointments, onAction }: { appointments: AppointmentRecord[]; onAction?: (id: string, action: string) => void }) {
  return <div className="table-scroll"><table><thead><tr><th>Request</th><th>Patient</th><th>Branch / service</th><th>Preferred time</th><th>Status</th><th><span className="sr-only">Actions</span></th></tr></thead><tbody>{appointments.map((appointment) => <tr key={appointment.id}><td><Link className="table-primary" href={'/appointments/' + appointment.id}>{appointment.publicCode}</Link><small>{formatDate(appointment.createdAt)}</small></td><td><strong>{appointment.patient?.fullName || '—'}</strong><small>{appointment.patient?.phone || '—'}</small></td><td><strong>{appointment.branch?.name || '—'}</strong><small>{appointment.service?.name || 'Consultation'}</small></td><td><strong>{formatDate(appointment.confirmedStartAt || appointment.requestedStartAt)}</strong><small>{appointment.durationMinutes} minutes</small></td><td><StatusBadge status={appointment.status} /></td><td><div className="row-actions">{onAction && <ActionButtons appointment={appointment} onAction={onAction} />}<Link href={'/appointments/' + appointment.id} className="icon-link" aria-label={'Open ' + appointment.publicCode}><ChevronRight size={17} /></Link></div></td></tr>)}</tbody></table>{!appointments.length && <EmptyAdminState title="No appointments match these filters" text="Try a different status or search term." />}</div>
}

function ActionButtons({ appointment, onAction }: { appointment: AppointmentRecord; onAction: (id: string, action: string) => void }) {
  if (appointment.status === 'PENDING_REVIEW' || appointment.status === 'RESCHEDULE_PROPOSED') return <><button type="button" className="admin-button admin-button-small admin-button-primary" onClick={() => onAction(appointment.id, 'confirm')}>Confirm</button><button type="button" className="icon-link" onClick={() => onAction(appointment.id, 'suggest')} aria-label="Suggest a new time"><CalendarDays size={16} /></button></>
  if (appointment.status === 'CONFIRMED') return <><button type="button" className="admin-button admin-button-small admin-button-primary" onClick={() => onAction(appointment.id, 'check-in')}>Check in</button><button type="button" className="icon-link" onClick={() => onAction(appointment.id, 'no-show')} aria-label="Mark no show"><X size={16} /></button></>
  if (appointment.status === 'CHECKED_IN') return <button type="button" className="admin-button admin-button-small admin-button-primary" onClick={() => onAction(appointment.id, 'start-treatment')}>Start</button>
  if (appointment.status === 'IN_TREATMENT') return <button type="button" className="admin-button admin-button-small admin-button-primary" onClick={() => onAction(appointment.id, 'complete')}>Complete</button>
  return null
}

function AppointmentDetailView({ data, onAction, onRefresh }: { data: Record<string, any>; onAction: (id: string, action: string) => void; onRefresh: (message?: string) => void }) {
  const appointment = data.appointment as AppointmentRecord
  const [paymentOpen, setPaymentOpen] = useState(false)
  const [paymentAmount, setPaymentAmount] = useState('')
  const [paymentMethod, setPaymentMethod] = useState('Cash')
  const [paymentError, setPaymentError] = useState('')
  if (!appointment) return <div className="workspace-state"><h2>Appointment not found.</h2><Link href="/appointments" className="admin-button admin-button-primary">Back to appointments</Link></div>
  const paymentTotal = appointment.payments?.filter((item) => item.status === 'PAID').reduce((sum, item) => sum + item.amount, 0) || 0
  async function recordPayment(event: React.FormEvent) {
    event.preventDefault()
    const amount = Number(paymentAmount)
    if (!Number.isFinite(amount) || amount <= 0) {
      setPaymentError('Enter a positive payment amount.')
      return
    }
    if (!appointment.patient?.id || !appointment.branch?.id) {
      setPaymentError('This appointment is missing its patient or branch link.')
      return
    }
    setPaymentError('')
    try {
      await requestJson('/api/payments', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ appointmentId: appointment.id, patientId: appointment.patient.id, branchId: appointment.branch.id, amount, paymentMethod, status: 'PAID' }) })
      setPaymentOpen(false)
      setPaymentAmount('')
      onRefresh('Payment recorded.')
    } catch (caught) {
      setPaymentError(caught instanceof Error ? caught.message : 'Unable to record payment.')
    }
  }
  return <><div><Link href="/appointments" className="back-link"><ArrowLeft size={15} /> Back to appointments</Link><WorkspaceHeader eyebrow={appointment.publicCode} title={appointment.patient?.fullName || 'Appointment'} description="Review the request, its timeline, and the actions available for this stage." action={<StatusBadge status={appointment.status} />} /><div className="detail-grid"><section className="admin-card detail-main"><div className="detail-top"><div><p className="eyebrow">APPOINTMENT DETAILS</p><h2>{appointment.service?.name || 'Consultation / I’m not sure'}</h2></div><div className="detail-actions">{appointment.status === 'PENDING_REVIEW' && <><button className="admin-button admin-button-primary" type="button" onClick={() => onAction(appointment.id, 'confirm')}>Confirm</button><button className="admin-button admin-button-outline" type="button" onClick={() => onAction(appointment.id, 'suggest')}>Suggest new time</button><button className="admin-button admin-button-quiet" type="button" onClick={() => onAction(appointment.id, 'decline')}>Decline</button></>}{appointment.status === 'CONFIRMED' && <><button className="admin-button admin-button-primary" type="button" onClick={() => onAction(appointment.id, 'check-in')}>Check in</button><button className="admin-button admin-button-outline" type="button" onClick={() => onAction(appointment.id, 'reschedule')}>Reschedule</button><button className="admin-button admin-button-quiet" type="button" onClick={() => onAction(appointment.id, 'cancel')}>Cancel</button></>}{appointment.status === 'CHECKED_IN' && <button className="admin-button admin-button-primary" type="button" onClick={() => onAction(appointment.id, 'start-treatment')}>Start treatment</button>}{appointment.status === 'IN_TREATMENT' && <button className="admin-button admin-button-primary" type="button" onClick={() => onAction(appointment.id, 'complete')}>Complete treatment</button>}</div></div><div className="detail-facts"><div><span>Preferred schedule</span><strong>{formatDate(appointment.requestedStartAt)}</strong></div><div><span>Confirmed schedule</span><strong>{formatDate(appointment.confirmedStartAt)}</strong></div><div><span>Branch</span><strong>{appointment.branch?.name || '—'}</strong></div><div><span>Duration</span><strong>{appointment.durationMinutes} minutes</strong></div></div>{(appointment.concernText || appointment.patientMessage) && <div className="detail-message"><p className="eyebrow">PATIENT NOTE</p><p>{appointment.concernText || appointment.patientMessage}</p></div>}<div className="timeline"><p className="eyebrow">STATUS HISTORY</p>{(appointment.statusHistory || []).map((item) => <div className="timeline-row" key={item.id}><span className="timeline-dot" /><div><strong>{statusLabel(item.toStatus)}</strong><small>{formatDate(item.createdAt)}{item.note ? ' · ' + item.note : ''}</small></div></div>)}</div></section><aside className="detail-side"><section className="admin-card"><p className="eyebrow">PATIENT</p><h3>{appointment.patient?.fullName || '—'}</h3><a href={'tel:' + (appointment.patient?.phone || '').replace(/\s/g, '')}>{appointment.patient?.phone || '—'}</a>{appointment.patient?.email && <a href={'mailto:' + appointment.patient.email}>{appointment.patient.email}</a>}<Link className="admin-inline-link" href={'/patients/' + appointment.patient?.id}>Open patient profile <ArrowRight size={15} /></Link></section><section className="admin-card"><p className="eyebrow">PAYMENTS</p><div className="payment-total">{formatMoney(paymentTotal)}</div><span className="muted-copy">Recorded as paid</span><button className="admin-button admin-button-outline admin-button-wide" type="button" onClick={() => { setPaymentError(''); setPaymentOpen(true) }}><CreditCard size={16} /> Record payment</button></section></aside></div></div>{paymentOpen && <AdminDialog title="Record payment" description="Store a basic operational payment record without card details." onClose={() => setPaymentOpen(false)}><form className="modal-form" onSubmit={recordPayment}><label>Amount paid (PHP)<input type="number" min="0.01" step="0.01" value={paymentAmount} onChange={(event) => setPaymentAmount(event.target.value)} autoFocus required /></label><label>Payment method<select value={paymentMethod} onChange={(event) => setPaymentMethod(event.target.value)}><option>Cash</option><option>GCash</option><option>Maya</option><option>Bank Transfer</option><option>Card</option><option>Other</option></select></label>{paymentError && <div className="admin-error" role="alert">{paymentError}</div>}<div className="modal-actions"><button type="button" className="admin-button admin-button-quiet" onClick={() => setPaymentOpen(false)}>Cancel</button><button type="submit" className="admin-button admin-button-primary">Save payment</button></div></form></AdminDialog>}</>
}

function CalendarView({ data }: { data: Record<string, any> }) {
  const appointments = (data.appointments || []) as AppointmentRecord[]
  const [month, setMonth] = useState(() => new Date())
  const monthLabel = new Intl.DateTimeFormat('en-PH', { month: 'long', year: 'numeric', timeZone: BUSINESS.timezone }).format(month)
  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
  const first = new Date(month.getFullYear(), month.getMonth(), 1)
  const start = new Date(first)
  start.setDate(first.getDate() - first.getDay())
  const cells = Array.from({ length: 42 }, (_, index) => {
    const date = new Date(start)
    date.setDate(start.getDate() + index)
    return date
  })
  const keyFor = (date: Date) => date.toLocaleDateString('en-CA', { timeZone: BUSINESS.timezone })
  const eventsByDay = useMemo(() => {
    const map = new Map<string, AppointmentRecord[]>()
    appointments.filter((item) => ['CONFIRMED', 'CHECKED_IN', 'IN_TREATMENT', 'RESCHEDULE_PROPOSED'].includes(item.status)).forEach((item) => {
      const key = keyFor(new Date(item.confirmedStartAt || item.requestedStartAt))
      map.set(key, [...(map.get(key) || []), item])
    })
    return map
  }, [appointments])
  function moveMonth(amount: number) { setMonth((current) => new Date(current.getFullYear(), current.getMonth() + amount, 1)) }
  return <div><WorkspaceHeader eyebrow="CALENDAR" title="The clinic schedule." description="A month view of confirmed visits, with each appointment linked to its operational detail." action={<Link href="/appointments" className="admin-button admin-button-outline">Appointment inbox <ArrowRight size={16} /></Link>} /><section className="admin-card calendar-card"><div className="calendar-toolbar"><div><button className="admin-button admin-button-outline" type="button" onClick={() => moveMonth(-1)} aria-label="Previous month">‹</button><button className="admin-button admin-button-outline" type="button" onClick={() => setMonth(new Date())}>Today</button><button className="admin-button admin-button-outline" type="button" onClick={() => moveMonth(1)} aria-label="Next month">›</button></div><h2>{monthLabel}</h2><span>{appointments.filter((item) => ['CONFIRMED', 'CHECKED_IN', 'IN_TREATMENT', 'RESCHEDULE_PROPOSED'].includes(item.status)).length} scheduled</span></div><div className="calendar-grid">{dayNames.map((day) => <div className="calendar-weekday" key={day}>{day}</div>)}{cells.map((date) => { const key = keyFor(date); const events = (eventsByDay.get(key) || []).sort((a, b) => new Date(a.confirmedStartAt || a.requestedStartAt).getTime() - new Date(b.confirmedStartAt || b.requestedStartAt).getTime()); const inMonth = date.getMonth() === month.getMonth(); return <div className={'calendar-cell' + (inMonth ? '' : ' outside-month')} key={key}><strong>{date.getDate()}</strong><div>{events.slice(0, 3).map((item) => <Link className="calendar-event" href={'/appointments/' + item.id} key={item.id}><time>{new Intl.DateTimeFormat('en-PH', { timeStyle: 'short', timeZone: BUSINESS.timezone }).format(new Date(item.confirmedStartAt || item.requestedStartAt))}</time><span>{item.patient?.fullName || 'Patient'}</span></Link>)}{events.length > 3 && <small className="calendar-more">+{events.length - 3} more</small>}</div></div>})}</div></section></div>
}



function PatientsView({ data }: { data: Record<string, any> }) {
  const [query, setQuery] = useState('')
  const patients = (data.patients || []) as { id: string; fullName: string; phone: string; email?: string; appointments: AppointmentRecord[] }[]
  const filtered = patients.filter((patient) => !query || [patient.fullName, patient.phone, patient.email].join(' ').toLowerCase().includes(query.toLowerCase()))
  return <div><WorkspaceHeader eyebrow="PATIENT DIRECTORY" title="People, not paperwork." description="A lightweight operational directory for appointment coordination. This is not a certified EHR." /><div className="filter-bar"><label className="search-field"><Search size={17} /><input placeholder="Search name, phone, or email" value={query} onChange={(event) => setQuery(event.target.value)} /></label></div><section className="admin-card table-card"><div className="table-meta"><span><strong>{filtered.length}</strong> patients</span><span>Minimal operational data only</span></div><div className="table-scroll"><table><thead><tr><th>Patient</th><th>Contact</th><th>Appointments</th><th>Last visit</th><th /></tr></thead><tbody>{filtered.map((patient) => <tr key={patient.id}><td><Link href={'/patients/' + patient.id} className="table-primary">{patient.fullName}</Link></td><td><strong>{patient.phone}</strong><small>{patient.email || 'No email'}</small></td><td>{patient.appointments.length}</td><td>{formatDate(patient.appointments.find((item) => item.status === 'COMPLETED')?.completedAt)}</td><td><Link href={'/patients/' + patient.id} className="icon-link" aria-label={'Open ' + patient.fullName}><ChevronRight size={17} /></Link></td></tr>)}</tbody></table>{!filtered.length && <EmptyAdminState title="No patients yet" text="A patient record is created when a public appointment request is submitted." />}</div></section></div>
}

function PatientDetailView({ data, onAction }: { data: Record<string, any>; onAction: (id: string, action: string) => void }) {
  const patient = data.patient as { id: string; fullName: string; phone: string; email?: string; appointments: AppointmentRecord[]; payments: { amount: number; status: string; paymentMethod: string; createdAt: string }[] }
  if (!patient) return <div className="workspace-state"><h2>Patient not found.</h2><Link href="/patients" className="admin-button admin-button-primary">Back to patients</Link></div>
  return <div><Link href="/patients" className="back-link"><ArrowLeft size={15} /> Back to patients</Link><WorkspaceHeader eyebrow="PATIENT PROFILE" title={patient.fullName} description="Operational appointment history and contact details only." action={<a className="admin-button admin-button-outline" href={'tel:' + patient.phone.replace(/\s/g, '')}>Call patient</a>} /><div className="patient-profile-grid"><section className="admin-card"><p className="eyebrow">CONTACT</p><div className="profile-contact"><span>{patient.phone}</span><span>{patient.email || 'No email provided'}</span></div><p className="muted-copy">Patient data should be accessed only for a clinic purpose.</p></section><section className="admin-card"><p className="eyebrow">PAYMENT SUMMARY</p><div className="payment-total">{formatMoney(patient.payments?.filter((item) => item.status === 'PAID').reduce((sum, item) => sum + item.amount, 0) || 0)}</div><span className="muted-copy">{patient.payments?.length || 0} recorded payments</span></section></div><section className="admin-card table-card"><div className="card-heading"><div><p className="eyebrow">APPOINTMENT HISTORY</p><h2>Visits and requests</h2></div><span>{patient.appointments.length} records</span></div><AppointmentTable appointments={patient.appointments} onAction={onAction} /></section></div>
}

function ServicesView({ data, onRefresh }: { data: Record<string, any>; onRefresh: (message?: string) => void }) {
  const services = (data.services || []) as { id: string; name: string; category: string; shortDescription: string; longDescription?: string; defaultDurationMinutes: number; isActive: boolean; isFeatured?: boolean; price: number | null }[]
  const [editing, setEditing] = useState<typeof services[number] | null>(null)
  async function toggle(service: { id: string; isActive: boolean }) {
    try {
      await requestJson('/api/services/' + service.id, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ isActive: !service.isActive }) })
      onRefresh('Service availability updated.')
    } catch (caught) {
      window.alert(caught instanceof Error ? caught.message : 'Unable to update service.')
    }
  }
  async function saveEdit(event: React.FormEvent) {
    event.preventDefault()
    if (!editing) return
    try {
      await requestJson('/api/services/' + editing.id, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(editing) })
      setEditing(null)
      onRefresh('Service details updated.')
    } catch (caught) {
      window.alert(caught instanceof Error ? caught.message : 'Unable to update service.')
    }
  }
  return <div><WorkspaceHeader eyebrow="SERVICES" title="Keep the care catalog clear." description="Edit the full catalog when treatment details, duration, pricing, or public availability changes." />{editing && <form className="admin-card service-edit-form" onSubmit={saveEdit}><div className="card-heading"><div><p className="eyebrow">EDIT SERVICE</p><h2>{editing.name}</h2></div><button type="button" className="admin-button admin-button-quiet" onClick={() => setEditing(null)}>Cancel</button></div><div className="form-grid two"><label>Service name<input value={editing.name} onChange={(event) => setEditing({ ...editing, name: event.target.value })} required /></label><label>Category<input value={editing.category} onChange={(event) => setEditing({ ...editing, category: event.target.value })} required /></label><label>Short description<input value={editing.shortDescription} onChange={(event) => setEditing({ ...editing, shortDescription: event.target.value })} required /></label><label>Duration (minutes)<input type="number" min="15" value={editing.defaultDurationMinutes} onChange={(event) => setEditing({ ...editing, defaultDurationMinutes: Number(event.target.value) })} required /></label><label>Price (PHP)<input type="number" min="0" value={editing.price ?? ''} onChange={(event) => setEditing({ ...editing, price: event.target.value === '' ? null : Number(event.target.value) })} /></label><label className="field-full">Long description<textarea rows={4} value={editing.longDescription || ''} onChange={(event) => setEditing({ ...editing, longDescription: event.target.value })} required /></label></div><label className="service-check"><input type="checkbox" checked={editing.isActive} onChange={(event) => setEditing({ ...editing, isActive: event.target.checked })} /><span>Publish this service on the public website</span></label><button className="admin-button admin-button-primary" type="submit">Save service</button></form>}<section className="admin-card table-card"><div className="table-meta"><span><strong>{services.length}</strong> services</span><span>All catalog fields are editable by authorized admin users</span></div><div className="table-scroll"><table><thead><tr><th>Service</th><th>Category</th><th>Duration</th><th>Price</th><th>Public</th><th /></tr></thead><tbody>{services.map((service) => <tr key={service.id}><td><strong>{service.name}</strong><small>{service.shortDescription}</small></td><td>{service.category}</td><td>{service.defaultDurationMinutes} min</td><td>{service.price === null ? 'Not published' : formatMoney(service.price)}</td><td><button type="button" className={'toggle-button' + (service.isActive ? ' on' : '')} aria-pressed={service.isActive} onClick={() => toggle(service)}><span />{service.isActive ? 'Active' : 'Off'}</button></td><td><button type="button" className="admin-button admin-button-outline admin-button-small" onClick={() => setEditing(service)}>Edit</button></td></tr>)}</tbody></table></div></section><div className="admin-note"><ShieldCheck size={18} /><span>Only authorized staff should publish service claims or pricing. Descriptions should stay dentist-assessment-safe.</span></div></div>
}

function BranchesView({ data, onRefresh }: { data: Record<string, any>; onRefresh: (message?: string) => void }) {
  const branches = (data.branches || []) as typeof BRANCHES
  return <div><WorkspaceHeader eyebrow="BRANCHES" title="Two locations, one source of truth." description="Review verified branch details and keep map/review links configurable without changing the public UI." /><div className="branch-admin-grid">{branches.map((branch) => <BranchAdminCard key={branch.id} branch={branch} onRefresh={onRefresh} />)}</div></div>
}

function BranchAdminCard({ branch, onRefresh }: { branch: typeof BRANCHES[number]; onRefresh: (message?: string) => void }) {
  const [editing, setEditing] = useState(false)
  const [mapsUrl, setMapsUrl] = useState(branch.mapsUrl || '')
  const [reviewUrl, setReviewUrl] = useState(branch.googleReviewUrl || '')
  async function save() {
    try {
      await requestJson('/api/branches/' + branch.id, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ mapsUrl, googleReviewUrl: reviewUrl }) })
      setEditing(false)
      onRefresh('Branch links updated.')
    } catch (caught) {
      window.alert(caught instanceof Error ? caught.message : 'Unable to update branch.')
    }
  }
  return <section className="admin-card branch-admin-card"><div className="branch-admin-heading"><div><p className="eyebrow">{branch.shortName}</p><h2>{branch.name}</h2></div>{branch.isGoogleBusinessVerified ? <span className="verified-chip"><Check size={12} /> Verified</span> : <span className="pending-chip">Google profile pending</span>}</div><div className="branch-admin-facts"><span><strong>Address</strong>{branch.address}</span><span><strong>Plus Code</strong>{branch.plusCode}</span><span><strong>Smart</strong>{branch.smartPhone}</span><span><strong>Globe</strong>{branch.globePhone}</span></div>{branch.isGoogleBusinessVerified ? <p className="admin-success"><Check size={15} /> Valley 1 review destination is configured.</p> : <p className="admin-warning"><ShieldCheck size={15} /> Do not publish a Google review action until this branch is verified.</p>}{editing ? <div className="branch-edit-form"><label>Maps URL<input value={mapsUrl} onChange={(event) => setMapsUrl(event.target.value)} placeholder="https://maps.google.com/..." /></label><label>Google review URL<input value={reviewUrl} onChange={(event) => setReviewUrl(event.target.value)} placeholder="Leave blank until verified" /></label><div className="detail-actions"><button className="admin-button admin-button-primary" type="button" onClick={save}>Save links</button><button className="admin-button admin-button-quiet" type="button" onClick={() => setEditing(false)}>Cancel</button></div></div> : <button type="button" className="admin-button admin-button-outline" onClick={() => setEditing(true)}>Edit map/review links</button>}</section>
}

function BillingView({ data }: { data: Record<string, any> }) {
  const payments = (data.payments || []) as { id: string; amount: number; paymentMethod: string; status: string; paidAt?: string; patient?: { fullName: string }; branch?: { name: string } }[]
  return <div><WorkspaceHeader eyebrow="BILLING" title="Recorded payments." description="Basic operational payment records only — not audited accounting and no card details are stored." action={<Link href="/appointments" className="admin-button admin-button-primary">Record from appointment <ArrowRight size={16} /></Link>} /><div className="metric-grid billing-metric"><MetricCard label="Recorded total" value={formatMoney(payments.filter((payment) => payment.status === 'PAID').reduce((sum, payment) => sum + payment.amount, 0))} detail="Paid status only" tone="green" /><MetricCard label="Transactions" value={payments.length} detail="All recorded states" /></div><section className="admin-card table-card"><div className="table-scroll"><table><thead><tr><th>Patient</th><th>Branch</th><th>Amount</th><th>Method</th><th>Status</th><th>Date</th></tr></thead><tbody>{payments.map((payment) => <tr key={payment.id}><td>{payment.patient?.fullName || '—'}</td><td>{payment.branch?.name || '—'}</td><td><strong>{formatMoney(payment.amount)}</strong></td><td>{payment.paymentMethod}</td><td><StatusBadge status={payment.status} /></td><td>{formatDate(payment.paidAt)}</td></tr>)}</tbody></table>{!payments.length && <EmptyAdminState title="No payments recorded" text="Record a payment from an appointment detail page after a visit." />}</div></section></div>
}

function InventoryView({ data, onRefresh }: { data: Record<string, any>; onRefresh: (message?: string) => void }) {
  const inventory = (data.inventory || []) as { id: string; name: string; unit: string; reorderLevel: number; sku?: string; stock: { branchId: string; quantity: number; branch?: { name: string } }[] }[]
  const [showForm, setShowForm] = useState(false)
  const [name, setName] = useState('')
  const [unit, setUnit] = useState('unit')
  const [reorderLevel, setReorderLevel] = useState('0')
  const [movementDialog, setMovementDialog] = useState<MovementDialogState | null>(null)
  const [movementError, setMovementError] = useState('')
  async function addItem(event: React.FormEvent) {
    event.preventDefault()
    try {
      await requestJson('/api/inventory', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name, unit, reorderLevel: Number(reorderLevel) }) })
      setName('')
      setShowForm(false)
      onRefresh('Inventory item created.')
    } catch (caught) {
      window.alert(caught instanceof Error ? caught.message : 'Unable to create inventory item.')
    }
  }
  function openMovement(itemId: string, branchId: string, type: 'IN' | 'OUT') {
    setMovementError('')
    setMovementDialog({ itemId, branchId, type, quantity: '', reason: type === 'IN' ? 'Stock received' : 'Stock used' })
  }
  async function submitMovement(event: React.FormEvent) {
    event.preventDefault()
    if (!movementDialog) return
    const quantity = Number(movementDialog.quantity)
    if (!Number.isFinite(quantity) || quantity <= 0) {
      setMovementError('Enter a positive quantity.')
      return
    }
    if (!movementDialog.reason.trim()) {
      setMovementError('Enter a reason for this stock movement.')
      return
    }
    setMovementError('')
    try {
      await requestJson('/api/inventory', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ itemId: movementDialog.itemId, branchId: movementDialog.branchId, type: movementDialog.type, quantity, reason: movementDialog.reason.trim() }) })
      setMovementDialog(null)
      onRefresh('Stock movement recorded.')
    } catch (caught) {
      setMovementError(caught instanceof Error ? caught.message : 'Unable to record movement.')
    }
  }
  return <><div><WorkspaceHeader eyebrow="INVENTORY" title="Know what is on hand." description="Stock changes are recorded by branch, item, reason, actor, and time." action={<button className="admin-button admin-button-primary" type="button" onClick={() => setShowForm((value) => !value)}><Package size={16} /> Add item</button>} />{showForm && <form className="admin-card inline-form" onSubmit={addItem}><label>Item name<input value={name} onChange={(event) => setName(event.target.value)} required /></label><label>Unit<input value={unit} onChange={(event) => setUnit(event.target.value)} required /></label><label>Reorder level<input type="number" min="0" value={reorderLevel} onChange={(event) => setReorderLevel(event.target.value)} /></label><button className="admin-button admin-button-primary" type="submit">Create item</button></form>}<section className="admin-card table-card"><div className="table-scroll"><table><thead><tr><th>Item</th><th>Valley 1</th><th>BF / Irineville</th><th>Reorder</th><th>Actions</th></tr></thead><tbody>{inventory.map((item) => <tr key={item.id}><td><strong>{item.name}</strong><small>{item.sku || 'No SKU'} · per {item.unit}</small></td>{BRANCHES.map((branch) => { const stock = item.stock.find((value) => value.branchId === branch.id)?.quantity || 0; return <td key={branch.id}><strong className={stock <= item.reorderLevel ? 'stock-low' : ''}>{stock}</strong><small>{item.unit}</small></td> })}<td>{item.reorderLevel}</td><td><div className="row-actions"><button type="button" className="icon-link" onClick={() => openMovement(item.id, BRANCHES[0].id, 'IN')} aria-label={'Stock in ' + item.name}>+</button><button type="button" className="icon-link" onClick={() => openMovement(item.id, BRANCHES[0].id, 'OUT')} aria-label={'Stock out ' + item.name}>−</button></div></td></tr>)}</tbody></table>{!inventory.length && <EmptyAdminState title="Inventory is empty" text="Add an item to start tracking branch stock." />}</div></section></div>{movementDialog && <AdminDialog title={movementDialog.type === 'IN' ? 'Receive stock' : 'Record stock use'} description="Record the quantity and reason for this branch movement." onClose={() => setMovementDialog(null)}><form className="modal-form" onSubmit={submitMovement}><label>Quantity<input type="number" min="0.01" step="0.01" value={movementDialog.quantity} onChange={(event) => setMovementDialog({ ...movementDialog, quantity: event.target.value })} autoFocus required /></label><label>Reason<input value={movementDialog.reason} onChange={(event) => setMovementDialog({ ...movementDialog, reason: event.target.value })} required /></label>{movementError && <div className="admin-error" role="alert">{movementError}</div>}<div className="modal-actions"><button type="button" className="admin-button admin-button-quiet" onClick={() => setMovementDialog(null)}>Cancel</button><button type="submit" className="admin-button admin-button-primary">Save movement</button></div></form></AdminDialog>}</>
}

function ReportsView({ data }: { data: Record<string, any> }) {
  const [range, setRange] = useState('30')
  const [branchId, setBranchId] = useState('ALL')
  const [status, setStatus] = useState('ALL')
  const [customStart, setCustomStart] = useState('')
  const [customEnd, setCustomEnd] = useState('')
  const appointments = (data.appointments || []) as AppointmentRecord[]
  const payments = (data.paymentRecords || []) as { id: string; patientId: string; amount: number; paymentMethod: string; status: string; createdAt: string; paidAt?: string; patient?: { fullName: string }; branch?: { id: string; name: string } }[]
  const branches = (data.branches || BRANCHES) as typeof BRANCHES
  const filtered = useMemo(() => {
    const today = new Date()
    let start: Date | null = null
    if (range === '1') start = new Date(today.getFullYear(), today.getMonth(), today.getDate())
    if (range === '7') start = new Date(today.getFullYear(), today.getMonth(), today.getDate() - 6)
    if (range === '30') start = new Date(today.getFullYear(), today.getMonth(), today.getDate() - 29)
    if (range === '3m') start = new Date(today.getFullYear(), today.getMonth() - 3, today.getDate())
    if (range === '6m') start = new Date(today.getFullYear(), today.getMonth() - 6, today.getDate())
    if (range === 'custom' && customStart) start = new Date(customStart + 'T00:00:00')
    const end = range === 'custom' && customEnd ? new Date(customEnd + 'T23:59:59') : null
    const within = (value: string) => { const date = new Date(value); return (!start || date >= start) && (!end || date <= end) }
    const matchesBranch = (id?: string) => branchId === 'ALL' || id === branchId
    const appointmentRows = appointments.filter((item) => within(item.requestedStartAt) && matchesBranch(item.branch?.id || item.branchId) && (status === 'ALL' || item.status === status))
    const paymentRows = payments.filter((item) => within(item.createdAt) && matchesBranch(item.branch?.id))
    return { appointmentRows, paymentRows }
  }, [appointments, payments, branchId, range, status, customStart, customEnd])
  function exportExcel() {
    if (range === 'custom' && (!customStart || !customEnd)) { window.alert('Choose both a start and end date before exporting.'); return }
    const params = new URLSearchParams({ range, branchId, status })
    if (range === 'custom') { params.set('start', customStart); params.set('end', customEnd) }
    const anchor = document.createElement('a')
    anchor.href = '/api/reports/export?' + params.toString()
    anchor.download = 'mab-dental-report-' + new Date().toISOString().slice(0, 10) + '.xls'
    document.body.appendChild(anchor)
    anchor.click()
    anchor.remove()
  }
  const summary = { pending: filtered.appointmentRows.filter((item) => item.status === 'PENDING_REVIEW').length, confirmed: filtered.appointmentRows.filter((item) => item.status === 'CONFIRMED').length, completed: filtered.appointmentRows.filter((item) => item.status === 'COMPLETED').length, noShow: filtered.appointmentRows.filter((item) => item.status === 'NO_SHOW').length, payments: filtered.paymentRows.filter((item) => item.status === 'PAID').reduce((sum, item) => sum + item.amount, 0) }
  return <div><WorkspaceHeader eyebrow="REPORTS" title="Operational reporting." description="Filter appointment and payment records by period, branch, and status, then export the visible result to Excel." action={<button className="admin-button admin-button-primary" type="button" onClick={exportExcel}>Export Excel</button>} /><div className="report-filters"><label>Period<select value={range} onChange={(event) => setRange(event.target.value)}><option value="1">Last 1 day</option><option value="7">Last 7 days</option><option value="30">Last 30 days</option><option value="3m">Last 3 months</option><option value="6m">Last 6 months</option><option value="ALL">All time</option><option value="custom">Custom range</option></select></label><label>Branch<select value={branchId} onChange={(event) => setBranchId(event.target.value)}><option value="ALL">All branches</option>{branches.map((branch) => <option value={branch.id} key={branch.id}>{branch.name}</option>)}</select></label><label>Status<select value={status} onChange={(event) => setStatus(event.target.value)}><option value="ALL">All statuses</option>{['PENDING_REVIEW', 'CONFIRMED', 'COMPLETED', 'CANCELLED', 'DECLINED', 'NO_SHOW'].map((item) => <option value={item} key={item}>{statusLabel(item)}</option>)}</select></label>{range === 'custom' && <><label>From<input type="date" value={customStart} onChange={(event) => setCustomStart(event.target.value)} /></label><label>To<input type="date" value={customEnd} onChange={(event) => setCustomEnd(event.target.value)} /></label></>}</div><div className="metric-grid"><MetricCard label="Requests" value={summary.pending} detail={filtered.appointmentRows.length + ' filtered appointments'} tone="gold" /><MetricCard label="Confirmed" value={summary.confirmed} detail="Filtered schedule" /><MetricCard label="Completed" value={summary.completed} detail="Filtered visits" tone="green" /><MetricCard label="No shows" value={summary.noShow} detail="Filtered records" tone="soft" /><MetricCard label="Recorded payments" value={formatMoney(summary.payments)} detail={filtered.paymentRows.length + ' filtered payments'} tone="soft" /></div><section className="admin-card"><div className="card-heading"><div><p className="eyebrow">BRANCH COMPARISON</p><h2>Activity by branch</h2></div><FileText size={19} /></div><div className="report-branch-grid">{branches.map((branch) => { const rows = filtered.appointmentRows.filter((item) => item.branch?.id === branch.id); const branchPayments = filtered.paymentRows.filter((item) => item.branch?.id === branch.id && item.status === 'PAID').reduce((sum, item) => sum + item.amount, 0); return <div className="report-branch-card" key={branch.id}><h3>{branch.name}</h3><div><span>Appointments<strong>{rows.length}</strong></span><span>Completed<strong>{rows.filter((item) => item.status === 'COMPLETED').length}</strong></span><span>Payments<strong>{formatMoney(branchPayments)}</strong></span></div></div>})}</div></section></div>
}



function StaffView({ data }: { data: Record<string, any> }) {
  const staff = data.staff || []
  return <div><WorkspaceHeader eyebrow="STAFF & ROLES" title="Access with intention." description="Role descriptions are part of the operating model. Staff invitations and activation belong behind authorized Supabase Auth administration." /><section className="admin-card"><div className="card-heading"><div><p className="eyebrow">CURRENT STAFF</p><h2>{staff.length ? staff.length + ' staff profiles' : 'No staff profiles in local mode'}</h2></div><ShieldCheck size={19} /></div>{staff.length ? <div className="staff-list">{staff.map((member: { id: string; fullName: string; email: string; role: Role; isActive: boolean }) => <div className="staff-row" key={member.id}><div><strong>{member.fullName}</strong><span>{member.email}</span></div><StatusBadge status={member.role} /><span className={member.isActive ? 'active-label' : 'muted-copy'}>{member.isActive ? 'Active' : 'Inactive'}</span></div>)}</div> : <EmptyAdminState title="Local staff directory is empty" text="Configure Supabase Auth and create authorized staff profiles before production use." />}</section><section className="role-grid">{roleDescriptions.map((item) => <div className="role-card" key={item.role}><span>{statusLabel(item.role)}</span><p>{item.description}</p></div>)}</section></div>
}

function SettingsView() {
  return <div><WorkspaceHeader eyebrow="SETTINGS" title="Keep the operating rules visible." description="Business facts stay centralized and sensitive service credentials never belong in database settings." /><section className="admin-card settings-card"><div className="settings-row"><div><p className="eyebrow">OFFICIAL DISPLAY NAME</p><h2>{BUSINESS.name}</h2><span>Locked to the verified clinic name.</span></div><span className="locked-tag"><ShieldCheck size={14} /> Locked</span></div><div className="settings-grid"><div><span>Timezone</span><strong>{BUSINESS.timezone}</strong></div><div><span>Consultation</span><strong>{BUSINESS.consultation}</strong></div><div><span>Monday–Saturday</span><strong>{BUSINESS.hours.weekday}</strong></div><div><span>Sunday</span><strong>{BUSINESS.hours.sunday}</strong></div><div><span>Data mode</span><strong>Supabase in production / local fallback in development</strong></div><div><span>Admin sign-up</span><strong>Disabled</strong></div></div></section><section className="admin-card"><div className="card-heading"><div><p className="eyebrow">PRODUCTION SAFEGUARDS</p><h2>Keep the operating boundary clear.</h2></div><ShieldCheck size={19} /></div><ul className="checklist"><li><Check size={16} /> Supabase schema, RLS policies, and Realtime publication are applied.</li><li><Check size={16} /> Server keys remain outside the browser bundle.</li><li><Check size={16} /> Bootstrap access is configured for the initial handoff.</li><li><Check size={16} /> Rotate the temporary bootstrap password after handoff.</li><li><Check size={16} /> Create additional staff profiles through the authorized staff process.</li></ul></section></div>
}

function StatusBadge({ status }: { status: string }) {
  const tone = status === 'PENDING_REVIEW' || status === 'RESCHEDULE_PROPOSED' ? 'gold' : ['CONFIRMED', 'CHECKED_IN', 'COMPLETED', 'PAID', 'ACTIVE'].includes(status) ? 'green' : ['CANCELLED', 'DECLINED', 'NO_SHOW', 'VOID', 'INACTIVE'].includes(status) ? 'red' : 'navy'
  return <span className={'status-badge status-' + tone}>{statusLabel(status)}</span>
}

function EmptyAdminState({ title, text }: { title: string; text: string }) {
  return <div className="empty-admin"><ClipboardList size={22} /><h3>{title}</h3><p>{text}</p></div>
}
