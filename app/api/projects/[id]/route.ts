import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireUser, teamIdsForUser } from '@/lib/tenant'
import { getSupabaseAdmin, MEDIA_BUCKET, ensureBucketExists } from '@/lib/supabase'

type Ctx = { params: { id: string } }

export async function GET(_req: NextRequest, { params }: Ctx) {
  const { user } = await requireUser()
  const teamIds = await teamIdsForUser(user.id)
  const project = await prisma.project.findFirst({ where: { id: params.id, teamId: { in: teamIds } } })
  if (!project) return Response.json({ error: 'Not found' }, { status: 404 })
  return Response.json({
    id: project.id,
    description: project.description,
    health: (project as any).health,
    healthAuto: (project as any).healthAuto,
  })
}

export async function PATCH(req: NextRequest, { params }: Ctx) {
  const { user } = await requireUser()
  const teamIds = await teamIdsForUser(user.id)
  const body = await req.json().catch(() => ({})) as any

  // Only allow updates to projects within the user's teams
  const project = await prisma.project.findFirst({ where: { id: params.id, teamId: { in: teamIds } } })
  if (!project) return Response.json({ error: 'Not found' }, { status: 404 })

  const data: any = {}
  if (typeof body.description === 'string') data.description = body.description.trim() || null
  if (typeof body.health === 'string') data.health = body.health
  if (typeof body.healthAuto === 'boolean') data.healthAuto = body.healthAuto

  if (Object.keys(data).length === 0) return Response.json({ ok: true })

  const updated = await prisma.project.update({ where: { id: project.id }, data })
  return Response.json({ ok: true, project: updated })
}

export async function DELETE(_req: NextRequest, { params }: Ctx) {
  const { user } = await requireUser()
  const teamIds = await teamIdsForUser(user.id)

  const project = await prisma.project.findFirst({ where: { id: params.id, teamId: { in: teamIds } } })
  if (!project) return Response.json({ error: 'Not found' }, { status: 404 })

  // Collect task IDs for cascading deletes
  const tasks = await prisma.task.findMany({ where: { projectId: project.id }, select: { id: true } })
  const taskIds = tasks.map((t) => t.id)

  await prisma.$transaction([
    // Delete dependents of tasks first
    prisma.timesheet.deleteMany({ where: { taskId: { in: taskIds } } }),
    prisma.taskSchedule.deleteMany({ where: { taskId: { in: taskIds } } }),
    prisma.comment.deleteMany({ where: { taskId: { in: taskIds } } }),
    prisma.attachment.deleteMany({ where: { taskId: { in: taskIds } } }),
    // Delete tasks and project-level dependents
    prisma.task.deleteMany({ where: { projectId: project.id } }),
    prisma.credential.deleteMany({ where: { projectId: project.id } }),
    // Finally delete the project
    prisma.project.delete({ where: { id: project.id } }),
  ])

  // Best-effort: delete media files for this project from storage
  try {
    const supabase = getSupabaseAdmin()
    await ensureBucketExists()
    const prefix = `${project.id}/`
    const { data: list } = await supabase.storage.from(MEDIA_BUCKET).list(prefix, { limit: 1000, offset: 0 })
    const keys = (list || []).map((f) => prefix + f.name)
    if (keys.length > 0) {
      await supabase.storage.from(MEDIA_BUCKET).remove(keys)
    }
  } catch {
    // ignore storage errors
  }

  return new Response(null, { status: 204 })
}
