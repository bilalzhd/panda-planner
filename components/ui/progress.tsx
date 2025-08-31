export function Progress({ value, className }: { value: number; className?: string }) {
  const v = Math.max(0, Math.min(100, value))
  return (
    <div className={`h-2 w-full overflow-hidden rounded-full bg-white/10 ${className || ''}`}>
      <div className="h-full bg-white" style={{ width: `${v}%` }} />
    </div>
  )
}

