import React from 'react'

export function Label({ children, htmlFor }: { children: React.ReactNode; htmlFor: string }) {
  return <label className="mb-1 block text-sm font-medium" htmlFor={htmlFor}>{children}</label>
}

export function Input(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input className="w-full rounded border border-gray-300 px-3 py-2 text-sm focus:border-blue-600 focus:outline-none" {...props} />
}

