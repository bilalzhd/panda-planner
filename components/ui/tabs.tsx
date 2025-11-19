"use client"
import { useEffect, useId, useState, type ReactNode } from 'react'

type Tab = {
  key: string
  label: string
  icon?: ReactNode
  ariaLabel?: string
  disabled?: boolean
  disabledReason?: string
}

export function Tabs({ tabs, initial, onChange }: { tabs: Tab[]; initial?: string; onChange?: (key: string) => void }) {
  const firstEnabled = tabs.find((t) => !t.disabled)?.key || tabs[0]?.key
  const initialKey = (initial && tabs.find((t) => t.key === initial && !t.disabled)?.key) || firstEnabled
  const [active, setActive] = useState<string>(initialKey as string)
  const id = useId()

  useEffect(() => {
    const next = (initial && tabs.find((t) => t.key === initial && !t.disabled)?.key) || tabs.find((t) => !t.disabled)?.key || tabs[0]?.key
    if (next && next !== active) setActive(next)
  }, [initial, tabs, active])

  useEffect(() => {
    onChange?.(active)
  }, [active])

  return (
    <div className="border-b border-white/10">
      <div role="tablist" aria-label="Project Views" className="flex items-center gap-1 overflow-x-auto">
        {tabs.map((t) => {
          const selected = active === t.key
          return (
            <button
              disabled={!!t.disabled}
              key={t.key}
              role="tab"
              aria-selected={selected}
              aria-controls={`${id}-${t.key}`}
              aria-disabled={t.disabled ? true : undefined}
              title={t.disabled ? (t.disabledReason || 'Coming soon') : (t.ariaLabel || undefined)}
              className={`px-3 py-2 text-sm rounded-t-md focus:outline-none transition-colors whitespace-nowrap flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed ${
                selected
                  ? 'bg-white/[0.06] text-white border border-white/10 border-b-transparent'
                  : 'text-white/70 hover:text-white'
              }`}
              onClick={() => { if (!t.disabled) setActive(t.key) }}
            >
              {t.icon && <span className="opacity-80">{t.icon}</span>}
              <span>{t.label}</span>
              {t.disabled && (
                <span className="ml-1 rounded bg-white/10 px-1.5 py-0.5 text-[10px] text-white/70">Coming soon</span>
              )}
            </button>
          )
        })}
      </div>
    </div>
  )
}

export function TabPanel({ when, active, children, id }: { when: string; active: string; id: string; children: React.ReactNode }) {
  if (active !== when) return null
  return (
    <div id={id} role="tabpanel" className="py-4">
      {children}
    </div>
  )
}
