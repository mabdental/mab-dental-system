export type Role =
  | 'SUPER_ADMIN'
  | 'BRANCH_MANAGER'
  | 'RECEPTIONIST'
  | 'DENTIST'
  | 'CASHIER'
  | 'INVENTORY_STAFF'

export type AppointmentStatus =
  | 'PENDING_REVIEW'
  | 'CONFIRMED'
  | 'RESCHEDULE_PROPOSED'
  | 'CANCELLED'
  | 'DECLINED'
  | 'CHECKED_IN'
  | 'IN_TREATMENT'
  | 'COMPLETED'
  | 'NO_SHOW'

export type PaymentStatus = 'UNPAID' | 'PARTIAL' | 'PAID' | 'VOID' | 'REFUNDED'
export type PaymentMethod = 'Cash' | 'GCash' | 'Maya' | 'Bank Transfer' | 'Card' | 'Other'

export type Branch = {
  id: string
  slug: string
  name: string
  shortName: string
  address: string
  plusCode: string
  latitude?: number
  longitude?: number
  smartPhone: string
  globePhone: string
  mapsUrl?: string
  googleBusinessProfileUrl?: string
  googleReviewUrl?: string
  isGoogleBusinessVerified: boolean
  imageUrl: string
}

export type Service = {
  id: string
  slug: string
  name: string
  category: string
  shortDescription: string
  longDescription: string
  defaultDurationMinutes: number
  price: number | null
  isActive: boolean
  isFeatured: boolean
  imageUrl: string
  concernTags: string[]
  processSteps: string[]
  faq: { question: string; answer: string }[]
}

export type Patient = {
  id: string
  fullName: string
  phone: string
  phoneNormalized: string
  email?: string
  preferredBranchId?: string
  createdAt: string
  updatedAt: string
  lastVisitAt?: string
}

export type Appointment = {
  id: string
  publicCode: string
  patientId: string
  branchId: string
  serviceId?: string
  concernText?: string
  requestedStartAt: string
  confirmedStartAt?: string
  durationMinutes: number
  status: AppointmentStatus
  source: 'PUBLIC' | 'STAFF'
  patientMessage?: string
  internalNote?: string
  assignedDentistId?: string
  createdByStaffId?: string
  updatedByStaffId?: string
  createdAt: string
  updatedAt: string
  cancelledAt?: string
  completedAt?: string
  statusHistory: {
    id: string
    fromStatus?: AppointmentStatus
    toStatus: AppointmentStatus
    changedBy?: string
    note?: string
    createdAt: string
  }[]
}

export type Payment = {
  id: string
  appointmentId?: string
  patientId: string
  branchId: string
  amount: number
  paymentMethod: PaymentMethod
  status: PaymentStatus
  referenceNumber?: string
  paidAt?: string
  createdBy?: string
  createdAt: string
}

export type InventoryItem = {
  id: string
  name: string
  sku?: string
  unit: string
  reorderLevel: number
  isActive: boolean
  createdAt: string
  updatedAt: string
}

export type InventoryStock = {
  branchId: string
  inventoryItemId: string
  quantity: number
  updatedAt: string
}

export type InventoryMovement = {
  id: string
  branchId: string
  inventoryItemId: string
  type: 'IN' | 'OUT' | 'ADJUSTMENT'
  quantity: number
  reason: string
  appointmentId?: string
  createdBy?: string
  createdAt: string
}

export type StaffProfile = {
  id: string
  email: string
  fullName: string
  role: Role
  branchId?: string
  isActive: boolean
  mustChangePassword: boolean
}

export type AuditLog = {
  id: string
  actorUserId?: string
  action: string
  entityType: string
  entityId?: string
  metadata?: Record<string, unknown>
  createdAt: string
}

export const BUSINESS = {
  name: 'M.A.B. Dental Clinic',
  tagline: 'Your Smile is Our Masterpiece.',
  timezone: 'Asia/Manila',
  consultation: 'Free Consultation and Assessment',
  email: 'mabdntlclnc@gmail.com',
  hours: {
    weekdayLabel: 'Monday–Saturday',
    weekday: '8:00 AM–8:00 PM',
    sunday: 'Strictly by appointment',
  },
} as const

