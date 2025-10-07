import { SectionTitle } from '../components/ui/SectionTitle'
import Button from '../components/Button'
import { EnvelopeIcon, PhoneIcon } from '@heroicons/react/24/outline'

export default function Contact() {
  return (
    <main className="mx-auto flex w-full max-w-5xl flex-col gap-16 px-6 py-16">
      <SectionTitle
        eyebrow="Contact"
        title="Let’s make your next drop unforgettable"
        description="Reach out for styling tours, supplier partnerships, or order support. Our UX stylists respond within two hours."
        align="left"
      />

      <div className="grid gap-10 md:grid-cols-[1.2fr_1fr]">
        <div className="rounded-3xl border border-neutral-100 bg-white/80 p-8 shadow-card backdrop-blur">
          <form className="space-y-5">
            <div className="grid gap-4 md:grid-cols-2">
              <label className="text-sm font-medium text-neutral-700">
                Name
                <input
                  type="text"
                  required
                  placeholder="Your name"
                  className="mt-2 h-11 w-full rounded-2xl border border-neutral-200 bg-white px-4 text-sm focus:border-primary-200 focus:outline-none"
                />
              </label>
              <label className="text-sm font-medium text-neutral-700">
                Email
                <input
                  type="email"
                  required
                  placeholder="you@example.com"
                  className="mt-2 h-11 w-full rounded-2xl border border-neutral-200 bg-white px-4 text-sm focus:border-primary-200 focus:outline-none"
                />
              </label>
            </div>
            <label className="text-sm font-medium text-neutral-700">
              Topic
              <select className="mt-2 h-11 w-full rounded-2xl border border-neutral-200 bg-white px-4 text-sm focus:border-primary-200 focus:outline-none">
                <option>Order support</option>
                <option>Partnership inquiry</option>
                <option>Press & collaborations</option>
              </select>
            </label>
            <label className="text-sm font-medium text-neutral-700">
              Message
              <textarea
                rows={4}
                required
                placeholder="Tell us how we can help…"
                className="mt-2 w-full rounded-2xl border border-neutral-200 bg-white px-4 py-3 text-sm focus:border-primary-200 focus:outline-none"
              />
            </label>
            <Button type="submit" className="w-full md:w-auto">Send message</Button>
          </form>
        </div>

        <div className="space-y-6 rounded-3xl border border-neutral-100 bg-white/80 p-8 shadow-card backdrop-blur">
          <div>
            <h3 className="text-sm font-semibold uppercase tracking-[0.3em] text-neutral-400">Support hours</h3>
            <p className="mt-2 text-sm text-neutral-600">Sunday – Friday · 8:00 – 20:00 NST</p>
          </div>
          <div className="flex items-center gap-3 text-sm text-neutral-600">
            <EnvelopeIcon className="h-5 w-5 text-primary-500" />
            <a className="hover:text-primary-600" href="mailto:hello@dropshipper.design">hello@dropshipper.design</a>
          </div>
          <div className="flex items-center gap-3 text-sm text-neutral-600">
            <PhoneIcon className="h-5 w-5 text-primary-500" />
            <a className="hover:text-primary-600" href="tel:+9779801234567">+977 980-123-4567</a>
          </div>
          <div className="rounded-2xl bg-neutral-100/80 p-4 text-sm text-neutral-500 shadow-inner">
            <p className="font-semibold text-neutral-700">Studio</p>
            <p className="mt-1">Open : · Mon – Fri · 10:00 – 18:00 NST</p>
          </div>
        </div>
      </div>
    </main>
  )
}
