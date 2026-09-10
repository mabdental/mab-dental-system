import { NextResponse } from 'next/server'
import { createInventoryItem, listInventory, moveInventory } from '@mab/server'
import { sessionFromRequest } from '@/lib/auth'

export async function GET(request: Request) {
  if (!sessionFromRequest(request)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  return NextResponse.json({ inventory: await listInventory() })
}

export async function POST(request: Request) {
  if (!sessionFromRequest(request)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  try {
    const body = await request.json()
    if (body.itemId) return NextResponse.json({ movement: await moveInventory({ itemId: body.itemId, branchId: body.branchId, type: body.type, quantity: Number(body.quantity), reason: String(body.reason || 'Admin adjustment') }) }, { status: 201 })
    if (!body.name || !body.unit) throw new Error('Item name and unit are required.')
    return NextResponse.json({ item: await createInventoryItem({ name: body.name, unit: body.unit, reorderLevel: Number(body.reorderLevel) || 0, sku: body.sku || undefined }) }, { status: 201 })
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Unable to update inventory.' }, { status: 400 })
  }
}