export const SOCIAL_LINKS = {
  messenger:
    'https://l.messenger.com/l.php?u=http%3A%2F%2Fmessenger.com%2Ft%2F875653832292951&h=AUBRnVV5jadkSuYBjsnL5sHul9eTiStc2eRt73MoS-LCqGvOBTKxoGsltDVqV6v0FE1Td7UNAZTaCEe9GU18g6i5rTsaMhpUmoOl-2qpFEgPv-1pxPSvmD3XKW1JdYyRyzKOnw',
  instagram: 'https://www.instagram.com/mab_dentalclinic?stkn=MTRwYnd1cW0xYjN3bg==',
  facebook: 'https://www.facebook.com/share/1RoDgiK1Ed/',
  tiktok: 'https://www.tiktok.com/@mab.dental.clinic?_r=1&_t=ZS-99ZrBplCrBa',
} as const

export const BRANCHES: Branch[] = [
  {
    id: '11111111-1111-4111-8111-111111111111',
    slug: 'valley-1',
    name: 'Valley 1 Branch',
    shortName: 'Valley 1',
    address: '138-C Barangay San Antonio, Valley 1, Parañaque City',
    plusCode: 'F2CC+3J Parañaque, Metro Manila',
    smartPhone: '0968 312 5797',
    globePhone: '0915 695 6460',
    googleReviewUrl: 'https://g.page/r/CZHke-5ErCgREBM/review',
    isGoogleBusinessVerified: true,
    imageUrl: '/images/clinic-signage.jpg',
  },
  {
    id: '22222222-2222-4222-8222-222222222222',
    slug: 'bf-irineville',
    name: 'BF Homes / Irineville Branch',
    shortName: 'BF Homes / Irineville',
    address: 'Blk 4 Lot 13 Doña Irenea Ave., Irineville 1, BF Homes, Parañaque City',
    plusCode: 'F22M+QQ5 Parañaque, Metro Manila',
    latitude: 14.451889,
    longitude: 121.0345,
    smartPhone: '0961 608 4124',
    globePhone: '0954 438 5175',
    isGoogleBusinessVerified: false,
    imageUrl: '/images/clinic-lobby.jpg',
  },
]

const rootCanalFaq = [
  { question: 'Is root canal therapy painful?', answer: 'Modern numbing techniques are used to keep you comfortable. Your dentist will explain what to expect after examining your tooth.' },
  { question: 'How long does the procedure take?', answer: 'Timing depends on the tooth and the treatment plan. Your dentist can give you a clearer estimate during your assessment.' },
  { question: 'Will I need a crown after a root canal?', answer: 'Some treated teeth benefit from additional restoration. Your dentist will recommend the appropriate way to protect the tooth.' },
  { question: 'Are there alternatives to root canal therapy?', answer: 'The right options depend on the condition of the tooth. A dentist can discuss available treatments after an evaluation.' },
]

const genericFaq = [
  { question: 'How do I know which treatment is right for me?', answer: 'Choose a consultation if you are unsure. A dentist will assess your needs and explain suitable options.' },
  { question: 'Can I ask about treatment costs?', answer: 'Yes. Pricing is best discussed after an assessment because the recommended treatment can vary by case.' },
]

