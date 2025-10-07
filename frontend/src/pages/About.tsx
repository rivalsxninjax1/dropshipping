import { SectionTitle } from "../components/ui/SectionTitle";
import { GlassCard } from "../components/ui/GlassCard";
import { motion } from "framer-motion";

const milestones = [
  {
    year: "2024 November",
    detail:
      "Had an idea of creaitng something to upgrade Nepal's fashion wear.",
  },
  {
    year: "2024 December",
    detail: "Made a website with user friendly UI/UX and did some research on fashion and culture of Nepalses fashion scene",
  },
  {
    year: "2025 January",
    detail: "Started connecting with top level and emerging fashion designers and suppliers for top fashion choices.",
  },
];

const values = [
  "Community-first drops that respond to culture, not guesswork.",
  "Sustainable sourcing partners with traceable supply chains.",
  "Hyper-responsive support team based in Nepal.",
];

export default function About() {
  return (
    <main className="mx-auto flex w-full max-w-6xl flex-col gap-16 px-6 py-16">
      <SectionTitle
        eyebrow="About VastraStore"
        title="Designer-Approved Fashion, Curated for You"
        description="We’re a Nepal-based fashion collective redefining how style reaches your wardrobe. Every outfit at VastraStore passes through the hands and eyes of professional fashion designers before it reaches you — ensuring every piece reflects quality, confidence, and individuality."
        align="left"
      />

      <div className="grid gap-6 md:grid-cols-[1.2fr_1fr]">
        <GlassCard className="p-8">
          <h3 className="text-lg font-semibold text-neutral-900">
            Our Story: Where Designers Define the Trends
          </h3>
          <p className="mt-4 text-sm text-neutral-600">
            VastraStore began as a bold idea — what if every product you saw
            online was already approved by designers? No random picks, no
            overhyped trends — just fashion chosen by professionals who
            understand aesthetics, fit, and real-world style. What started as a
            small design curation circle has now evolved into Nepal’s first
            designer-led fashion platform, bringing together top stylists,
            creative directors, and emerging labels under one digital roof.
          </p>
          <div className="mt-6 grid gap-4 text-sm text-neutral-500">
            {milestones.map((entry) => (
              <div
                key={entry.year}
                className="rounded-2xl border border-neutral-100 bg-white/70 px-4 py-3 shadow-inner"
              >
                <span className="text-xs uppercase tracking-[0.3em] text-neutral-400">
                  {entry.year}
                </span>
                <p className="mt-1 text-neutral-700">{entry.detail}</p>
              </div>
            ))}
          </div>
        </GlassCard>

        <GlassCard className="flex flex-col justify-between gap-6 p-8">
          <div>
            <h3 className="text-lg font-semibold text-neutral-900">
              What keeps us grounded
            </h3>
            <ul className="mt-4 space-y-3 text-sm text-neutral-600">
              {values.map((value) => (
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
          <h4 className="text-sm font-semibold uppercase tracking-[0.3em] text-neutral-400">
            Team size
          </h4>
          <p className="mt-2 text-2xl font-bold text-neutral-900">
            18 curators
          </p>
          <p className="text-sm text-neutral-500">
            Designers, merchandisers, and logistics problem-solvers.
          </p>
        </div>
        <div>
          <h4 className="text-sm font-semibold uppercase tracking-[0.3em] text-neutral-400">
            Suppliers
          </h4>
          <p className="mt-2 text-2xl font-bold text-neutral-900">
            Top designers stores.
          </p>
          <p className="text-sm text-neutral-500">
            Across all over Nepal.
          </p>
        </div>
        <div>
          <h4 className="text-sm font-semibold uppercase tracking-[0.3em] text-neutral-400">
            Community
          </h4>
          <p className="mt-2 text-2xl font-bold text-neutral-900">
            Growing members on every day
          </p>
          <p className="text-sm text-neutral-500">
            Voting on drops and unlocking co-created exclusives.
          </p>
        </div>
      </GlassCard>
    </main>
  );
}
