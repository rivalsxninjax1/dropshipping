import { api } from './client'
import type { Category, Bundle, ContentPage } from '../types/api'

export async function fetchAdminMetrics() {
  const { data } = await api.get('/admin/metrics/')
  return data
}

export async function fetchLowStock() {
  const { data } = await api.get('/admin/low-stock/')
  return data.results ?? data
}

export async function fetchAdminOrders(params: Record<string, unknown> = {}) {
  const { data } = await api.get('/admin/orders/', { params })
  return data
}

export async function updateAdminOrder(id: number, payload: Record<string, unknown>) {
  const { data } = await api.patch(`/admin/orders/${id}/`, payload)
  return data
}

export async function refundAdminOrder(id: number, payload: Record<string, unknown> = {}) {
  const { data } = await api.post(`/admin/orders/${id}/refund/`, payload)
  return data
}

export async function fetchAdminProducts(params: Record<string, unknown> = {}) {
  const { data } = await api.get('/admin/products/', { params })
  return data
}

export async function createAdminProduct(payload: FormData | Record<string, unknown>) {
  const { data } = await api.post('/admin/products/', payload)
  return data
}

export async function updateAdminProduct(id: number, payload: FormData | Record<string, unknown>) {
  const { data } = await api.patch(`/admin/products/${id}/`, payload)
  return data
}

export async function fetchAdminSuppliers() {
  const { data } = await api.get('/admin/suppliers/')
  return data
}

export async function triggerSupplierSync(id: number) {
  const { data } = await api.post(`/admin/suppliers/${id}/sync/`)
  return data
}

export async function fetchAdminCoupons() {
  const { data } = await api.get('/admin/coupons/')
  return data
}

export async function createAdminCoupon(payload: Record<string, unknown>) {
  const { data } = await api.post('/admin/coupons/', payload)
  return data
}

export async function updateAdminCoupon(id: number, payload: Record<string, unknown>) {
  const { data } = await api.patch(`/admin/coupons/${id}/`, payload)
  return data
}

export async function deleteAdminCoupon(id: number) {
  await api.delete(`/admin/coupons/${id}/`)
}

export async function fetchAdminCategories() {
  const { data } = await api.get('/admin/categories/')
  return data
}

export async function updateAdminCategory(id: number, payload: Partial<Category>) {
  const { data } = await api.patch(`/admin/categories/${id}/`, payload)
  return data
}

export async function createAdminCategory(payload: Partial<Category>) {
  const { data } = await api.post('/admin/categories/', payload)
  return data
}

export async function fetchAdminBundles(params: Record<string, unknown> = {}) {
  const { data } = await api.get('/admin/bundles/', { params })
  return data
}

export async function updateAdminBundle(id: number, payload: Partial<Bundle>) {
  const { data } = await api.patch(`/admin/bundles/${id}/`, payload)
  return data
}

export async function createAdminBundle(payload: Partial<Bundle>) {
  const { data } = await api.post('/admin/bundles/', payload)
  return data
}

export async function deleteAdminBundle(id: number) {
  await api.delete(`/admin/bundles/${id}/`)
}

export async function fetchAdminPages() {
  const { data } = await api.get('/admin/pages/')
  return data
}

export async function updateAdminPage(id: number, payload: Partial<ContentPage>) {
  const { data } = await api.patch(`/admin/pages/${id}/`, payload)
  return data
}

export async function fetchAdminUsers(params: Record<string, unknown> = {}) {
  const { data } = await api.get('/admin/users/', { params })
  return data
}

export async function updateAdminUser(id: number, payload: Record<string, unknown>) {
  const { data } = await api.patch(`/admin/users/${id}/`, payload)
  return data
}

export async function fetchAdminActionLogs(params: Record<string, unknown> = {}) {
  const { data } = await api.get('/admin/logs/', { params })
  return data
}
