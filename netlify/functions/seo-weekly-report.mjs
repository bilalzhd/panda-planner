// Netlify scheduled function: pings the app's cron endpoint hourly.
// The endpoint decides which projects are due (weekday + 08:00 Swedish time) and sends each once.
export default async () => {
  const base = process.env.URL || process.env.NEXT_PUBLIC_BASE_URL
  if (!base) return
  const secret = process.env.CRON_SECRET || process.env.CRON_SECRET_TOKEN || ''
  const res = await fetch(`${base}/api/cron/seo-weekly-report`, {
    method: 'POST',
    headers: secret ? { 'x-cron-secret': secret } : {},
  })
  console.log('seo-weekly-report', res.status, await res.text())
}

export const config = { schedule: '0 * * * *' }
