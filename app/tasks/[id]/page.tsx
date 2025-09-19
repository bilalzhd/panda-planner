import { prisma } from '@/lib/prisma'
import { notFound } from 'next/navigation'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import { revalidatePath } from 'next/cache'
import { requireUser, projectWhereForUser } from '@/lib/tenant'

export const dynamic = 'force-dynamic'

async function getTask(id: string) {
  const { user } = await requireUser()
  const projectWhere = await projectWhereForUser(user.id)
  const task = await prisma.task.findFirst({
    where: { id, project: projectWhere },
    include: { project: true, assignedTo: true, createdBy: true, comments: { include: { author: true }, orderBy: { createdAt: 'asc' } }, attachments: true, timesheets: { include: { user: true }, orderBy: { date: 'desc' } } },
  })
  if (!task) notFound()
  return task
}

async function addComment(data: FormData) {
  'use server'
  const { user } = await requireUser()
  const taskId = String(data.get('taskId'))
  const content = String(data.get('content') || '')
  if (!content) throw new Error('content required')
  // authorize task
  const projectWhere = await projectWhereForUser(user.id)
  const count = await prisma.task.count({ where: { id: taskId, project: projectWhere } })
  if (!count) throw new Error('Forbidden')
  await prisma.comment.create({ data: { taskId, authorId: user.id, content } })
  revalidatePath(`/tasks/${taskId}`)
}

async function addTimesheet(data: FormData) {
  'use server'
  const { user } = await requireUser()
  const payload = {
    taskId: String(data.get('taskId')),
    userId: user.id,
    hours: Number(data.get('hours')),
    notes: (data.get('notes') as string) || undefined,
    date: new Date(String(data.get('date') || new Date().toISOString())),
  }
  // authorize task
  const projectWhere = await projectWhereForUser(user.id)
  const count = await prisma.task.count({ where: { id: payload.taskId, project: projectWhere } })
  if (!count) throw new Error('Forbidden')
  await prisma.timesheet.create({ data: payload })
  revalidatePath(`/tasks/${payload.taskId}`)
}

async function uploadAttachment(_prevState: any, data: FormData) {
  'use server'
  const taskId = String(data.get('taskId'))
  const uploadedById = (data.get('uploadedById') as string) || undefined
  const file = data.get('file') as File | null
  if (!file) throw new Error('file required')
  const res = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || ''}/api/tasks/${taskId}/attachments`, {
    method: 'POST',
    body: data,
  })
  if (!res.ok) throw new Error('Upload failed')
}

export default async function TaskPage({ params }: { params: { id: string } }) {
  const task = await getTask(params.id)
  return (
    <div className="space-y-6">
      <div>
        <div className="text-xs text-white/60">Project</div>
        <div className="text-lg font-semibold">{task.project.name}</div>
      </div>
      <Card>
        <CardHeader className="font-semibold">{task.title}</CardHeader>
        <CardContent>
          {task.description && <p className="text-white/80 mb-2">{task.description}</p>}
          {task.createdBy && (
            <div className="text-xs text-white/60 mb-1">Added by {task.createdBy.name || task.createdBy.email}</div>
          )}
          {task.dueDate && <div className="text-sm text-white/60">Due {new Date(task.dueDate).toLocaleDateString()}</div>}
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-3">
        <Card className="md:col-span-2">
          <CardHeader className="font-semibold">Comments</CardHeader>
          <CardContent>
            <ul className="space-y-3">
              {task.comments.map((c) => (
                <li key={c.id}>
                  <div className="text-sm"><span className="text-white/70">{c.author.name || c.author.email}</span>: {c.content}</div>
                  <div className="text-xs text-white/50">{new Date(c.createdAt).toLocaleString()}</div>
                </li>
              ))}
            </ul>
            <form action={addComment} className="mt-3 grid gap-2">
              <input type="hidden" name="taskId" value={task.id} />
              <Textarea name="content" placeholder="Write a comment..." required />
              <div><Button type="submit">Add Comment</Button></div>
            </form>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="font-semibold">Attachments</CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {task.attachments.map((a) => (
                <li key={a.id} className="flex items-center justify-between text-sm">
                  <a href={a.url} target="_blank" className="hover:underline">{a.filename}</a>
                  <span className="text-white/50">{(a.size/1024).toFixed(1)} KB</span>
                </li>
              ))}
            </ul>
            <form action={uploadAttachment.bind(null, null)} className="mt-3 grid gap-2" encType="multipart/form-data">
              <input type="hidden" name="taskId" value={task.id} />
              <input className="text-sm" type="file" name="file" required />
              <div><Button type="submit">Upload</Button></div>
            </form>
        </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="font-semibold">Timesheets</CardHeader>
        <CardContent>
          <form action={addTimesheet} className="grid gap-2 md:grid-cols-4 items-end">
            <input type="hidden" name="taskId" value={task.id} />
            <Input name="date" type="date" defaultValue={new Date().toISOString().slice(0,10)} />
            <Input name="hours" type="number" step="0.25" min="0" placeholder="Hours" required />
            <Textarea name="notes" placeholder="Notes" className="md:col-span-4" />
            <div className="md:col-span-4"><Button type="submit">Log Time</Button></div>
          </form>
          <div className="mt-4">
            <ul className="divide-y divide-white/10">
              {task.timesheets.map((t) => (
                <li key={t.id} className="py-2 text-sm">
                  <div className="flex items-center justify-between">
                    <div>
                      {new Date(t.date).toLocaleDateString()} — {t.user.name || t.user.email}
                    </div>
                    <div className="text-white/70">{t.hours.toString()}h</div>
                  </div>
                  {t.notes && <div className="text-white/70">{t.notes}</div>}
                </li>
              ))}
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
