import { prisma } from '@/lib/prisma'
import { NextRequest } from 'next/server'
import { promises as fs } from 'fs'
import path from 'path'
import { requireUser, projectWhereForUser, ensureProjectPermission } from '@/lib/tenant'

export const runtime = 'nodejs'

type Params = { params: { id: string } }

export async function GET(_req: NextRequest, { params }: Params) {
  const { user } = await requireUser()
  const projectWhere = await projectWhereForUser(user.id)
  const task = await prisma.task.findFirst({ where: { id: params.id, project: projectWhere } })
  if (!task) return Response.json({ error: 'Not found' }, { status: 404 })
  const atts = await prisma.attachment.findMany({ where: { taskId: params.id }, orderBy: { createdAt: 'desc' } })
  return Response.json(atts)
}

export async function POST(req: NextRequest, { params }: Params) {
  const { user } = await requireUser()
  const projectWhere = await projectWhereForUser(user.id)
  const task = await prisma.task.findFirst({ where: { id: params.id, project: projectWhere } })
  if (!task) return Response.json({ error: 'Not found' }, { status: 404 })
  const canEdit = await ensureProjectPermission(user, task.projectId, 'EDIT')
  if (!canEdit) return Response.json({ error: 'Read-only access' }, { status: 403 })
  const form = await req.formData()
  const file = form.get('file') as unknown as File
  if (!file) return Response.json({ error: 'file required' }, { status: 400 })

  const arrayBuffer = await file.arrayBuffer()
  const buffer = Buffer.from(arrayBuffer)
  const uploadsDir = path.join(process.cwd(), 'public', 'uploads')
  await fs.mkdir(uploadsDir, { recursive: true })
  const filename = `${Date.now()}-${file.name.replace(/[^a-zA-Z0-9.\-]/g, '_')}`
  const filepath = path.join(uploadsDir, filename)
  await fs.writeFile(filepath, buffer)
  const url = `/uploads/${filename}`

  const att = await prisma.attachment.create({
    data: {
      taskId: params.id,
      filename: file.name,
      url,
      size: buffer.length,
      mimeType: file.type || 'application/octet-stream',
      uploadedById: user.id,
    },
  })
  return Response.json(att, { status: 201 })
}
