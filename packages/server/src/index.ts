import { createHmac, randomBytes, randomUUID } from 'node:crypto'
import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import {
  Appointment,
  AppointmentStatus,
  BRANCHES,
  BUSINESS,
  Branch,
  InventoryItem,
  InventoryMovement,
  InventoryStock,
  Patient,
  Payment,
  PaymentMethod,
  PaymentStatus,
  Role,
  SERVICES,
  Service,
  StaffProfile,
  AuditLog,
  normalizePhone,
} from '@mab/shared'

export type LocalDb = {
  branches: Branch[]
  services: Service[]
  appointments: Appointment[]
  patients: Patient[]
  payments: Payment[]
  inventoryItems: InventoryItem[]
  inventoryStock: InventoryStock[]
  inventoryMovements: InventoryMovement[]
  staff: StaffProfile[]
  auditLogs: AuditLog[]
}

export type AppointmentInput = {
  fullName: string
  phone: string
  email?: string
  branchSlug: string
  serviceSlug?: string
  concernText?: string
  requestedStartAt: string
  patientMessage?: string
}

type Session = {
  email: string
  role: Role
  issuedAt: number
}

function dataFile() {
  const configured = process.env.MAB_DATA_FILE
  if (configured) {
    const isAbsolute = /^[A-Za-z]:[\\/]/.test(configured) || configured.startsWith('/')
    return isAbsolute ? configured : join(process.cwd(), configured)
  }
  return join(process.cwd(), 'data', 'local-db.json')
}

function emptyDb(): LocalDb {
  return {
    branches: BRANCHES.map((branch) => ({ ...branch })),
    services: SERVICES.map((service) => ({ ...service })),
    appointments: [],
    patients: [],
    payments: [],
    inventoryItems: [],
    inventoryStock: [],
    inventoryMovements: [],
    staff: [],
    auditLogs: [],
  }
}

export function resetLocalDb() {
  writeDb(emptyDb())
}

function ensureDataFile() {
  const file = dataFile()
  if (!existsSync(file)) {
    mkdirSync(dirname(file), { recursive: true })
    writeFileSync(file, JSON.stringify(emptyDb(), null, 2), 'utf8')
  }
  return file
}

export function readDb() {
  return JSON.parse(readFileSync(ensureDataFile(), 'utf8')) as LocalDb
}

export function writeDb(db: LocalDb) {
  const file = ensureDataFile()
  const temporary = file + '.' + String(process.pid) + '.tmp'
  writeFileSync(temporary, JSON.stringify(db, null, 2), 'utf8')
  renameSync(temporary, file)
}

export function updateDb<T>(mutator: (db: LocalDb) => T) {
  const db = readDb()
  const result = mutator(db)
  writeDb(db)
  return result
}

export function isSupabaseConfigured() {
  return Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY)
}

export function getSupabaseServiceClient(): SupabaseClient | null {
  if (!isSupabaseConfigured()) return null
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
}

function now() {
  return new Date().toISOString()
}

function publicCode() {
  return 'MAB-' + randomBytes(4).toString('hex').toUpperCase()
}

function branchOrThrow(slug: string, db: LocalDb) {
  const branch = db.branches.find((item) => item.slug === slug)
  if (!branch) throw new Error('Branch not found')
  return branch
}

function serviceForSlug(slug: string | undefined, db: LocalDb) {
  if (!slug || slug === 'consultation') return undefined
  return db.services.find((item) => item.slug === slug && item.isActive)
}

function localTimeParts(iso: string) {
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: BUSINESS.timezone,
    weekday: 'short',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  })
  return Object.fromEntries(formatter.formatToParts(new Date(iso)).map((part) => [part.type, part.value]))
}

export function validateAppointmentTime(startAt: string, durationMinutes: number) {
  const date = new Date(startAt)
  if (Number.isNaN(date.getTime())) throw new Error('Choose a valid date and time.')
  if (date.getTime() < Date.now()) throw new Error('Choose a future date and time.')
  const parts = localTimeParts(startAt)
  if (parts.weekday === 'Sun') throw new Error('Sunday appointments are strictly by appointment. Please message the clinic.')
  const minutes = Number(parts.hour) * 60 + Number(parts.minute)
  if (minutes < 8 * 60 || minutes + durationMinutes > 20 * 60) {
    throw new Error('Choose a time between 8:00 AM and 8:00 PM.')
  }
}

