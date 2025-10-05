import React from 'react'

type Props = React.InputHTMLAttributes<HTMLInputElement> & { label?: string }

export default function Checkbox({ label, id, ...props }: Props) {
  const cid = id || `chk_${Math.random().toString(36).slice(2)}`
  return (
    <label htmlFor={cid} className="inline-flex items-center gap-2 text-sm">
      <input id={cid} type="checkbox" className="h-4 w-4 rounded border-neutral-300 text-primary-600 focus:ring-primary-600" {...props} />
      {label}
    </label>
  )
}

