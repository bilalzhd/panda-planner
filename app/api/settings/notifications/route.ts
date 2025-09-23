import { prisma } from '@/lib/prisma'
import { requireUser } from '@/lib/tenant'

export async function GET() {
  const { user } = await requireUser()
  const hasModel = !!(prisma as any).notificationPreference?.findUnique
  if (!hasModel) {
    return Response.json({ emailTaskAssigned: true, emailTeamMessage: true, setupPending: true })
  }
  const pref = await prisma.notificationPreference.findUnique({ where: { userId: user.id } })
  return Response.json({ emailTaskAssigned: pref?.emailTaskAssigned ?? true, emailTeamMessage: pref?.emailTeamMessage ?? true })
}

export async function POST(req: Request) {
  const { user } = await requireUser()
  const body = await req.json().catch(() => ({}))
  const hasModel = !!(prisma as any).notificationPreference?.upsert
  if (!hasModel) {
    return Response.json({ error: 'Notifications are not fully enabled yet for this workspace.' }, { status: 503 })
  }
  const emailTaskAssigned = typeof body?.emailTaskAssigned === 'boolean' ? body.emailTaskAssigned : undefined
  const emailTeamMessage = typeof body?.emailTeamMessage === 'boolean' ? body.emailTeamMessage : undefined
  if (emailTaskAssigned === undefined && emailTeamMessage === undefined) {
    return Response.json({ error: 'No changes to save.' }, { status: 400 })
  }
  const updated = await prisma.notificationPreference.upsert({
    where: { userId: user.id },
    create: { userId: user.id, emailTaskAssigned: emailTaskAssigned ?? true, emailTeamMessage: emailTeamMessage ?? true },
    update: { emailTaskAssigned, emailTeamMessage },
  })
  return Response.json({ ok: true, pref: updated })
}
