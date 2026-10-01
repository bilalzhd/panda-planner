"use client"
import { useCallback, useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

const MAX_POS = 30
const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

type Keyword = { id?: string; keyword: string; isPrimary: boolean; position: number | null; qualityScore: number | null; adRunning: boolean }
type Check = {
  id: string
  checkedAt: string
  impressions: number | null
  clicks: number | null
  adsRunning: boolean
  adsNotes: string | null
  notes: string | null
  keywords: Keyword[]
  checkedBy?: { name: string | null; email: string | null } | null
}
type Page = { id: string; name: string; url: string | null; primaryKeyword: string | null; checks: Check[] }
type Settings = { enabled: boolean; day: number; extraEmails: string[]; lastSentAt: string | null }
type Report = {
  from: string
  to: string
  pages: {
    id: string
    name: string
    url: string | null
    checksInRange: number
    keywords: { keyword: string; isPrimary: boolean; from: number | null | undefined; to: number | null; change: number | null; qualityScore: number | null; adRunning: boolean }[]
    clicks: { from: number | null; to: number | null }
    impressions: { from: number | null; to: number | null }
    adsRunning: boolean
    notes: string[]
  }[]
  improved: { page: string; keyword: string; from: number | null; to: number | null; change: number }[]
  declined: { page: string; keyword: string; from: number | null; to: number | null; change: number }[]
}

const pos = (p: number | null | undefined) => (p === undefined ? '–' : p === null ? `>${MAX_POS}` : `#${p}`)
const rank = (p: number | null | undefined) => (p == null ? MAX_POS + 1 : p)
const fmtDate = (d: string) => new Date(d).toLocaleDateString('sv-SE')

function Change({ change }: { change: number | null }) {
  if (change === null) return <span className="text-white/40">new</span>
  if (change > 0) return <span className="text-emerald-300">▲ {change}</span>
  if (change < 0) return <span className="text-rose-300">▼ {Math.abs(change)}</span>
  return <span className="text-white/40">–</span>
}

export function SeoPanel({ projectId, canEdit }: { projectId: string; canEdit: boolean }) {
  const [view, setView] = useState<'pages' | 'report'>('pages')
  const [pages, setPages] = useState<Page[]>([])
  const [settings, setSettings] = useState<Settings | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const api = `/api/projects/${projectId}/seo`

  const load = useCallback(async () => {
    try {
      const [p, s] = await Promise.all([
        fetch(`${api}/pages`, { cache: 'no-store' }).then((r) => r.json()),
        fetch(`${api}/settings`, { cache: 'no-store' }).then((r) => r.json()),
      ])
      setPages(p.pages || [])
      setSettings(s.error ? null : s)
    } catch {
      setError('Failed to load SEO data')
    } finally {
      setLoading(false)
    }
  }, [api])

  useEffect(() => { load() }, [load])

  if (loading) return <div className="py-4 text-sm text-white/60">Loading…</div>

  return (
    <div className="py-4 space-y-4">
      <div className="flex items-center gap-2">
        {(['pages', 'report'] as const).map((v) => (
          <button
            key={v}
            onClick={() => setView(v)}
            className={`text-sm rounded-md px-3 py-1.5 border ${view === v ? 'border-white/30 bg-white/10' : 'border-white/10 hover:bg-white/5'}`}
          >
            {v === 'pages' ? 'Pages & checks' : 'Report'}
          </button>
        ))}
      </div>
      {error && <div className="text-sm text-rose-300">{error}</div>}
      {view === 'pages' ? (
        <>
          {settings && <ReportSettings api={api} settings={settings} canEdit={canEdit} onChange={setSettings} />}
          <PagesView api={api} pages={pages} canEdit={canEdit} reload={load} />
        </>
      ) : (
        <ReportView api={api} />
      )}
    </div>
  )
}

// ---------- Weekly email settings ----------

function ReportSettings({ api, settings, canEdit, onChange }: { api: string; settings: Settings; canEdit: boolean; onChange: (s: Settings) => void }) {
  const [emails, setEmails] = useState(settings.extraEmails.join(', '))
  const [msg, setMsg] = useState<string | null>(null)

  async function save(patch: Record<string, unknown>) {
    setMsg(null)
    const res = await fetch(`${api}/settings`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(patch) })
    const data = await res.json()
    if (!res.ok) return setMsg(data.error || 'Could not save')
    onChange(data)
    setEmails(data.extraEmails.join(', '))
    setMsg('Saved')
  }

  return (
    <div className="rounded-lg border border-white/10 bg-white/[0.03] p-3 space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="text-sm font-semibold">Weekly SEO report email</div>
          <div className="text-xs text-white/60">Sent to everyone assigned to a task in this project, plus the extra recipients below (08:00 Swedish time).</div>
        </div>
        <div className="flex items-center gap-3">
          <select
            className="h-9 rounded-md border border-white/10 bg-white/5 px-2 text-sm"
            value={settings.day}
            disabled={!canEdit}
            onChange={(e) => save({ day: Number(e.target.value) })}
          >
            {[1, 2, 3, 4, 5, 6, 0].map((d) => <option key={d} value={d} className="text-black">{WEEKDAYS[d]}</option>)}
          </select>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={settings.enabled} disabled={!canEdit} onChange={(e) => save({ enabled: e.target.checked })} />
            {settings.enabled ? 'On' : 'Off'}
          </label>
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <Input
          className="max-w-md"
          placeholder="Extra recipients, comma separated (e.g. customer@example.com)"
          value={emails}
          disabled={!canEdit}
          onChange={(e) => setEmails(e.target.value)}
        />
        {canEdit && (
          <Button variant="outline" onClick={() => save({ extraEmails: emails.split(/[,;\s]+/).filter(Boolean) })}>Save recipients</Button>
        )}
        {msg && <span className="text-xs text-white/60">{msg}</span>}
        {settings.lastSentAt && <span className="text-xs text-white/40">Last sent {fmtDate(settings.lastSentAt)}</span>}
      </div>
    </div>
  )
}

