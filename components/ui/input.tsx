import { InputHTMLAttributes, forwardRef } from 'react'
import { clsx } from 'clsx'

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(function Input(
  { className, ...props },
  ref,
) {
  return (
    <input
      ref={ref}
      className={clsx(
        'flex h-9 w-full rounded-md border border-white/10 bg-white/5 px-3 py-1 text-sm placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-white/20',
        className,
      )}
      {...props}
    />
  )
})

