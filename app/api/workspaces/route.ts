import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { prisma } from '@/lib/prisma'
import { requireUser, canCreateWorkspace, workspaceLimit, WORKSPACE_COOKIE_NAME } from '@/lib/tenant'

export async function GET() {
  const { user, workspaceId } = await requireUser({ requireWorkspace: false })
  const memberships = await prisma.membership.findMany({
    where: { userId: user.id },
    include: { team: { select: { id: true, name: true, ownerId: true } } },
    orderBy: { createdAt: 'asc' },
  })
  const workspaces = memberships
    .map((m) => m.team)
    .filter((team): team is { id: string; name: string; ownerId: string } => !!team)
    .sort((a, b) => a.name.localeCompare(b.name))
  const cookieValue = cookies().get(WORKSPACE_COOKIE_NAME)?.value || null
  let activeWorkspaceId = cookieValue && workspaces.some((w) => w.id === cookieValue) ? cookieValue : workspaceId
  if (!activeWorkspaceId) {
    activeWorkspaceId = workspaces[0]?.id || null
  }
  const res = NextResponse.json({ workspaces, limit: workspaceLimit(), activeWorkspaceId })
  if (activeWorkspaceId) {
    res.cookies.set(WORKSPACE_COOKIE_NAME, activeWorkspaceId, { path: '/', httpOnly: true, sameSite: 'lax' })
  } else {
    res.cookies.delete(WORKSPACE_COOKIE_NAME)
  }
  return res
}

export async function POST(req: NextRequest) {
  const { user } = await requireUser({ requireWorkspace: false })
  if (!(await canCreateWorkspace(user.id))) {
    return NextResponse.json({ error: `Workspace limit reached (${workspaceLimit()})` }, { status: 403 })
  }
  const body = await req.json().catch(() => ({}))
  const name = (body?.name || '').toString().trim() || `${user.name || 'My'} Workspace`
  const workspace = await prisma.team.create({
    data: {
      name,
      ownerId: user.id,
    },
  })
  await prisma.membership.create({
    data: { teamId: workspace.id, userId: user.id, role: 'OWNER' },
  })
  const res = NextResponse.json({ workspace }, { status: 201 })
  res.cookies.set(WORKSPACE_COOKIE_NAME, workspace.id, { path: '/', httpOnly: true, sameSite: 'lax' })
  return res
}
