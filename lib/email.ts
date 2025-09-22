import nodemailer from 'nodemailer'

function getBrevoTransport() {
  const debug = process.env.EMAIL_DEBUG === 'true'
  const host = process.env.BREVO_SMTP_HOST || 'smtp-relay.brevo.com'
  const port = Number(process.env.BREVO_SMTP_PORT || 587)

  // Prefer explicit SMTP login/password from Brevo (recommended)
  const login = process.env.BREVO_SMTP_LOGIN
  const password = process.env.BREVO_SMTP_PASSWORD
  if (login && password) {
    if (debug) console.log('[email] Using Brevo SMTP login auth')
    return nodemailer.createTransport({
      host,
      port,
      secure: false,
      auth: { user: login, pass: password },
      logger: debug,
      debug,
    })
  }

  // Fallback: allow API key style if provided (not recommended for Brevo SMTP)
  const apiKey = process.env.BREVO_API_KEY
  if (apiKey) {
    if (debug) console.log('[email] Using Brevo API key auth')
    return nodemailer.createTransport({
      host,
      port,
      secure: false,
      auth: { user: process.env.BREVO_SMTP_USER || 'apikey', pass: apiKey },
      logger: debug,
      debug,
    })
  }
  return null
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

export function getEmailConfigSummary() {
  const host = process.env.BREVO_SMTP_HOST || 'smtp-relay.brevo.com'
  const port = Number(process.env.BREVO_SMTP_PORT || 587)
  const login = !!process.env.BREVO_SMTP_LOGIN
  const password = !!process.env.BREVO_SMTP_PASSWORD
  const apiKey = !!process.env.BREVO_API_KEY
  const url = !!process.env.EMAIL_SERVER
  const method = login && password ? 'brevo-login' : apiKey ? 'brevo-apikey' : url ? 'url' : 'none'
  const from = process.env.EMAIL_FROM || ''
  return {
    method,
    host,
    port,
    secure: false,
    hasLogin: login,
    hasPassword: password,
    hasApiKey: apiKey,
    hasEmailServerUrl: url,
    from,
    node: process.version,
    env: process.env.NODE_ENV,
  }
}

export async function sendInviteEmail(to: string, acceptUrl: string, opts?: { projectName?: string }) {
  const from = process.env.EMAIL_FROM || 'noreply@example.com'
  const transporter = getTransport()
  // Optional connectivity verification (fast no-op on many providers)
  try { await transporter.verify() } catch {}
  const projectName = opts?.projectName?.trim()
  const brand = process.env.NEXT_PUBLIC_BRAND_NAME || 'Mera Kommunikation'
  const subject = projectName
    ? `You're invited to ${brand} · ${projectName}`
    : `You're invited to ${brand}`
  const introHtml = projectName
    ? `You have been invited to view updates for the project <strong>${escapeHtml(projectName)}</strong>.`
    : `You have been invited to join <strong>${escapeHtml(brand)}</strong>.`

  const html = renderBrandedEmail({
    title: 'Invitation',
    preheader: projectName ? `Access the ${projectName} workspace` : `Access your ${brand} workspace`,
    bodyHtml: `
      <p>${introHtml}</p>
      <p>Click the button below to accept the invite and get started.</p>
    `,
    action: { label: 'Accept Invite', url: acceptUrl },
  })

  const info = await transporter.sendMail({
    from,
    to,
    subject,
    text: `${stripHtml(introHtml)}\n\nAccept the invite: ${acceptUrl}\n\nIf you did not expect this email, you can ignore it.`,
    html,
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
  const transporter = getTransport()
  try { await transporter.verify() } catch {}
  const html = renderBrandedEmail({
    title: 'Task Assigned',
    preheader: `New task: ${task.title}${task?.project?.name ? ` · ${task.project.name}` : ''}`,
    bodyHtml: `
      <p>You have been assigned a new task${task?.project?.name ? ` in project <strong>${escapeHtml(task.project.name)}</strong>` : ''}.</p>
      <table role=\"presentation\" cellpadding=\"0\" cellspacing=\"0\" width=\"100%\" style=\"margin:12px 0 6px 0\">
        <tr><td style=\"padding:6px 0\"><strong>Title:</strong> ${escapeHtml(task.title)}</td></tr>
        ${task.description ? `<tr><td style=\"padding:6px 0\"><strong>Description:</strong> ${escapeHtml(task.description)}</td></tr>` : ''}
        ${due ? `<tr><td style=\"padding:6px 0\"><strong>Due:</strong> ${escapeHtml(due)}</td></tr>` : ''}
      </table>
    `,
    action: { label: 'Open Task', url: taskUrl },
  })

  const textLines = [
    `You have been assigned a new task${task?.project?.name ? ` in project "${task.project.name}"` : ''}.`,
    `Title: ${task.title}`,
    task.description ? `Description: ${task.description}` : undefined,
    due ? `Due: ${due}` : undefined,
    `Open: ${taskUrl}`,
  ].filter(Boolean) as string[]

  return transporter.sendMail({
    from,
    to,
    subject,
    text: textLines.join('\\n'),
    html,
  })
}

function escapeHtml(s: string) {
  return s
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
}

function stripHtml(s: string) {
  return s.replace(/<[^>]+>/g, '')
}

function renderBrandedEmail(args: {
  title: string
  bodyHtml: string
  preheader?: string
  action?: { label: string; url: string }
}) {
  const brand = process.env.NEXT_PUBLIC_BRAND_NAME || 'Mera Kommunikation'
  const brandColor = process.env.NEXT_PUBLIC_BRAND_COLOR || '#111827'
  const accent = process.env.NEXT_PUBLIC_BRAND_ACCENT || '#6366f1'

  const preheader = args.preheader || ''
  const btn = args.action
    ? `<a href="${args.action.url}" style="display:inline-block;background:${accent};color:#fff;text-decoration:none;padding:10px 16px;border-radius:8px;font-weight:600">${escapeHtml(args.action.label)}</a>`
    : ''

  return `
<!doctype html>
<html>
<head>
  <meta http-equiv="Content-Type" content="text/html; charset=utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${escapeHtml(args.title)}</title>
  <style>
    .preheader { display:none; visibility:hidden; opacity:0; color:transparent; height:0; width:0; overflow:hidden; }
  </style>
</head>
<body style="margin:0; background:#0b0e14;">
  <span class="preheader">${escapeHtml(preheader)}</span>
  <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="background:#0b0e14;padding:24px 12px">
    <tr>
      <td align="center">
        <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="max-width:560px;background:#0f1320;border:1px solid rgba(255,255,255,0.08);border-radius:12px;overflow:hidden">
          <tr>
            <td style="background:${brandColor};padding:16px 20px;border-bottom:1px solid rgba(255,255,255,0.08)">
              <div style="color:#fff;font-size:16px;font-weight:700;letter-spacing:.2px">${escapeHtml(brand)}</div>
            </td>
          </tr>
          <tr>
            <td style="padding:22px 20px;color:#e5e7eb;font-size:14px;line-height:1.6">
              <h1 style="margin:0 0 12px 0;color:#fff;font-size:18px">${escapeHtml(args.title)}</h1>
              ${args.bodyHtml}
              ${btn ? `<div style=\"margin:18px 0 6px 0\">${btn}</div>` : ''}
              ${args.action ? `<div style=\"margin-top:8px;color:#9ca3af;font-size:12px;word-break:break-all\">If the button doesn't work, copy and paste this link: <br /><a href=\"${args.action.url}\" style=\"color:${accent}\">${args.action.url}</a></div>` : ''}
            </td>
          </tr>
          <tr>
            <td style="padding:14px 20px;border-top:1px solid rgba(255,255,255,0.08);color:#9ca3af;font-size:12px">This message was sent by ${escapeHtml(brand)}.</td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`
}
