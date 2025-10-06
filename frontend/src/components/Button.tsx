import { type AnchorHTMLAttributes, type ButtonHTMLAttributes } from 'react'
import clsx from 'clsx'

type Variant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'accent' | 'destructive'
type Size = 'sm' | 'md' | 'lg'

type BaseProps = {
  variant?: Variant
  size?: Size
  as?: 'button' | 'a'
}

type ButtonProps = BaseProps & ButtonHTMLAttributes<HTMLButtonElement>
type AnchorProps = BaseProps & AnchorHTMLAttributes<HTMLAnchorElement>

type Props = ButtonProps | AnchorProps

const base = 'inline-flex items-center justify-center rounded-full font-semibold transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60'

const variantStyles: Record<Variant, string> = {
  // Primary CTA uses gradient to grab attention (Fitts's law: large, high-contrast target)
  primary: 'bg-gradient-primary text-white shadow-glow hover:shadow-glow/80 focus-visible:ring-primary-300',
  // Secondary keeps contrast high for hierarchy while supporting dark backgrounds
  secondary: 'bg-neutral-900 text-white hover:bg-neutral-800 focus-visible:ring-neutral-700',
  // Outline provides low emphasis actions without losing affordance
  outline: 'border border-neutral-200 bg-white text-neutral-900 hover:border-primary-200 hover:text-primary-600 focus-visible:ring-primary-200',
  // Ghost is subtle for icon-only or tertiary actions
  ghost: 'bg-transparent text-neutral-700 hover:bg-neutral-100 focus-visible:ring-neutral-200',
  // Accent CTA uses brand gold for limited highlights (Hick’s law: reserve for key flows)
  accent: 'bg-accent-500 text-neutral-900 hover:bg-accent-400 focus-visible:ring-accent-400',
  destructive: 'bg-red-600 text-white hover:bg-red-500 focus-visible:ring-red-500',
}

const sizeStyles: Record<Size, string> = {
  sm: 'h-9 px-4 text-sm',
  md: 'h-11 px-6 text-sm',
  lg: 'h-12 px-8 text-base',
}

export default function Button({ className, variant = 'primary', size = 'md', as = 'button', ...props }: Props) {
  const Component = (as === 'a' ? 'a' : 'button') as 'a' | 'button'
  return (
    <Component
      className={clsx(base, variantStyles[variant], sizeStyles[size], className)}
      {...(props as any)}
    />
  )
}
