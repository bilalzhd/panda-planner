import { prisma } from '@/lib/prisma'
import { NextRequest } from 'next/server'
import { requireUser, teamIdsForUser } from '@/lib/tenant'
import { getTransport } from '@/lib/email'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const { user } = await requireUser()
  const { searchParams } = new URL(req.url)
  const teamId = searchParams.get('teamId') || undefined
  const allowed = new Set(await teamIdsForUser(user.id))
  const tid = teamId && allowed.has(teamId) ? teamId : (Array.from(allowed)[0] || null)
  if (!tid) return Response.json([])
  const items = await (prisma as any).teamMessage.findMany({
    where: { teamId: tid },
    include: { author: true, reads: { include: { user: true } } },
    orderBy: { createdAt: 'asc' },
    take: 500,
  })
  return Response.json(items)
}

export async function POST(req: NextRequest) {
  const { user } = await requireUser()
  const body = await req.json()
  const teamId = String(body?.teamId || '')
  const content = String(body?.content || '').trim()
  if (!content) return Response.json({ error: 'Content required' }, { status: 400 })
  // Auth: user must be a member of teamId
  const allowed = new Set(await teamIdsForUser(user.id))
  if (!allowed.has(teamId)) return Response.json({ error: 'Forbidden' }, { status: 403 })
  const created = await (prisma as any).teamMessage.create({
    data: { teamId, authorId: user.id, content },
    include: { author: true, reads: { include: { user: true } } },
  })
  try {
    const members = await prisma.membership.findMany({ where: { teamId }, include: { user: { include: { notificationPref: true } } } })
    // Default behavior: notify if no preference is set yet (opt-out available in Settings)
    const toNotify = members
      .map((m) => m.user)
      .filter((u) => u.id !== user.id && !!u.email && (u.notificationPref?.emailTeamMessage ?? true))
    if (toNotify.length > 0) {
      const tx = getTransport()
      const base = process.env.NEXT_PUBLIC_BASE_URL || ''
      const subject = 'New team message'
      const text = `${user.name || user.email || 'Someone'} posted:\n\n${content}\n\nOpen: ${base}/messages?teamId=${teamId}`
      await Promise.allSettled(toNotify.map((u) => tx.sendMail({ from: process.env.EMAIL_FROM || 'noreply@example.com', to: u.email!, subject, text })))
    }
  } catch (e) {
    console.error('Message email notify failed', e)
  }
  return Response.json(created, { status: 201 })
}
