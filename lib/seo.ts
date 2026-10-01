import { prisma } from '@/lib/prisma'
import { requireUser, projectWhereForUser, ensureProjectPermission } from '@/lib/tenant'

// Anything outside the top 30 (or unchecked) is treated as this value when comparing.
export const SEO_MAX_POSITION = 30
export const SEO_TIMEZONE = 'Europe/Stockholm'

// Resolve the signed-in user and verify they can access the project at the given level.
export async function requireSeoProject(projectId: string, level: 'READ' | 'EDIT') {
  const { user, workspaceId } = await requireUser()
  if (!workspaceId) return { error: Response.json({ error: 'Select a workspace first' }, { status: 400 }) } as const
  const projectWhere = await projectWhereForUser(user.id, { includeArchived: true })
  const project = await prisma.project.findFirst({ where: { id: projectId, AND: [projectWhere] } })
  if (!project) return { error: Response.json({ error: 'Not found' }, { status: 404 }) } as const
  const ok = await ensureProjectPermission(user, project.id, level)
  if (!ok) return { error: Response.json({ error: 'Forbidden' }, { status: 403 }) } as const
  return { user, project } as const
}

const rankValue = (pos: number | null | undefined) => (pos == null ? SEO_MAX_POSITION + 1 : pos)

export type ReportKeyword = {
  keyword: string
  isPrimary: boolean
  from: number | null | undefined // undefined = not tracked at start
  to: number | null
  change: number | null // positive = improved
  qualityScore: number | null
  adRunning: boolean
}

export type ReportPage = {
  id: string
  name: string
  url: string | null
  checksInRange: number
  fromDate: string | null
  toDate: string | null
  keywords: ReportKeyword[]
  clicks: { from: number | null; to: number | null }
  impressions: { from: number | null; to: number | null }
  adsRunning: boolean
  notes: string[]
}

export type SeoReport = {
  projectId: string
  projectName: string
  from: string
  to: string
  pages: ReportPage[]
  improved: { page: string; keyword: string; from: number | null; to: number | null; change: number }[]
  declined: { page: string; keyword: string; from: number | null; to: number | null; change: number }[]
}

type CheckWithKeywords = Awaited<ReturnType<typeof loadChecks>>[number]['checks'][number]

async function loadChecks(projectId: string, to: Date) {
  return prisma.seoPage.findMany({
    where: { projectId, archivedAt: null },
    orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
    include: {
      checks: {
        where: { checkedAt: { lte: to } },
        orderBy: { checkedAt: 'asc' },
        include: { keywords: true },
      },
    },
  })
}

// Compare the state at the start of the range (latest check before `from`, or the first check
// inside the range if none exists) with the state at the end (latest check up to `to`).
export async function buildSeoReport(projectId: string, from: Date, to: Date): Promise<SeoReport> {
  const project = await prisma.project.findUnique({ where: { id: projectId }, select: { name: true } })
  const pages = await loadChecks(projectId, to)
  const improved: SeoReport['improved'] = []
  const declined: SeoReport['declined'] = []

  const out: ReportPage[] = pages.map((page) => {
    const inRange = page.checks.filter((c) => c.checkedAt >= from)
    const before = page.checks.filter((c) => c.checkedAt < from)
    const end: CheckWithKeywords | undefined = page.checks[page.checks.length - 1]
    const start: CheckWithKeywords | undefined = before[before.length - 1] ?? inRange[0]
    const hasEnd = !!end && end.checkedAt >= from
    const effectiveEnd = hasEnd ? end : undefined

    const startMap = new Map((start?.keywords ?? []).map((k) => [k.keyword.trim().toLowerCase(), k]))
    const keywords: ReportKeyword[] = (effectiveEnd?.keywords ?? []).map((k) => {
      const prev = start && start.id !== effectiveEnd!.id ? startMap.get(k.keyword.trim().toLowerCase()) : undefined
      const change = prev ? rankValue(prev.position) - rankValue(k.position) : null
      if (change && change > 0) improved.push({ page: page.name, keyword: k.keyword, from: prev!.position, to: k.position, change })
      if (change && change < 0) declined.push({ page: page.name, keyword: k.keyword, from: prev!.position, to: k.position, change })
      return {
        keyword: k.keyword,
        isPrimary: k.isPrimary,
        from: prev ? prev.position : undefined,
        to: k.position,
        change,
        qualityScore: k.qualityScore,
        adRunning: k.adRunning,
      }
    })
    keywords.sort((a, b) => Number(b.isPrimary) - Number(a.isPrimary))
    const compareStart = start && effectiveEnd && start.id !== effectiveEnd.id ? start : undefined

    return {
      id: page.id,
      name: page.name,
      url: page.url,
      checksInRange: inRange.length,
      fromDate: compareStart ? compareStart.checkedAt.toISOString() : null,
      toDate: effectiveEnd ? effectiveEnd.checkedAt.toISOString() : null,
      keywords,
      clicks: { from: compareStart?.clicks ?? null, to: effectiveEnd?.clicks ?? null },
      impressions: { from: compareStart?.impressions ?? null, to: effectiveEnd?.impressions ?? null },
      adsRunning: !!effectiveEnd?.adsRunning,
      notes: inRange.map((c) => c.notes).filter((n): n is string => !!n),
    }
  })

  improved.sort((a, b) => b.change - a.change)
  declined.sort((a, b) => a.change - b.change)
  return {
    projectId,
    projectName: project?.name || '',
    from: from.toISOString(),
    to: to.toISOString(),
    pages: out,
    improved,
    declined,
  }
}

// --- Stockholm time helpers (weekly email scheduling) ---

export function stockholmParts(d: Date) {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: SEO_TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    hourCycle: 'h23',
    weekday: 'short',
  }).formatToParts(d)
  const get = (t: string) => parts.find((p) => p.type === t)?.value || ''
  const weekday = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].indexOf(get('weekday'))
  return { dateKey: `${get('year')}-${get('month')}-${get('day')}`, hour: Number(get('hour')), weekday }
}

export function formatPosition(pos: number | null | undefined) {
  if (pos === undefined) return '–'
  if (pos === null) return `>${SEO_MAX_POSITION}`
  return `#${pos}`
}
