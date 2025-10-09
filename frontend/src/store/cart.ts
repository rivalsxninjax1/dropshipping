import { create } from 'zustand'

type CartItem = { productId: number; quantity: number }

type CartState = {
  items: CartItem[]
  setItems: (items: CartItem[]) => void
  clear: () => void
}

export const useCartStore = create<CartState>()((set) => ({
  items: [],
  setItems: (items) => set({ items }),
  clear: () => set({ items: [] }),
}))
