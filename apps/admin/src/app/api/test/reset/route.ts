import { NextResponse } from 'next/server'
import { resetLocalDb } from '@mab/server'

export async function POST(request: Request) {
  if (process.env.NODE_ENV === 'production' || request.headers.get('x-mab-test-reset') !== 'local-only') {
    return NextResponse.json({ error: 'Not found.' }, { status: 404 })
  }
  resetLocalDb()
  return NextResponse.json({ ok: true })
}
