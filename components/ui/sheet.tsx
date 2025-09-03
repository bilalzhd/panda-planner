"use client"
import { ReactNode, createContext, useContext, useState, useCallback, useEffect } from 'react'
import { createPortal } from 'react-dom'

type SheetContextType = {
  open: boolean
  setOpen: (v: boolean) => void
}

const SheetCtx = createContext<SheetContextType | null>(null)

export function Sheet({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false)
  return <SheetCtx.Provider value={{ open, setOpen }}>{children}</SheetCtx.Provider>
}

export function useSheet() {
  const ctx = useContext(SheetCtx)
  if (!ctx) throw new Error('Sheet components must be used inside <Sheet>')
  return ctx
}

export function SheetTrigger({ children }: { children: ReactNode }) {
  const { setOpen } = useSheet()
  return (
    <span onClick={() => setOpen(true)} className="inline-flex cursor-pointer">
      {children}
    </span>
  )
}

export function SheetContent({ side = 'left', children }: { side?: 'left' | 'right'; children: ReactNode }) {
  const { open, setOpen } = useSheet()

  const onKey = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false)
    },
    [setOpen],
  )

  useEffect(() => {
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onKey])

  if (!open) return null

  const sideClass = side === 'left' ? 'left-0' : 'right-0'

  return createPortal(
    <div className="fixed inset-0 z-50">
      <div className="absolute inset-0 bg-black/60" onClick={() => setOpen(false)} />
      <div
        className={`absolute top-0 ${sideClass} h-full w-72 max-w-[85%] border-r border-white/10 bg-[#12151b] p-4 shadow-xl`}
        role="dialog"
        aria-modal="true"
      >
        {children}
      </div>
    </div>,
    document.body,
  )
}

export function SheetHeader({ children }: { children: ReactNode }) {
  return <div className="mb-3 text-base font-semibold">{children}</div>
}

export function SheetTitle({ children }: { children: ReactNode }) {
  return <div className="text-lg font-semibold">{children}</div>
}

export function SheetDescription({ children }: { children: ReactNode }) {
  return <div className="text-sm text-white/70">{children}</div>
}

