"use client"
import React from 'react'

type Brand = {
  key: string
  abbr: string
  bg: string
  fg: string
}

function detectBrand(label: string): Brand | null {
  const l = (label || '').toLowerCase()
  const table: Brand[] = [
    { key: 'google', abbr: 'G', bg: '#4285F4', fg: '#ffffff' },
    { key: 'gmail', abbr: 'G', bg: '#EA4335', fg: '#ffffff' },
    { key: 'wordpress', abbr: 'W', bg: '#21759B', fg: '#ffffff' },
    { key: 'github', abbr: 'GH', bg: '#000000', fg: '#ffffff' },
    { key: 'gitlab', abbr: 'GL', bg: '#FC6D26', fg: '#ffffff' },
    { key: 'aws', abbr: 'AWS', bg: '#FF9900', fg: '#111827' },
    { key: 'azure', abbr: 'AZ', bg: '#0078D4', fg: '#ffffff' },
    { key: 'gcp', abbr: 'GCP', bg: '#34A853', fg: '#ffffff' },
    { key: 'google cloud', abbr: 'GCP', bg: '#34A853', fg: '#ffffff' },
    { key: 'digitalocean', abbr: 'DO', bg: '#0080FF', fg: '#ffffff' },
    { key: 'linode', abbr: 'LI', bg: '#00A95C', fg: '#ffffff' },
    { key: 'vps', abbr: 'V', bg: '#6B7280', fg: '#ffffff' },
    { key: 'server', abbr: 'SV', bg: '#6B7280', fg: '#ffffff' },
    { key: 'mysql', abbr: 'DB', bg: '#00758F', fg: '#ffffff' },
    { key: 'postgres', abbr: 'DB', bg: '#336791', fg: '#ffffff' },
    { key: 'database', abbr: 'DB', bg: '#4B5563', fg: '#ffffff' },
    { key: 'email', abbr: 'EM', bg: '#9CA3AF', fg: '#111827' },
    { key: 'facebook', abbr: 'f', bg: '#1877F2', fg: '#ffffff' },
    { key: 'twitter', abbr: 'X', bg: '#111111', fg: '#ffffff' },
  ]
  for (const b of table) {
    if (l.includes(b.key)) return b
  }
  return null
}

export function CredentialIcon({ label, className = '' }: { label: string; className?: string }) {
  const brand = detectBrand(label)
  if (brand) {
    return (
      <span
        className={`inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[9px] font-semibold ${className}`}
        style={{ backgroundColor: brand.bg, color: brand.fg }}
        aria-label={`${brand.key} credential`}
      >
        {brand.abbr}
      </span>
    )
  }
  // Fallback: key icon
  return (
    <span className={`inline-flex h-5 w-5 items-center justify-center rounded-full bg-white/10 ${className}`} aria-hidden>
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="h-3.5 w-3.5">
        <path d="M10 12a5 5 0 1 1 9.58 1.66l2.12 2.12a1 1 0 0 1 0 1.41l-1.59 1.59a1 1 0 0 1-1.41 0l-.29-.29-.29.29a1 1 0 0 1-1.41 0l-.88-.88-.29.29a1 1 0 0 1-1.41 0l-1.01-1.01A5 5 0 0 1 10 12Zm5-3a3 3 0 1 0 0 6 3 3 0 0 0 0-6Z" />
      </svg>
    </span>
  )
}

