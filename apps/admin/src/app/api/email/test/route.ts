import { NextResponse } from 'next/server'
import { z } from 'zod'
import { brevoStatus, sendBrevoTestEmail } from '@mab/server'
import { sessionFromRequest } from '@/lib/auth'

const schema = z.object({ recipient: z.string().trim().email().max(160) })

export async function GET(request: Request) {
  if (!sessionFromRequest(request)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  return NextResponse.json(brevoStatus())
}

export async function POST(request: Request) {
  if (!sessionFromRequest(request)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  try {
    const { recipient } = schema.parse(await request.json())
    const result = await sendBrevoTestEmail(recipient)
    if (!result.sent) {
      const message = result.reason === 'not_configured'
        ? 'Brevo is not configured for this deployment yet.'
        : result.reason === 'invalid_recipient'
          ? 'Use a deliverable email address for the test.'
          : 'Brevo could not accept the test message.'
      return NextResponse.json({ error: message }, { status: 400 })
    }
    return NextResponse.json({ sent: true })
  } catch (error) {
    return NextResponse.json({ error: error instanceof z.ZodError ? 'Enter a valid recipient email.' : error instanceof Error ? error.message : 'Unable to send the Brevo test.' }, { status: 400 })
  }
}
