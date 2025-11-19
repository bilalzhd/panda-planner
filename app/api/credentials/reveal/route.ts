import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireUser, projectWhereForUser, projectScopeForUser } from '@/lib/tenant'
import { decryptSecret, hashPin, verifyPin } from '@/lib/crypto'

export async function POST(req: NextRequest) {
  const { user } = await requireUser()
  const { pin } = await req.json().catch(() => ({}))
  if (!pin || typeof pin !== 'string' || pin.length < 4) {
    return Response.json({ error: 'PIN required (min 4 chars)' }, { status: 400 })
  }

  // If no PIN set, set it now
  if (!user.credentialsPinHash) {
    const hash = hashPin(pin)
    await prisma.user.update({ where: { id: user.id }, data: { credentialsPinHash: hash } })
  } else {
    const ok = verifyPin(pin, user.credentialsPinHash)
    if (!ok) return Response.json({ error: 'Invalid PIN' }, { status: 401 })
  }

  const projectWhere = await projectWhereForUser(user.id)
  const scope = await projectScopeForUser(user.id)
  const projects = await prisma.project.findMany({
    where: projectWhere,
    include: { credentials: true },
    orderBy: { createdAt: 'desc' },
  })
  const editableProjects = scope.isSuperAdmin
    ? new Set(projects.map((p) => p.id))
    : new Set(Object.entries(scope.accessMap).filter(([, level]) => level === 'EDIT').map(([projectId]) => projectId))
  const filtered = projects.filter((p) => editableProjects.has(p.id))

  const result = filtered.map((p) => ({
    projectId: p.id,
    projectName: p.name,
    credentials: p.credentials.map((c) => ({ id: c.id, label: c.label, username: c.username, password: safeDecrypt(c.secretEnc) })),
  }))

  return Response.json({ projects: result })
}

function safeDecrypt(payload: string) {
  try { return decryptSecret(payload) } catch { return '' }
}
