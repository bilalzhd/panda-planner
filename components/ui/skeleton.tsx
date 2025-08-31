import { clsx } from 'clsx'

export function Skeleton({ className }: { className?: string }) {
  return <div className={clsx('animate-pulse rounded-md bg-white/10', className)} />
}

