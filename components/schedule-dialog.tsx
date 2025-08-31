"use client"
import { useState } from 'react'
import { Dialog, DialogFooter, DialogHeader } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'

type TaskOpt = { id: string; title: string; projectName: string }

export function ScheduleDialog({ tasks, onCreated }: { tasks: TaskOpt[]; onCreated?: () => void }) {
  const [open, setOpen] = useState(false)
  const [taskId, setTaskId] = useState('')
  const [mode, setMode] = useState<'one' | 'recurring'>('recurring')
  const [weekday, setWeekday] = useState('1')
  const [date, setDate] = useState('')
  const [timeOfDay, setTimeOfDay] = useState('09:00')
  const [durationMin, setDurationMin] = useState(60)
  const [saving, setSaving] = useState(false)

  async function submit() {
    if (!taskId) return
    setSaving(true)
    const payload: any = { taskId, timeOfDay, durationMin }
    if (mode === 'one') {
      payload.isRecurring = false
      payload.date = date || new Date().toISOString().slice(0,10)
    } else {
      payload.isRecurring = true
      payload.frequency = 'WEEKLY'
      payload.byWeekday = Number(weekday)
      payload.startDate = new Date().toISOString().slice(0,10)
    }
    const res = await fetch('/api/schedules', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
    setSaving(false)
    if (res.ok) {
      setOpen(false)
      setTaskId('')
      onCreated?.()
    }
  }

  return (
    <div>
      <Button onClick={() => setOpen(true)}>New Schedule</Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogHeader>Schedule Task</DialogHeader>
        <div className="grid gap-2">
          <label className="text-sm text-white/80">
            Task
            <Select value={taskId} onChange={(e) => setTaskId(e.target.value)}>
              <option value="">Select a task</option>
              {tasks.map((t) => (
                <option key={t.id} value={t.id}>{t.projectName} · {t.title}</option>
              ))}
            </Select>
          </label>
          <label className="text-sm text-white/80">
            Mode
            <Select value={mode} onChange={(e) => setMode(e.target.value as any)}>
              <option value="recurring">Recurring (weekly)</option>
              <option value="one">One-time</option>
            </Select>
          </label>
          {mode === 'recurring' ? (
            <label className="text-sm text-white/80">
              Weekday
              <Select value={weekday} onChange={(e) => setWeekday(e.target.value)}>
                <option value="1">Monday</option>
                <option value="2">Tuesday</option>
                <option value="3">Wednesday</option>
                <option value="4">Thursday</option>
                <option value="5">Friday</option>
                <option value="6">Saturday</option>
                <option value="0">Sunday</option>
              </Select>
            </label>
          ) : (
            <label className="text-sm text-white/80">
              Date
              <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
            </label>
          )}
          <label className="text-sm text-white/80">
            Time of day
            <Input placeholder="09:00" value={timeOfDay} onChange={(e) => setTimeOfDay(e.target.value)} />
          </label>
          <label className="text-sm text-white/80">
            Duration (minutes)
            <Input type="number" min={15} step={15} value={durationMin} onChange={(e) => setDurationMin(parseInt(e.target.value || '60', 10))} />
          </label>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
          <Button onClick={submit} disabled={!taskId || saving}>{saving ? 'Saving…' : 'Save'}</Button>
        </DialogFooter>
      </Dialog>
    </div>
  )
}
