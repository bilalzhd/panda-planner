import { RecurrenceFrequency } from '@prisma/client'
import { addDays, addWeeks, addMonths, nextDay, isAfter, isSameDay } from 'date-fns'

// Compute the next due date after a reference date for a recurring task
export function nextDueDate(opts: {
  lastDueDate?: Date | null
  frequency: RecurrenceFrequency
  interval?: number | null
  byWeekday?: number | null // 0-6, Sunday-Saturday
  reference?: Date // default now
}): Date {
  const interval = Math.max(1, opts.interval ?? 1)
  const ref = opts.reference ?? new Date()
  const base = opts.lastDueDate ?? ref

  if (opts.frequency === 'DAILY') {
    let d = addDays(base, interval)
    if (!isAfter(d, ref) && !isSameDay(d, ref)) d = addDays(ref, interval)
    return d
  }

  if (opts.frequency === 'WEEKLY') {
    const wd = (opts.byWeekday ?? base.getDay()) as 0|1|2|3|4|5|6
    // next occurrence of weekday after ref
    let d = nextDay(ref, wd)
    // handle interval > 1 by advancing weeks from the lastDueDate
    if (opts.lastDueDate) {
      d = addWeeks(opts.lastDueDate, interval)
      // ensure weekday aligns
      if (d.getDay() !== wd) {
        d = nextDay(addWeeks(opts.lastDueDate, interval - 1), wd)
      }
    }
    return d
  }

  // MONTHLY
  if (opts.frequency === 'MONTHLY') {
    const d = addMonths(base, interval)
    return d
  }

  return addDays(base, 1)
}

