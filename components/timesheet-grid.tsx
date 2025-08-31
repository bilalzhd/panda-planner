"use client"
import { useEffect, useMemo, useState, useTransition } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { format } from 'date-fns'
import { formatHHMM, parseHHMM } from '@/lib/schedule'

type Day = { date: string; label: string }
type Entry = { taskId: string; date: string; hours: number }

type TaskRow = {
  id: string
  title: string
  projectName: string
}

export function TimesheetGrid({
  days,
  rows,
  entries,
  scheduled,
  taskOptions,
}: {
  days: Day[]
  rows: TaskRow[]
  entries: Entry[]
  scheduled?: Record<string, boolean>
  taskOptions?: TaskRow[]
}) {
  const [isPending, startTransition] = useTransition()
  const [map, setMap] = useState<Record<string, number>>(Object.create(null))
  const [localRows, setLocalRows] = useState<TaskRow[]>(rows)
  const [adding, setAdding] = useState(false)
  const [newTaskId, setNewTaskId] = useState('')

  useEffect(() => {
    const m: Record<string, number> = {}
    entries.forEach((e) => (m[`${e.taskId}:${e.date}`] = e.hours))
    setMap(m)
  }, [entries])

  useEffect(() => {
    setLocalRows(rows)
  }, [rows])

  function hoursFor(taskId: string, date: string) {
    return map[`${taskId}:${date}`] ?? 0
  }

  function setHours(taskId: string, date: string, hours: number) {
    setMap((prev) => ({ ...prev, [`${taskId}:${date}`]: hours }))
  }

  async function save(taskId: string, isoDate: string, value: string) {
    const parsed = parseHHMM(value)
    if (parsed == null) return
    const hours = Number(parsed.toFixed(2))
    setHours(taskId, isoDate, hours)
    await fetch('/api/timesheets', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ taskId, hours, date: new Date(isoDate).toISOString() }),
    })
  }

  const totals = useMemo(() => {
    const t: Record<string, number> = {}
    localRows.forEach((r) => {
      const sum = days.reduce((acc, d) => acc + (hoursFor(r.id, d.date) || 0), 0)
      t[r.id] = sum
    })
    return t
  }, [localRows, days, map])

  const grandTotal = useMemo(() => Object.values(totals).reduce((a, b) => a + b, 0), [totals])

  return (
    <div className="overflow-auto rounded-lg border border-white/10">
      <table className="w-full text-sm">
        <thead className="bg-white/5">
          <tr>
            <th className="sticky left-0 z-10 bg-white/5 px-2 py-2 text-left">Task</th>
            {days.map((d) => (
              <th key={d.date} className="px-2 py-2 text-right whitespace-nowrap">{d.label}</th>
            ))}
            <th className="px-2 py-2 text-right">Time Spent</th>
          </tr>
        </thead>
        <tbody>
          {localRows.map((r, i) => (
            <tr key={r.id} className="border-t border-white/10">
              <td className="sticky left-0 z-10 bg-[#0b0d12] px-2 py-2 w-[320px]">
                <div className="flex items-center gap-2">
                  <span className="inline-flex h-5 w-5 items-center justify-center rounded bg-white/10 text-[10px]">{String.fromCharCode(65 + (i % 26))}</span>
                  <div>
                    <div className="font-medium">{r.projectName} · {r.title}</div>
                  </div>
                </div>
              </td>
              {days.map((d) => {
                const iso = d.date
                const val = hoursFor(r.id, iso)
                const isScheduled = scheduled?.[`${r.id}:${iso}`]
                return (
                  <td key={d.date} className="px-2 py-1 text-right">
                    <input
                      defaultValue={val ? formatHHMM(val) : ''}
                      placeholder="0:00"
                      className={`w-16 rounded-md border px-2 py-1 text-right ${isScheduled ? 'border-white/20 bg-white/10' : 'border-white/10 bg-white/5'}`}
                      onBlur={(e) => save(r.id, iso, e.currentTarget.value)}
                    />
                  </td>
                )
              })}
              <td className="px-2 py-2 text-right font-medium">{formatHHMM(totals[r.id] || 0)}</td>
            </tr>
          ))}
          {taskOptions && (
            <tr className="border-t border-white/10">
              <td className="sticky left-0 z-10 bg-[#0b0d12] px-2 py-2" colSpan={days.length + 2}>
                {!adding ? (
                  <button type="button" className="text-sm text-white/80 hover:underline" onClick={() => setAdding(true)}>+ Add a line</button>
                ) : (
                  <div className="flex items-center gap-2">
                    <select className="w-96 rounded-md border border-white/10 bg-white/5 px-3 py-1 text-sm" value={newTaskId} onChange={(e) => setNewTaskId(e.target.value)}>
                      <option value="">Select a task…</option>
                      {taskOptions.map((t) => (
                        <option key={t.id} value={t.id}>{t.projectName} · {t.title}</option>
                      ))}
                    </select>
                    <button
                      className="rounded-md border border-white/10 bg-white/10 px-3 py-1 text-sm"
                      onClick={() => {
                        const t = taskOptions.find((x) => x.id === newTaskId)
                        if (!t) return
                        if (!localRows.find((r) => r.id === t.id)) setLocalRows((prev) => [...prev, t])
                        setAdding(false)
                        setNewTaskId('')
                      }}
                    >Add</button>
                    <button className="rounded-md border border-white/10 bg-white/5 px-3 py-1 text-sm" onClick={() => { setAdding(false); setNewTaskId('') }}>Cancel</button>
                  </div>
                )}
              </td>
            </tr>
          )}
        </tbody>
        <tfoot>
          <tr className="border-t border-white/10 bg-white/5">
            <td className="sticky left-0 z-10 bg-white/5 px-2 py-2 text-left">Totals</td>
            {days.map((d) => {
              const colTotal = localRows.reduce((acc, r) => acc + (hoursFor(r.id, d.date) || 0), 0)
              return <td key={d.date} className="px-2 py-2 text-right">{formatHHMM(colTotal)}</td>
            })}
            <td className="px-2 py-2 text-right font-semibold">{formatHHMM(grandTotal)}</td>
          </tr>
        </tfoot>
      </table>
    </div>
  )
}
