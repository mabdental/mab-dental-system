import { NextResponse } from 'next/server'
import { z } from 'zod'
import { BRANCHES, SERVICES } from '@mab/shared'
import { createPublicAppointment } from '@mab/server'

const schema = z.object({
  fullName: z.string().trim().min(2).max(100),
  phone: z.string().trim().regex(/^[0-9+() .-]{10,20}$/),
  email: z.string().trim().email().max(160).optional().or(z.literal('')),
  branchSlug: z.enum(BRANCHES.map((branch) => branch.slug) as [string, ...string[]]),
  serviceSlug: z.enum(['consultation', ...SERVICES.map((service) => service.slug)] as [string, ...string[]]),
  requestedStartAt: z.string().datetime(),
  concernText: z.string().trim().max(500).optional(),
  patientMessage: z.string().trim().max(1000).optional(),
})

const attempts = new Map<string, { count: number; resetAt: number }>()

export async function POST(request: Request) {
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'local'
  const current = attempts.get(ip)
  const timestamp = Date.now()
  if (current && current.resetAt > timestamp && current.count >= 12) return NextResponse.json({ error: 'Please wait a few minutes before sending another request.' }, { status: 429 })
  attempts.set(ip, current && current.resetAt > timestamp ? { count: current.count + 1, resetAt: current.resetAt } : { count: 1, resetAt: timestamp + 10 * 60_000 })
  try {
    const body = schema.parse(await request.json())
    const result = await createPublicAppointment(body)
    const appointment = result.appointment as { publicCode?: string; public_code?: string; status?: string }
    return NextResponse.json({ publicCode: appointment.publicCode ?? appointment.public_code, status: appointment.status ?? 'PENDING_REVIEW' }, { status: 201 })
  } catch (error) {
    const message = error instanceof z.ZodError ? 'Please check the highlighted details and try again.' : error instanceof Error ? error.message : 'We could not submit the appointment request.'
    return NextResponse.json({ error: message }, { status: 400 })
  }
}
