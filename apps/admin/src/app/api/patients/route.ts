import { NextResponse } from 'next/server'
import { listPatients } from '@mab/server'
import { sessionFromRequest } from '@/lib/auth'

export async function GET(request: Request) {
  if (!sessionFromRequest(request)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  return NextResponse.json({ patients: await listPatients(new URL(request.url).searchParams.get('query') || undefined) })
}
