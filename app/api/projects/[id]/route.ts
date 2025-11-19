import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireUser, projectWhereForUser, ensureProjectPermission } from '@/lib/tenant'
import { getSupabaseAdmin, MEDIA_BUCKET, ensureBucketExists } from '@/lib/supabase'

type Ctx = { params: { id: string } }

export async function GET(_req: NextRequest, { params }: Ctx) {
  const { user, workspaceId } = await requireUser()
  if (!workspaceId) {
    return Response.json({ error: 'Select a workspace first' }, { status: 400 })
  }
  const projectWhere = await projectWhereForUser(user.id, { includeArchived: true })
  const project = await prisma.project.findFirst({ where: { id: params.id, AND: [projectWhere] } })
  if (!project) return Response.json({ error: 'Not found' }, { status: 404 })
  const accessLevel = (await ensureProjectPermission(user, project.id, 'READ')) || 'READ'
  return Response.json({
    id: project.id,
    description: project.description,
    notesHtml: (project as any).notesHtml || null,
    archivedAt: (project as any).archivedAt || null,
    health: (project as any).health,
    healthAuto: (project as any).healthAuto,
    accessLevel,
  })
}

export async function PATCH(req: NextRequest, { params }: Ctx) {
  const { user, workspaceId } = await requireUser()
  if (!workspaceId) {
    return Response.json({ error: 'Select a workspace first' }, { status: 400 })
  }
  const projectWhere = await projectWhereForUser(user.id, { includeArchived: true })
  const body = await req.json().catch(() => ({})) as any

  // Only allow updates to projects within the user's teams
  const project = await prisma.project.findFirst({ where: { id: params.id, AND: [projectWhere] }, include: { team: true } })
  if (!project) return Response.json({ error: 'Not found' }, { status: 404 })
  const canEdit = await ensureProjectPermission(user, project.id, 'EDIT')
  if (!canEdit) return Response.json({ error: 'Forbidden' }, { status: 403 })

  const data: any = {}
  if (typeof body.name === 'string') {
    const name = body.name.trim()
    if (!name) {
      return Response.json({ ok: false, error: 'Project name is required' }, { status: 400 })
    }
    data.name = name
  }
  if (typeof body.description === 'string') data.description = body.description.trim() || null
  if (typeof body.notesHtml === 'string') data.notesHtml = body.notesHtml
  if (typeof body.health === 'string') data.health = body.health
  if (typeof body.healthAuto === 'boolean') data.healthAuto = body.healthAuto
  if (typeof body.archived === 'boolean') {
    data.archivedAt = body.archived ? new Date() : null
  }

  if (Object.keys(data).length === 0) return Response.json({ ok: true })

  try {
    const updated = await prisma.project.update({ where: { id: project.id }, data })
    return Response.json({ ok: true, project: updated })
  } catch (err: any) {
    const msg = String(err?.message || '')
    // If the DB hasn't been migrated yet, prisma will complain about unknown arg/column.
    const migrationRelated = msg.includes('notesHtml') || msg.includes('archivedAt') || msg.toLowerCase().includes('column') && (msg.toLowerCase().includes('notes') || msg.toLowerCase().includes('archive'))
    if (migrationRelated) {
      // Best-effort: retry without notesHtml to avoid hard 500s
      if (typeof data.notesHtml !== 'undefined') {
        delete (data as any).notesHtml
        if (Object.keys(data).length) {
          try { await prisma.project.update({ where: { id: project.id }, data }) } catch {}
        }
      }
      if (typeof data.archivedAt !== 'undefined') {
        delete (data as any).archivedAt
        if (Object.keys(data).length) {
          try { await prisma.project.update({ where: { id: project.id }, data }) } catch {}
        }
      }
      return Response.json({ ok: false, error: 'Notes/archive fields not available. Please run database migrations.' }, { status: 409 })
    }
    console.error('PATCH /api/projects/[id] failed', err)
    return Response.json({ ok: false, error: 'Internal Server Error' }, { status: 500 })
  }
}

export async function DELETE(_req: NextRequest, { params }: Ctx) {
  const { user, workspaceId } = await requireUser()
  if (!workspaceId) {
    return Response.json({ error: 'Select a workspace first' }, { status: 400 })
  }
  const projectWhere = await projectWhereForUser(user.id, { includeArchived: true })

  const project = await prisma.project.findFirst({ where: { id: params.id, AND: [projectWhere] }, include: { team: true } })
  if (!project) return Response.json({ error: 'Not found' }, { status: 404 })
  const canEdit = await ensureProjectPermission(user, project.id, 'EDIT')
  if (!canEdit) return Response.json({ error: 'Forbidden' }, { status: 403 })

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
