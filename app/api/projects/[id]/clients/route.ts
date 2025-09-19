import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireUser } from '@/lib/tenant'
import { randomBytes } from 'crypto'
import { sendInviteEmail } from '@/lib/email'

type Ctx = { params: { id: string } }

async function requireProjectManager(projectId: string, userId: string) {
  return prisma.project.findFirst({
    where: { id: projectId, team: { members: { some: { userId } } } },
    include: { team: true },
  })
}

export async function GET(_req: NextRequest, { params }: Ctx) {
  const { user } = await requireUser()
  const project = await requireProjectManager(params.id, user.id)
  if (!project) return Response.json({ error: 'Not found' }, { status: 404 })
  const [accesses, invites] = await Promise.all([
    prisma.projectAccess.findMany({
      where: { projectId: project.id },
      include: { user: true },
      orderBy: { createdAt: 'asc' },
    }),
    prisma.teamInvite.findMany({
      where: { projectId: project.id, status: 'PENDING' },
      orderBy: { createdAt: 'desc' },
    }),
  ])
  return Response.json({
    clients: accesses.map((a) => ({
      id: a.userId,
      name: a.user.name,
      email: a.user.email,
      image: a.user.image,
      accessId: a.id,
      role: a.role,
    })),
    invites,
  })
}

export async function POST(req: NextRequest, { params }: Ctx) {
  const { user } = await requireUser()
  const project = await requireProjectManager(params.id, user.id)
  if (!project) return Response.json({ error: 'Not found' }, { status: 404 })
  const body = await req.json().catch(() => ({}))
  const email = String(body?.email || '').toLowerCase().trim()
  if (!email) return Response.json({ error: 'email required' }, { status: 400 })

  const existingUser = await prisma.user.findUnique({ where: { email } })
  if (existingUser) {
    const alreadyMember = await prisma.membership.findFirst({ where: { teamId: project.teamId, userId: existingUser.id } })
    if (alreadyMember) {
      return Response.json({ error: 'User is already part of the team' }, { status: 400 })
    }
    const existingAccess = await prisma.projectAccess.findUnique({ where: { projectId_userId: { projectId: project.id, userId: existingUser.id } } })
    if (existingAccess) {
      return Response.json({ error: 'User already has access' }, { status: 400 })
    }
    const created = await prisma.projectAccess.create({ data: { projectId: project.id, userId: existingUser.id, role: 'CLIENT' } })
    return Response.json({
      client: {
        id: existingUser.id,
        name: existingUser.name,
        email: existingUser.email,
        image: existingUser.image,
        accessId: created.id,
        role: created.role,
      },
      invited: false,
    }, { status: 201 })
  }

  const pending = await prisma.teamInvite.findFirst({ where: { projectId: project.id, email, status: 'PENDING' } })
  if (pending) {
    return Response.json({ error: 'Invite already pending', invite: pending }, { status: 400 })
  }

  const token = randomBytes(16).toString('hex')
  const expiresAt = new Date(Date.now() + 7 * 24 * 3600 * 1000)
  const invite = await prisma.teamInvite.create({
    data: {
      teamId: project.teamId,
      projectId: project.id,
      email,
      token,
      invitedById: user.id,
      expiresAt,
      type: 'PROJECT_CLIENT',
    },
  })

  const baseFromEnv = process.env.NEXT_PUBLIC_BASE_URL && process.env.NEXT_PUBLIC_BASE_URL.trim()
  const origin = new URL(req.url).origin
  const base = baseFromEnv || origin
  const acceptUrl = `${base}/invites/accept?token=${token}`
  let mailSent = false
  let mailError: any = null
  try {
    await sendInviteEmail(email, acceptUrl, { projectName: project.name })
    mailSent = true
  } catch (e: any) {
    console.error('Invite email failed', e)
    mailError = e?.message || String(e)
  }

  return Response.json({ invite, acceptUrl, mailSent, error: mailError }, { status: 201 })
}

export async function DELETE(req: NextRequest, { params }: Ctx) {
  const { user } = await requireUser()
  const project = await requireProjectManager(params.id, user.id)
  if (!project) return Response.json({ error: 'Not found' }, { status: 404 })
  const { searchParams } = new URL(req.url)
  const userId = searchParams.get('userId')
  if (!userId) return Response.json({ error: 'userId required' }, { status: 400 })
  await prisma.projectAccess.deleteMany({ where: { projectId: project.id, userId } })
  return new Response(null, { status: 204 })
}
