import { redirect } from 'next/navigation'
import { auth } from '@clerk/nextjs/server'
import { AcceptInviteClient } from '@/components/accept-invite-client'

export default function AcceptInvitePage({ searchParams }: { searchParams: { token?: string } }) {
  const token = searchParams.token || ''
  const { userId } = auth()
  if (!userId) {
    const target = `/sign-in?redirect_url=${encodeURIComponent(`/invites/accept?token=${token}`)}`
    redirect(target)
  }
  if (!token) {
    return (
      <div className="mx-auto mt-20 max-w-md rounded-lg border border-white/10 bg-white/5 p-6 text-center">
        <div className="text-lg font-semibold text-white">Invite link invalid</div>
        <div className="mt-2 text-sm text-white/70">We couldn't find a token on this link.</div>
      </div>
    )
  }
  return <AcceptInviteClient token={token} />
}
