import { api } from './client'
import type {
  Paginated,
  Product,
  Category,
  PaymentIntent,
  Order,
  Wishlist,
  Notification,
} from '../types/api'

export async function fetchProducts(params: Record<string, any> = {}): Promise<Paginated<Product>> {
  const { data } = await api.get('/products/', { params })
  return data
}

export async function fetchProduct(slug: string): Promise<Product> {
  const { data } = await api.get(`/products/${slug}/`)
  return data
}

export async function fetchCategories(): Promise<Category[]> {
  const { data } = await api.get('/categories/')
  return data.results ?? data
}

export async function searchSuggestions(q: string): Promise<string[]> {
  const { data } = await api.get('/search/suggestions/', { params: { q } })
  return data.suggestions ?? []
}

export async function getCart() {
  const { data } = await api.get('/cart/')
  return data
}

export async function addToCart(product_id: number, quantity = 1) {
  const { data } = await api.post('/cart/', { product_id, quantity })
  return data
}

export async function updateCart(product_id: number, quantity: number) {
  const { data } = await api.patch('/cart/', { product_id, quantity })
  return data
}

export async function removeFromCart(product_id: number) {
  const { data } = await api.delete('/cart/', { data: { product_id } })
  return data
}

export async function clearCart() {
  const { data } = await api.post('/cart/clear/', {})
  return data
}

export async function checkout(payload: { shipping_address: number; billing_address: number; provider?: string }) {
  const { data } = await api.post('/checkout/', payload)
  return data as { order_id: number; payment_intent: PaymentIntent }
}

export async function fetchAddresses() {
  const { data } = await api.get('/addresses/')
  return data.results ?? data
}

export async function createAddress(payload: Record<string, unknown>) {
  const { data } = await api.post('/addresses/', payload)
  return data
}

export async function updateAddress(id: number, payload: Record<string, unknown>) {
  const { data } = await api.put(`/addresses/${id}/`, payload)
  return data
}

export async function deleteAddress(id: number) {
  await api.delete(`/addresses/${id}/`)
}

export async function login(email: string, password: string) {
  const { data } = await api.post('/auth/login/', { email, password })
  return data as { access: string; refresh: string; user?: any }
}

export async function listOrders(): Promise<Paginated<Order>> {
  const { data } = await api.get('/orders/')
  return data
}

export async function register(payload: { email: string; password: string; first_name?: string; last_name?: string }) {
  const { data } = await api.post('/auth/register/', payload)
  return data as { user: any; verify_token: string }
}

export async function me() {
  const { data } = await api.get('/auth/me/')
  return data
}

export async function mergeCart() {
  const { data } = await api.post('/cart/merge/')
  return data
}

export async function fetchWishlist(): Promise<Wishlist> {
  const { data } = await api.get('/wishlist/')
  return data
}

export async function addToWishlist(product_id: number) {
  const { data } = await api.post('/wishlist/', { product_id })
  return data
}

export async function removeFromWishlist(product_id: number) {
  await api.delete(`/wishlist/items/${product_id}/`)
}

export async function fetchNotifications(): Promise<Paginated<Notification>> {
  const { data } = await api.get('/notifications/')
  return data
}

export async function markNotificationsRead(ids: number[]) {
  await api.post('/notifications/mark-read/', { ids })
}