function hasConfirmedConflict(db: LocalDb, appointmentId: string | undefined, branchId: string, startAt: string, durationMinutes: number) {
  const start = new Date(startAt).getTime()
  const end = start + durationMinutes * 60_000
  return db.appointments.some((appointment) => {
    if (appointment.id === appointmentId || appointment.branchId !== branchId) return false
    if (!['CONFIRMED', 'CHECKED_IN', 'IN_TREATMENT'].includes(appointment.status)) return false
    const existingStart = new Date(appointment.confirmedStartAt ?? appointment.requestedStartAt).getTime()
    const existingEnd = existingStart + appointment.durationMinutes * 60_000
    return start < existingEnd && end > existingStart
  })
}

function addAudit(db: LocalDb, action: string, entityType: string, entityId: string | undefined, metadata?: Record<string, unknown>) {
  db.auditLogs.unshift({
    id: randomUUID(),
    action,
    entityType,
    entityId,
    metadata,
    createdAt: now(),
  })
}

export function createLocalAppointment(input: AppointmentInput) {
  return updateDb((db) => {
    const branch = branchOrThrow(input.branchSlug, db)
    const service = serviceForSlug(input.serviceSlug, db)
    const duration = service?.defaultDurationMinutes ?? 30
    validateAppointmentTime(input.requestedStartAt, duration)
    const phoneNormalized = normalizePhone(input.phone)
    let patient = db.patients.find((item) => item.phoneNormalized === phoneNormalized)
    if (!patient) {
      patient = {
        id: randomUUID(),
        fullName: input.fullName.trim(),
        phone: input.phone.trim(),
        phoneNormalized,
        email: input.email?.trim() || undefined,
        preferredBranchId: branch.id,
        createdAt: now(),
        updatedAt: now(),
      }
      db.patients.push(patient)
    } else {
      patient.fullName = input.fullName.trim()
      patient.phone = input.phone.trim()
      patient.email = input.email?.trim() || patient.email
      patient.preferredBranchId = branch.id
      patient.updatedAt = now()
    }
    const appointment: Appointment = {
      id: randomUUID(),
      publicCode: publicCode(),
      patientId: patient.id,
      branchId: branch.id,
      serviceId: service?.id,
      concernText: input.concernText?.trim() || undefined,
      requestedStartAt: input.requestedStartAt,
      durationMinutes: duration,
      status: 'PENDING_REVIEW',
      source: 'PUBLIC',
      patientMessage: input.patientMessage?.trim() || undefined,
      createdAt: now(),
      updatedAt: now(),
      statusHistory: [
        {
          id: randomUUID(),
          toStatus: 'PENDING_REVIEW',
          note: 'Public appointment request received.',
          createdAt: now(),
        },
      ],
    }
    db.appointments.unshift(appointment)
    addAudit(db, 'APPOINTMENT_REQUESTED', 'appointment', appointment.id, { branch: branch.slug })
    return { appointment, patient }
  })
}

export async function createPublicAppointment(input: AppointmentInput) {
  const supabase = getSupabaseServiceClient()
  if (!supabase) return createLocalAppointment(input)
  const branch = BRANCHES.find((item) => item.slug === input.branchSlug)
  if (!branch) throw new Error('Branch not found')
  const service = SERVICES.find((item) => item.slug === input.serviceSlug)
  const duration = service?.defaultDurationMinutes ?? 30
  validateAppointmentTime(input.requestedStartAt, duration)
  const phoneNormalized = normalizePhone(input.phone)
  const patientQuery = await supabase.from('patients').select('*').eq('phone_normalized', phoneNormalized).maybeSingle()
  if (patientQuery.error) throw new Error('Unable to access the appointment database.')
  let patient = patientQuery.data as Patient | null
  if (!patient) {
    const inserted = await supabase.from('patients').insert({
      full_name: input.fullName.trim(),
      phone: input.phone.trim(),
      phone_normalized: phoneNormalized,
      email: input.email?.trim() || null,
      preferred_branch_id: branch.id,
    }).select('*').single()
    if (inserted.error) throw new Error('Unable to save the patient details.')
    patient = inserted.data as Patient
  }
  const appointment = await supabase.from('appointments').insert({
    public_code: publicCode(),
    patient_id: patient.id,
    branch_id: branch.id,
    service_id: service?.id ?? null,
    requested_start_at: input.requestedStartAt,
    duration_minutes: duration,
    status: 'PENDING_REVIEW',
    source: 'PUBLIC',
    patient_message: input.patientMessage?.trim() || null,
    concern_text: input.concernText?.trim() || null,
  }).select('public_code,status').single()
  if (appointment.error) throw new Error('Unable to submit the appointment request.')
  return { appointment: appointment.data, patient }
}

