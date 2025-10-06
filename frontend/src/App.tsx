import React, { Suspense, useEffect } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import Header from './components/Header'
import Footer from './components/Footer'
import FloatingActions from './components/FloatingActions'
import ProductQuickView from './components/ProductQuickView'
import { useCartStore } from './store/cart'

const Home = React.lazy(() => import('./pages/Home'))
const Category = React.lazy(() => import('./pages/Category'))
const ProductDetail = React.lazy(() => import('./pages/ProductDetail'))
const Cart = React.lazy(() => import('./pages/Cart'))
const Checkout = React.lazy(() => import('./pages/Checkout'))
const About = React.lazy(() => import('./pages/About'))
const Contact = React.lazy(() => import('./pages/Contact'))
const Login = React.lazy(() => import('./pages/Auth/Login'))
const Register = React.lazy(() => import('./pages/Auth/Register'))
const AccountOrders = React.lazy(() => import('./pages/Account/Orders'))
const AccountProfile = React.lazy(() => import('./pages/Account/Profile'))
const AccountAddresses = React.lazy(() => import('./pages/Account/Addresses'))
const AccountWishlist = React.lazy(() => import('./pages/Account/Wishlist'))
const AdminProducts = React.lazy(() => import('./pages/Admin/Products'))
const AdminSuppliers = React.lazy(() => import('./pages/Admin/Suppliers'))
const AdminOrders = React.lazy(() => import('./pages/Admin/Orders'))
const AdminCoupons = React.lazy(() => import('./pages/Admin/Coupons'))
const AdminDashboard = React.lazy(() => import('./pages/Admin/Dashboard'))
const AdminContent = React.lazy(() => import('./pages/Admin/Content'))
const AdminCampaigns = React.lazy(() => import('./pages/Admin/Campaigns'))
const Search = React.lazy(() => import('./pages/Search'))
const PaymentSuccess = React.lazy(() => import('./pages/PaymentSuccess'))
const PaymentFailure = React.lazy(() => import('./pages/PaymentFailure'))
const ReturnPolicy = React.lazy(() => import('./pages/ReturnPolicy'))
const OrderTracking = React.lazy(() => import('./pages/OrderTracking'))
const BundleDetail = React.lazy(() => import('./pages/BundleDetail'))
const DesignSystem = React.lazy(() => import('./pages/design-system'))

const qc = new QueryClient()

export default function App() {
  const loadCart = useCartStore(s => s.load)
  useEffect(() => { loadCart() }, [loadCart])

  return (
    <QueryClientProvider client={qc}>
      <BrowserRouter>
        <div className="relative flex min-h-screen flex-col bg-background-50 text-neutral-900">
          <Header />
          <main className="flex-1">
            <Suspense fallback={<div className="section-padding text-center text-sm text-neutral-500">Loading the experience…</div>}>
              <Routes>
                <Route path="/" element={<Home />} />
                <Route path="/products" element={<Category />} />
                <Route path="/c/:slug" element={<Category />} />
                <Route path="/p/:slug" element={<ProductDetail />} />
                <Route path="/cart" element={<Cart />} />
                <Route path="/checkout" element={<Checkout />} />
                <Route path="/about" element={<About />} />
                <Route path="/contact" element={<Contact />} />
                <Route path="/payment/success" element={<PaymentSuccess />} />
                <Route path="/payment/failure" element={<PaymentFailure />} />
                <Route path="/policies/returns" element={<ReturnPolicy />} />
                <Route path="/track-order" element={<OrderTracking />} />
                <Route path="/bundles/:slug" element={<BundleDetail />} />
                <Route path="/login" element={<Login />} />
                <Route path="/register" element={<Register />} />
                <Route path="/account" element={<AccountProfile />} />
                <Route path="/account/profile" element={<AccountProfile />} />
                <Route path="/account/addresses" element={<AccountAddresses />} />
                <Route path="/account/wishlist" element={<AccountWishlist />} />
                <Route path="/account/orders" element={<AccountOrders />} />
                <Route path="/admin/dashboard" element={<AdminDashboard />} />
                <Route path="/admin/products" element={<AdminProducts />} />
                <Route path="/admin/suppliers" element={<AdminSuppliers />} />
                <Route path="/admin/orders" element={<AdminOrders />} />
                <Route path="/admin/coupons" element={<AdminCoupons />} />
                <Route path="/admin/content" element={<AdminContent />} />
                <Route path="/admin/campaigns" element={<AdminCampaigns />} />
                <Route path="/search" element={<Search />} />
                <Route path="/design-system" element={<DesignSystem />} />
                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
            </Suspense>
          </main>
          <Footer />
          <FloatingActions />
          <ProductQuickView />
        </div>
      </BrowserRouter>
    </QueryClientProvider>
  )
}
