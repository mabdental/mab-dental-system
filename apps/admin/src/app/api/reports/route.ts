import { NextResponse } from 'next/server'
import { readDb } from '@mab/server'
import { sessionFromRequest } from '@/lib/auth'

export async function GET(request: Request) {
  if (!sessionFromRequest(request)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const db = readDb()
  const byStatus = Object.fromEntries(['PENDING_REVIEW', 'CONFIRMED', 'COMPLETED', 'CANCELLED', 'DECLINED', 'NO_SHOW'].map((status) => [status, db.appointments.filter((appointment) => appointment.status === status).length]))
  const branchComparison = db.branches.map((branch) => ({ branch: branch.name, appointments: db.appointments.filter((appointment) => appointment.branchId === branch.id).length, completed: db.appointments.filter((appointment) => appointment.branchId === branch.id && appointment.status === 'COMPLETED').length, payments: db.payments.filter((payment) => payment.branchId === branch.id && payment.status === 'PAID').reduce((sum, payment) => sum + payment.amount, 0) }))
  return NextResponse.json({ byStatus, branchComparison, payments: db.payments.filter((payment) => payment.status === 'PAID').reduce((sum, payment) => sum + payment.amount, 0) })
}