export function enrichAppointment(appointment: Appointment, db: LocalDb) {
  return {
    ...appointment,
    patient: db.patients.find((item) => item.id === appointment.patientId),
    branch: db.branches.find((item) => item.id === appointment.branchId),
    service: db.services.find((item) => item.id === appointment.serviceId),
    payments: db.payments.filter((item) => item.appointmentId === appointment.id),
  }
}

export function listLocalAppointments(filters?: { status?: string; branchId?: string; query?: string }) {
  const db = readDb()
  const query = filters?.query?.toLowerCase().trim()
  return db.appointments
    .filter((appointment) => !filters?.status || filters.status === 'ALL' || appointment.status === filters.status)
    .filter((appointment) => !filters?.branchId || filters.branchId === 'ALL' || appointment.branchId === filters.branchId)
    .map((appointment) => enrichAppointment(appointment, db))
    .filter((appointment) => !query || appointment.publicCode.toLowerCase().includes(query) || appointment.patient?.fullName.toLowerCase().includes(query) || appointment.patient?.phone.includes(query))
}

export function getLocalAppointment(id: string) {
  const db = readDb()
  const appointment = db.appointments.find((item) => item.id === id)
  return appointment ? enrichAppointment(appointment, db) : null
}

export function updateLocalAppointment(id: string, action: string, payload: { startAt?: string; note?: string }) {
  return updateDb((db) => {
    const appointment = db.appointments.find((item) => item.id === id)
    if (!appointment) throw new Error('Appointment not found.')
    const from = appointment.status
    const next: Record<string, AppointmentStatus> = {
      confirm: 'CONFIRMED',
      suggest: 'RESCHEDULE_PROPOSED',
      decline: 'DECLINED',
      cancel: 'CANCELLED',
      'check-in': 'CHECKED_IN',
      'start-treatment': 'IN_TREATMENT',
      complete: 'COMPLETED',
      'no-show': 'NO_SHOW',
      reschedule: 'CONFIRMED',
    }
    const to = next[action]
    if (!to) throw new Error('Unknown appointment action.')
    const allowed: Record<AppointmentStatus, AppointmentStatus[]> = {
      PENDING_REVIEW: ['CONFIRMED', 'RESCHEDULE_PROPOSED', 'DECLINED', 'CANCELLED'],
      CONFIRMED: ['CHECKED_IN', 'RESCHEDULE_PROPOSED', 'CANCELLED', 'NO_SHOW'],
      RESCHEDULE_PROPOSED: ['CONFIRMED', 'DECLINED', 'CANCELLED'],
      CHECKED_IN: ['IN_TREATMENT', 'CANCELLED'],
      IN_TREATMENT: ['COMPLETED'],
      COMPLETED: [],
      CANCELLED: [],
      DECLINED: [],
      NO_SHOW: [],
    }
    if (!allowed[from].includes(to)) throw new Error('Cannot move ' + from + ' to ' + to + '.')
    const startAt = payload.startAt || appointment.confirmedStartAt || appointment.requestedStartAt
    if (to === 'CONFIRMED' || to === 'RESCHEDULE_PROPOSED') {
      validateAppointmentTime(startAt, appointment.durationMinutes)
      if (to === 'CONFIRMED' && hasConfirmedConflict(db, appointment.id, appointment.branchId, startAt, appointment.durationMinutes)) {
        throw new Error('That time overlaps another confirmed appointment at this branch.')
      }
      appointment.confirmedStartAt = startAt
    }
    appointment.status = to
    appointment.updatedAt = now()
    if (to === 'CANCELLED') appointment.cancelledAt = now()
    if (to === 'COMPLETED') {
      appointment.completedAt = now()
      const patient = db.patients.find((item) => item.id === appointment.patientId)
      if (patient) patient.lastVisitAt = now()
    }
    appointment.statusHistory.unshift({
      id: randomUUID(),
      fromStatus: from,
      toStatus: to,
      note: payload.note,
      createdAt: now(),
    })
    addAudit(db, 'APPOINTMENT_' + action.toUpperCase(), 'appointment', id, { from, to, note: payload.note })
    return enrichAppointment(appointment, db)
  })
}

