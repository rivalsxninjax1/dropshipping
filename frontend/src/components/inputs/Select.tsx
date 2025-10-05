import React from 'react'

type Option = { label: string; value: string | number }
type Props = React.SelectHTMLAttributes<HTMLSelectElement> & { label?: string; options: Option[] }

export default function Select({ label, options, id, ...props }: Props) {
  const selId = id || `sel_${Math.random().toString(36).slice(2)}`
  return (
    <div className="space-y-1">
      {label && <label htmlFor={selId} className="text-sm font-medium">{label}</label>}
      <select id={selId} className="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm focus:border-primary-600 focus:outline-none" {...props}>
        {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    </div>
  )
}