const serviceSeed = [
  ['oral-prophylaxis', 'Oral Prophylaxis', 'Preventive / Periodontal', 'Keep your smile healthy with professional cleaning and plaque removal.'],
  ['teeth-whitening', 'Teeth Whitening', 'Preventive / Periodontal', 'A brighter, more confident smile with dentist-guided whitening.'],
  ['deep-scaling-root-planing', 'Deep Scaling & Root Planing', 'Preventive / Periodontal', 'Treat gum concerns with thorough deep cleaning.'],
  ['pit-and-fissure-sealant', 'Pit and Fissure Sealant', 'Preventive / Periodontal', 'Help protect hard-to-clean grooves from decay.'],
  ['periodontal-treatment', 'Periodontal Treatment', 'Preventive / Periodontal', 'Care for your gums and supporting structures.'],
  ['composite-restoration', 'Composite Restoration', 'Restorative / Endodontic', 'Repair cavities with natural-looking tooth-colored fillings.'],
  ['pulpotomy', 'Pulpotomy', 'Restorative / Endodontic', 'A focused treatment for an affected portion of the tooth pulp.'],
  ['pulpectomy', 'Pulpectomy', 'Restorative / Endodontic', 'Remove affected pulp as part of a dentist-led treatment plan.'],
  ['root-canal-therapy', 'Root Canal Therapy', 'Restorative / Endodontic', 'Save your natural tooth and relieve pain from infected pulp.'],
  ['stainless-steel-crown', 'Stainless Steel Crown', 'Restorative / Endodontic', 'Durable crowns for children’s teeth when protection is needed.'],
  ['crowns-fixed-bridge', 'Crowns & Fixed Bridge', 'Restorative / Endodontic', 'Restore strength and function with high-quality crowns and bridges.'],
  ['tooth-extraction', 'Tooth Extraction', 'Surgical / Replacement', 'Safe, thoughtful extraction when a tooth cannot be saved.'],
  ['dental-implant', 'Dental Implant', 'Surgical / Replacement', 'A long-lasting option for replacing missing teeth.'],
  ['dentures', 'Dentures', 'Cosmetic / Prosthodontic', 'Comfortable, natural-looking solutions for missing teeth.'],
  ['veneers', 'Veneers', 'Cosmetic / Prosthodontic', 'Enhance your smile with carefully planned veneers.'],
  ['gum-contouring', 'Gum Contouring', 'Cosmetic / Prosthodontic', 'Refine the appearance of your smile with gum contouring.'],
  ['orthodontic-treatment', 'Orthodontic Treatment', 'Orthodontic', 'Straighter smiles with a dentist-guided treatment plan.'],
  ['retainer', 'Retainer', 'Orthodontic', 'Help maintain alignment after orthodontic treatment.'],
  ['expander', 'Expander', 'Orthodontic', 'Support jaw and dental development when clinically appropriate.'],
  ['mouth-guard', 'Mouth Guard', 'Orthodontic', 'Protect teeth during sport or while managing nighttime grinding.'],
  ['pediatric-dentistry', 'Pediatric Dentistry', 'Pediatric', 'Gentle, friendly care for children’s growing smiles.'],
] as const

export const SERVICES: Service[] = serviceSeed.map(([slug, name, category, shortDescription], index) => ({
  id: '33333333-3333-4333-8333-' + String(index + 1).padStart(12, '0'),
  slug,
  name,
  category,
  shortDescription,
  longDescription:
    name === 'Root Canal Therapy'
      ? 'Root canal therapy is a dentist-led treatment that removes infected or damaged pulp, cleans and disinfects the root canals, and seals the tooth to help preserve natural function.'
      : name + ' is available as part of a personalized care plan. Your dentist will assess your needs and explain what the treatment may involve.',
  defaultDurationMinutes: 60,
  price: null,
  isActive: true,
  isFeatured: index < 6,
  imageUrl: name === 'Root Canal Therapy' ? '/images/root-canal.jpg' : '/images/clinic-detail.jpg',
  concernTags:
    category === 'Preventive / Periodontal'
      ? ['I want cleaner teeth']
      : category === 'Orthodontic'
        ? ['I want straighter teeth']
        : category === 'Surgical / Replacement'
          ? ['I have missing teeth']
          : category === 'Pediatric'
            ? ['My child needs dental care']
            : ['I want to improve my smile', 'I’m not sure'],
  processSteps:
    name === 'Root Canal Therapy'
      ? ['Examination & diagnosis', 'Cleaning & disinfection', 'Shaping & sealing', 'Restoration']
      : ['Assessment', 'Personalized treatment plan', 'Care delivered by the clinic team'],
  faq: name === 'Root Canal Therapy' ? rootCanalFaq : genericFaq,
}))

