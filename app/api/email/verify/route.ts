import { getTransport, getEmailConfigSummary } from '@/lib/email'

export const dynamic = 'force-dynamic'

export async function GET(req: Request) {
  const meta = getEmailConfigSummary()
  const res: any = { meta }
  try {
    const tx = getTransport()
    await tx.verify()
    res.verify = { ok: true }

    // Optional: send a test email when requested.
    const { searchParams } = new URL(req.url)
    const send = searchParams.get('send')
    if (send && send !== '0' && send !== 'false') {
      const toEnv = process.env.EMAIL_TEST_TO || process.env.EMAIL_FROM || ''
      const to = (searchParams.get('to') || toEnv).trim()
      if (to) {
        try {
          const from = process.env.EMAIL_FROM || 'noreply@example.com'
          const now = new Date().toISOString()
          const subject = `Test email · ${now}`
          const text = `This is a test email sent at ${now}.\nMethod=${meta.method} Host=${meta.host}:${meta.port}`
          const info = await tx.sendMail({ from, to, subject, text })
          res.test = {
            ok: true,
            to,
            messageId: (info as any)?.messageId,
            accepted: (info as any)?.accepted,
            rejected: (info as any)?.rejected,
            envelope: (info as any)?.envelope,
          }
        } catch (e: any) {
          res.test = { ok: false, error: e?.message || String(e) }
        }
      } else {
        res.test = { ok: false, error: 'No recipient. Set EMAIL_TEST_TO or provide ?to=' }
      }
    }
  } catch (e: any) {
    res.verify = { ok: false, error: e?.message || String(e) }
  }
  return Response.json(res)
}
