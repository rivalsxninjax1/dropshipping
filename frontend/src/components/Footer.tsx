import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { EnvelopeIcon, PhoneIcon, MapPinIcon } from '@heroicons/react/24/outline'

const currentYear = new Date().getFullYear()

const footerLinks = [
  {
    title: 'Shop',
    links: [
      { label: 'nav.products', fallback: 'Products', href: '/products' },
      { label: 'nav.categories', fallback: 'Categories', href: '/products?sort=trending' },
      { label: 'nav.wishlist', fallback: 'Wishlist', href: '/account/wishlist' },
    ],
  },
  {
    title: 'Company',
    links: [
      { label: 'nav.about', fallback: 'About', href: '/about' },
      { label: 'nav.contact', fallback: 'Contact', href: '/contact' },
      { label: 'nav.orders', fallback: 'Orders', href: '/account/orders' },
    ],
  },
]

const socials = [
  { label: 'Instagram', href: 'https://instagram.com', icon: '📸' },
  { label: 'TikTok', href: 'https://tiktok.com', icon: '🎵' },
  { label: 'YouTube', href: 'https://youtube.com', icon: '▶️' },
]

export default function Footer() {
  const { t } = useTranslation()

  return (
    <footer className="relative mt-20 bg-gradient-dark text-neutral-100">
      <div className="absolute inset-0 opacity-50" aria-hidden="true">
        <div className="pointer-events-none absolute top-[-40%] left-[5%] h-96 w-96 animate-pulse-soft rounded-full bg-primary-500/30 blur-3xl" />
        <div className="pointer-events-none absolute bottom-[-30%] right-[8%] h-80 w-80 animate-float rounded-full bg-emerald-500/20 blur-3xl" />
      </div>

      <div className="relative mx-auto flex w-full max-w-7xl flex-col gap-16 px-6 pb-12 pt-16">
        <div className="grid grid-cols-1 gap-12 md:grid-cols-[1.5fr_1fr_1fr]">
          <div>
            <div className="flex items-center gap-3">
              <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/10 text-xl font-bold text-white shadow-glow">ds</span>
              <div>
                <h3 className="font-heading text-2xl font-semibold">Dropshipper</h3>
                <p className="text-sm text-neutral-300">{t('footer.tagline', 'Trendy essentials curated for your daily glow up.')}</p>
              </div>
            </div>
            <p className="mt-6 max-w-md text-sm text-neutral-400">
              {t('footer.description', 'We blend design thinking with data-backed merchandising to help you discover useful, aesthetic products you will actually use.')}
            </p>
            <div className="mt-6 flex flex-wrap items-center gap-3 text-sm text-neutral-300">
              {socials.map(social => (
                <a
                  key={social.label}
                  href={social.href}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-2 rounded-full bg-white/5 px-4 py-2 text-neutral-200 transition hover:bg-white/10"
                >
                  <span>{social.icon}</span>
                  <span>{social.label}</span>
                </a>
              ))}
            </div>
          </div>

          {footerLinks.map(({ title, links }) => (
            <div key={title} className="space-y-4">
              <h4 className="text-sm font-semibold uppercase tracking-[0.3em] text-neutral-400">{title}</h4>
              <ul className="space-y-2 text-sm text-neutral-300">
                {links.map(link => (
                  <li key={link.href}>
                    <Link to={link.href} className="transition hover:text-white">
                      {t(link.label, { defaultValue: link.fallback })}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 gap-6 rounded-3xl border border-white/10 bg-white/5 p-6 backdrop-blur md:grid-cols-3">
          <div className="flex items-center gap-3 text-sm text-neutral-200">
            <EnvelopeIcon className="h-5 w-5" />
            <span>hello@dropshipper.design</span>
          </div>
          <div className="flex items-center gap-3 text-sm text-neutral-200">
            <PhoneIcon className="h-5 w-5" />
            <span>+977 980-123-4567</span>
          </div>
          <div className="flex items-center gap-3 text-sm text-neutral-200">
            <MapPinIcon className="h-5 w-5" />
            <span>{t('footer.location', 'Kathmandu • Remote Worldwide')}</span>
          </div>
        </div>

        <div className="flex flex-col items-center justify-between gap-4 border-t border-white/10 pt-6 text-xs text-neutral-500 sm:flex-row">
          <p>© {currentYear} Dropshipper. {t('footer.rights', 'All rights reserved.')}</p>
          <div className="flex items-center gap-4">
            <Link to="/terms" className="hover:text-white">{t('footer.terms', 'Terms')}</Link>
            <Link to="/privacy" className="hover:text-white">{t('footer.privacy', 'Privacy')}</Link>
            <Link to="/shipping" className="hover:text-white">{t('footer.shipping', 'Shipping')}</Link>
          </div>
        </div>
      </div>
    </footer>
  )
}
