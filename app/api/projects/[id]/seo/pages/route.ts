import { NextRequest } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { requireSeoProject } from '@/lib/seo'

type Ctx = { params: { id: string } }

const createSchema = z.object({
  name: z.string().trim().min(1).max(120),
  url: z.string().trim().max(500).optional().nullable(),
  primaryKeyword: z.string().trim().max(200).optional().nullable(),
})

export async function GET(_req: NextRequest, { params }: Ctx) {
  const ctx = await requireSeoProject(params.id, 'READ')
  if ('error' in ctx) return ctx.error
  const pages = await prisma.seoPage.findMany({
    where: { projectId: params.id, archivedAt: null },
    orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
    include: {
      checks: {
        orderBy: { checkedAt: 'desc' },
        include: { keywords: true, checkedBy: { select: { id: true, name: true, email: true } } },
      },
    },
  })
  return Response.json({ pages })
}

export async function POST(req: NextRequest, { params }: Ctx) {
  const ctx = await requireSeoProject(params.id, 'EDIT')
  if ('error' in ctx) return ctx.error
  const parsed = createSchema.safeParse(await req.json().catch(() => ({})))
  if (!parsed.success) return Response.json({ error: 'Page name is required' }, { status: 400 })
  const count = await prisma.seoPage.count({ where: { projectId: params.id } })
  const page = await prisma.seoPage.create({
    data: {
      projectId: params.id,
      name: parsed.data.name,
      url: parsed.data.url || null,
      primaryKeyword: parsed.data.primaryKeyword || null,
      sortOrder: count,
    },
  })
  return Response.json({ page: { ...page, checks: [] } })
}
