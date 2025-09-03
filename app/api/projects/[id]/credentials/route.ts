import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireUser, teamIdsForUser } from '@/lib/tenant'
import { credentialSchema } from '@/lib/validators'
import { encryptSecret } from '@/lib/crypto'

// List credentials for a project (masked)
export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const { user } = await requireUser()
  const teamIds = await teamIdsForUser(user.id)
  const project = await prisma.project.findFirst({ where: { id: params.id, teamId: { in: teamIds } } })
  if (!project) return Response.json({ error: 'Not found' }, { status: 404 })

  const creds = await prisma.credential.findMany({ where: { projectId: project.id }, orderBy: { createdAt: 'desc' } })
  return Response.json(creds.map(c => ({ id: c.id, label: c.label, username: c.username, masked: true })))
}

// Create a credential for a project
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const { user } = await requireUser()
  const teamIds = await teamIdsForUser(user.id)
  const project = await prisma.project.findFirst({ where: { id: params.id, teamId: { in: teamIds } } })
  if (!project) return Response.json({ error: 'Not found' }, { status: 404 })

  const body = await req.json()
  const parsed = credentialSchema.safeParse(body)
  if (!parsed.success) return Response.json({ error: parsed.error.format() }, { status: 400 })

  try {
    const secretEnc = encryptSecret(parsed.data.password)
    const created = await prisma.credential.create({
      data: {
        projectId: project.id,
        label: parsed.data.label,
        username: parsed.data.username || null,
        secretEnc,
      },
    })
    return Response.json({ id: created.id, label: created.label, username: created.username, masked: true }, { status: 201 })
  } catch (e: any) {
    return Response.json({ error: e?.message || 'Failed to save' }, { status: 500 })
  }
}

