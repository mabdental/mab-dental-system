import { NextResponse } from 'next/server'
import { updateLocalService } from '@mab/server'
import { sessionFromRequest } from '@/lib/auth'

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!sessionFromRequest(request)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  try {
    const body = await request.json()
    return NextResponse.json({ service: updateLocalService((await params).id, { isActive: Boolean(body.isActive) }) })
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Unable to update service.' }, { status: 400 })
  }
}
