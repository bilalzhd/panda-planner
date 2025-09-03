import crypto from 'crypto'

const KEY_ENV = process.env.CREDENTIALS_ENCRYPTION_KEY || ''

function getKey() {
  // Expect a 32-byte key in base64 or hex; fallback to utf8 padded
  if (!KEY_ENV) throw new Error('Missing CREDENTIALS_ENCRYPTION_KEY')
  if (/^[A-Fa-f0-9]{64}$/.test(KEY_ENV)) return Buffer.from(KEY_ENV, 'hex')
  if (/^[A-Za-z0-9+/=]+$/.test(KEY_ENV) && Buffer.from(KEY_ENV, 'base64').length === 32) return Buffer.from(KEY_ENV, 'base64')
  const buf = Buffer.alloc(32)
  Buffer.from(KEY_ENV).copy(buf)
  return buf
}

export function encryptSecret(plain: string) {
  const key = getKey()
  const iv = crypto.randomBytes(12)
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv)
  const ciphertext = Buffer.concat([cipher.update(plain, 'utf8'), cipher.final()])
  const tag = cipher.getAuthTag()
  // Store as base64 parts joined by .
  return [iv.toString('base64'), tag.toString('base64'), ciphertext.toString('base64')].join('.')
}

export function decryptSecret(payload: string) {
  const key = getKey()
  const [ivB64, tagB64, dataB64] = payload.split('.')
  if (!ivB64 || !tagB64 || !dataB64) throw new Error('Invalid secret payload')
  const iv = Buffer.from(ivB64, 'base64')
  const tag = Buffer.from(tagB64, 'base64')
  const data = Buffer.from(dataB64, 'base64')
  const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv)
  decipher.setAuthTag(tag)
  const plain = Buffer.concat([decipher.update(data), decipher.final()])
  return plain.toString('utf8')
}

export function hashPin(pin: string) {
  const salt = crypto.randomBytes(16)
  const hash = crypto.scryptSync(pin, salt, 32)
  return `${salt.toString('hex')}:${hash.toString('hex')}`
}

export function verifyPin(pin: string, stored?: string | null) {
  if (!stored) return false
  const [saltHex, hashHex] = stored.split(':')
  if (!saltHex || !hashHex) return false
  const salt = Buffer.from(saltHex, 'hex')
  const expected = Buffer.from(hashHex, 'hex')
  const actual = crypto.scryptSync(pin, salt, expected.length)
  return crypto.timingSafeEqual(actual, expected)
}

