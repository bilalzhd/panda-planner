import { NextRequest } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { requireSeoProject, SEO_MAX_POSITION } from '@/lib/seo'

type Ctx = { params: { id: string; pageId: string } }

const intOrNull = (min: number, max: number) =>
  z.preprocess((v) => (v === '' || v === undefined ? null : v), z.coerce.number().int().min(min).max(max).nullable())

const checkSchema = z.object({
  checkedAt: z.string().optional(),
  impressions: intOrNull(0, 1_000_000_000),
  clicks: intOrNull(0, 1_000_000_000),
  adsRunning: z.boolean().default(false),
  adsNotes: z.string().trim().max(1000).optional().nullable(),
  notes: z.string().trim().max(5000).optional().nullable(),
  keywords: z
    .array(
      z.object({
        keyword: z.string().trim().min(1).max(200),
        isPrimary: z.boolean().default(false),
        // null = not in the top 30
        position: intOrNull(1, SEO_MAX_POSITION),
        qualityScore: intOrNull(1, 10),
        adRunning: z.boolean().default(false),
      }),
    )
    .min(1)
    .max(50),
})

export async function POST(req: NextRequest, { params }: Ctx) {
  const ctx = await requireSeoProject(params.id, 'EDIT')
  if ('error' in ctx) return ctx.error
  const parsed = checkSchema.safeParse(await req.json().catch(() => ({})))
  if (!parsed.success) return Response.json({ error: 'Invalid input: add at least one keyword' }, { status: 400 })
  const page = await prisma.seoPage.findFirst({ where: { id: params.pageId, projectId: params.id, archivedAt: null } })
  if (!page) return Response.json({ error: 'Not found' }, { status: 404 })
  const d = parsed.data
  const checkedAt = d.checkedAt ? new Date(d.checkedAt) : new Date()
  if (Number.isNaN(checkedAt.getTime())) return Response.json({ error: 'Invalid date' }, { status: 400 })

  const check = await prisma.seoCheck.create({
    data: {
      pageId: page.id,
      checkedAt,
      checkedById: ctx.user.id,
      impressions: d.impressions,
      clicks: d.clicks,
      adsRunning: d.adsRunning,
      adsNotes: d.adsNotes || null,
      notes: d.notes || null,
      keywords: { create: d.keywords },
    },
    include: { keywords: true, checkedBy: { select: { id: true, name: true, email: true } } },
  })

  // Remember the primary keyword so the next check is pre-filled.
  const primary = d.keywords.find((k) => k.isPrimary)
  if (primary && primary.keyword !== page.primaryKeyword) {
    await prisma.seoPage.update({ where: { id: page.id }, data: { primaryKeyword: primary.keyword } })
  }
  return Response.json({ check })
}
