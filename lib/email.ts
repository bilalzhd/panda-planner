import nodemailer from 'nodemailer'

function getBrevoTransport() {
  const apiKey = process.env.BREVO_API_KEY
  if (!apiKey) return null
  const debug = process.env.EMAIL_DEBUG === 'true'
  return nodemailer.createTransport({
    host: 'smtp-relay.brevo.com',
    port: 587,
    secure: false,
    auth: { user: 'apikey', pass: apiKey },
    logger: debug,
    debug,
  })
}

export function getTransport() {
  // Prefer Brevo when key is set
  const brevo = getBrevoTransport()
  if (brevo) return brevo
  // Otherwise fall back to generic EMAIL_SERVER
  const url = process.env.EMAIL_SERVER
  if (url) {
    const debug = process.env.EMAIL_DEBUG === 'true'
    return nodemailer.createTransport(url, { logger: debug, debug })
  }
  throw new Error('Email transport not configured. Set BREVO_API_KEY or EMAIL_SERVER')
}

export async function sendInviteEmail(to: string, acceptUrl: string) {
  const from = process.env.EMAIL_FROM || 'noreply@example.com'
  const transporter = getTransport()
  // Optional connectivity verification (fast no-op on many providers)
  try { await transporter.verify() } catch {}
  const info = await transporter.sendMail({
    from,
    to,
    subject: 'You have been invited to Mera Kommunikation Task Management',
    text: `You have been invited to join a team on Mera Kommunikation TM. Click to accept: ${acceptUrl}`,
    html: `<p>You have been invited to join a team on <strong>Mera Kommunikation</strong>.</p><p><a href="${acceptUrl}">Accept invite</a></p>`,
  })
  return info
}

export async function sendTaskAssignedEmail(args: {
  to: string
  task: { id: string; title: string; description?: string | null; project?: { name: string } | null; dueDate?: Date | null }
}) {
  const { to, task } = args
  const from = process.env.EMAIL_FROM || 'noreply@example.com'
  const base = process.env.NEXT_PUBLIC_BASE_URL || ''
  const taskUrl = `${base}/tasks/${task.id}`
  const due = task?.dueDate ? new Date(task.dueDate).toLocaleDateString() : null
  const subject = `New task assigned: ${task.title}`
  const textLines = [
    `You have been assigned a new task${task?.project?.name ? ` in project "${task.project.name}"` : ''}.`,
    `Title: ${task.title}`,
    task.description ? `Description: ${task.description}` : undefined,
    due ? `Due: ${due}` : undefined,
    `Open: ${taskUrl}`,
  ].filter(Boolean) as string[]

  const transporter = getTransport()
  try { await transporter.verify() } catch {}
  return transporter.sendMail({
    from,
    to,
    subject,
    text: textLines.join('\n'),
    html: `
      <p>You have been assigned a new task${task?.project?.name ? ` in project <strong>${task.project.name}</strong>` : ''}.</p>
      <p><strong>Title:</strong> ${task.title}</p>
      ${task.description ? `<p><strong>Description:</strong> ${escapeHtml(task.description)}</p>` : ''}
      ${due ? `<p><strong>Due:</strong> ${due}</p>` : ''}
      <p><a href="${taskUrl}">Open task</a></p>
    `,
  })
}

function escapeHtml(s: string) {
  return s
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
}
