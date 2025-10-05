import { create } from 'zustand'

type CartItem = { productId: number; quantity: number }

type CartState = {
  items: CartItem[]
  add: (productId: number, quantity?: number) => void
  update: (productId: number, quantity: number) => void
  remove: (productId: number) => void
  clear: () => void
  load: () => void
}

const STORAGE_KEY = 'ds_cart'

export const useCartStore = create<CartState>((set, get) => ({
  items: [],
  add: (productId, quantity = 1) => {
    const items = [...get().items]
    const idx = items.findIndex(i => i.productId === productId)
    if (idx >= 0) items[idx].quantity += quantity
    else items.push({ productId, quantity })
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items))
    set({ items })
  },
  update: (productId, quantity) => {
    const items = get().items.map(i => i.productId === productId ? { ...i, quantity } : i)
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items))
    set({ items })
  },
  remove: (productId) => {
    const items = get().items.filter(i => i.productId !== productId)
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items))
    set({ items })
  },
  clear: () => {
    localStorage.removeItem(STORAGE_KEY)
    set({ items: [] })
  },
  load: () => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      if (raw) set({ items: JSON.parse(raw) })
    } catch {}
  }
}))

