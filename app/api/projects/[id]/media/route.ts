import { NextRequest } from 'next/server'
import { requireUser, teamIdsForUser } from '@/lib/tenant'
import { prisma } from '@/lib/prisma'
import { getSupabaseAdmin, MEDIA_BUCKET, getPublicUrl, ensureBucketExists } from '@/lib/supabase'
import { randomUUID } from 'crypto'

type Ctx = { params: { id: string } }

async function ensureProjectAccess(projectId: string) {
  const { user } = await requireUser()
  const teamIds = await teamIdsForUser(user.id)
  const project = await prisma.project.findFirst({ where: { id: projectId, teamId: { in: teamIds } } })
  if (!project) return null
  return { user, project }
}

export async function GET(_req: NextRequest, { params }: Ctx) {
  const access = await ensureProjectAccess(params.id)
  if (!access) return Response.json({ error: 'Not found' }, { status: 404 })

  const supabase = getSupabaseAdmin()
  await ensureBucketExists()
  const prefix = `${params.id}/`
  const { data, error } = await supabase.storage.from(MEDIA_BUCKET).list(prefix, { limit: 100, offset: 0, sortBy: { column: 'created_at', order: 'desc' } })
  if (error) return Response.json({ error: error.message }, { status: 500 })
  const useSigned = ['1','true','TRUE','yes','YES'].includes(String(process.env.SUPABASE_MEDIA_SIGNED || 'false'))
  const ttl = Number(process.env.SUPABASE_SIGNED_URL_TTL || 3600)
  const items = await Promise.all((data || []).map(async (f) => {
    const path = prefix + f.name
    let url = getPublicUrl(path)
    if (useSigned) {
      const { data: s } = await supabase.storage.from(MEDIA_BUCKET).createSignedUrl(path, ttl)
      if (s?.signedUrl) url = s.signedUrl
    }
    return {
      name: f.name,
      path,
      size: (f as any).metadata?.size || null,
      updatedAt: f.updated_at,
      url,
    }
  }))
  return Response.json(items)
}

export async function POST(req: NextRequest, { params }: Ctx) {
  const access = await ensureProjectAccess(params.id)
  if (!access) return Response.json({ error: 'Not found' }, { status: 404 })
  const form = await req.formData().catch(() => null)
  if (!form) return Response.json({ error: 'Expected multipart form data' }, { status: 400 })
  const file = form.get('file') as File | null
  if (!file) return Response.json({ error: 'file is required' }, { status: 400 })
  const arrayBuffer = await file.arrayBuffer()
  const buf = Buffer.from(arrayBuffer)
  const supabase = getSupabaseAdmin()
  await ensureBucketExists()
  const ext = file.name.split('.').pop() || 'bin'
  const key = `${params.id}/${randomUUID()}.${ext}`
  const { error } = await supabase.storage.from(MEDIA_BUCKET).upload(key, buf, { contentType: file.type || 'application/octet-stream', upsert: false })
  if (error) return Response.json({ error: error.message }, { status: 500 })
  // Return appropriate URL based on visibility (signed vs public)
  const useSigned = ['1','true','TRUE','yes','YES'].includes(String(process.env.SUPABASE_MEDIA_SIGNED || 'false'))
  let url = getPublicUrl(key)
  if (useSigned) {
    const ttl = Number(process.env.SUPABASE_SIGNED_URL_TTL || 3600)
    const { data: s } = await supabase.storage.from(MEDIA_BUCKET).createSignedUrl(key, ttl)
    if (s?.signedUrl) url = s.signedUrl
  }
  return Response.json({ path: key, url, name: file.name, size: file.size, type: file.type })
}

export async function DELETE(req: NextRequest, { params }: Ctx) {
  const access = await ensureProjectAccess(params.id)
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
  return new Response(null, { status: 204 })
}
