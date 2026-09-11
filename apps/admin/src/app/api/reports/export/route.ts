import { reportsSnapshot } from '@mab/server'
import { NextResponse } from 'next/server'
import { sessionFromRequest } from '@/lib/auth'

function escapeCell(value: unknown) {
  return String(value ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}

function rangeStart(range: string, start: string) {
  if (range === 'custom' && start) return new Date(start + 'T00:00:00')
  const today = new Date()
  if (range === '1') return new Date(today.getFullYear(), today.getMonth(), today.getDate())
  if (range === '7') return new Date(today.getFullYear(), today.getMonth(), today.getDate() - 6)
  if (range === '30') return new Date(today.getFullYear(), today.getMonth(), today.getDate() - 29)
  if (range === '3m') return new Date(today.getFullYear(), today.getMonth() - 3, today.getDate())
  if (range === '6m') return new Date(today.getFullYear(), today.getMonth() - 6, today.getDate())
  return null
}

export async function GET(request: Request) {
  if (!sessionFromRequest(request)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const url = new URL(request.url)
  const range = url.searchParams.get('range') || '30'
  const branchId = url.searchParams.get('branchId') || 'ALL'
  const status = url.searchParams.get('status') || 'ALL'
  const start = rangeStart(range, url.searchParams.get('start') || '')
  const end = range === 'custom' && url.searchParams.get('end') ? new Date(url.searchParams.get('end') + 'T23:59:59') : null
  const within = (value: string) => { const date = new Date(value); return (!start || date >= start) && (!end || date <= end) }
  const data = await reportsSnapshot()
  const appointments = (data.appointments || []).filter((item) => within(item.requestedStartAt) && (branchId === 'ALL' || item.branch?.id === branchId) && (status === 'ALL' || item.status === status))
  const payments = (data.paymentRecords || []).filter((item) => within(item.createdAt) && (branchId === 'ALL' || item.branch?.id === branchId))
  const branchLabel = branchId === 'ALL' ? 'All branches' : data.branches?.find((item) => item.id === branchId)?.name || 'Selected branch'
  const rangeLabel = range === 'custom' ? `${url.searchParams.get('start') || ''} to ${url.searchParams.get('end') || ''}` : range === 'ALL' ? 'All time' : ({ '1': 'Last 1 day', '7': 'Last 7 days', '30': 'Last 30 days', '3m': 'Last 3 months', '6m': 'Last 6 months' }[range] || 'Selected period')
  const appointmentRows = appointments.map((item) => `<tr><td>Appointment</td><td>${escapeCell(item.publicCode)}</td><td>${escapeCell(item.patient?.fullName)}</td><td>${escapeCell(item.branch?.name)}</td><td>${escapeCell(item.service?.name || 'Consultation')}</td><td>${escapeCell(item.status)}</td><td>${escapeCell(item.requestedStartAt)}</td></tr>`).join('')
  const paymentRows = payments.map((item) => `<tr><td>Payment</td><td>${escapeCell(item.id)}</td><td>${escapeCell(item.patient?.fullName)}</td><td>${escapeCell(item.branch?.name)}</td><td>${escapeCell(item.paymentMethod)}</td><td>${escapeCell(item.status)}</td><td>${escapeCell(item.amount)}</td></tr>`).join('')
  const html = `<!doctype html><html><head><meta charset="utf-8"><style>body{font-family:Arial,sans-serif;color:#082d57}table{border-collapse:collapse}th,td{border:1px solid #b8c1ca;padding:6px}th{background:#f7f2e9;text-align:left}</style></head><body><h1>M.A.B. Dental Clinic operational report</h1><p>Range: ${escapeCell(rangeLabel)} | Branch: ${escapeCell(branchLabel)} | Status: ${escapeCell(status)}</p><table><thead><tr><th>Type</th><th>Reference</th><th>Patient</th><th>Branch</th><th>Service / Method</th><th>Status</th><th>Date / Amount</th></tr></thead><tbody>${appointmentRows}${paymentRows}</tbody></table></body></html>`
  return new Response(html, { status: 200, headers: { 'Content-Type': 'application/vnd.ms-excel; charset=utf-8', 'Content-Disposition': `attachment; filename="mab-dental-report-${new Date().toISOString().slice(0, 10)}.xls"`, 'Cache-Control': 'no-store' } })
}
