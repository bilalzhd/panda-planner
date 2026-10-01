import { NextRequest } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { requireSeoProject } from '@/lib/seo'

type Ctx = { params: { id: string } }

const patchSchema = z.object({
  enabled: z.boolean().optional(),
  day: z.number().int().min(0).max(6).optional(),
  extraEmails: z.array(z.string().trim().toLowerCase().email()).max(20).optional(),
})

function shape(p: { seoReportEnabled: boolean; seoReportDay: number; seoReportExtraEmails: string[]; seoReportLastSentAt: Date | null }) {
  return { enabled: p.seoReportEnabled, day: p.seoReportDay, extraEmails: p.seoReportExtraEmails, lastSentAt: p.seoReportLastSentAt }
}

export async function GET(_req: NextRequest, { params }: Ctx) {
  const ctx = await requireSeoProject(params.id, 'READ')
  if ('error' in ctx) return ctx.error
  return Response.json(shape(ctx.project))
}

export async function PATCH(req: NextRequest, { params }: Ctx) {
  const ctx = await requireSeoProject(params.id, 'EDIT')
  if ('error' in ctx) return ctx.error
  const parsed = patchSchema.safeParse(await req.json().catch(() => ({})))
  if (!parsed.success) return Response.json({ error: 'Invalid input (check the email addresses)' }, { status: 400 })
  const d = parsed.data
  const updated = await prisma.project.update({
    where: { id: params.id },
    data: {
      seoReportEnabled: d.enabled,
      seoReportDay: d.day,
      seoReportExtraEmails: d.extraEmails ? Array.from(new Set(d.extraEmails)) : undefined,
    },
  })
  return Response.json(shape(updated))
}
