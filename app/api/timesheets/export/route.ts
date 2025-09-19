import { prisma } from '@/lib/prisma'
import { NextRequest } from 'next/server'
import PDFDocument from 'pdfkit'
import { requireUser, projectWhereForUser } from '@/lib/tenant'

export async function GET(req: NextRequest) {
  const { user } = await requireUser()
  const projectWhere = await projectWhereForUser(user.id)
  const { searchParams } = new URL(req.url)
  const format = (searchParams.get('format') || 'csv').toLowerCase()
  const from = searchParams.get('from')
  const to = searchParams.get('to')
  const userId = searchParams.get('userId') || undefined
  const projectId = searchParams.get('projectId') || undefined

  const timesheets = await prisma.timesheet.findMany({
    where: {
      task: {
        project: projectWhere,
        ...(projectId ? { projectId } : {}),
      },
      userId,
      date: {
        gte: from ? new Date(from) : undefined,
        lte: to ? new Date(to) : undefined,
      },
    },
    include: { task: { include: { project: true } }, user: true },
    orderBy: { date: 'asc' },
  })

  if (format === 'csv') {
    const rows = [
      ['Date', 'Project', 'Task', 'User', 'Hours', 'Notes'],
      ...timesheets.map((t) => [
        t.date.toISOString().slice(0, 10),
        t.task.project.name,
        t.task.title,
        t.user.name || t.user.email || t.user.id,
        t.hours.toString(),
        (t.notes || '').replaceAll('\n', ' '),
      ]),
    ]
    const csv = rows.map((r) => r.map((c) => `"${String(c).replaceAll('"', '""')}"`).join(',')).join('\n')
    return new Response(csv, {
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': 'attachment; filename="timesheets.csv"',
      },
    })
  }

  if (format === 'pdf') {
    const doc = new PDFDocument({ margin: 40 })
    const chunks: Buffer[] = []
    doc.on('data', (chunk) => chunks.push(chunk as Buffer))
    const done = new Promise<Buffer>((resolve) => doc.on('end', () => resolve(Buffer.concat(chunks))))

    doc.fontSize(16).text('Timesheet Report', { underline: true })
    doc.moveDown()
    if (from || to) doc.fontSize(10).text(`Range: ${from || '...'} - ${to || '...'}`)
    if (userId) doc.fontSize(10).text(`User: ${userId}`)
    if (projectId) doc.fontSize(10).text(`Project: ${projectId}`)
    doc.moveDown()

    doc.fontSize(10)
    timesheets.forEach((t) => {
      doc.text(`${t.date.toISOString().slice(0,10)}  ${t.task.project.name} › ${t.task.title}`)
      doc.text(`User: ${t.user.name || t.user.email || t.user.id}  Hours: ${t.hours.toString()}`)
      if (t.notes) doc.text(`Notes: ${t.notes}`)
      doc.moveDown(0.5)
    })
    doc.end()
    const pdf = await done
    return new Response(pdf, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': 'attachment; filename="timesheets.pdf"',
      },
    })
  }

  return Response.json({ error: 'Unsupported format' }, { status: 400 })
}
