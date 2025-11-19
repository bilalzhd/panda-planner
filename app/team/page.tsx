import { prisma } from '@/lib/prisma'
import { requireUser, teamIdsForUser } from '@/lib/tenant'
import Link from 'next/link'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { RemoveMemberButton } from '@/components/remove-member-button'
import { Button } from '@/components/ui/button'

export const dynamic = 'force-dynamic'

export default async function TeamPage({ searchParams }: { searchParams: { teamId?: string; accepted?: string } }) {
  const { user } = await requireUser()
  const memberships = await prisma.membership.findMany({
    where: { userId: user.id },
    include: { team: true },
    orderBy: { createdAt: 'desc' },
  })
  if (memberships.length === 0) {
    return <div>No teams yet.</div>
  }

  const requestedTeamId = searchParams.teamId
  const allowedTeamIds = new Set(memberships.map((m) => m.teamId))
  const currentTeamId = requestedTeamId && allowedTeamIds.has(requestedTeamId)
    ? requestedTeamId
    : memberships[0].teamId // default to most recent membership (likely the invited team)

  const currentTeam = memberships.find((m) => m.teamId === currentTeamId)!.team

  const members = await prisma.membership.findMany({
    where: { teamId: currentTeamId },
    include: { user: true },
    orderBy: { createdAt: 'asc' },
  })
  const tasks = await prisma.task.findMany({
    where: { project: { teamId: currentTeamId } },
    include: { project: true, assignedTo: true },
  })

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Team Members</h1>
        <div className="text-sm text-white/80">Current team: <span className="font-medium">{currentTeam.name}</span></div>
      </div>

      <div className="flex flex-wrap gap-2 text-sm">
        {memberships.map((m) => (
          <Link key={m.teamId} href={`/team?teamId=${m.teamId}`} className={`rounded-md border px-2 py-1 ${m.teamId === currentTeamId ? 'border-white bg-white text-black' : 'border-white/10 bg-white/5 hover:bg-white/10'}`}>{m.team.name}</Link>
        ))}
      </div>

      <Card>
        <CardHeader className="font-semibold">Manage access</CardHeader>
        <CardContent className="space-y-2 text-sm text-white/70">
          <p>Invitations have moved to the new Users screen where you can grant project access and user-management permissions.</p>
          <Button asChild variant="outline" className="text-sm">
            <Link href="/users">Open Users</Link>
          </Button>
        </CardContent>
      </Card>

      <ul className="space-y-4">
        {members.map((m) => {
          const myTasks = tasks.filter((t) => t.assignedToId === m.userId)
          return (
            <li key={m.id} className="rounded-lg border border-white/10 bg-white/5 p-4">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  {m.user.image ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={m.user.image} alt={m.user.name || 'User'} className="h-9 w-9 rounded-full object-cover" />
                  ) : (
                    <div className="h-9 w-9 rounded-full bg-white/20 flex items-center justify-center text-sm">{(m.user.name || m.user.email || 'U').slice(0,2).toUpperCase()}</div>
                  )}
                  <div>
                    <div className="font-medium">{m.user.name || m.user.email}</div>
                    <div className="text-xs text-white/60">{myTasks.length} assigned tasks</div>
                  </div>
                </div>
                {/* Owner can remove non-owner members */}
                {user.id === currentTeam.ownerId && m.userId !== currentTeam.ownerId && (
                  <RemoveMemberButton teamId={currentTeamId} userId={m.userId} />
                )}
              </div>
              {myTasks.length > 0 && (
                <div className="mt-3 grid md:grid-cols-2 gap-2">
                  {myTasks.slice(0, 6).map((t) => (
                    <Link key={t.id} href={`/tasks/${t.id}`} className="rounded-md border border-white/10 bg-white/5 px-3 py-2 text-sm hover:bg-white/10">
                      <div className="font-medium">{t.title}</div>
                      <div className="text-xs text-white/60">Project: {t.project.name}</div>
                    </Link>
                  ))}
                </div>
              )}
            </li>
          )
        })}
      </ul>
    </div>
  )
}
