import { NextResponse } from 'next/server'
import { dashboardSnapshot, listLocalAppointments } from '@mab/server'
import { sessionFromRequest } from '@/lib/auth'

export async function GET(request: Request) {
  if (!sessionFromRequest(request)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  return NextResponse.json({ snapshot: dashboardSnapshot(), pending: listLocalAppointments({ status: 'PENDING_REVIEW' }).slice(0, 8) })
}
