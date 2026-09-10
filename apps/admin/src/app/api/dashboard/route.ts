import { NextResponse } from 'next/server'
import { dashboardSnapshotData, listAppointments } from '@mab/server'
import { sessionFromRequest } from '@/lib/auth'

export async function GET(request: Request) {
  if (!sessionFromRequest(request)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  return NextResponse.json({ snapshot: await dashboardSnapshotData(), pending: (await listAppointments({ status: 'PENDING_REVIEW' })).slice(0, 8) })
}
