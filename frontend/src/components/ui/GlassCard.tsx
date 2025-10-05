import clsx from 'clsx'
import { motion } from 'framer-motion'
import { ReactNode } from 'react'

type Props = {
  children: ReactNode
  className?: string
  as?: keyof JSX.IntrinsicElements
}

/**
 * GlassCard delivers depth with subtle translucency (modern premium aesthetic)
 * while maintaining contrast for accessibility.
 */
export function GlassCard({ children, className, as: Component = 'div' }: Props) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 18 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.35 }}
      transition={{ duration: 0.6, ease: 'easeOut' }}
    >
      <Component className={clsx('glass-panel shadow-border', className)}>{children}</Component>
    </motion.div>
  )
}