// ---------- Pages ----------

function PagesView({ api, pages, canEdit, reload }: { api: string; pages: Page[]; canEdit: boolean; reload: () => void }) {
  const [name, setName] = useState('')
  const [url, setUrl] = useState('')
  const [keyword, setKeyword] = useState('')
  const [err, setErr] = useState<string | null>(null)

  async function addPage() {
    setErr(null)
    const res = await fetch(`${api}/pages`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, url, primaryKeyword: keyword }),
    })
    if (!res.ok) return setErr((await res.json()).error || 'Could not add page')
    setName(''); setUrl(''); setKeyword('')
    reload()
  }

  return (
    <div className="space-y-3">
      {canEdit && (
        <div className="rounded-lg border border-dashed border-white/15 p-3 flex flex-wrap items-end gap-2">
          <div className="flex-1 min-w-40"><div className="text-xs text-white/60 mb-1">Page name</div><Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Home, Services…" /></div>
          <div className="flex-1 min-w-48"><div className="text-xs text-white/60 mb-1">URL</div><Input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://gopbygg.se/" /></div>
          <div className="flex-1 min-w-48"><div className="text-xs text-white/60 mb-1">Primary keyword</div><Input value={keyword} onChange={(e) => setKeyword(e.target.value)} placeholder="byggfirma umeå" /></div>
          <Button onClick={addPage} disabled={!name.trim()}>Add page</Button>
          {err && <div className="w-full text-xs text-rose-300">{err}</div>}
        </div>
      )}
      {pages.length === 0 && <div className="text-sm text-white/60">No pages tracked yet. Add the pages you want to rank (e.g. Home, Services).</div>}
      {pages.map((p) => <PageCard key={p.id} api={api} page={p} canEdit={canEdit} reload={reload} />)}
    </div>
  )
}

