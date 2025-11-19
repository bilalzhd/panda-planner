import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireUser, WORKSPACE_COOKIE_NAME } from '@/lib/tenant'

export async function POST(req: NextRequest) {
  const { user, isSuperAdmin } = await requireUser()
  const body = await req.json().catch(() => ({}))
  const workspaceId = String(body?.workspaceId || '').trim()
  if (!workspaceId) return NextResponse.json({ error: 'workspaceId required' }, { status: 400 })
  let hasAccess = false
  if (isSuperAdmin) {
    const exists = await prisma.team.count({ where: { id: workspaceId } })
    hasAccess = exists > 0
  } else {
    const membership = await prisma.membership.findFirst({ where: { teamId: workspaceId, userId: user.id } })
    if (membership) hasAccess = true
  }
  if (!hasAccess && !isSuperAdmin) {
    const direct = await prisma.projectAccess.findFirst({
      where: { userId: user.id, project: { teamId: workspaceId } },
    })
    if (direct) hasAccess = true
  }
  if (!hasAccess) {
    return NextResponse.json({ error: 'Not allowed to select this workspace' }, { status: 403 })
  }
  const res = NextResponse.json({ ok: true })
  res.cookies.set(WORKSPACE_COOKIE_NAME, workspaceId, { path: '/', httpOnly: true, sameSite: 'lax' })
  return res
}
