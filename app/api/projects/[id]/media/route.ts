import { NextRequest } from 'next/server'
import { requireUser, projectWhereForUser, ensureProjectPermission } from '@/lib/tenant'
import { prisma } from '@/lib/prisma'
import { getSupabaseAdmin, MEDIA_BUCKET, getPublicUrl, ensureBucketExists } from '@/lib/supabase'
import { randomUUID } from 'crypto'

type Ctx = { params: { id: string } }

async function ensureProjectAccess(projectId: string, level: 'READ' | 'EDIT') {
  const { user, workspaceId } = await requireUser()
  if (!workspaceId) return null
  const projectWhere = await projectWhereForUser(user.id, { includeArchived: true })
  const project = await prisma.project.findFirst({ where: { id: projectId, AND: [projectWhere] } })
  if (!project) return null
  const allowed = await ensureProjectPermission(user, projectId, level)
  if (!allowed) return null
  return { user, project }
}

export async function GET(_req: NextRequest, { params }: Ctx) {
  const access = await ensureProjectAccess(params.id, 'READ')
  if (!access) return Response.json({ error: 'Not found' }, { status: 404 })

  const supabase = getSupabaseAdmin()
  await ensureBucketExists()
  const prefix = `${params.id}/`
  const { data, error } = await supabase.storage.from(MEDIA_BUCKET).list(prefix, { limit: 100, offset: 0, sortBy: { column: 'created_at', order: 'desc' } })
  if (error) return Response.json({ error: error.message }, { status: 500 })
  // Load metadata map if present
  let meta: Record<string, { label?: string; description?: string; updatedAt?: string }> = {}
  try {
    const metaPath = `${params.id}/_meta.json`
    const { data: metaFile } = await supabase.storage.from(MEDIA_BUCKET).download(metaPath)
    if (metaFile) {
      const text = await metaFile.text()
      meta = JSON.parse(text || '{}') || {}
    }
  } catch {}
  const useSigned = ['1','true','TRUE','yes','YES'].includes(String(process.env.SUPABASE_MEDIA_SIGNED || 'false'))
  const ttl = Number(process.env.SUPABASE_SIGNED_URL_TTL || 3600)
  // Exclude the internal metadata file from listings
  const files = (data || []).filter((f) => f.name !== '_meta.json')
  const items = await Promise.all(files.map(async (f) => {
    const path = prefix + f.name
    let url = getPublicUrl(path)
    if (useSigned) {
      const { data: s } = await supabase.storage.from(MEDIA_BUCKET).createSignedUrl(path, ttl)
      if (s?.signedUrl) url = s.signedUrl
    }
    const m = meta[f.name] || {}
    return {
      name: f.name,
      path,
      size: (f as any).metadata?.size || null,
      updatedAt: f.updated_at,
      url,
      label: m.label || null,
      description: m.description || null,
    }
  }))
  return Response.json(items)
}

export async function POST(req: NextRequest, { params }: Ctx) {
  const access = await ensureProjectAccess(params.id, 'EDIT')
  if (!access) return Response.json({ error: 'Not found' }, { status: 404 })
  const form = await req.formData().catch(() => null)
  if (!form) return Response.json({ error: 'Expected multipart form data' }, { status: 400 })
  const file = form.get('file') as File | null
  if (!file) return Response.json({ error: 'file is required' }, { status: 400 })
  const label = String(form.get('label') || '').trim() || null
  const description = String(form.get('description') || '').trim() || null
  const arrayBuffer = await file.arrayBuffer()
  const buf = Buffer.from(arrayBuffer)
  const supabase = getSupabaseAdmin()
  await ensureBucketExists()
  const ext = file.name.split('.').pop() || 'bin'
  const key = `${params.id}/${randomUUID()}.${ext}`
  const { error } = await supabase.storage.from(MEDIA_BUCKET).upload(key, buf, { contentType: file.type || 'application/octet-stream', upsert: false })
  if (error) return Response.json({ error: error.message }, { status: 500 })
  // Update metadata file with optional label/description
  try {
    const metaPath = `${params.id}/_meta.json`
    let meta: Record<string, { label?: string; description?: string; updatedAt?: string }> = {}
    const existing = await supabase.storage.from(MEDIA_BUCKET).download(metaPath)
    if (existing.data) {
      const text = await existing.data.text()
      meta = JSON.parse(text || '{}') || {}
    }
    const filename = key.split('/').pop() as string
    meta[filename] = {
      label: label || undefined,
      description: description || undefined,
      updatedAt: new Date().toISOString(),
    }
    const metaBuf = Buffer.from(JSON.stringify(meta, null, 2), 'utf8')
    await supabase.storage.from(MEDIA_BUCKET).upload(metaPath, metaBuf, { contentType: 'application/json', upsert: true })
  } catch {}
  // Return appropriate URL based on visibility (signed vs public)
  const useSigned = ['1','true','TRUE','yes','YES'].includes(String(process.env.SUPABASE_MEDIA_SIGNED || 'false'))
  let url = getPublicUrl(key)
  if (useSigned) {
    const ttl = Number(process.env.SUPABASE_SIGNED_URL_TTL || 3600)
    const { data: s } = await supabase.storage.from(MEDIA_BUCKET).createSignedUrl(key, ttl)
    if (s?.signedUrl) url = s.signedUrl
  }
  return Response.json({ path: key, url, name: file.name, size: file.size, type: file.type, label, description })
}

export async function DELETE(req: NextRequest, { params }: Ctx) {
  const access = await ensureProjectAccess(params.id, 'EDIT')
  if (!access) return Response.json({ error: 'Not found' }, { status: 404 })
  const { searchParams } = new URL(req.url)
  const path = searchParams.get('path')
  if (!path) return Response.json({ error: 'path query param required' }, { status: 400 })
  // Ensure we only allow deletes within the project folder
  if (!path.startsWith(`${params.id}/`)) return Response.json({ error: 'Invalid path' }, { status: 400 })
  const supabase = getSupabaseAdmin()
  await ensureBucketExists()
  const { error } = await supabase.storage.from(MEDIA_BUCKET).remove([path])
  if (error) return Response.json({ error: error.message }, { status: 500 })
  // Remove metadata entry if present
  try {
    const metaPath = `${params.id}/_meta.json`
    const { data: metaFile } = await supabase.storage.from(MEDIA_BUCKET).download(metaPath)
    if (metaFile) {
      const meta = JSON.parse(await metaFile.text() || '{}') || {}
      const filename = path.split('/').pop() as string
      if (meta[filename]) {
        delete meta[filename]
        const metaBuf = Buffer.from(JSON.stringify(meta, null, 2), 'utf8')
        await supabase.storage.from(MEDIA_BUCKET).upload(metaPath, metaBuf, { contentType: 'application/json', upsert: true })
      }
    }
  } catch {}
  return new Response(null, { status: 204 })
}