function PageCard({ api, page, canEdit, reload }: { api: string; page: Page; canEdit: boolean; reload: () => void }) {
  const [adding, setAdding] = useState(false)
  const [showHistory, setShowHistory] = useState(false)
  const latest = page.checks[0]
  const prev = page.checks[1]
  const primary = latest?.keywords.find((k) => k.isPrimary) || latest?.keywords[0]
  const prevPrimary = prev?.keywords.find((k) => k.keyword.toLowerCase() === primary?.keyword.toLowerCase())
  const change = primary && prevPrimary ? rank(prevPrimary.position) - rank(primary.position) : null

  async function archive() {
    if (!confirm(`Remove "${page.name}" from tracking? Its history is kept.`)) return
    await fetch(`${api}/pages/${page.id}`, { method: 'DELETE' })
    reload()
  }
  async function deleteCheck(id: string) {
    if (!confirm('Delete this check?')) return
    await fetch(`${api}/checks/${id}`, { method: 'DELETE' })
    reload()
  }

  return (
    <div className="rounded-lg border border-white/10 bg-white/[0.03] p-3 space-y-3">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="font-semibold">{page.name}</div>
          {page.url && <a href={page.url} target="_blank" rel="noreferrer" className="text-xs text-white/50 hover:underline break-all">{page.url}</a>}
        </div>
        <div className="flex items-center gap-2">
          {canEdit && <Button variant="outline" onClick={() => setAdding((v) => !v)}>{adding ? 'Cancel' : 'Add check'}</Button>}
          {canEdit && <Button variant="ghost" onClick={archive} aria-label="Remove page">✕</Button>}
        </div>
      </div>

      {latest ? (
        <div className="grid sm:grid-cols-4 gap-2 text-sm">
          <Stat label={primary ? `“${primary.keyword}”` : 'Primary keyword'} value={<>{pos(primary?.position)} {change !== null && <span className="text-xs"><Change change={change} /></span>}</>} />
          <Stat label="Clicks" value={latest.clicks ?? '–'} />
          <Stat label="Impressions" value={latest.impressions ?? '–'} />
          <Stat label="Google Ads" value={latest.adsRunning ? 'Running' : 'No'} />
        </div>
      ) : (
        <div className="text-sm text-white/60">No checks yet{page.primaryKeyword ? ` — primary keyword: “${page.primaryKeyword}”` : ''}.</div>
      )}

      {adding && <CheckForm api={api} page={page} onDone={() => { setAdding(false); reload() }} />}

      {page.checks.length > 0 && (
        <div>
          <button className="text-xs text-white/60 hover:text-white" onClick={() => setShowHistory((v) => !v)}>
            {showHistory ? 'Hide' : 'Show'} history ({page.checks.length})
          </button>
          {showHistory && (
            <div className="mt-2 space-y-2">
              {page.checks.map((c) => (
                <div key={c.id} className="rounded-md border border-white/10 bg-white/5 p-2 text-xs space-y-1">
                  <div className="flex justify-between gap-2">
                    <div className="text-white/70">{fmtDate(c.checkedAt)} · {c.checkedBy?.name || c.checkedBy?.email || 'Unknown'} · {c.clicks ?? '–'} clicks · {c.impressions ?? '–'} impr.{c.adsRunning ? ' · ads' : ''}</div>
                    {canEdit && <button className="text-white/40 hover:text-rose-300" onClick={() => deleteCheck(c.id)}>Delete</button>}
                  </div>
                  <div className="flex flex-wrap gap-x-4 gap-y-1">
                    {c.keywords.map((k) => (
                      <span key={k.id} className={k.isPrimary ? 'font-semibold' : 'text-white/80'}>
                        {k.keyword}: {pos(k.position)}{k.qualityScore ? ` (QS ${k.qualityScore})` : ''}
                      </span>
                    ))}
                  </div>
                  {c.adsNotes && <div className="text-white/60">Ads: {c.adsNotes}</div>}
                  {c.notes && <div className="text-white/60 whitespace-pre-wrap">{c.notes}</div>}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function Stat({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="rounded-md border border-white/10 bg-white/5 px-3 py-2">
      <div className="text-xs text-white/50 truncate">{label}</div>
      <div className="text-base font-semibold">{value}</div>
    </div>
  )
}

type KwRow = { keyword: string; isPrimary: boolean; position: string; qualityScore: string; adRunning: boolean }

function CheckForm({ api, page, onDone }: { api: string; page: Page; onDone: () => void }) {
  const lastKeywords = page.checks[0]?.keywords ?? []
  const initial: KwRow[] = lastKeywords.length
    ? [...lastKeywords].sort((a, b) => Number(b.isPrimary) - Number(a.isPrimary)).map((k, i) => ({ keyword: k.keyword, isPrimary: i === 0 && k.isPrimary, position: '', qualityScore: '', adRunning: k.adRunning }))
    : [{ keyword: page.primaryKeyword || '', isPrimary: true, position: '', qualityScore: '', adRunning: false }]
  const [rows, setRows] = useState<KwRow[]>(initial)
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10))
  const [impressions, setImpressions] = useState('')
  const [clicks, setClicks] = useState('')
  const [adsRunning, setAdsRunning] = useState(page.checks[0]?.adsRunning ?? false)
  const [adsNotes, setAdsNotes] = useState('')
  const [notes, setNotes] = useState('')
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState<string | null>(null)

  const update = (i: number, patch: Partial<KwRow>) => setRows((r) => r.map((row, j) => (j === i ? { ...row, ...patch } : row)))

  async function submit() {
    setErr(null)
    setSaving(true)
    const keywords = rows
      .filter((r) => r.keyword.trim())
      .map((r) => ({
        keyword: r.keyword.trim(),
        isPrimary: r.isPrimary,
        position: r.position === '' ? null : Number(r.position),
        qualityScore: r.qualityScore === '' ? null : Number(r.qualityScore),
        adRunning: r.adRunning,
      }))
    const res = await fetch(`${api}/pages/${page.id}/checks`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ checkedAt: new Date(`${date}T12:00:00`).toISOString(), impressions, clicks, adsRunning, adsNotes, notes, keywords }),
    })
    setSaving(false)
    if (!res.ok) return setErr((await res.json()).error || 'Could not save check')
    onDone()
  }

  return (
    <div className="rounded-md border border-white/10 bg-black/20 p-3 space-y-3">
      <div className="text-xs text-white/60">Check rankings in incognito with a Swedish VPN. Leave position empty if the page is not in the top {MAX_POS}.</div>
      <div className="space-y-2">
        <div className="hidden sm:grid grid-cols-[1fr_90px_90px_70px] gap-2 text-xs text-white/50">
          <div>Keyword</div><div>Position</div><div>Ads QS (1–10)</div><div>Ad running</div>
        </div>
        {rows.map((r, i) => (
          <div key={i} className="grid grid-cols-2 sm:grid-cols-[1fr_90px_90px_70px_24px] gap-2 items-center">
            <Input className="col-span-2 sm:col-span-1" value={r.keyword} onChange={(e) => update(i, { keyword: e.target.value })} placeholder={r.isPrimary ? 'Primary keyword' : 'Secondary keyword'} />
            <Input type="number" min={1} max={MAX_POS} value={r.position} onChange={(e) => update(i, { position: e.target.value })} placeholder={`>${MAX_POS}`} />
            <Input type="number" min={1} max={10} value={r.qualityScore} onChange={(e) => update(i, { qualityScore: e.target.value })} />
            <input type="checkbox" checked={r.adRunning} onChange={(e) => update(i, { adRunning: e.target.checked })} aria-label="Ad running" />
            {!r.isPrimary ? <button className="text-white/40 hover:text-rose-300" onClick={() => setRows((rs) => rs.filter((_, j) => j !== i))} aria-label="Remove keyword">✕</button> : <span />}
          </div>
        ))}
        <Button variant="ghost" onClick={() => setRows((r) => [...r, { keyword: '', isPrimary: false, position: '', qualityScore: '', adRunning: false }])}>+ Secondary keyword</Button>
      </div>
      <div className="grid sm:grid-cols-4 gap-2">
        <div><div className="text-xs text-white/60 mb-1">Date</div><Input type="date" value={date} onChange={(e) => setDate(e.target.value)} /></div>
        <div><div className="text-xs text-white/60 mb-1">Clicks (Search Console)</div><Input type="number" min={0} value={clicks} onChange={(e) => setClicks(e.target.value)} /></div>
        <div><div className="text-xs text-white/60 mb-1">Impressions</div><Input type="number" min={0} value={impressions} onChange={(e) => setImpressions(e.target.value)} /></div>
        <label className="flex items-center gap-2 text-sm sm:pt-6"><input type="checkbox" checked={adsRunning} onChange={(e) => setAdsRunning(e.target.checked)} /> Google Ads running</label>
      </div>
      {adsRunning && <Input value={adsNotes} onChange={(e) => setAdsNotes(e.target.value)} placeholder="Ads notes (campaign, budget…)" />}
      <textarea className="w-full rounded-md border border-white/10 bg-white/5 p-2 text-sm" rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="What did we improve on this page? (shown in reports)" />
      {err && <div className="text-xs text-rose-300">{err}</div>}
      <Button onClick={submit} disabled={saving || !rows.some((r) => r.keyword.trim())}>{saving ? 'Saving…' : 'Save check'}</Button>
    </div>
  )
}

// ---------- Report ----------

function monthRange(ym: string) {
  const [y, m] = ym.split('-').map(Number)
  const last = new Date(y, m, 0).getDate()
  return { from: `${ym}-01`, to: `${ym}-${String(last).padStart(2, '0')}` }
}

function ReportView({ api }: { api: string }) {
  const thisMonth = new Date().toISOString().slice(0, 7)
  const [range, setRange] = useState(monthRange(thisMonth))
  const [report, setReport] = useState<Report | null>(null)
  const [err, setErr] = useState<string | null>(null)

  const run = useCallback(async (r: { from: string; to: string }) => {
    setErr(null)
    const res = await fetch(`${api}/report?from=${r.from}&to=${r.to}`, { cache: 'no-store' })
    const data = await res.json()
    if (!res.ok) return setErr(data.error || 'Could not build report')
    setReport(data)
  }, [api])

  useEffect(() => { run(range) }, [])  // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end gap-2 print:hidden">
        <div><div className="text-xs text-white/60 mb-1">Month</div><Input type="month" defaultValue={thisMonth} onChange={(e) => { if (e.target.value) { const r = monthRange(e.target.value); setRange(r); run(r) } }} /></div>
        <div><div className="text-xs text-white/60 mb-1">From</div><Input type="date" value={range.from} onChange={(e) => setRange({ ...range, from: e.target.value })} /></div>
        <div><div className="text-xs text-white/60 mb-1">To</div><Input type="date" value={range.to} onChange={(e) => setRange({ ...range, to: e.target.value })} /></div>
        <Button variant="outline" onClick={() => run(range)}>Update</Button>
        <Button variant="outline" onClick={() => window.print()}>Print / PDF</Button>
      </div>
      {err && <div className="text-sm text-rose-300">{err}</div>}
      {report && (
        <div className="space-y-4">
          <div className="text-sm text-white/70">{fmtDate(report.from)} – {fmtDate(report.to)}</div>
          <div className="grid sm:grid-cols-2 gap-3">
            <MoveList title="Improved" tone="text-emerald-300" items={report.improved} />
            <MoveList title="Declined" tone="text-rose-300" items={report.declined} />
          </div>
          {report.pages.map((p) => (
            <div key={p.id} className="rounded-lg border border-white/10 bg-white/[0.03] p-3 space-y-2">
              <div className="font-semibold">{p.name} {p.url && <span className="text-xs font-normal text-white/50">{p.url}</span>}</div>
              {p.keywords.length === 0 ? (
                <div className="text-sm text-white/60">No checks in this period.</div>
              ) : (
                <>
                  <table className="w-full text-sm">
                    <thead><tr className="text-xs text-white/50 text-left"><th className="font-normal py-1">Keyword</th><th className="font-normal">Before</th><th className="font-normal">Now</th><th className="font-normal">Change</th><th className="font-normal">QS</th></tr></thead>
                    <tbody>
                      {p.keywords.map((k, i) => (
                        <tr key={i} className="border-t border-white/5">
                          <td className={`py-1 ${k.isPrimary ? 'font-semibold' : ''}`}>{k.keyword}</td>
                          <td>{pos(k.from)}</td><td>{pos(k.to)}</td><td><Change change={k.change} /></td><td>{k.qualityScore ?? '–'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  <div className="text-xs text-white/60">
                    Clicks {p.clicks.from ?? '–'} → {p.clicks.to ?? '–'} · Impressions {p.impressions.from ?? '–'} → {p.impressions.to ?? '–'}{p.adsRunning ? ' · Google Ads running' : ''}
                  </div>
                  {p.notes.length > 0 && (
                    <ul className="list-disc pl-5 text-sm text-white/80">{p.notes.map((n, i) => <li key={i} className="whitespace-pre-wrap">{n}</li>)}</ul>
                  )}
                </>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function MoveList({ title, tone, items }: { title: string; tone: string; items: Report['improved'] }) {
  return (
    <div className="rounded-lg border border-white/10 bg-white/[0.03] p-3">
      <div className={`text-sm font-semibold mb-1 ${tone}`}>{title} ({items.length})</div>
      {items.length === 0 ? <div className="text-sm text-white/50">None</div> : (
        <ul className="text-sm space-y-0.5">
          {items.map((i, n) => <li key={n}>{i.page}: “{i.keyword}” {pos(i.from)} → {pos(i.to)}</li>)}
        </ul>
      )}
    </div>
  )
}
