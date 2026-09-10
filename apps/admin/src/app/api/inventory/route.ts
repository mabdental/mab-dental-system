import { NextResponse } from 'next/server'
import { createLocalInventoryItem, listLocalInventory, moveLocalInventory } from '@mab/server'
import { sessionFromRequest } from '@/lib/auth'

export async function GET(request: Request) {
  if (!sessionFromRequest(request)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  return NextResponse.json({ inventory: listLocalInventory() })
}

export async function POST(request: Request) {
  if (!sessionFromRequest(request)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  try {
    const body = await request.json()
    if (body.itemId) return NextResponse.json({ movement: moveLocalInventory({ itemId: body.itemId, branchId: body.branchId, type: body.type, quantity: Number(body.quantity), reason: String(body.reason || 'Admin adjustment') }) }, { status: 201 })
    if (!body.name || !body.unit) throw new Error('Item name and unit are required.')
    return NextResponse.json({ item: createLocalInventoryItem({ name: body.name, unit: body.unit, reorderLevel: Number(body.reorderLevel) || 0, sku: body.sku || undefined }) }, { status: 201 })
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Unable to update inventory.' }, { status: 400 })
  }
}
