import { create } from 'zustand'
import type { Product } from '../types/api'

type UIState = {
  cartOpen: boolean
  quickViewProduct: Product | null
  chatOpen: boolean
  openCart: () => void
  closeCart: () => void
  openQuickView: (product: Product) => void
  closeQuickView: () => void
  toggleChat: () => void
}

export const useUIStore = create<UIState>((set) => ({
  cartOpen: false,
  quickViewProduct: null,
  chatOpen: false,
  openCart: () => set({ cartOpen: true }),
  closeCart: () => set({ cartOpen: false }),
  openQuickView: (product) => set({ quickViewProduct: product }),
  closeQuickView: () => set({ quickViewProduct: null }),
  toggleChat: () => set(state => ({ chatOpen: !state.chatOpen })),
}))
