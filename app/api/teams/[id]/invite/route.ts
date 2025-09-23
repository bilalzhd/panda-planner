import { prisma } from '@/lib/prisma'
import { requireUser } from '@/lib/tenant'
import { randomBytes } from 'crypto'
import { sendInviteEmail } from '@/lib/email'

type Params = { params: { id: string } }

export async function POST(req: Request, { params }: Params) {
  const { user } = await requireUser()
  const team = await prisma.team.findFirst({ where: { id: params.id, members: { some: { userId: user.id } } } })
  if (!team) return Response.json({ error: 'Not found' }, { status: 404 })
  const body = await req.json()
  const email = String(body?.email || '').toLowerCase().trim()
  if (!email) return Response.json({ error: 'email required' }, { status: 400 })

  // If the user already exists and is already a member of this team, block with a helpful error
  const existingUser = await prisma.user.findUnique({ where: { email } })
  if (existingUser) {
    const membership = await prisma.membership.findFirst({ where: { teamId: team.id, userId: existingUser.id } })
    if (membership) {
      return Response.json({ error: 'User is already a member of this team.' }, { status: 400 })
    }
  }

  // Prevent duplicate pending invites for the same email and team
  const pending = await prisma.teamInvite.findFirst({ where: { teamId: team.id, email, status: 'PENDING' } })
  if (pending) {
    return Response.json({ error: 'An invite is already pending for this email.' }, { status: 400 })
  }

  const token = randomBytes(16).toString('hex')
  const expiresAt = new Date(Date.now() + 7 * 24 * 3600 * 1000)
  const invite = await prisma.teamInvite.create({
    data: {
      teamId: team.id,
      email,
      token,
      invitedById: user.id,
      expiresAt,
    },
  })
  // Build an absolute accept URL. Prefer configured base, else derive from request origin.
  const baseFromEnv = process.env.NEXT_PUBLIC_BASE_URL && process.env.NEXT_PUBLIC_BASE_URL.trim()
  const origin = new URL(req.url).origin
  const base = baseFromEnv || origin
  const acceptUrl = `${base}/invites/accept?token=${token}`
  let mailSent = false
  let mailError: any = null
  try {
    await sendInviteEmail(email, acceptUrl)
    mailSent = true
  } catch (e: any) {
    console.error('Invite email failed', e)
    mailError = e?.message || String(e)
  }
  return Response.json({ invite, acceptUrl, mailSent, error: mailError }, { status: 201 })
}
