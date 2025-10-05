import { useEffect, useState } from 'react'
import Button from '../../components/Button'
import ProductCard from '../../components/ProductCard'
import TextInput from '../../components/inputs/TextInput'
import Select from '../../components/inputs/Select'
import Checkbox from '../../components/inputs/Checkbox'
import RadioGroup from '../../components/inputs/RadioGroup'
import { foundation } from '../../styles/theme'
import NavBar from '../../components/NavBar'

const demoProduct = {
  id: 1, title: 'Demo Product', slug: 'demo', description: '', base_price: '19.99', sku: 'DEMO', images: '',
  category: { id: 1, name: 'Cat', slug: 'cat', parent: null }, supplier: null, created_at: '', updated_at: ''
}

export default function DesignSystem() {
  const [dark, setDark] = useState(false)
  useEffect(() => {
    const root = document.documentElement
    dark ? root.classList.add('dark') : root.classList.remove('dark')
  }, [dark])

  return (
    <div className="min-h-screen bg-neutral-50 text-neutral-900 dark:bg-neutral-900 dark:text-neutral-100">
      <NavBar />
      <div className="mx-auto max-w-6xl p-6">
        <div className="mb-6 flex items-center justify-between">
          <h1 className="text-2xl font-heading">Design System</h1>
          <label className="inline-flex items-center gap-2 text-sm"><input type="checkbox" checked={dark} onChange={e => setDark(e.target.checked)} /> Dark mode</label>
        </div>

        <section className="mb-8">
          <h2 className="mb-3 text-xl font-semibold">Colors</h2>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-6">
            {Object.entries(foundation.colors.brand).map(([key, value]) => (
              typeof value === 'string' ? (
                <div key={key} className="rounded p-3 text-sm shadow-card">
                  <div className="h-10 w-full rounded" style={{ background: value }}></div>
                  <div className="mt-2">brand.{key}</div>
                </div>
              ) : (
                Object.entries(value).map(([shade, hex]) => (
                  <div key={`${key}-${shade}`} className="rounded p-3 text-sm shadow-card">
                    <div className="h-10 w-full rounded" style={{ background: hex as string }}></div>
                    <div className="mt-2">{`brand.${key}.${shade}`}</div>
                  </div>
                ))
              )
            ))}
            {Object.entries(foundation.colors.neutral).map(([shade, hex]) => (
              <div key={`neutral-${shade}`} className="rounded p-3 text-sm shadow-card">
                <div className="h-10 w-full rounded" style={{ background: hex as string }}></div>
                <div className="mt-2">neutral-{shade}</div>
              </div>
            ))}
          </div>
        </section>

        <section className="mb-8">
          <h2 className="mb-3 text-xl font-semibold">Buttons</h2>
          <div className="flex flex-wrap gap-3">
            <Button>Primary</Button>
            <Button variant="secondary">Secondary</Button>
            <Button variant="outline">Outline</Button>
            <Button variant="destructive">Destructive</Button>
          </div>
        </section>

        <section className="mb-8">
          <h2 className="mb-3 text-xl font-semibold">Inputs</h2>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <TextInput label="Text" placeholder="Your name" />
            <Select label="Select" options={[{label:'One',value:'1'},{label:'Two',value:'2'}]} />
            <Checkbox label="Accept terms" />
            <RadioGroup name="r" options={[{label:'A',value:'a'},{label:'B',value:'b'}]} />
          </div>
        </section>

        <section className="mb-8">
          <h2 className="mb-3 text-xl font-semibold">Product Card</h2>
          <div className="max-w-sm"><ProductCard product={demoProduct as any} /></div>
        </section>

        <section className="mb-8">
          <h2 className="mb-3 text-xl font-semibold">Tokens</h2>
          <pre className="rounded bg-neutral-100 p-4 text-sm dark:bg-neutral-800">{JSON.stringify(foundation, null, 2)}</pre>
        </section>
      </div>
    </div>
  )
}
