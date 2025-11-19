import { prisma } from '@/lib/prisma'
import { requireUser } from '@/lib/tenant'

export async function GET() {
  const { user } = await requireUser()
  const hasModel = !!(prisma as any).notificationPreference?.findUnique
  if (!hasModel) {
    return Response.json({ emailTaskAssigned: true, emailDirectMessage: true, setupPending: true })
  }
  const pref = await prisma.notificationPreference.findUnique({ where: { userId: user.id } })
  return Response.json({ emailTaskAssigned: pref?.emailTaskAssigned ?? true, emailDirectMessage: pref?.emailDirectMessage ?? true })
}

export async function POST(req: Request) {
  const { user } = await requireUser()
  const body = await req.json().catch(() => ({}))
  const hasModel = !!(prisma as any).notificationPreference?.upsert
  if (!hasModel) {
    return Response.json({ error: 'Notifications are not fully enabled yet for this workspace.' }, { status: 503 })
  }
  const emailTaskAssigned = typeof body?.emailTaskAssigned === 'boolean' ? body.emailTaskAssigned : undefined
  const emailDirectMessage = typeof body?.emailDirectMessage === 'boolean' ? body.emailDirectMessage : undefined
  if (emailTaskAssigned === undefined && emailDirectMessage === undefined) {
    return Response.json({ error: 'No changes to save.' }, { status: 400 })
  }
  const updated = await prisma.notificationPreference.upsert({
    where: { userId: user.id },
    create: { userId: user.id, emailTaskAssigned: emailTaskAssigned ?? true, emailDirectMessage: emailDirectMessage ?? true },
    update: { emailTaskAssigned, emailDirectMessage },
  })
  return Response.json({ ok: true, pref: updated })
}
