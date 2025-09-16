import fs from 'fs/promises'

export const dynamic = 'force-dynamic'

type Version = { title: string; items: { text: string; subs?: string[] }[] }

function parseChangelog(src: string): Version[] {
  const lines = src.split(/\r?\n/)
  const start = lines.findIndex((l) => /^\s*Changelog\s*$/i.test(l))
  if (start === -1) return []
  const out: Version[] = []
  let cur: Version | null = null
  for (let i = start + 1; i < lines.length; i++) {
    const line = lines[i]
    if (!line.trim()) continue
    if (/^v\d+\.\d+\.\d+/.test(line)) {
      if (cur) out.push(cur)
      cur = { title: line.trim(), items: [] }
      continue
    }
    if (line.startsWith('- ')) {
      cur?.items.push({ text: line.slice(2).trim() })
      continue
    }
    if (line.startsWith('  - ')) {
      const last = cur?.items[cur.items.length - 1]
      if (last) {
        last.subs = last.subs || []
        last.subs.push(line.slice(4).trim())
      }
      continue
    }
    // fallthrough: treat as continuation of last bullet
    const last = cur?.items[cur.items.length - 1]
    if (last) last.text += ` ${line.trim()}`
  }
  if (cur) out.push(cur)
  return out
}

export default async function ChangelogPage() {
  let content = ''
  try {
    content = await fs.readFile('README.md', 'utf8')
  } catch {}
  const versions = parseChangelog(content)

  return (
    <div className="mx-auto max-w-3xl py-8">
      <h1 className="text-2xl font-semibold">Changelog</h1>
      <p className="mt-1 text-white/70 text-sm">Release notes and recent updates.</p>

      {versions.length === 0 ? (
        <div className="mt-6 rounded-lg border border-white/10 bg-white/5 p-4 text-white/70">
          No changelog entries found.
        </div>
      ) : (
        <div className="mt-6 space-y-6">
          {versions.map((v) => (
            <div key={v.title} className="rounded-lg border border-white/10 bg-white/5 p-4">
              <div className="mb-2 text-lg font-medium">{v.title}</div>
              <ul className="list-disc space-y-1 pl-5 text-sm">
                {v.items.map((it, idx) => (
                  <li key={idx} className="text-white/90">
                    <span>{it.text}</span>
                    {it.subs && it.subs.length > 0 && (
                      <ul className="mt-1 list-[circle] space-y-1 pl-5 text-white/70">
                        {it.subs.map((s, j) => (
                          <li key={j}>{s}</li>
                        ))}
                      </ul>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