export const CONSULTATION_SERVICE: Service = {
  id: 'service-consultation',
  slug: 'consultation',
  name: 'Consultation / I’m not sure',
  category: 'Consultation',
  shortDescription: BUSINESS.consultation,
  longDescription: 'Not sure what to book? Start with a free consultation and assessment so the clinic team can understand what you need.',
  defaultDurationMinutes: 30,
  price: null,
  isActive: true,
  isFeatured: false,
  imageUrl: '/images/clinic-chair.jpg',
  concernTags: ['I’m not sure'],
  processSteps: ['Share your concern', 'Meet with the clinic team', 'Discuss next steps'],
  faq: genericFaq,
}

export const SERVICE_CATEGORIES = [
  'All',
  'Preventive / Periodontal',
  'Restorative / Endodontic',
  'Orthodontic',
  'Cosmetic / Prosthodontic',
  'Surgical / Replacement',
  'Pediatric',
] as const

export const CONCERNS = [
  'I want cleaner teeth',
  'I want straighter teeth',
  'I have tooth pain',
  'I have missing teeth',
  'I want to improve my smile',
  'My child needs dental care',
  'I’m not sure',
] as const

export const EQUIPMENT = [
  { id: 'chair', name: 'Comfortable Chair', label: 'Dental Chair', detail: 'Ergonomic support designed for a calmer, more relaxed visit.', imageUrl: '/images/clinic-chair.jpg' },
  { id: 'light', name: 'Dental Light', label: 'Clinical Light', detail: 'Bright, focused illumination for precise and gentle treatment.', imageUrl: '/images/clinic-light.jpg' },
  { id: 'instruments', name: 'Instrument System', label: 'Instrument System', detail: 'Modern tools arranged for efficient, comfortable care.', imageUrl: '/images/clinic-instruments.jpg' },
  { id: 'rinse', name: 'Rinse System', label: 'Rinse System', detail: 'Convenient and hygienic support for a better treatment experience.', imageUrl: '/images/clinic-rinse.jpg' },
  { id: 'monitor', name: 'Monitor', label: 'Monitor / Display', detail: 'Clear visuals to help explain treatment and support informed care.', imageUrl: '/images/clinic-monitor.jpg' },
] as const

export const CLINIC_GALLERY = [
  { id: 'chair', label: 'Treatment room', imageUrl: '/images/clinic-chair.jpg' },
  { id: 'lobby', label: 'Reception area', imageUrl: '/images/clinic-lobby.jpg' },
  { id: 'signage', label: 'Clinic identity', imageUrl: '/images/clinic-signage.jpg' },
  { id: 'light', label: 'Dental light', imageUrl: '/images/clinic-light.jpg' },
] as const

export const PUBLIC_NAV = [
  { href: '/', label: 'Home' },
  { href: '/services', label: 'Services' },
  { href: '/locations', label: 'Locations' },
  { href: '/our-clinic', label: 'Our Clinic' },
  { href: '/reviews', label: 'Reviews' },
  { href: '/contact', label: 'Contact' },
] as const

export function getBranchBySlug(slug: string) {
  return BRANCHES.find((branch) => branch.slug === slug)
}

export function getServiceBySlug(slug: string) {
  return SERVICES.find((service) => service.slug === slug) ?? (slug === CONSULTATION_SERVICE.slug ? CONSULTATION_SERVICE : undefined)
}

export function getDirectionsUrl(branch: Branch) {
  const destination = branch.latitude && branch.longitude
    ? String(branch.latitude) + ',' + String(branch.longitude)
    : branch.address + ', ' + branch.plusCode
  return 'https://www.google.com/maps/dir/?api=1&destination=' + encodeURIComponent(destination)
}

export function normalizePhone(phone: string) {
  return phone.replace(/\D/g, '')
}

export function formatPeso(amount: number) {
  return new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' }).format(amount)
}
