import { NextResponse } from 'next/server'
import { updateBranch } from '@mab/server'
import { sessionFromRequest } from '@/lib/auth'

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!sessionFromRequest(request)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  try {
    const body = await request.json()
    return NextResponse.json({ branch: await updateBranch((await params).id, { mapsUrl: body.mapsUrl, googleReviewUrl: body.googleReviewUrl || undefined }) })
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Unable to update branch.' }, { status: 400 })
  }
}
