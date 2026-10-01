import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { sendSeoReportEmail } from '@/lib/email'
import { buildSeoReport, stockholmParts } from '@/lib/seo'

// Called hourly by the Netlify scheduled function. A project's report goes out once on its
// configured weekday (Swedish time) from 08:00 onward, so a missed run is picked up later that day.
const SEND_HOUR = 8

function isAuthorized(req: NextRequest) {
  const secret = process.env.CRON_SECRET || process.env.CRON_SECRET_TOKEN || ''
  // Public route (see middleware.ts), so fail closed when no secret is configured.
  if (!secret) return false
  const header = req.headers.get('x-cron-secret') || req.headers.get('authorization') || ''
  return header === secret || header === `Bearer ${secret}`
}

export async function POST(req: NextRequest) {
  if (!isAuthorized(req)) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const now = new Date()
  const today = stockholmParts(now)
  if (today.hour < SEND_HOUR) return Response.json({ sent: 0, skipped: 'before send hour' })

  const projects = await prisma.project.findMany({
    where: { seoReportEnabled: true, seoReportDay: today.weekday, archivedAt: null },
    include: {
      tasks: { select: { assignedTo: { select: { email: true } } } },
    },
  })

  let sent = 0
  const errors: { projectId: string; error: string }[] = []
  for (const project of projects) {
    if (project.seoReportLastSentAt && stockholmParts(project.seoReportLastSentAt).dateKey === today.dateKey) continue

    const recipients = new Set<string>(project.seoReportExtraEmails.map((e) => e.toLowerCase()))
    for (const t of project.tasks) for (const u of t.assignedTo) if (u.email) recipients.add(u.email.toLowerCase())
    if (recipients.size === 0) continue

    try {
      const from = new Date(now.getTime() - 7 * 86400000)
      const report = await buildSeoReport(project.id, from, now)
      if (report.pages.length === 0) continue
      const fmt = (d: Date) => d.toLocaleDateString('sv-SE', { timeZone: 'Europe/Stockholm' })
      await sendSeoReportEmail({ to: Array.from(recipients), report, periodLabel: `${fmt(from)} – ${fmt(now)}` })
      await prisma.project.update({ where: { id: project.id }, data: { seoReportLastSentAt: now } })
      sent += 1
    } catch (e: any) {
      errors.push({ projectId: project.id, error: String(e?.message || e) })
    }
  }
  return Response.json({ sent, errors })
}
