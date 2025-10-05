import { api } from './client'

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

export async function fetchAdminProducts(params: Record<string, unknown> = {}) {
  const { data } = await api.get('/admin/products/', { params })
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
