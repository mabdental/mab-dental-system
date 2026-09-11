import { NextResponse } from 'next/server'
import { updateService } from '@mab/server'
import { sessionFromRequest } from '@/lib/auth'

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!sessionFromRequest(request)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  try {
    const body = await request.json()
    const patch = {
      ...(body.name !== undefined ? { name: String(body.name) } : {}),
      ...(body.category !== undefined ? { category: String(body.category) } : {}),
      ...(body.shortDescription !== undefined ? { shortDescription: String(body.shortDescription) } : {}),
      ...(body.longDescription !== undefined ? { longDescription: String(body.longDescription) } : {}),
      ...(body.defaultDurationMinutes !== undefined ? { defaultDurationMinutes: Number(body.defaultDurationMinutes) || 60 } : {}),
      ...(body.price !== undefined ? { price: body.price === '' || body.price === null ? null : Number(body.price) } : {}),
      ...(body.isActive !== undefined ? { isActive: Boolean(body.isActive) } : {}),
      ...(body.isFeatured !== undefined ? { isFeatured: Boolean(body.isFeatured) } : {}),
    }
    return NextResponse.json({ service: await updateService((await params).id, patch) })
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Unable to update service.' }, { status: 400 })
  }
}
