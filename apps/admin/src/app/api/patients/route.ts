import { NextResponse } from 'next/server'
import { listLocalPatients } from '@mab/server'
import { sessionFromRequest } from '@/lib/auth'

export async function GET(request: Request) {
  if (!sessionFromRequest(request)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  return NextResponse.json({ patients: listLocalPatients(new URL(request.url).searchParams.get('query') || undefined) })
}
