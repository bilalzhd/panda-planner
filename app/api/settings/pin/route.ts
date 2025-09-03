import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireUser } from '@/lib/tenant'
import { hashPin, verifyPin } from '@/lib/crypto'

export async function GET() {
  const { user } = await requireUser()
  return Response.json({ hasPin: !!user.credentialsPinHash })
}

export async function POST(req: NextRequest) {
  const { user } = await requireUser()
  const body = await req.json().catch(() => ({})) as { currentPin?: string; newPin?: string }
  const newPin = body?.newPin?.trim() || ''
  const currentPin = body?.currentPin?.trim() || ''

  if (newPin.length < 4) return Response.json({ error: 'New PIN must be at least 4 characters' }, { status: 400 })

  if (user.credentialsPinHash) {
    // Changing existing PIN requires current PIN
    if (!currentPin) return Response.json({ error: 'Current PIN required' }, { status: 400 })
    const ok = verifyPin(currentPin, user.credentialsPinHash)
    if (!ok) return Response.json({ error: 'Invalid current PIN' }, { status: 401 })
  }

  const hash = hashPin(newPin)
  await prisma.user.update({ where: { id: user.id }, data: { credentialsPinHash: hash } })
  return Response.json({ ok: true })
}

