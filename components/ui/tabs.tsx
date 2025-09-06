"use client"
import { useEffect, useId, useState, type ReactNode } from 'react'

type Tab = {
  key: string
  label: string
  icon?: ReactNode
  ariaLabel?: string
}

export function Tabs({ tabs, initial, onChange }: { tabs: Tab[]; initial?: string; onChange?: (key: string) => void }) {
  const [active, setActive] = useState<string>(initial || tabs[0]?.key)
  const id = useId()

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
              key={t.key}
              role="tab"
              aria-selected={selected}
              aria-controls={`${id}-${t.key}`}
              className={`px-3 py-2 text-sm rounded-t-md focus:outline-none transition-colors whitespace-nowrap flex items-center gap-2 ${
                selected ? 'bg-white/[0.06] text-white border border-white/10 border-b-transparent' : 'text-white/70 hover:text-white'
              }`}
              onClick={() => setActive(t.key)}
            >
              {t.icon && <span className="opacity-80">{t.icon}</span>}
              <span>{t.label}</span>
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
