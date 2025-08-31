import { ReactNode } from 'react'
import { clsx } from 'clsx'

export function Card({ className, children }: { className?: string; children: ReactNode }) {
  return <div className={clsx('rounded-lg border border-white/10 bg-white/5', className)}>{children}</div>
}

export function CardHeader({ className, children }: { className?: string; children: ReactNode }) {
  return <div className={clsx('p-4 border-b border-white/10', className)}>{children}</div>
}

export function CardContent({ className, children }: { className?: string; children: ReactNode }) {
  return <div className={clsx('p-4', className)}>{children}</div>
}

