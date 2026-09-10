import { NextResponse } from 'next/server'
import { listAppointments } from '@mab/server'
import { sessionFromRequest } from '@/lib/auth'

export async function GET(request: Request) {
  if (!sessionFromRequest(request)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const url = new URL(request.url)
  return NextResponse.json({ appointments: await listAppointments({ status: url.searchParams.get('status') || undefined, branchId: url.searchParams.get('branchId') || undefined, query: url.searchParams.get('query') || undefined }) })
}
