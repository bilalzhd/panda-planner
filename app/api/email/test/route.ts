import { sendInviteEmail } from '@/lib/email'

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const to = searchParams.get('to')
  if (!to) return Response.json({ error: 'Provide ?to=email@example.com' }, { status: 400 })
  try {
    const info = await sendInviteEmail(to, `${process.env.NEXT_PUBLIC_BASE_URL || ''}/api/invites/accept?token=test-token`)
    return Response.json({ ok: true, info })
  } catch (e: any) {
    return Response.json({ ok: false, error: e?.message || String(e) }, { status: 500 })
  }
}

