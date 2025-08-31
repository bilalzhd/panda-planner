import { RecurrenceFrequency, TaskSchedule } from '@prisma/client'
import { addDays, isAfter, isBefore, isSameDay } from 'date-fns'

// Expand schedule rules into concrete dates within [from, to]
export function expandSchedules(rules: TaskSchedule[], from: Date, to: Date) {
  const out: { taskId: string; userId: string; date: Date; timeOfDay?: string | null; durationMin?: number | null }[] = []
  for (const r of rules) {
    if (!r.isRecurring) {
      if (!r.date) continue
      if ((isAfter(r.date, from) || isSameDay(r.date, from)) && (isBefore(r.date, to) || isSameDay(r.date, to))) {
        out.push({ taskId: r.taskId, userId: r.userId, date: new Date(r.date), timeOfDay: r.timeOfDay, durationMin: r.durationMin })
      }
      continue
    }
    const start = r.startDate ?? from
    const end = r.endDate ?? to
    let cur = new Date(from)
    while (cur <= to) {
      if (cur >= start && cur <= end) {
        if (r.frequency === 'DAILY') {
          out.push({ taskId: r.taskId, userId: r.userId, date: new Date(cur), timeOfDay: r.timeOfDay, durationMin: r.durationMin })
        } else if (r.frequency === 'WEEKLY') {
          const wd = r.byWeekday ?? cur.getDay()
          if (cur.getDay() === wd) {
            out.push({ taskId: r.taskId, userId: r.userId, date: new Date(cur), timeOfDay: r.timeOfDay, durationMin: r.durationMin })
          }
        } else if (r.frequency === 'MONTHLY') {
          // Monthly: include on same day-of-month as start date
          const dom = (r.startDate ?? new Date()).getDate()
          if (cur.getDate() === dom) {
            out.push({ taskId: r.taskId, userId: r.userId, date: new Date(cur), timeOfDay: r.timeOfDay, durationMin: r.durationMin })
          }
        }
      }
      cur = addDays(cur, 1)
    }
  }
  return out
}

export function parseHHMM(s: string): number | null {
  const m = s.match(/^\s*(\d{1,2}):(\d{2})\s*$/)
  if (!m) return null
  const h = parseInt(m[1], 10)
  const mm = parseInt(m[2], 10)
  if (h < 0 || mm < 0 || mm > 59) return null
  return h + mm / 60
}

export function formatHHMM(hours: number): string {
  const h = Math.floor(hours)
  const m = Math.round((hours - h) * 60)
  return `${String(h).padStart(1, '0')}:${String(m).padStart(2, '0')}`
}

