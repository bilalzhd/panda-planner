import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireUser, getUserCapability, isSuperAdmin } from '@/lib/tenant'

type AccessInput = { projectId: string; accessLevel: 'READ' | 'EDIT' }

function normalizeEmail(email: string) {
  return email.trim().toLowerCase()
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const { user } = await requireUser()
  const capability = await getUserCapability(user.id)
  if (!capability.canEditUsers) {
    return Response.json({ error: 'Forbidden' }, { status: 403 })
  }
  const target = await prisma.user.findUnique({ where: { id: params.id }, include: { projectAccesses: true } })
  if (!target) return Response.json({ error: 'Not found' }, { status: 404 })
  if (isSuperAdmin(target) && !capability.isSuperAdmin) {
    return Response.json({ error: 'Cannot modify super admin' }, { status: 403 })
  }
  const body = await req.json().catch(() => ({}))
  const updates: any = {}
  if (typeof body?.name === 'string') updates.name = body.name.trim() || null
  if (typeof body?.email === 'string' && body.email.trim()) {
    const email = normalizeEmail(body.email)
    if (email !== target.email) {
      const exists = await prisma.user.findUnique({ where: { email } })
      if (exists && exists.id !== target.id) return Response.json({ error: 'Email already exists' }, { status: 409 })
      updates.email = email
    }
  }
  if (Object.keys(updates).length) {
    await prisma.user.update({ where: { id: target.id }, data: updates })
  }
  const accesses = Array.isArray(body?.projectAccesses) ? (body.projectAccesses as AccessInput[]) : []
  await prisma.projectAccess.deleteMany({ where: { userId: target.id } })
  if (isSuperAdmin(target)) {
    // super admin gets implicit edit access; no direct records needed
  } else if (accesses.length) {
    await prisma.projectAccess.createMany({
      data: accesses
        .filter((a) => typeof a?.projectId === 'string' && (a.accessLevel === 'READ' || a.accessLevel === 'EDIT'))
        .map((a) => ({ projectId: a.projectId, userId: target.id, accessLevel: a.accessLevel })),
    })
  }
  const permissionsInput = body?.permissions
  if (permissionsInput) {
    await prisma.userPermission.upsert({
      where: { userId: target.id },
      create: {
        userId: target.id,
        canAccessUsers: !!permissionsInput?.canAccessUsers,
        canCreateUsers: !!permissionsInput?.canCreateUsers,
        canEditUsers: !!permissionsInput?.canEditUsers,
        canDeleteUsers: !!permissionsInput?.canDeleteUsers,
      },
      update: {
        canAccessUsers: !!permissionsInput?.canAccessUsers,
        canCreateUsers: !!permissionsInput?.canCreateUsers,
        canEditUsers: !!permissionsInput?.canEditUsers,
        canDeleteUsers: !!permissionsInput?.canDeleteUsers,
      },
    })
  }
  return Response.json({ ok: true })
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const { user } = await requireUser()
  const capability = await getUserCapability(user.id)
  if (!capability.canDeleteUsers) {
    return Response.json({ error: 'Forbidden' }, { status: 403 })
  }
  if (user.id === params.id) return Response.json({ error: 'Cannot delete your own account' }, { status: 400 })
  const target = await prisma.user.findUnique({ where: { id: params.id } })
  if (!target) return Response.json({ error: 'Not found' }, { status: 404 })
  if (isSuperAdmin(target)) {
    return Response.json({ error: 'Cannot delete super admin' }, { status: 403 })
  }
  await prisma.projectAccess.deleteMany({ where: { userId: target.id } })
  await prisma.userPermission.deleteMany({ where: { userId: target.id } })
  await prisma.user.delete({ where: { id: target.id } })
  return new Response(null, { status: 204 })
}
