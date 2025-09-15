"use client"
import { useRouter, useSearchParams } from 'next/navigation'
import { addDays } from 'date-fns'
import { useTransition } from 'react'

export function TimesheetToolbar({ from, to, range }: { from: string; to: string; range: 'week' | 'month' }) {
  const router = useRouter()
  const params = useSearchParams()
  const fromDate = new Date(from)
  const toDate = new Date(to)
  const [isPending, startTransition] = useTransition()

  function push(newFrom: Date, newTo: Date, newRange?: 'week' | 'month') {
    const sp = new URLSearchParams(params as any)
    sp.set('from', newFrom.toISOString().slice(0,10))
    sp.set('to', newTo.toISOString().slice(0,10))
    sp.set('range', newRange || range)
    startTransition(() => router.push(`/timesheets?${sp.toString()}`))
  }

  function setToday() {
    const today = new Date(); today.setHours(0,0,0,0)
    if (range === 'month') {
      const f = new Date(today.getFullYear(), today.getMonth(), 1)
      const t = new Date(today.getFullYear(), today.getMonth()+1, 0)
      push(f, t)
    } else {
      const f = today
      const t = addDays(today, 6)
      push(f, t)
    }
  }

  function prev() {
    if (range === 'month') {
      const f = new Date(fromDate.getFullYear(), fromDate.getMonth()-1, 1)
      const t = new Date(fromDate.getFullYear(), fromDate.getMonth(), 0)
      push(f, t)
    } else {
      const f = addDays(fromDate, -7)
      const t = addDays(toDate, -7)
      push(f, t)
    }
  }

  function next() {
    if (range === 'month') {
      const f = new Date(fromDate.getFullYear(), fromDate.getMonth()+1, 1)
      const t = new Date(fromDate.getFullYear(), fromDate.getMonth()+2, 0)
      push(f, t)
    } else {
      const f = addDays(fromDate, 7)
      const t = addDays(toDate, 7)
      push(f, t)
    }
  }

  return (
    <div className="flex items-center gap-2">
      <button
        className="rounded-md border border-white/10 bg-white/10 px-3 py-1 text-sm disabled:opacity-50"
        onClick={setToday}
        disabled={isPending}
      >Today</button>
      <select
        className="rounded-md border border-white/10 bg-white/5 px-3 py-1 text-sm disabled:opacity-50"
        value={range}
        disabled={isPending}
        onChange={(e) => {
          const r = e.target.value as 'week' | 'month'
          if (r === 'month') {
            const f = new Date(fromDate.getFullYear(), fromDate.getMonth(), 1)
            const t = new Date(fromDate.getFullYear(), fromDate.getMonth()+1, 0)
            push(f, t, 'month')
          } else {
            const today = new Date(); today.setHours(0,0,0,0)
            const f = today
            const t = addDays(today, 6)
            push(f, t, 'week')
          }
        }}
      >
        <option value="week">Week</option>
        <option value="month">Month</option>
      </select>
      <button
        className="rounded-md border border-white/10 bg-white/10 px-3 py-1 text-sm disabled:opacity-50"
        onClick={prev}
        disabled={isPending}
      >◀</button>
      <button
        className="rounded-md border border-white/10 bg-white/10 px-3 py-1 text-sm disabled:opacity-50"
        onClick={next}
        disabled={isPending}
      >▶</button>
      {isPending && (
        <span className="ml-2 inline-block h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-transparent" aria-label="Loading" />
      )}
    </div>
  )
}
