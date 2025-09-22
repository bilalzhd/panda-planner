import { getTransport, getEmailConfigSummary } from '@/lib/email'

export const dynamic = 'force-dynamic'

export async function GET() {
  const meta = getEmailConfigSummary()
  const res: any = { meta }
  try {
    const tx = getTransport()
    await tx.verify()
    res.verify = { ok: true }
  } catch (e: any) {
    res.verify = { ok: false, error: e?.message || String(e) }
  }
  return Response.json(res)
}

