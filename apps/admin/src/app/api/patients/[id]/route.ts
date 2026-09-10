import { NextResponse } from 'next/server'
import { getLocalPatient } from '@mab/server'
import { sessionFromRequest } from '@/lib/auth'

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!sessionFromRequest(request)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const patient = getLocalPatient((await params).id)
  return patient ? NextResponse.json({ patient }) : NextResponse.json({ error: 'Patient not found.' }, { status: 404 })
}
