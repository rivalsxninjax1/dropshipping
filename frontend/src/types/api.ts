// DRF-based API types
export type Category = {
  id: number
  name: string
  slug: string
  parent: number | null
}

export type Supplier = {
  id: number
  name: string
  contact_email: string
  active: boolean
}

export type Product = {
  id: number
  title: string
  slug: string
  description: string
  base_price: string
  sku: string
  images?: string
  gallery?: string[]
  video_url?: string
  brand?: string | null
  shipping_time_min_days?: number
  shipping_time_max_days?: number
  attributes?: Record<string, unknown>
  category: Category
  supplier: Supplier | null
  avg_rating?: number | null
  created_at: string
  updated_at: string
}

export type Review = {
  id: number
  product: number
  rating: number
  comment: string
  created_at: string
}

export type OrderItem = {
  id: number
  product: Product
  unit_price: string
  quantity: number
  variant_info: Record<string, unknown>
}

export type Coupon = {
  id: number
  code: string
  discount_type: 'percent' | 'fixed'
  value: string
  min_order_total: string
  per_user_limit: number
  usage_limit: number
  is_active: boolean
  expires_at: string | null
}

export type OrderStatusEvent = {
  id: number
  status: Order['status']
  note: string
  created_at: string
}

export type ReturnRequest = {
  id: number
  order: number
  order_item: number | null
  status: 'pending' | 'approved' | 'rejected' | 'received' | 'refunded'
  reason: string
  resolution: string
  attachments: string[]
  created_at: string
  updated_at: string
}

export type Order = {
  id: number
  status: 'pending' | 'paid' | 'processing' | 'shipped' | 'delivered' | 'cancelled' | 'refunded'
  payment_status: 'pending' | 'authorized' | 'paid' | 'failed' | 'refunded'
  total_amount: string
  discount_amount?: string
  coupon?: Coupon | null
  shipping_address: number
  billing_address: number
  shipping_method?: string
  tracking_number?: string
  estimated_delivery_at?: string | null
  placed_at: string
  items: OrderItem[]
  events?: OrderStatusEvent[]
  return_requests?: ReturnRequest[]
}

export type Notification = {
  id: number
  notification_type: 'order_update' | 'abandoned_cart' | 'promotion'
  channel: 'email' | 'push' | 'sms'
  payload: Record<string, unknown>
  sent_at: string | null
  read_at: string | null
  created_at: string
}

export type WishlistItem = {
  id: number
  product: Product
  added_at: string
}

export type Wishlist = {
  id: number
  user: number
  items: WishlistItem[]
  created_at: string
  updated_at: string
}

export type Paginated<T> = {
  count: number
  next: string | null
  previous: string | null
  results: T[]
}

export type PaymentIntent = {
  provider: string
  payment_url?: string
  payment_form?: {
    url: string
    method?: string
    fields: Record<string, string>
  }
  token?: string
  provider_payment_id?: string
  client_secret?: string
}
