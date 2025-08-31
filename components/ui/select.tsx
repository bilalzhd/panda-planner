import { SelectHTMLAttributes, forwardRef } from 'react'
import { clsx } from 'clsx'

export const Select = forwardRef<HTMLSelectElement, SelectHTMLAttributes<HTMLSelectElement>>(function Select(
  { className, children, ...props },
  ref,
) {
  return (
    <select
      ref={ref}
      className={clsx(
        'flex h-9 w-full rounded-md border border-white/10 bg-white/5 px-3 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-white/20',
        className,
      )}
      {...props}
    >
      {children}
    </select>
  )
})

