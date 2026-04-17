"use client"

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { Dialog, DialogFooter, DialogHeader } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'

type AlertTask = {
  id: string
  title: string
  dueDate: string | null
  project: {
    id: string
    name: string
  }
}

type TaskAlertsResponse = {
  dueSoon: AlertTask[]
  overdueSinceLastCheck: AlertTask[]
  windowHours: number
  checkedAt: string
}

type ToastItem = AlertTask & {
  toastId: string
}

const POPUP_SESSION_KEY = 'pp-task-alert-popup'

function formatDueDate(value: string | null) {
  if (!value) return 'No due date'
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value))
}

function formatWindowLabel(windowHours: number) {
  if (windowHours % 24 === 0) {
    const days = windowHours / 24
    return days === 1 ? 'next 24 hours' : `next ${days} days`
  }
  return `next ${windowHours} hours`
}

export function TaskAlerts() {
  const [dueSoon, setDueSoon] = useState<AlertTask[]>([])
  const [toasts, setToasts] = useState<ToastItem[]>([])
  const [dialogOpen, setDialogOpen] = useState(false)
  const [windowHours, setWindowHours] = useState(48)

  useEffect(() => {
    let active = true
    const timers: number[] = []

    async function loadAlerts() {
      try {
        const res = await fetch('/api/tasks/alerts', { cache: 'no-store' })
        if (!res.ok) return
        const data = (await res.json()) as TaskAlertsResponse
        if (!active) return

        setWindowHours(data.windowHours)
        setDueSoon(data.dueSoon)

        if (data.dueSoon.length > 0) {
          const signature = data.dueSoon.map((task) => `${task.id}:${task.dueDate || 'none'}`).join('|')
          const popupKey = `${POPUP_SESSION_KEY}:${signature}`
          if (typeof window !== 'undefined' && !window.sessionStorage.getItem(popupKey)) {
            window.sessionStorage.setItem(popupKey, '1')
            setDialogOpen(true)
          }
        }

        if (data.overdueSinceLastCheck.length > 0) {
          const nextToasts = data.overdueSinceLastCheck.map((task) => ({
            ...task,
            toastId: `${task.id}:${task.dueDate || 'none'}`,
          }))
          setToasts(nextToasts)
          nextToasts.forEach((toast, index) => {
            const timer = window.setTimeout(() => {
              setToasts((current) => current.filter((item) => item.toastId !== toast.toastId))
            }, 7000 + index * 1200)
            timers.push(timer)
          })
        }
      } catch {
        // Ignore notification fetch failures to avoid breaking navigation.
      }
    }

    loadAlerts()
    return () => {
      active = false
      timers.forEach((timer) => window.clearTimeout(timer))
    }
  }, [])

  return (
    <>
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogHeader>Tasks due soon</DialogHeader>
        <div className="space-y-3">
          <p className="text-sm text-white/70">
            You have {dueSoon.length} task{dueSoon.length === 1 ? '' : 's'} due in the {formatWindowLabel(windowHours)}.
          </p>
          <div className="max-h-[60vh] space-y-2 overflow-y-auto pr-1">
            {dueSoon.map((task) => (
              <div key={task.id} className="rounded-md border border-white/10 bg-white/5 p-3">
                <div className="text-sm font-medium">{task.title}</div>
                <div className="mt-1 text-xs text-white/60">{task.project.name}</div>
                <div className="mt-1 text-xs text-amber-200">Due {formatDueDate(task.dueDate)}</div>
                <Link href={`/tasks/${task.id}`} className="mt-2 inline-flex text-xs text-white/80 underline underline-offset-2">
                  Open task
                </Link>
              </div>
            ))}
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => setDialogOpen(false)}>Close</Button>
        </DialogFooter>
      </Dialog>

      <div className="pointer-events-none fixed right-4 top-20 z-50 flex w-full max-w-sm flex-col gap-2">
        {toasts.map((toast) => (
          <div
            key={toast.toastId}
            role="status"
            className="pointer-events-auto rounded-lg border border-rose-500/30 bg-[#12151b] p-4 shadow-xl"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="text-sm font-semibold text-rose-200">Task overdue</div>
                <div className="mt-1 text-sm">{toast.title}</div>
                <div className="mt-1 text-xs text-white/60">{toast.project.name}</div>
                <div className="mt-1 text-xs text-rose-200">Expired {formatDueDate(toast.dueDate)}</div>
                <Link href={`/tasks/${toast.id}`} className="mt-2 inline-flex text-xs text-white/80 underline underline-offset-2">
                  Open task
                </Link>
              </div>
              <button
                type="button"
                className="text-xs text-white/50 hover:text-white"
                onClick={() => setToasts((current) => current.filter((item) => item.toastId !== toast.toastId))}
              >
                Dismiss
              </button>
            </div>
          </div>
        ))}
      </div>
    </>
  )
}
