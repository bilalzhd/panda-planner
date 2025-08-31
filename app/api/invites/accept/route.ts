import { prisma } from '@/lib/prisma'
import { requireUser } from '@/lib/tenant'
import { auth } from '@clerk/nextjs/server'

export async function POST(req: Request) {
  const { user } = await requireUser()
  const { searchParams } = new URL(req.url)
  const token = searchParams.get('token') || (await req.json().then((b) => b?.token).catch(() => undefined))
  if (!token) return Response.json({ error: 'token required' }, { status: 400 })
  const invite = await prisma.teamInvite.findUnique({ where: { token } })
  if (!invite) return Response.json({ error: 'invalid token' }, { status: 400 })
  if (invite.status !== 'PENDING' || invite.expiresAt < new Date()) return Response.json({ error: 'invite expired' }, { status: 400 })

  // Optional: verify user email matches invite.email
  if (invite.email && user.email && invite.email.toLowerCase() !== user.email.toLowerCase()) {
    return Response.json({ error: 'email mismatch' }, { status: 400 })
  }

  await prisma.$transaction([
    prisma.membership.upsert({
      where: { teamId_userId: { teamId: invite.teamId, userId: user.id } },
      update: {},
      create: { teamId: invite.teamId, userId: user.id, role: 'MEMBER' },
    }),
    prisma.teamInvite.update({ where: { token }, data: { status: 'ACCEPTED' } }),
  ])

  return Response.json({ status: 'accepted' })
}

export async function GET(req: Request) {
  // Accept via GET for convenience from email link
  const { searchParams } = new URL(req.url)
  const token = searchParams.get('token') || undefined
  if (!token) return Response.json({ error: 'token required' }, { status: 400 })

  const { userId } = auth()
  if (!userId) {
    // Redirect to sign-in and bounce back to this URL
    const redirectUrl = `/sign-in?redirect_url=${encodeURIComponent(`/api/invites/accept?token=${token}`)}`
    return new Response(null, { status: 307, headers: { Location: redirectUrl } })
  }

  // Resolve the app user via tenant helper (ensures local user row exists)
  const { user } = await requireUser()

  const invite = await prisma.teamInvite.findUnique({ where: { token } })
  if (!invite) return Response.json({ error: 'invalid token' }, { status: 400 })
  if (invite.status !== 'PENDING' || invite.expiresAt < new Date()) return Response.json({ error: 'invite expired' }, { status: 400 })
  if (invite.email && user.email && invite.email.toLowerCase() !== user.email.toLowerCase()) {
    // Still accept but note mismatch; alternatively, enforce exact match by returning error
    // return Response.json({ error: 'email mismatch' }, { status: 400 })
  }
  await prisma.$transaction([
    prisma.membership.upsert({
      where: { teamId_userId: { teamId: invite.teamId, userId: user.id } },
      update: {},
      create: { teamId: invite.teamId, userId: user.id, role: 'MEMBER' },
    }),
    prisma.teamInvite.update({ where: { token }, data: { status: 'ACCEPTED' } }),
  ])

  // Redirect into the app — show Team page after accepting
  return new Response(null, { status: 302, headers: { Location: '/team?accepted=1' } })
}
