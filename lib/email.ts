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
      <p style=\"margin:4px 0 10px 0;color:#6b7280\">Assigned by: <strong>${escapeHtml(((task as any)?.createdBy?.name) || ((task as any)?.createdBy?.email) || 'System')}</strong></p>
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

  const result = await transporter.sendMail({
    from,
    to,
    subject,
    text: textLines.join('\\n'),
    html,
  })
  if (process.env.EMAIL_DEBUG === 'true') {
    try {
      console.log('[email] task assignment sent', {
        to,
        messageId: (result as any)?.messageId,
        accepted: (result as any)?.accepted,
        rejected: (result as any)?.rejected,
        envelope: (result as any)?.envelope,
      })
    } catch {}
  }
  return result
}

export async function sendTaskStatusChangedEmail(args: {
  to: string
  task: {
    id: string
    title: string
    description?: string | null
    project?: { name: string } | null
    dueDate?: Date | null
    status?: string | null
  }
  previousStatus: string
  updatedBy?: { name?: string | null; email?: string | null } | null
}) {
  const { to, task, previousStatus, updatedBy } = args
  const from = process.env.EMAIL_FROM || 'noreply@example.com'
  const base = process.env.NEXT_PUBLIC_BASE_URL || ''
  const taskUrl = `${base}/tasks/${task.id}`
  const formattedPrev = formatTaskStatus(previousStatus)
  const formattedNext = formatTaskStatus(task.status || '')
  const changer = updatedBy?.name || updatedBy?.email || 'Team member'
  const subject = `Task status updated: ${task.title}`
  const transporter = getTransport()
  try { await transporter.verify() } catch {}
  const html = renderBrandedEmail({
    title: 'Task Status Updated',
    preheader: `${escapeHtml(task.title)} moved to ${escapeHtml(formattedNext)}`,
    bodyHtml: `
      <p>The task <strong>${escapeHtml(task.title)}</strong>${task?.project?.name ? ` in project <strong>${escapeHtml(task.project.name)}</strong>` : ''} had its status updated.</p>
      <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="margin:12px 0 6px 0">
        <tr><td style="padding:6px 0"><strong>Updated by:</strong> ${escapeHtml(changer)}</td></tr>
        <tr><td style="padding:6px 0"><strong>Previous status:</strong> ${escapeHtml(formattedPrev)}</td></tr>
        <tr><td style="padding:6px 0"><strong>New status:</strong> ${escapeHtml(formattedNext)}</td></tr>
        ${task?.dueDate ? `<tr><td style=\"padding:6px 0\"><strong>Due:</strong> ${escapeHtml(new Date(task.dueDate).toLocaleDateString())}</td></tr>` : ''}
      </table>
      ${task.description ? `<p style=\"margin:16px 0 0 0\"><strong>Description</strong><br />${escapeHtml(task.description)}</p>` : ''}
    `,
    action: { label: 'Review Task', url: taskUrl },
  })

  const textLines = [
    `The task "${task.title}" had its status updated${task?.project?.name ? ` in project "${task.project.name}"` : ''}.`,
    `Updated by: ${changer}`,
    `Previous status: ${formattedPrev}`,
    `New status: ${formattedNext}`,
    task?.dueDate ? `Due: ${new Date(task.dueDate).toLocaleDateString()}` : undefined,
    `Open: ${taskUrl}`,
  ].filter(Boolean) as string[]

  const result = await transporter.sendMail({
    from,
    to,
    subject,
    text: textLines.join('\n'),
    html,
  })
  if (process.env.EMAIL_DEBUG === 'true') {
    try {
      console.log('[email] task status update sent', {
        to,
        messageId: (result as any)?.messageId,
        accepted: (result as any)?.accepted,
        rejected: (result as any)?.rejected,
        envelope: (result as any)?.envelope,
      })
    } catch {}
  }
  return result
}

export async function sendDirectMessageEmail(args: {
  to: string
  recipientName?: string | null
  sender: { name?: string | null; email?: string | null }
  content: string
  projectName?: string | null
}) {
  const { to, sender, content, projectName, recipientName } = args
  if (!to) return
  const transporter = getTransport()
  try { await transporter.verify() } catch {}
  const from = process.env.EMAIL_FROM || 'noreply@example.com'
  const base = process.env.NEXT_PUBLIC_BASE_URL || ''
  const inboxUrl = `${base}/messages`
  const actor = sender.name || sender.email || 'A teammate'
  const subject = projectName
    ? `New message about ${projectName}`
    : 'New message in PandaPlanner'
  const intro = projectName
    ? `${escapeHtml(actor)} sent you a message about <strong>${escapeHtml(projectName)}</strong>.`
    : `${escapeHtml(actor)} sent you a new message.`
  const html = renderBrandedEmail({
    title: 'New Message',
    preheader: stripHtml(intro),
    bodyHtml: `
      <p>${intro}</p>
      <blockquote style="margin:12px 0;padding:12px 16px;border-left:3px solid #d1d5db;background:#f9fafb;color:#111827;font-style:italic">${escapeHtml(content)}</blockquote>
      <p>Reply in PandaPlanner to keep the conversation going.</p>
    `,
    action: { label: 'Reply in App', url: inboxUrl },
  })
  const text = [
    `${actor} sent you a message${projectName ? ` about ${projectName}` : ''}.`,
    '',
    content,
    '',
    `Reply: ${inboxUrl}`,
  ].join('\n')
  await transporter.sendMail({
    from,
    to,
    subject,
    text,
    html,
  })
}

export async function sendWorkspaceInviteEmail(args: {
  to: string
  recipientName?: string | null
  workspaceName: string
  inviter: { name?: string | null; email?: string | null }
  projects?: string[]
}) {
  const { to, recipientName, workspaceName, inviter, projects = [] } = args
  if (!to) return
  const transporter = getTransport()
  try { await transporter.verify() } catch {}
  const from = process.env.EMAIL_FROM || 'noreply@example.com'
  const base = process.env.NEXT_PUBLIC_BASE_URL || ''
  const subject = `You've been added to ${workspaceName}`
  const preheader = `${inviter.name || inviter.email || 'A teammate'} invited you to collaborate`
  const projectList = projects.length
    ? `<p style="margin:12px 0 0 0"><strong>Projects:</strong> ${projects.map((p) => escapeHtml(p)).join(', ')}</p>`
    : ''
  const html = renderBrandedEmail({
    title: 'Workspace Invitation',
    preheader,
    bodyHtml: `
      <p>Hello ${escapeHtml(recipientName || '')},</p>
      <p><strong>${escapeHtml(inviter.name || inviter.email || 'A teammate')}</strong> added you to the workspace <strong>${escapeHtml(workspaceName)}</strong>.</p>
      ${projectList}
      <p>Use the link below to sign in and start collaborating.</p>
    `,
    action: { label: 'Open PandaPlanner', url: base || 'https://app.pandaplanner.dev' },
  })
  const textLines = [
    `${inviter.name || inviter.email || 'A teammate'} added you to the workspace "${workspaceName}".`,
    projects.length ? `Projects: ${projects.join(', ')}` : undefined,
    `Open: ${base || 'https://app.pandaplanner.dev'}`,
  ].filter(Boolean) as string[]
  await transporter.sendMail({
    from,
    to,
    subject,
    text: textLines.join('\n'),
    html,
  })
}

export async function sendTaskDueReminderEmail(args: {
  to: string
  task: {
    id: string
    title: string
    description?: string | null
    project?: { name: string } | null
    dueDate?: Date | null
    status?: string | null
  }
}) {
  const { to, task } = args
  const from = process.env.EMAIL_FROM || 'noreply@example.com'
  const base = process.env.NEXT_PUBLIC_BASE_URL || ''
  const taskUrl = `${base}/tasks/${task.id}`
  const due = task?.dueDate ? new Date(task.dueDate).toLocaleDateString() : null
  const subject = `Reminder: "${task.title}" is due today`
  const transporter = getTransport()
  try { await transporter.verify() } catch {}
  const html = renderBrandedEmail({
    title: 'Task Due Today',
    preheader: `${escapeHtml(task.title)} is due today`,
    bodyHtml: `
      <p>This is a reminder that the task <strong>${escapeHtml(task.title)}</strong>${task?.project?.name ? ` in project <strong>${escapeHtml(task.project.name)}</strong>` : ''} is due today.</p>
      ${due ? `<p style=\"margin:4px 0\"><strong>Due:</strong> ${escapeHtml(due)}</p>` : ''}
      ${task.status ? `<p style=\"margin:4px 0\"><strong>Current status:</strong> ${escapeHtml(formatTaskStatus(task.status))}</p>` : ''}
      ${task.description ? `<p style=\"margin:16px 0 0 0\"><strong>Description</strong><br />${escapeHtml(task.description)}</p>` : ''}
    `,
    action: { label: 'View Task', url: taskUrl },
  })

  const textLines = [
    `Reminder: the task "${task.title}"${task?.project?.name ? ` in project "${task.project.name}"` : ''} is due today.`,
    task.status ? `Current status: ${formatTaskStatus(task.status)}` : undefined,
    due ? `Due: ${due}` : undefined,
    `Open: ${taskUrl}`,
  ].filter(Boolean) as string[]

  const result = await transporter.sendMail({
    from,
    to,
    subject,
    text: textLines.join('\n'),
    html,
  })
  if (process.env.EMAIL_DEBUG === 'true') {
    try {
      console.log('[email] task due reminder sent', {
        to,
        messageId: (result as any)?.messageId,
        accepted: (result as any)?.accepted,
        rejected: (result as any)?.rejected,
        envelope: (result as any)?.envelope,
      })
    } catch {}
  }
  return result
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
<body style="margin:0; background:#f3f4f6;">
  <span class="preheader">${escapeHtml(preheader)}</span>
  <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="background:#f3f4f6;padding:24px 12px">
    <tr>
      <td align="center">
        <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="max-width:560px;background:#ffffff;border:1px solid #e5e7eb;border-radius:12px;overflow:hidden">
          <tr>
            <td style="background:${brandColor};padding:16px 20px;border-bottom:1px solid #e5e7eb">
              <div style="color:#ffffff;font-size:16px;font-weight:700;letter-spacing:.2px">${escapeHtml(brand)}</div>
            </td>
          </tr>
          <tr>
            <td style="padding:22px 20px;color:#374151;font-size:14px;line-height:1.6">
              <h1 style="margin:0 0 12px 0;color:#111827;font-size:18px">${escapeHtml(args.title)}</h1>
              ${args.bodyHtml}
              ${btn ? `<div style=\"margin:18px 0 6px 0\">${btn}</div>` : ''}
              ${args.action ? `<div style=\"margin-top:8px;color:#6b7280;font-size:12px;word-break:break-all\">If the button doesn't work, copy and paste this link: <br /><a href=\"${args.action.url}\" style=\"color:${accent}\">${args.action.url}</a></div>` : ''}
            </td>
          </tr>
          <tr>
            <td style="padding:14px 20px;border-top:1px solid #e5e7eb;color:#6b7280;font-size:12px">This message was sent by ${escapeHtml(brand)}.</td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`
}

function formatTaskStatus(status: string) {
  const map: Record<string, string> = {
    TODO: 'To Do',
    IN_PROGRESS: 'In Progress',
    CLIENT_REVIEW: 'Client Review',
    DONE: 'Done',
  }
  return map[status] || status || 'Unknown'
}
