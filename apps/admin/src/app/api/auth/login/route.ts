import { NextResponse } from 'next/server'
import { z } from 'zod'
import { createSessionToken, localLoginAllowed } from '@mab/server'
import { SESSION_COOKIE } from '@/lib/auth'

const schema = z.object({ email: z.string().trim().email(), password: z.string().min(1) })

export async function POST(request: Request) {
  try {
    const input = schema.parse(await request.json())
    if (!localLoginAllowed(input.email, input.password)) return NextResponse.json({ error: 'Invalid email or password.' }, { status: 401 })
    const response = NextResponse.json({ ok: true, profile: { email: input.email, role: 'SUPER_ADMIN' } })
    response.cookies.set(SESSION_COOKIE, createSessionToken(input.email), {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      maxAge: 60 * 60 * 12,
      path: '/',
    })
    return response
  } catch {
    return NextResponse.json({ error: 'Enter a valid email and password.' }, { status: 400 })
  }
}
