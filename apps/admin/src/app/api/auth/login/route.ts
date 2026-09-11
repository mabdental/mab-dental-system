import { NextResponse } from 'next/server'
import { z } from 'zod'
import { authenticateAdmin, createSessionToken } from '@mab/server'
import { SESSION_COOKIE } from '@/lib/auth'

const schema = z.object({ email: z.string().trim().email(), password: z.string().min(1) })

export async function POST(request: Request) {
  try {
    const input = schema.parse(await request.json())
    const profile = await authenticateAdmin(input.email, input.password)
    if (!profile) return NextResponse.json({ error: 'Invalid email or password.' }, { status: 401 })
    const response = NextResponse.json({ ok: true, profile })
    response.cookies.set(SESSION_COOKIE, createSessionToken(profile.email, profile.role), {
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
