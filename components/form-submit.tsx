"use client"
import { useFormStatus } from 'react-dom'
import { Button } from '@/components/ui/button'

export function FormSubmit({ children, pendingText = 'Saving…', className }: { children: React.ReactNode; pendingText?: string; className?: string }) {
  const { pending } = useFormStatus()
  return (
    <Button type="submit" disabled={pending} className={className}>
      {pending ? pendingText : children}
    </Button>
  )
}

