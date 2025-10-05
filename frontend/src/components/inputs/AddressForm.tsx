import React from 'react'
import TextInput from './TextInput'

export default function AddressForm({ value, onChange }: { value: any; onChange: (v: any) => void }) {
  function upd(k: string, v: string) { onChange({ ...value, [k]: v }) }
  return (
    <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
      <TextInput label="Label" value={value?.label || ''} onChange={e => upd('label', e.target.value)} />
      <TextInput label="Phone" value={value?.phone || ''} onChange={e => upd('phone', e.target.value)} />
      <TextInput label="Address Line 1" value={value?.address_line1 || ''} onChange={e => upd('address_line1', e.target.value)} />
      <TextInput label="City" value={value?.city || ''} onChange={e => upd('city', e.target.value)} />
      <TextInput label="State" value={value?.state || ''} onChange={e => upd('state', e.target.value)} />
      <TextInput label="Postal Code" value={value?.postal_code || ''} onChange={e => upd('postal_code', e.target.value)} />
      <TextInput label="Country" value={value?.country || ''} onChange={e => upd('country', e.target.value)} />
    </div>
  )
}

