// Feature flags read from NEXT_PUBLIC_* envs. These are evaluated at build time.
// Defaults are conservative (off) so features are opt-in.

function boolFromEnv(v: string | undefined, defaultValue = false) {
  if (typeof v !== 'string') return defaultValue
  const s = v.trim().toLowerCase()
  return s === '1' || s === 'true' || s === 'on' || s === 'yes' || s === 'enabled'
}

export const FEATURE_PROJECT_CLIENTS = boolFromEnv(process.env.NEXT_PUBLIC_FEATURE_PROJECT_CLIENTS, false)