export function listLocalPatients(query?: string) {
  const db = readDb()
  const normalized = query?.toLowerCase().trim()
  return db.patients
    .filter((patient) => !normalized || patient.fullName.toLowerCase().includes(normalized) || patient.phone.includes(normalized) || patient.email?.toLowerCase().includes(normalized))
    .map((patient) => ({
      ...patient,
      appointments: db.appointments.filter((appointment) => appointment.patientId === patient.id),
    }))
}

export function getLocalPatient(id: string) {
  const db = readDb()
  const patient = db.patients.find((item) => item.id === id)
  if (!patient) return null
  return {
    ...patient,
    appointments: db.appointments.filter((appointment) => appointment.patientId === id).map((appointment) => enrichAppointment(appointment, db)),
    payments: db.payments.filter((payment) => payment.patientId === id),
  }
}

export function listLocalPayments() {
  const db = readDb()
  return db.payments.map((payment) => ({
    ...payment,
    patient: db.patients.find((patient) => patient.id === payment.patientId),
    branch: db.branches.find((branch) => branch.id === payment.branchId),
  }))
}

export function createLocalPayment(input: { appointmentId?: string; patientId: string; branchId: string; amount: number; paymentMethod: PaymentMethod; status: PaymentStatus; referenceNumber?: string }) {
  return updateDb((db) => {
    const payment: Payment = { id: randomUUID(), ...input, paidAt: input.status === 'PAID' ? now() : undefined, createdAt: now() }
    db.payments.unshift(payment)
    addAudit(db, 'PAYMENT_RECORDED', 'payment', payment.id, { amount: input.amount, method: input.paymentMethod })
    return payment
  })
}

export function listLocalInventory() {
  const db = readDb()
  return db.inventoryItems.map((item) => ({
    ...item,
    stock: db.inventoryStock.filter((stock) => stock.inventoryItemId === item.id).map((stock) => ({ ...stock, branch: db.branches.find((branch) => branch.id === stock.branchId) })),
  }))
}

export function createLocalInventoryItem(input: { name: string; unit: string; reorderLevel: number; sku?: string }) {
  return updateDb((db) => {
    const item: InventoryItem = { id: randomUUID(), ...input, isActive: true, createdAt: now(), updatedAt: now() }
    db.inventoryItems.unshift(item)
    addAudit(db, 'INVENTORY_ITEM_CREATED', 'inventory_item', item.id)
    return item
  })
}

export function moveLocalInventory(input: { itemId: string; branchId: string; type: 'IN' | 'OUT' | 'ADJUSTMENT'; quantity: number; reason: string }) {
  return updateDb((db) => {
    const existing = db.inventoryStock.find((stock) => stock.inventoryItemId === input.itemId && stock.branchId === input.branchId)
    const current = existing?.quantity ?? 0
    const next = input.type === 'IN' ? current + input.quantity : input.type === 'OUT' ? current - input.quantity : input.quantity
    if (next < 0) throw new Error('Stock cannot go below zero.')
    if (existing) {
      existing.quantity = next
      existing.updatedAt = now()
    } else {
      db.inventoryStock.push({ branchId: input.branchId, inventoryItemId: input.itemId, quantity: next, updatedAt: now() })
    }
    const movement: InventoryMovement = { id: randomUUID(), inventoryItemId: input.itemId, branchId: input.branchId, type: input.type, quantity: input.quantity, reason: input.reason, createdAt: now() }
    db.inventoryMovements.unshift(movement)
    addAudit(db, 'INVENTORY_MOVEMENT_RECORDED', 'inventory_item', input.itemId, { type: input.type, quantity: input.quantity })
    return movement
  })
}

