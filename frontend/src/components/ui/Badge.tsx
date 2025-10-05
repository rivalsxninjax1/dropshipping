import clsx from 'clsx'
import { ReactNode } from 'react'

type Variant = 'default' | 'outline' | 'success' | 'warning'

type Props = {
  children: ReactNode
  variant?: Variant
  className?: string
}

const styles: Record<Variant, string> = {
  default: 'bg-primary-50 text-primary-600',
  outline: 'border border-primary-200 text-primary-600',
  success: 'bg-emerald-100 text-emerald-600',
  warning: 'bg-amber-100 text-amber-700',
}

export function Badge({ children, variant = 'default', className }: Props) {
  return (
    <span
      className={clsx(
        'inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-wide',
        styles[variant],
        className
      )}
    >
      {children}
    </span>
  )
}
