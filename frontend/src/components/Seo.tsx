import { Helmet } from 'react-helmet-async'

const DEFAULT_TITLE = 'Dropshipper Nepal'
const DEFAULT_DESCRIPTION = 'Curated Nepali streetwear, TikTok-ready fits, and global-inspired drops with cash-on-delivery.'
const DEFAULT_IMAGE = import.meta.env.VITE_OG_IMAGE as string | undefined
const BASE_URL = import.meta.env.VITE_BASE_URL as string | undefined

type SeoProps = {
  title?: string
  description?: string
  image?: string
  url?: string
}

export default function Seo({ title, description, image, url }: SeoProps) {
  const fullTitle = title ? `${title} • Dropshipper` : DEFAULT_TITLE
  const metaDescription = description || DEFAULT_DESCRIPTION
  const metaImage = image || DEFAULT_IMAGE || '/og-image.png'
  const canonical = url || BASE_URL

  return (
    <Helmet>
      <title>{fullTitle}</title>
      <meta name="description" content={metaDescription} />
      <meta property="og:title" content={fullTitle} />
      <meta property="og:description" content={metaDescription} />
      <meta property="og:image" content={metaImage} />
      {canonical && <meta property="og:url" content={canonical} />}
      <meta property="og:type" content="website" />
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={fullTitle} />
      <meta name="twitter:description" content={metaDescription} />
      <meta name="twitter:image" content={metaImage} />
    </Helmet>
  )
}
