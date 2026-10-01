import { NextRequest } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { requireSeoProject } from '@/lib/seo'

type Ctx = { params: { id: string; pageId: string } }

const patchSchema = z.object({
  name: z.string().trim().min(1).max(120).optional(),
  url: z.string().trim().max(500).nullable().optional(),
  primaryKeyword: z.string().trim().max(200).nullable().optional(),
})

export async function PATCH(req: NextRequest, { params }: Ctx) {
  const ctx = await requireSeoProject(params.id, 'EDIT')
  if ('error' in ctx) return ctx.error
  const parsed = patchSchema.safeParse(await req.json().catch(() => ({})))
  if (!parsed.success) return Response.json({ error: 'Invalid input' }, { status: 400 })
  const page = await prisma.seoPage.findFirst({ where: { id: params.pageId, projectId: params.id } })
  if (!page) return Response.json({ error: 'Not found' }, { status: 404 })
  const d = parsed.data
  const updated = await prisma.seoPage.update({
    where: { id: page.id },
    data: {
      name: d.name,
      url: d.url === undefined ? undefined : d.url || null,
      primaryKeyword: d.primaryKeyword === undefined ? undefined : d.primaryKeyword || null,
    },
  })
  return Response.json({ page: updated })
}

// Pages are archived (hidden) rather than deleted so their history is preserved.
export async function DELETE(_req: NextRequest, { params }: Ctx) {
  const ctx = await requireSeoProject(params.id, 'EDIT')
  if ('error' in ctx) return ctx.error
  const page = await prisma.seoPage.findFirst({ where: { id: params.pageId, projectId: params.id } })
  if (!page) return Response.json({ error: 'Not found' }, { status: 404 })
  await prisma.seoPage.update({ where: { id: page.id }, data: { archivedAt: new Date() } })
  return Response.json({ ok: true })
}
