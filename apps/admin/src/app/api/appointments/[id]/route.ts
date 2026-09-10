import { NextResponse } from 'next/server'
import { getLocalAppointment, updateLocalAppointment } from '@mab/server'
import { sessionFromRequest } from '@/lib/auth'

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!sessionFromRequest(request)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const appointment = getLocalAppointment((await params).id)
  return appointment ? NextResponse.json({ appointment }) : NextResponse.json({ error: 'Appointment not found.' }, { status: 404 })
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!sessionFromRequest(request)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  try {
    const body = await request.json()
    return NextResponse.json({ appointment: updateLocalAppointment((await params).id, body.action, { startAt: body.startAt, note: body.note }) })
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Unable to update appointment.' }, { status: 400 })
  }
}
