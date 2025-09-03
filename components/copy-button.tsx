"use client"
import { useState } from 'react'
import { Button } from '@/components/ui/button'

export function CopyButton({ text, ariaLabel = 'Copy', className = '' }: { text: string; ariaLabel?: string; className?: string }) {
  const [copied, setCopied] = useState(false)
  async function onCopy() {
    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
      setTimeout(() => setCopied(false), 1200)
    } catch {}
  }
  return (
    <Button
      type="button"
      variant="ghost"
      onClick={onCopy}
      aria-label={ariaLabel}
      className={`h-7 px-2 ${className}`}
      title={copied ? 'Copied' : 'Copy'}
    >
      {copied ? (
        // check icon
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4">
          <path d="M9 16.2 4.8 12l-1.4 1.4L9 19 21 7l-1.4-1.4z" />
        </svg>
      ) : (
        // copy icon
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4">
          <path d="M16 1H4a2 2 0 0 0-2 2v12h2V3h12V1Zm3 4H8a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h11a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2Zm0 16H8V7h11v14Z" />
        </svg>
      )}
    </Button>
  )
}

