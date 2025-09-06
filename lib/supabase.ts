import { createClient } from '@supabase/supabase-js'

export const MEDIA_BUCKET = process.env.SUPABASE_BUCKET || 'project-management'

export function getSupabaseAdmin() {
  const url = process.env.SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) throw new Error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY')
  return createClient(url, key, { auth: { persistSession: false } })
}

export function getPublicUrl(path: string) {
  const base = process.env.SUPABASE_PUBLIC_URL || process.env.SUPABASE_URL
  // When bucket is public and storage is served at /storage/v1, this forms a public URL.
  // Alternatively, callers can create signed URLs.
  return `${base}/storage/v1/object/public/${MEDIA_BUCKET}/${encodeURI(path)}`
}

export async function ensureBucketExists() {
  const supabase = getSupabaseAdmin()
  const useSigned = ['1','true','TRUE','yes','YES'].includes(String(process.env.SUPABASE_MEDIA_SIGNED || 'false'))
  // Try creating the bucket idempotently; ignore duplicate errors
  const { error: createErr } = await supabase.storage.createBucket(MEDIA_BUCKET, { public: !useSigned })
  if (createErr && !/exists/i.test(String(createErr.message))) {
    // If creation failed for another reason, probe to confirm existence; otherwise rethrow
    const probe = await supabase.storage.from(MEDIA_BUCKET).list('', { limit: 1 })
    // @ts-ignore
    if (probe?.error && String(probe.error.message).toLowerCase().includes('bucket not found')) {
      throw createErr
    }
  }
}
