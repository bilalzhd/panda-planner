import { TextareaHTMLAttributes, forwardRef } from 'react'
import { clsx } from 'clsx'

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaHTMLAttributes<HTMLTextAreaElement>>(function Textarea(
  { className, ...props },
  ref,
) {
  return (
    <textarea
      ref={ref}
      className={clsx(
        'flex min-h-[80px] w-full rounded-md border border-white/10 bg-white/5 px-3 py-2 text-sm placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-white/20',
        className,
      )}
      {...props}
    />
  )
})

