import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireSeoProject } from '@/lib/seo'

type Ctx = { params: { id: string; checkId: string } }

export async function DELETE(_req: NextRequest, { params }: Ctx) {
  const ctx = await requireSeoProject(params.id, 'EDIT')
  if ('error' in ctx) return ctx.error
  const check = await prisma.seoCheck.findFirst({ where: { id: params.checkId, page: { projectId: params.id } } })
  if (!check) return Response.json({ error: 'Not found' }, { status: 404 })
  await prisma.seoCheck.delete({ where: { id: check.id } })
  return Response.json({ ok: true })
}
