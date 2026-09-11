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
import { sendAppointmentRequestEmail, sendAppointmentStatusEmail, sendBrevoTestEmail, brevoStatus } from './email'

export { sendBrevoTestEmail, brevoStatus } from './email'

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
  let current = process.cwd()
  for (let depth = 0; depth < 5; depth += 1) {
    if (existsSync(join(current, 'package.json')) && existsSync(join(current, 'packages'))) return join(current, 'data', 'local-db.json')
    current = dirname(current)
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
  return Boolean(supabaseUrl() && supabaseSecretKey())
}

export function getSupabaseServiceClient(): SupabaseClient | null {
  if (!isSupabaseConfigured()) return null
  return createClient(supabaseUrl()!, supabaseSecretKey()!, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
}

function supabaseUrl() {
  return process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL
}

function supabaseSecretKey() {
  return process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY
}

function supabasePublishableKey() {
  return process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || process.env.SUPABASE_PUBLISHABLE_KEY
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
  await sendAppointmentRequestEmail({
    recipient: input.email,
    patientName: input.fullName,
    publicCode: stringValue(appointment.data.public_code),
    branchName: branch.name,
    branchSlug: branch.slug,
    serviceName: service?.name || BUSINESS.consultation,
    serviceSlug: service?.slug,
    requestedStartAt: input.requestedStartAt,
  })
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
    const isConfirmedReschedule = action === 'reschedule' && from === 'CONFIRMED' && to === 'CONFIRMED'
    if (!allowed[from].includes(to) && !isConfirmedReschedule) throw new Error('Cannot move ' + from + ' to ' + to + '.')
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

export async function authenticateAdmin(email: string, password: string) {
  const url = supabaseUrl()
  const publishableKey = supabasePublishableKey()
  if (isSupabaseConfigured() && url && publishableKey) {
    const authClient = createClient(url, publishableKey, { auth: { autoRefreshToken: false, persistSession: false } })
    const authResult = await authClient.auth.signInWithPassword({ email, password })
    if (!authResult.error && authResult.data.user) {
      const supabase = getSupabaseServiceClient()
      if (supabase) {
        const profile = await supabase.from('staff_profiles').select('email, role, is_active').eq('id', authResult.data.user.id).maybeSingle()
        if (!profile.error && profile.data?.is_active) return { email: stringValue(profile.data.email, email), role: stringValue(profile.data.role, 'SUPER_ADMIN') as Role }
      }
    }
  }
  return localLoginAllowed(email, password) ? { email, role: 'SUPER_ADMIN' as Role } : null
}

type SupabaseRow = Record<string, unknown>

function asRow(value: unknown): SupabaseRow {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as SupabaseRow : {}
}

function asRows(value: unknown) {
  return Array.isArray(value) ? value.map(asRow) : []
}

function stringValue(value: unknown, fallback = '') {
  return typeof value === 'string' ? value : value === null || value === undefined ? fallback : String(value)
}

function optionalString(value: unknown) {
  const result = stringValue(value)
  return result || undefined
}

function numberValue(value: unknown, fallback = 0) {
  const result = typeof value === 'number' ? value : Number(value)
  return Number.isFinite(result) ? result : fallback
}

function booleanValue(value: unknown, fallback = false) {
  return typeof value === 'boolean' ? value : fallback
}

function arrayValue<T>(value: unknown, fallback: T[] = []) {
  return Array.isArray(value) ? value as T[] : fallback
}

function relatedRow(source: SupabaseRow, key: string) {
  const value = source[key]
  return Array.isArray(value) ? asRow(value[0]) : asRow(value)
}

function mapBranch(value: unknown): Branch {
  const row = asRow(value)
  const fallback = BRANCHES.find((item) => item.id === optionalString(row.id) || item.slug === optionalString(row.slug))
  return {
    ...(fallback ?? {
      id: stringValue(row.id),
      slug: stringValue(row.slug),
      name: stringValue(row.name),
      shortName: stringValue(row.name),
      address: stringValue(row.address),
      plusCode: stringValue(row.plus_code),
      smartPhone: stringValue(row.smart_phone),
      globePhone: stringValue(row.globe_phone),
      isGoogleBusinessVerified: booleanValue(row.is_google_business_verified),
      imageUrl: '/images/clinic-signage.jpg',
    }),
    id: stringValue(row.id, fallback?.id),
    slug: stringValue(row.slug, fallback?.slug),
    name: stringValue(row.name, fallback?.name),
    shortName: fallback?.shortName ?? stringValue(row.name),
    address: stringValue(row.address, fallback?.address),
    plusCode: stringValue(row.plus_code, fallback?.plusCode),
    latitude: row.latitude === null || row.latitude === undefined ? fallback?.latitude : numberValue(row.latitude),
    longitude: row.longitude === null || row.longitude === undefined ? fallback?.longitude : numberValue(row.longitude),
    smartPhone: stringValue(row.smart_phone, fallback?.smartPhone),
    globePhone: stringValue(row.globe_phone, fallback?.globePhone),
    mapsUrl: optionalString(row.maps_url) ?? fallback?.mapsUrl,
    googleBusinessProfileUrl: optionalString(row.google_business_profile_url) ?? fallback?.googleBusinessProfileUrl,
    googleReviewUrl: optionalString(row.google_review_url) ?? fallback?.googleReviewUrl,
    isGoogleBusinessVerified: booleanValue(row.is_google_business_verified, fallback?.isGoogleBusinessVerified ?? false),
    imageUrl: fallback?.imageUrl ?? '/images/clinic-signage.jpg',
  }
}

function mapService(value: unknown): Service {
  const row = asRow(value)
  const fallback = SERVICES.find((item) => item.id === optionalString(row.id) || item.slug === optionalString(row.slug))
  return {
    ...(fallback ?? {
      id: stringValue(row.id),
      slug: stringValue(row.slug),
      name: stringValue(row.name),
      category: stringValue(row.category),
      shortDescription: stringValue(row.short_description),
      longDescription: stringValue(row.long_description),
      defaultDurationMinutes: numberValue(row.default_duration_minutes, 60),
      price: row.price === null || row.price === undefined ? null : numberValue(row.price),
      isActive: booleanValue(row.is_active, true),
      isFeatured: booleanValue(row.is_featured),
      imageUrl: '/images/clinic-detail.jpg',
      concernTags: [],
      processSteps: [],
      faq: [],
    }),
    id: stringValue(row.id, fallback?.id),
    slug: stringValue(row.slug, fallback?.slug),
    name: stringValue(row.name, fallback?.name),
    category: stringValue(row.category, fallback?.category),
    shortDescription: stringValue(row.short_description, fallback?.shortDescription),
    longDescription: stringValue(row.long_description, fallback?.longDescription),
    defaultDurationMinutes: numberValue(row.default_duration_minutes, fallback?.defaultDurationMinutes ?? 60),
    price: row.price === null || row.price === undefined ? fallback?.price ?? null : numberValue(row.price),
    isActive: booleanValue(row.is_active, fallback?.isActive ?? true),
    isFeatured: booleanValue(row.is_featured, fallback?.isFeatured ?? false),
    imageUrl: fallback?.imageUrl ?? '/images/clinic-detail.jpg',
    concernTags: arrayValue<string>(row.concern_tags, fallback?.concernTags ?? []),
    processSteps: arrayValue<string>(row.process_steps, fallback?.processSteps ?? []),
    faq: arrayValue<{ question: string; answer: string }>(row.faq, fallback?.faq ?? []),
  }
}

function mapPatient(value: unknown): Patient {
  const row = asRow(value)
  return {
    id: stringValue(row.id),
    fullName: stringValue(row.full_name),
    phone: stringValue(row.phone),
    phoneNormalized: stringValue(row.phone_normalized),
    email: optionalString(row.email),
    preferredBranchId: optionalString(row.preferred_branch_id),
    createdAt: stringValue(row.created_at),
    updatedAt: stringValue(row.updated_at),
    lastVisitAt: optionalString(row.last_visit_at),
  }
}

function mapPayment(value: unknown): Payment {
  const row = asRow(value)
  return {
    id: stringValue(row.id),
    appointmentId: optionalString(row.appointment_id),
    patientId: stringValue(row.patient_id),
    branchId: stringValue(row.branch_id),
    amount: numberValue(row.amount),
    paymentMethod: stringValue(row.payment_method) as PaymentMethod,
    status: stringValue(row.status) as PaymentStatus,
    referenceNumber: optionalString(row.reference_number),
    paidAt: optionalString(row.paid_at),
    createdBy: optionalString(row.created_by),
    createdAt: stringValue(row.created_at),
  }
}

function mapAppointment(value: unknown) {
  const row = asRow(value)
  const history = asRows(row.appointment_status_history).map((item) => ({
    id: stringValue(item.id),
    fromStatus: optionalString(item.from_status) as AppointmentStatus | undefined,
    toStatus: stringValue(item.to_status) as AppointmentStatus,
    changedBy: optionalString(item.changed_by),
    note: optionalString(item.note),
    createdAt: stringValue(item.created_at),
  }))
  const appointment: Appointment = {
    id: stringValue(row.id),
    publicCode: stringValue(row.public_code),
    patientId: stringValue(row.patient_id),
    branchId: stringValue(row.branch_id),
    serviceId: optionalString(row.service_id),
    concernText: optionalString(row.concern_text),
    requestedStartAt: stringValue(row.requested_start_at),
    confirmedStartAt: optionalString(row.confirmed_start_at),
    durationMinutes: numberValue(row.duration_minutes, 30),
    status: stringValue(row.status) as AppointmentStatus,
    source: stringValue(row.source, 'PUBLIC') as Appointment['source'],
    patientMessage: optionalString(row.patient_message),
    internalNote: optionalString(row.internal_note),
    assignedDentistId: optionalString(row.assigned_dentist_id),
    createdByStaffId: optionalString(row.created_by_staff_id),
    updatedByStaffId: optionalString(row.updated_by_staff_id),
    createdAt: stringValue(row.created_at),
    updatedAt: stringValue(row.updated_at),
    cancelledAt: optionalString(row.cancelled_at),
    completedAt: optionalString(row.completed_at),
    statusHistory: history,
  }
  return {
    ...appointment,
    patient: Object.keys(relatedRow(row, 'patients')).length ? mapPatient(relatedRow(row, 'patients')) : undefined,
    branch: Object.keys(relatedRow(row, 'branches')).length ? mapBranch(relatedRow(row, 'branches')) : undefined,
    service: Object.keys(relatedRow(row, 'services')).length ? mapService(relatedRow(row, 'services')) : undefined,
    payments: asRows(row.payments).map(mapPayment),
  }
}

function databaseUnavailable() {
  return new Error('The clinic database is not configured.')
}

async function supabaseAppointmentRows(filters?: { status?: string; branchId?: string }) {
  const supabase = getSupabaseServiceClient()
  if (!supabase) throw databaseUnavailable()
  let query = supabase
    .from('appointments')
    .select('*, patients(*), branches(*), services(*), appointment_status_history(*), payments(*)')
    .order('created_at', { ascending: false })
  if (filters?.status && filters.status !== 'ALL') query = query.eq('status', filters.status)
  if (filters?.branchId && filters.branchId !== 'ALL') query = query.eq('branch_id', filters.branchId)
  const result = await query
  if (result.error) throw new Error('Unable to access the appointment database.')
  return asRows(result.data)
}

export async function listAppointments(filters?: { status?: string; branchId?: string; query?: string }) {
  if (!isSupabaseConfigured()) return listLocalAppointments(filters)
  const query = filters?.query?.toLowerCase().trim()
  return (await supabaseAppointmentRows(filters))
    .map(mapAppointment)
    .filter((appointment) => !query || appointment.publicCode.toLowerCase().includes(query) || appointment.patient?.fullName.toLowerCase().includes(query) || appointment.patient?.phone.includes(query))
}

export async function getAppointment(id: string) {
  if (!isSupabaseConfigured()) return getLocalAppointment(id)
  const supabase = getSupabaseServiceClient()
  if (!supabase) throw databaseUnavailable()
  const result = await supabase.from('appointments').select('*, patients(*), branches(*), services(*), appointment_status_history(*), payments(*)').eq('id', id).maybeSingle()
  if (result.error) throw new Error('Unable to access the appointment database.')
  return result.data ? mapAppointment(result.data) : null
}

export async function updateAppointment(id: string, action: string, payload: { startAt?: string; note?: string }) {
  if (!isSupabaseConfigured()) return updateLocalAppointment(id, action, payload)
  const supabase = getSupabaseServiceClient()
  if (!supabase) throw databaseUnavailable()
  const currentResult = await supabase.from('appointments').select('*, patients(*), branches(*), services(*), appointment_status_history(*), payments(*)').eq('id', id).maybeSingle()
  if (currentResult.error) throw new Error('Unable to access the appointment database.')
  if (!currentResult.data) throw new Error('Appointment not found.')
  const current = mapAppointment(currentResult.data)
  const from = current.status
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
  const isConfirmedReschedule = action === 'reschedule' && from === 'CONFIRMED' && to === 'CONFIRMED'
  if (!allowed[from].includes(to) && !isConfirmedReschedule) throw new Error('Cannot move ' + from + ' to ' + to + '.')
  const startAt = payload.startAt || current.confirmedStartAt || current.requestedStartAt
  if (to === 'CONFIRMED' || to === 'RESCHEDULE_PROPOSED') {
    validateAppointmentTime(startAt, current.durationMinutes)
    if (to === 'CONFIRMED') {
      const conflicts = await supabase.from('appointments').select('id, branch_id, confirmed_start_at, requested_start_at, duration_minutes, status').eq('branch_id', current.branchId).in('status', ['CONFIRMED', 'CHECKED_IN', 'IN_TREATMENT'])
      if (conflicts.error) throw new Error('Unable to verify appointment availability.')
      const hasConflict = asRows(conflicts.data).some((row) => {
        if (stringValue(row.id) === id) return false
        const existingStart = new Date(optionalString(row.confirmed_start_at) ?? stringValue(row.requested_start_at)).getTime()
        const existingEnd = existingStart + numberValue(row.duration_minutes, 30) * 60_000
        const targetStart = new Date(startAt).getTime()
        return targetStart < existingEnd && targetStart + current.durationMinutes * 60_000 > existingStart
      })
      if (hasConflict) throw new Error('That time overlaps another confirmed appointment at this branch.')
    }
  }
  const updatedAt = now()
  const updatePayload: Record<string, unknown> = { status: to, updated_at: updatedAt }
  if (to === 'CONFIRMED' || to === 'RESCHEDULE_PROPOSED') updatePayload.confirmed_start_at = startAt
  if (to === 'CANCELLED') updatePayload.cancelled_at = updatedAt
  if (to === 'COMPLETED') updatePayload.completed_at = updatedAt
  const updated = await supabase.from('appointments').update(updatePayload).eq('id', id).select('*').single()
  if (updated.error) throw new Error('Unable to update appointment.')
  const history = await supabase.from('appointment_status_history').insert({ appointment_id: id, from_status: from, to_status: to, note: payload.note?.trim() || null })
  if (history.error) throw new Error('Appointment updated, but its status history could not be recorded.')
  const audit = await supabase.from('audit_logs').insert({ action: 'APPOINTMENT_' + action.toUpperCase(), entity_type: 'appointment', entity_id: id, metadata: { from, to, note: payload.note } })
  if (audit.error) throw new Error('Appointment updated, but its audit entry could not be recorded.')
  if (to === 'COMPLETED') await supabase.from('patients').update({ last_visit_at: updatedAt, updated_at: updatedAt }).eq('id', current.patientId)
  const result = await getAppointment(id)
  if (result && ['CONFIRMED', 'RESCHEDULE_PROPOSED', 'CANCELLED', 'DECLINED', 'COMPLETED', 'NO_SHOW'].includes(to)) {
    await sendAppointmentStatusEmail({
      recipient: result.patient?.email,
      patientName: result.patient?.fullName || 'Patient',
      publicCode: result.publicCode,
      branchName: result.branch?.name,
      branchSlug: result.branch?.slug,
      serviceName: result.service?.name || BUSINESS.consultation,
      serviceSlug: result.service?.slug,
      requestedStartAt: result.requestedStartAt,
      confirmedStartAt: result.confirmedStartAt,
      status: to,
    })
  }
  return result
}

export async function listPatients(query?: string) {
  if (!isSupabaseConfigured()) return listLocalPatients(query)
  const supabase = getSupabaseServiceClient()
  if (!supabase) throw databaseUnavailable()
  const result = await supabase.from('patients').select('*').order('created_at', { ascending: false })
  if (result.error) throw new Error('Unable to access the patient database.')
  const normalized = query?.toLowerCase().trim()
  const appointments = await listAppointments()
  const payments = await listPayments()
  return asRows(result.data)
    .map(mapPatient)
    .filter((patient) => !normalized || patient.fullName.toLowerCase().includes(normalized) || patient.phone.includes(normalized) || patient.email?.toLowerCase().includes(normalized))
    .map((patient) => ({ ...patient, appointments: appointments.filter((appointment) => appointment.patientId === patient.id), payments: payments.filter((payment) => payment.patientId === patient.id) }))
}

export async function getPatient(id: string) {
  if (!isSupabaseConfigured()) return getLocalPatient(id)
  const supabase = getSupabaseServiceClient()
  if (!supabase) throw databaseUnavailable()
  const result = await supabase.from('patients').select('*').eq('id', id).maybeSingle()
  if (result.error) throw new Error('Unable to access the patient database.')
  if (!result.data) return null
  const patient = mapPatient(result.data)
  const [appointments, payments] = await Promise.all([listAppointments(), listPayments()])
  return { ...patient, appointments: appointments.filter((appointment) => appointment.patientId === id), payments: payments.filter((payment) => payment.patientId === id) }
}

export async function listPayments() {
  if (!isSupabaseConfigured()) return listLocalPayments()
  const supabase = getSupabaseServiceClient()
  if (!supabase) throw databaseUnavailable()
  const result = await supabase.from('payments').select('*, patients(*), branches(*)').order('created_at', { ascending: false })
  if (result.error) throw new Error('Unable to access the payments database.')
  return asRows(result.data).map((row) => ({
    ...mapPayment(row),
    patient: Object.keys(relatedRow(row, 'patients')).length ? mapPatient(relatedRow(row, 'patients')) : undefined,
    branch: Object.keys(relatedRow(row, 'branches')).length ? mapBranch(relatedRow(row, 'branches')) : undefined,
  }))
}

export async function createPayment(input: { appointmentId?: string; patientId: string; branchId: string; amount: number; paymentMethod: PaymentMethod; status: PaymentStatus; referenceNumber?: string }) {
  if (!isSupabaseConfigured()) return createLocalPayment(input)
  const supabase = getSupabaseServiceClient()
  if (!supabase) throw databaseUnavailable()
  const result = await supabase.from('payments').insert({ appointment_id: input.appointmentId ?? null, patient_id: input.patientId, branch_id: input.branchId, amount: input.amount, payment_method: input.paymentMethod, status: input.status, reference_number: input.referenceNumber ?? null, paid_at: input.status === 'PAID' ? now() : null }).select('*').single()
  if (result.error) throw new Error('Unable to record payment.')
  await supabase.from('audit_logs').insert({ action: 'PAYMENT_RECORDED', entity_type: 'payment', entity_id: result.data.id, metadata: { amount: input.amount, method: input.paymentMethod } })
  return mapPayment(result.data)
}

function mapInventoryItem(value: unknown) {
  const row = asRow(value)
  return {
    id: stringValue(row.id),
    name: stringValue(row.name),
    sku: optionalString(row.sku),
    unit: stringValue(row.unit),
    reorderLevel: numberValue(row.reorder_level),
    isActive: booleanValue(row.is_active, true),
    createdAt: stringValue(row.created_at),
    updatedAt: stringValue(row.updated_at),
  } satisfies InventoryItem
}

function mapInventoryStock(value: unknown) {
  const row = asRow(value)
  return {
    branchId: stringValue(row.branch_id),
    inventoryItemId: stringValue(row.inventory_item_id),
    quantity: numberValue(row.quantity),
    updatedAt: stringValue(row.updated_at),
  } satisfies InventoryStock
}

function mapInventoryMovement(value: unknown) {
  const row = asRow(value)
  return {
    id: stringValue(row.id),
    branchId: stringValue(row.branch_id),
    inventoryItemId: stringValue(row.inventory_item_id),
    type: stringValue(row.type) as InventoryMovement['type'],
    quantity: numberValue(row.quantity),
    reason: stringValue(row.reason),
    appointmentId: optionalString(row.appointment_id),
    createdBy: optionalString(row.created_by),
    createdAt: stringValue(row.created_at),
  } satisfies InventoryMovement
}

export async function listInventory() {
  if (!isSupabaseConfigured()) return listLocalInventory()
  const supabase = getSupabaseServiceClient()
  if (!supabase) throw databaseUnavailable()
  const [items, stock] = await Promise.all([
    supabase.from('inventory_items').select('*').order('name', { ascending: true }),
    supabase.from('inventory_stock').select('*, branches(*)'),
  ])
  if (items.error || stock.error) throw new Error('Unable to access the inventory database.')
  const stockRows = asRows(stock.data)
  return asRows(items.data).map((item) => ({
    ...mapInventoryItem(item),
    stock: stockRows.filter((row) => stringValue(row.inventory_item_id) === stringValue(asRow(item).id)).map((row) => ({ ...mapInventoryStock(row), branch: Object.keys(relatedRow(row, 'branches')).length ? mapBranch(relatedRow(row, 'branches')) : undefined })),
  }))
}

export async function createInventoryItem(input: { name: string; unit: string; reorderLevel: number; sku?: string }) {
  if (!isSupabaseConfigured()) return createLocalInventoryItem(input)
  const supabase = getSupabaseServiceClient()
  if (!supabase) throw databaseUnavailable()
  const result = await supabase.from('inventory_items').insert({ name: input.name, unit: input.unit, reorder_level: input.reorderLevel, sku: input.sku ?? null }).select('*').single()
  if (result.error) throw new Error('Unable to create inventory item.')
  await supabase.from('audit_logs').insert({ action: 'INVENTORY_ITEM_CREATED', entity_type: 'inventory_item', entity_id: result.data.id })
  return mapInventoryItem(result.data)
}

export async function moveInventory(input: { itemId: string; branchId: string; type: 'IN' | 'OUT' | 'ADJUSTMENT'; quantity: number; reason: string }) {
  if (!isSupabaseConfigured()) return moveLocalInventory(input)
  const supabase = getSupabaseServiceClient()
  if (!supabase) throw databaseUnavailable()
  const existing = await supabase.from('inventory_stock').select('*').eq('inventory_item_id', input.itemId).eq('branch_id', input.branchId).maybeSingle()
  if (existing.error) throw new Error('Unable to read inventory stock.')
  const current = existing.data ? numberValue(existing.data.quantity) : 0
  const next = input.type === 'IN' ? current + input.quantity : input.type === 'OUT' ? current - input.quantity : input.quantity
  if (next < 0) throw new Error('Stock cannot go below zero.')
  const stock = await supabase.from('inventory_stock').upsert({ inventory_item_id: input.itemId, branch_id: input.branchId, quantity: next, updated_at: now() }, { onConflict: 'branch_id,inventory_item_id' })
  if (stock.error) throw new Error('Unable to update inventory stock.')
  const movement = await supabase.from('inventory_movements').insert({ inventory_item_id: input.itemId, branch_id: input.branchId, type: input.type, quantity: input.quantity, reason: input.reason }).select('*').single()
  if (movement.error) throw new Error('Stock updated, but the movement could not be recorded.')
  await supabase.from('audit_logs').insert({ action: 'INVENTORY_MOVEMENT_RECORDED', entity_type: 'inventory_item', entity_id: input.itemId, metadata: { type: input.type, quantity: input.quantity } })
  return mapInventoryMovement(movement.data)
}

export async function listServices() {
  if (!isSupabaseConfigured()) return listLocalServices()
  const supabase = getSupabaseServiceClient()
  if (!supabase) throw databaseUnavailable()
  const result = await supabase.from('services').select('*').order('name', { ascending: true })
  if (result.error) throw new Error('Unable to access the services database.')
  return asRows(result.data).map(mapService)
}

export async function updateService(id: string, patch: Partial<Service>) {
  if (!isSupabaseConfigured()) return updateLocalService(id, patch)
  const supabase = getSupabaseServiceClient()
  if (!supabase) throw databaseUnavailable()
  const result = await supabase.from('services').update({ name: patch.name, category: patch.category, short_description: patch.shortDescription, long_description: patch.longDescription, default_duration_minutes: patch.defaultDurationMinutes, price: patch.price, is_active: patch.isActive, is_featured: patch.isFeatured, updated_at: now() }).eq('id', id).select('*').single()
  if (result.error) throw new Error('Unable to update service.')
  await supabase.from('audit_logs').insert({ action: 'SERVICE_UPDATED', entity_type: 'service', entity_id: id, metadata: { fields: Object.keys(patch) } })
  return mapService(result.data)
}

export async function listBranches() {
  if (!isSupabaseConfigured()) return readDb().branches
  const supabase = getSupabaseServiceClient()
  if (!supabase) throw databaseUnavailable()
  const result = await supabase.from('branches').select('*').order('name', { ascending: true })
  if (result.error) throw new Error('Unable to access the branches database.')
  return asRows(result.data).map(mapBranch)
}

export async function updateBranch(id: string, patch: Partial<Branch>) {
  if (!isSupabaseConfigured()) return updateLocalBranch(id, patch)
  const supabase = getSupabaseServiceClient()
  if (!supabase) throw databaseUnavailable()
  const result = await supabase.from('branches').update({ maps_url: patch.mapsUrl ?? null, google_review_url: patch.googleReviewUrl ?? null, updated_at: now() }).eq('id', id).select('*').single()
  if (result.error) throw new Error('Unable to update branch.')
  await supabase.from('audit_logs').insert({ action: 'BRANCH_UPDATED', entity_type: 'branch', entity_id: id, metadata: { fields: Object.keys(patch) } })
  return mapBranch(result.data)
}

export async function listStaff() {
  if (!isSupabaseConfigured()) return readDb().staff
  const supabase = getSupabaseServiceClient()
  if (!supabase) throw databaseUnavailable()
  const result = await supabase.from('staff_profiles').select('*').order('full_name', { ascending: true })
  if (result.error) throw new Error('Unable to access the staff database.')
  return asRows(result.data).map((row) => ({
    id: stringValue(row.id),
    email: stringValue(row.email),
    fullName: stringValue(row.full_name),
    role: stringValue(row.role) as Role,
    branchId: optionalString(row.branch_id),
    isActive: booleanValue(row.is_active, true),
    mustChangePassword: booleanValue(row.must_change_password),
  } satisfies StaffProfile))
}

export async function dashboardSnapshotData() {
  if (!isSupabaseConfigured()) return dashboardSnapshot()
  const [appointments, payments, inventory] = await Promise.all([listAppointments(), listPayments(), listInventory()])
  const today = new Intl.DateTimeFormat('en-CA', { timeZone: BUSINESS.timezone }).format(new Date())
  const dayAppointments = appointments.filter((appointment) => new Intl.DateTimeFormat('en-CA', { timeZone: BUSINESS.timezone }).format(new Date(appointment.confirmedStartAt ?? appointment.requestedStartAt)) === today)
  const paymentsToday = payments.filter((payment) => payment.paidAt && new Intl.DateTimeFormat('en-CA', { timeZone: BUSINESS.timezone }).format(new Date(payment.paidAt)) === today && payment.status === 'PAID')
  return {
    today: dayAppointments,
    counts: {
      today: dayAppointments.length,
      pending: appointments.filter((item) => item.status === 'PENDING_REVIEW').length,
      confirmed: dayAppointments.filter((item) => item.status === 'CONFIRMED').length,
      checkedIn: dayAppointments.filter((item) => item.status === 'CHECKED_IN').length,
      completed: dayAppointments.filter((item) => item.status === 'COMPLETED').length,
      noShow: dayAppointments.filter((item) => item.status === 'NO_SHOW').length,
      payments: paymentsToday.reduce((sum, payment) => sum + payment.amount, 0),
      lowStock: inventory.reduce((count, item) => count + item.stock.filter((stock) => stock.quantity <= item.reorderLevel).length, 0),
    },
  }
}

export async function reportsSnapshot() {
  if (!isSupabaseConfigured()) {
    const db = readDb()
    const byStatus = Object.fromEntries(['PENDING_REVIEW', 'CONFIRMED', 'COMPLETED', 'CANCELLED', 'DECLINED', 'NO_SHOW'].map((status) => [status, db.appointments.filter((appointment) => appointment.status === status).length]))
    const branchComparison = db.branches.map((branch) => ({ branch: branch.name, appointments: db.appointments.filter((appointment) => appointment.branchId === branch.id).length, completed: db.appointments.filter((appointment) => appointment.branchId === branch.id && appointment.status === 'COMPLETED').length, payments: db.payments.filter((payment) => payment.branchId === branch.id && payment.status === 'PAID').reduce((sum, payment) => sum + payment.amount, 0) }))
    return { byStatus, branchComparison, payments: db.payments.filter((payment) => payment.status === 'PAID').reduce((sum, payment) => sum + payment.amount, 0), appointments: listLocalAppointments(), paymentRecords: listLocalPayments(), branches: db.branches }
  }
  const [appointments, payments, branches] = await Promise.all([listAppointments(), listPayments(), listBranches()])
  const byStatus = Object.fromEntries(['PENDING_REVIEW', 'CONFIRMED', 'COMPLETED', 'CANCELLED', 'DECLINED', 'NO_SHOW'].map((status) => [status, appointments.filter((appointment) => appointment.status === status).length]))
  const branchComparison = branches.map((branch) => ({ branch: branch.name, appointments: appointments.filter((appointment) => appointment.branchId === branch.id).length, completed: appointments.filter((appointment) => appointment.branchId === branch.id && appointment.status === 'COMPLETED').length, payments: payments.filter((payment) => payment.branchId === branch.id && payment.status === 'PAID').reduce((sum, payment) => sum + payment.amount, 0) }))
  return { byStatus, branchComparison, payments: payments.filter((payment) => payment.status === 'PAID').reduce((sum, payment) => sum + payment.amount, 0), appointments, paymentRecords: payments, branches }
}
