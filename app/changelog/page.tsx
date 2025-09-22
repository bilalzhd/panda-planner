import fs from 'fs/promises'
import path from 'path'

export const dynamic = 'force-dynamic'

async function loadChangelog() {
  const root = process.cwd()
  const changelogPath = path.join(root, 'CHANGELOG.md')
  const readmePath = path.join(root, 'README.md')

  try {
    const buf = await fs.readFile(changelogPath, 'utf8')
    if (buf.trim().length > 0) return buf
  } catch {}

  try {
    const readme = await fs.readFile(readmePath, 'utf8')
    const idx = readme.indexOf('## Changelog')
    if (idx >= 0) return readme.slice(idx)
    return readme
  } catch {}
  return '# Changelog\n\nNo entries yet.'
}

export default async function ChangelogPage() {
  const content = await loadChangelog()
  return (
    <div className="prose prose-invert max-w-none">
      <pre className="whitespace-pre-wrap rounded-lg border border-white/10 bg-white/5 p-4 text-sm">{content}</pre>
    </div>
  )
}

