import React from 'react'

type Option = { label: string; value: string }

export default function RadioGroup({ name, options, value, onChange }: { name: string; options: Option[]; value?: string; onChange?: (v: string) => void }) {
  return (
    <div role="radiogroup" className="flex gap-4">
      {options.map(o => (
        <label key={o.value} className="inline-flex items-center gap-2 text-sm">
          <input type="radio" name={name} value={o.value} checked={value === o.value} onChange={e => onChange?.(e.target.value)} className="h-4 w-4 border-neutral-300 text-primary-600 focus:ring-primary-600" />
          {o.label}
        </label>
      ))}
    </div>
  )
}

