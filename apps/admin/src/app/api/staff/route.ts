import { NextResponse } from 'next/server'
import { listStaff } from '@mab/server'
import { sessionFromRequest } from '@/lib/auth'

export async function GET(request: Request) {
  if (!sessionFromRequest(request)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  return NextResponse.json({ staff: await listStaff() })
}
