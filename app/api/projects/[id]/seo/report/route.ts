import { NextRequest } from 'next/server'
import { buildSeoReport, requireSeoProject } from '@/lib/seo'

type Ctx = { params: { id: string } }

// GET ?from=YYYY-MM-DD&to=YYYY-MM-DD (defaults to the last 30 days)
export async function GET(req: NextRequest, { params }: Ctx) {
  const ctx = await requireSeoProject(params.id, 'READ')
  if ('error' in ctx) return ctx.error
  const sp = req.nextUrl.searchParams
  const to = sp.get('to') ? new Date(`${sp.get('to')}T23:59:59.999Z`) : new Date()
  const from = sp.get('from') ? new Date(`${sp.get('from')}T00:00:00.000Z`) : new Date(to.getTime() - 30 * 86400000)
  if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime()) || from > to) {
    return Response.json({ error: 'Invalid date range' }, { status: 400 })
  }
  return Response.json(await buildSeoReport(params.id, from, to))
}
