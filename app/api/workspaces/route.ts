import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { prisma } from '@/lib/prisma'
import { requireUser, canCreateWorkspace, workspaceLimit, WORKSPACE_COOKIE_NAME } from '@/lib/tenant'

export async function GET() {
  const { user, isSuperAdmin } = await requireUser()
  const workspaceMap = new Map<string, { id: string; name: string; ownerId: string }>()

  if (isSuperAdmin) {
    const all = await prisma.team.findMany({ select: { id: true, name: true, ownerId: true }, orderBy: { createdAt: 'asc' } })
    all.forEach((team) => workspaceMap.set(team.id, team))
  } else {
    const memberships = await prisma.membership.findMany({
      where: { userId: user.id },
      include: { team: { select: { id: true, name: true, ownerId: true } } },
    })
    memberships.forEach((m) => {
      if (m.team) workspaceMap.set(m.team.id, m.team)
    })
    const direct = await prisma.projectAccess.findMany({
      where: { userId: user.id },
      include: { project: { select: { team: { select: { id: true, name: true, ownerId: true } } } } },
    })
    direct.forEach((entry) => {
      const team = entry.project?.team
      if (team) workspaceMap.set(team.id, team)
    })
  }

  const workspaces = Array.from(workspaceMap.values()).sort((a, b) => a.name.localeCompare(b.name))
  const cookieValue = cookies().get(WORKSPACE_COOKIE_NAME)?.value || null
  let activeWorkspaceId = cookieValue && workspaces.some((w) => w.id === cookieValue) ? cookieValue : workspaces[0]?.id || null
  const res = NextResponse.json({ workspaces, limit: workspaceLimit(), activeWorkspaceId })
  if (activeWorkspaceId) {
    res.cookies.set(WORKSPACE_COOKIE_NAME, activeWorkspaceId, { path: '/', httpOnly: true, sameSite: 'lax' })
  }
  return res
}

export async function POST(req: NextRequest) {
  const { user } = await requireUser()
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
