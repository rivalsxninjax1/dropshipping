import { useMemo, useState, type MouseEvent } from 'react'
import { motion } from 'framer-motion'

type GalleryProps = {
  images: string[]
}

export default function ProductGallery({ images }: GalleryProps) {
  const gallery = images.length ? images : ['https://via.placeholder.com/900x900']
  const [active, setActive] = useState(0)
  const [zoomVisible, setZoomVisible] = useState(false)
  const [zoomPosition, setZoomPosition] = useState({ x: '50%', y: '50%' })

  const activeImage = useMemo(() => gallery[active], [gallery, active])

  const handleMouseMove = (event: MouseEvent<HTMLDivElement>) => {
    const rect = event.currentTarget.getBoundingClientRect()
    const x = ((event.clientX - rect.left) / rect.width) * 100
    const y = ((event.clientY - rect.top) / rect.height) * 100
    setZoomPosition({ x: `${x}%`, y: `${y}%` })
  }

  return (
    <div className="flex flex-col gap-4 lg:flex-row">
      <motion.div
        key={gallery[active]}
        initial={{ opacity: 0.6, scale: 0.98 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.4 }}
        className="relative flex-1 overflow-hidden rounded-3xl bg-neutral-100 shadow-glass"
        onMouseEnter={() => setZoomVisible(true)}
        onMouseLeave={() => setZoomVisible(false)}
        onMouseMove={handleMouseMove}
      >
        <img
          src={activeImage}
          alt="Product preview"
          className="h-full w-full object-cover"
          loading="lazy"
        />
        <div className="absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-neutral-950/60 via-transparent to-transparent" />
        {zoomVisible && (
          <div
            className="absolute right-4 top-4 hidden h-44 w-44 overflow-hidden rounded-2xl border border-neutral-200 bg-white/90 shadow-lg lg:block"
            aria-hidden="true"
          >
            <div
              className="h-full w-full bg-no-repeat"
              style={{
                backgroundImage: `url(${activeImage})`,
                backgroundSize: '250%',
                backgroundPosition: `${zoomPosition.x} ${zoomPosition.y}`,
              }}
            />
          </div>
        )}
      </motion.div>
      <div className="flex shrink-0 gap-3 overflow-x-auto lg:flex-col lg:overflow-y-auto">
        {gallery.map((src, index) => {
          const selected = index === active
          return (
            <button
              key={src}
              onClick={() => setActive(index)}
              className={`relative h-24 w-24 overflow-hidden rounded-2xl border transition ${selected ? 'border-primary-300 shadow-glow' : 'border-transparent hover:border-primary-200'}`}
              aria-label={`Preview ${index + 1}`}
            >
              <img src={src} alt="Thumbnail" className="h-full w-full object-cover" loading="lazy" />
              {selected && <span className="absolute inset-0 rounded-2xl ring-4 ring-primary-200/70" aria-hidden="true" />}
            </button>
          )
        })}
      </div>
    </div>
  )
}
