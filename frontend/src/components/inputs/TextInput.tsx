import React from 'react'

type Props = React.InputHTMLAttributes<HTMLInputElement> & { label?: string; hint?: string }

export default function TextInput({ label, hint, id, ...props }: Props) {
  const inputId = id || `in_${Math.random().toString(36).slice(2)}`
  return (
    <div className="space-y-1">
      {label && <label htmlFor={inputId} className="text-sm font-medium">{label}</label>}
      <input id={inputId} className="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm focus:border-primary-600 focus:outline-none" {...props} />
      {hint && <p className="text-xs text-neutral-600">{hint}</p>}
    </div>
  )
}

