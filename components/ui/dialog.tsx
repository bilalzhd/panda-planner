"use client"
import { ReactNode, useEffect } from 'react'
import { createPortal } from 'react-dom'

export function Dialog({ open, onOpenChange, children }: { open: boolean; onOpenChange: (o: boolean) => void; children: ReactNode }) {
  useEffect(() => {
    const onEsc = (e: KeyboardEvent) => e.key === 'Escape' && onOpenChange(false)
    document.addEventListener('keydown', onEsc)
    return () => document.removeEventListener('keydown', onEsc)
  }, [onOpenChange])
  if (!open) return null
  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/60" onClick={() => onOpenChange(false)} />
      <div className="relative z-10 w-full max-w-md rounded-lg border border-white/10 bg-[#12151b] p-4 shadow-xl">
        {children}
      </div>
    </div>,
    document.body,
  )
}

export function DialogHeader({ children }: { children: ReactNode }) {
  return <div className="mb-3 text-base font-semibold">{children}</div>
}

export function DialogFooter({ children }: { children: ReactNode }) {
  return <div className="mt-4 flex items-center justify-end gap-2">{children}</div>
}

