import { NextResponse } from 'next/server'
import { sessionFromRequest } from '@/lib/auth'

export async function GET(request: Request) {
  const session = sessionFromRequest(request)
  return session ? NextResponse.json({ profile: session }) : NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
}
