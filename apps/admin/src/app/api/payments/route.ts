import { NextResponse } from 'next/server'
import { createLocalPayment, listLocalPayments } from '@mab/server'
import { sessionFromRequest } from '@/lib/auth'

export async function GET(request: Request) {
  if (!sessionFromRequest(request)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  return NextResponse.json({ payments: listLocalPayments() })
}

export async function POST(request: Request) {
  if (!sessionFromRequest(request)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  try {
    const body = await request.json()
    const amount = Number(body.amount)
    if (!body.patientId || !body.branchId || !Number.isFinite(amount) || amount <= 0) throw new Error('Patient, branch, and a positive amount are required.')
    return NextResponse.json({ payment: createLocalPayment({ appointmentId: body.appointmentId, patientId: body.patientId, branchId: body.branchId, amount, paymentMethod: body.paymentMethod || 'Cash', status: body.status || 'PAID', referenceNumber: body.referenceNumber }) }, { status: 201 })
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Unable to record payment.' }, { status: 400 })
  }
}
