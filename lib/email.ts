import nodemailer from 'nodemailer'

export function getTransport() {
  const url = process.env.EMAIL_SERVER
  if (!url) throw new Error('EMAIL_SERVER not configured')
  // Allow full URL like: smtp://user:pass@smtp.gmail.com:587 or smtps://user:pass@smtp.gmail.com:465
  // If your password contains special chars, URL-encode it.
  const debug = process.env.EMAIL_DEBUG === 'true'
  return nodemailer.createTransport(url, { logger: debug, debug })
}

export async function sendInviteEmail(to: string, acceptUrl: string) {
  const from = process.env.EMAIL_FROM || 'noreply@example.com'
  const transporter = getTransport()
  // Optional connectivity verification (fast no-op on many providers)
  try { await transporter.verify() } catch {}
  const info = await transporter.sendMail({
    from,
    to,
    subject: 'You have been invited to Panda Planner',
    text: `You have been invited to join a team on Panda Planner. Click to accept: ${acceptUrl}`,
    html: `<p>You have been invited to join a team on <strong>Panda Planner</strong>.</p><p><a href="${acceptUrl}">Accept invite</a></p>`,
  })
  return info
}
