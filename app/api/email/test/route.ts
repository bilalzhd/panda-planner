import { sendDirectMessageEmail } from '@/lib/email'

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const to = searchParams.get('to')
  if (!to) return Response.json({ error: 'Provide ?to=email@example.com' }, { status: 400 })
  try {
    await sendDirectMessageEmail({
      to,
      sender: { name: 'Test Sender', email: 'noreply@example.com' },
      content: 'This is a test message from PandaPlanner.',
    })
    return Response.json({ ok: true })
  } catch (e: any) {
    return Response.json({ ok: false, error: e?.message || String(e) }, { status: 500 })
  }
}
