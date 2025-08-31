import { ButtonHTMLAttributes } from 'react'
import { clsx } from 'clsx'

type Props = ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'default' | 'outline' | 'ghost' }

export function Button({ className, variant = 'default', ...props }: Props) {
  const base = 'inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/20 disabled:opacity-50 disabled:pointer-events-none h-9 px-3'
  const variants: Record<typeof variant, string> = {
    default: 'bg-white text-black hover:bg-white/90',
    outline: 'border border-white/20 hover:bg-white/5',
    ghost: 'hover:bg-white/5',
  }
  return <button className={clsx(base, variants[variant], className)} {...props} />
}