export function listLocalServices() {
  return readDb().services
}

export function updateLocalService(id: string, patch: Partial<Service>) {
  return updateDb((db) => {
    const service = db.services.find((item) => item.id === id)
    if (!service) throw new Error('Service not found.')
    Object.assign(service, patch)
    addAudit(db, 'SERVICE_UPDATED', 'service', id, { fields: Object.keys(patch) })
    return service
  })
}

export function updateLocalBranch(id: string, patch: Partial<Branch>) {
  return updateDb((db) => {
    const branch = db.branches.find((item) => item.id === id)
    if (!branch) throw new Error('Branch not found.')
    Object.assign(branch, patch)
    addAudit(db, 'BRANCH_UPDATED', 'branch', id, { fields: Object.keys(patch) })
    return branch
  })
}

export function dashboardSnapshot() {
  const db = readDb()
  const today = new Intl.DateTimeFormat('en-CA', { timeZone: BUSINESS.timezone }).format(new Date())
  const dayAppointments = db.appointments.filter((appointment) => {
    const target = appointment.confirmedStartAt ?? appointment.requestedStartAt
    return new Intl.DateTimeFormat('en-CA', { timeZone: BUSINESS.timezone }).format(new Date(target)) === today
  })
  const paymentsToday = db.payments.filter((payment) => payment.paidAt && new Intl.DateTimeFormat('en-CA', { timeZone: BUSINESS.timezone }).format(new Date(payment.paidAt)) === today && payment.status === 'PAID')
  return {
    today: dayAppointments,
    counts: {
      today: dayAppointments.length,
      pending: db.appointments.filter((item) => item.status === 'PENDING_REVIEW').length,
      confirmed: dayAppointments.filter((item) => item.status === 'CONFIRMED').length,
      checkedIn: dayAppointments.filter((item) => item.status === 'CHECKED_IN').length,
      completed: dayAppointments.filter((item) => item.status === 'COMPLETED').length,
      noShow: dayAppointments.filter((item) => item.status === 'NO_SHOW').length,
      payments: paymentsToday.reduce((sum, payment) => sum + payment.amount, 0),
      lowStock: db.inventoryStock.filter((stock) => {
        const item = db.inventoryItems.find((candidate) => candidate.id === stock.inventoryItemId)
        return item && stock.quantity <= item.reorderLevel
      }).length,
    },
  }
}

export function createSessionToken(email: string, role: Role = 'SUPER_ADMIN') {
  const payload = Buffer.from(JSON.stringify({ email, role, issuedAt: Date.now() }), 'utf8').toString('base64url')
  const secret = process.env.MAB_SESSION_SECRET || 'mab-local-development-session-secret'
  const signature = createHmac('sha256', secret).update(payload).digest('base64url')
  return payload + '.' + signature
}

export function readSessionToken(token?: string): Session | null {
  if (!token) return null
  const parts = token.split('.')
  const payload = parts[0]
  const signature = parts[1]
  if (!payload || !signature) return null
  const secret = process.env.MAB_SESSION_SECRET || 'mab-local-development-session-secret'
  const expected = createHmac('sha256', secret).update(payload).digest('base64url')
  if (signature !== expected) return null
  try {
    const data = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8')) as Session
    if (!data.email || !data.role || Date.now() - data.issuedAt > 1000 * 60 * 60 * 12) return null
    return data
  } catch {
    return null
  }
}

export function localLoginAllowed(email: string, password: string) {
  const configuredEmail = process.env.MAB_BOOTSTRAP_ADMIN_EMAIL
  const configuredPassword = process.env.MAB_BOOTSTRAP_ADMIN_PASSWORD
  if (configuredEmail || configuredPassword) return email === configuredEmail && password === configuredPassword
  return process.env.NODE_ENV !== 'production' && Boolean(email.trim() && password.trim())
}
