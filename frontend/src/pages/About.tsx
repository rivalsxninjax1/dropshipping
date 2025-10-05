import { SectionTitle } from '../components/ui/SectionTitle'
import { GlassCard } from '../components/ui/GlassCard'
import { motion } from 'framer-motion'

const milestones = [
  { year: '2021', detail: 'Launched the first curated drop shipping 200 orders in the first weekend.' },
  { year: '2022', detail: 'Scaled to nationwide delivery with eSewa and Khalti integrations.' },
  { year: '2024', detail: 'Introduced personalization engine powered by community voting.' },
]

const values = [
  'Community-first drops that respond to culture, not guesswork.',
  'Sustainable sourcing partners with traceable supply chains.',
  'Hyper-responsive support team based in Kathmandu.',
]

export default function About() {
  return (
    <main className="mx-auto flex w-full max-w-6xl flex-col gap-16 px-6 py-16">
      <SectionTitle
        eyebrow="About Dropshipper"
        title="Design studio meets digital marketplace"
        description="We’re a Nepal-based crew obsessed with elevating everyday essentials. Every product passes our design critique before making it to your feed."
        align="left"
      />

      <div className="grid gap-6 md:grid-cols-[1.2fr_1fr]">
        <GlassCard className="p-8">
          <h3 className="text-lg font-semibold text-neutral-900">Our origin story</h3>
          <p className="mt-4 text-sm text-neutral-600">
            Dropshipper started as a weekly newsletter of curated finds. As our community grew, we built a premium experience around limited batches, design storytelling, and instant checkout. Today we blend data, trend forecasting, and supplier relationships to deliver pieces that feel personal.
          </p>
          <div className="mt-6 grid gap-4 text-sm text-neutral-500">
            {milestones.map(entry => (
              <div key={entry.year} className="rounded-2xl border border-neutral-100 bg-white/70 px-4 py-3 shadow-inner">
                <span className="text-xs uppercase tracking-[0.3em] text-neutral-400">{entry.year}</span>
                <p className="mt-1 text-neutral-700">{entry.detail}</p>
              </div>
            ))}
          </div>
        </GlassCard>

        <GlassCard className="flex flex-col justify-between gap-6 p-8">
          <div>
            <h3 className="text-lg font-semibold text-neutral-900">What keeps us grounded</h3>
            <ul className="mt-4 space-y-3 text-sm text-neutral-600">
              {values.map(value => (
                <li key={value} className="flex items-start gap-3">
                  <span className="mt-0.5 text-primary-500">◆</span>
                  <span>{value}</span>
                </li>
              ))}
            </ul>
          </div>
          <motion.img
            src="https://images.unsplash.com/photo-1545239351-1141bd82e8a6?auto=format&fit=crop&w=800&q=80"
            alt="Studio desk"
            className="h-48 w-full rounded-3xl object-cover"
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            loading="lazy"
          />
        </GlassCard>
      </div>

      <GlassCard className="grid gap-8 p-8 md:grid-cols-3">
        <div>
          <h4 className="text-sm font-semibold uppercase tracking-[0.3em] text-neutral-400">Team size</h4>
          <p className="mt-2 text-2xl font-bold text-neutral-900">18 curators</p>
          <p className="text-sm text-neutral-500">Designers, merchandisers, and logistics problem-solvers.</p>
        </div>
        <div>
          <h4 className="text-sm font-semibold uppercase tracking-[0.3em] text-neutral-400">Suppliers</h4>
          <p className="mt-2 text-2xl font-bold text-neutral-900">42 partners</p>
          <p className="text-sm text-neutral-500">Across Kathmandu, Shenzhen, Seoul, and Copenhagen.</p>
        </div>
        <div>
          <h4 className="text-sm font-semibold uppercase tracking-[0.3em] text-neutral-400">Community</h4>
          <p className="mt-2 text-2xl font-bold text-neutral-900">56k members</p>
          <p className="text-sm text-neutral-500">Voting on drops and unlocking co-created exclusives.</p>
        </div>
      </GlassCard>
    </main>
  )
}
