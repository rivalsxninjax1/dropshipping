import { motion } from 'framer-motion'
import clsx from 'clsx'

interface SectionTitleProps {
  eyebrow?: string
  title: string
  description?: string
  align?: 'left' | 'center'
  className?: string
}

/**
 * SectionTitle enforces consistent hierarchy and spacing across pages
 * (Gestalt alignment + predictable scanning for returning visitors).
 */
export function SectionTitle({ eyebrow, title, description, align = 'center', className }: SectionTitleProps) {
  return (
    <motion.header
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.4 }}
      transition={{ duration: 0.6, ease: 'easeOut' }}
      className={clsx('mx-auto max-w-3xl space-y-3', align === 'center' ? 'text-center' : 'text-left', className)}
    >
      {eyebrow && <p className="section-heading">{eyebrow}</p>}
      <h2 className="headline">{title}</h2>
      {description && <p className={clsx('text-base text-neutral-600 sm:text-lg', align === 'center' ? 'mx-auto max-w-2xl' : 'max-w-xl')}>
        {description}
      </p>}
    </motion.header>
  )
}
