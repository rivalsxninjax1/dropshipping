import { useEffect, useState } from 'react'
import { register, login, mergeCart, getCart } from '../../api'
import { useAuthStore } from '../../store/auth'
import { useCartStore } from '../../store/cart'
import Button from '../../components/Button'
import { useNavigate } from 'react-router-dom'
import { useQueryClient } from '@tanstack/react-query'

export default function Register() {
  const setTokens = useAuthStore(s => s.setTokens)
  const user = useAuthStore(s => s.user)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [first, setFirst] = useState('')
  const [last, setLast] = useState('')
  const [verifyToken, setVerifyToken] = useState<string | null>(null)
  const [error, setError] = useState('')
  const navigate = useNavigate()
  const qc = useQueryClient()
  const setCartStoreItems = useCartStore(s => s.setItems)

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    try {
      const res = await register({ email, password, first_name: first, last_name: last })
      setVerifyToken(res.verify_token)
      // Auto-login after registration
      const tokens = await login(email, password)
      setTokens(tokens.access, tokens.refresh, tokens.user)
      try {
        await mergeCart()
        const cartData = await getCart()
        qc.setQueryData(['cart'], cartData)
        setCartStoreItems((cartData.items ?? []).map(item => ({ productId: item.product.id, quantity: item.quantity })))
        await qc.invalidateQueries({ queryKey: ['saved'] })
      } catch {}
      navigate('/')
    } catch (e: any) {
      // If the email is already registered, try to log in instead
      try {
        const tokens = await login(email, password)
        setTokens(tokens.access, tokens.refresh, tokens.user)
        try {
          await mergeCart()
          const cartData = await getCart()
          qc.setQueryData(['cart'], cartData)
          setCartStoreItems((cartData.items ?? []).map(item => ({ productId: item.product.id, quantity: item.quantity })))
          await qc.invalidateQueries({ queryKey: ['saved'] })
        } catch {}
        navigate('/')
        return
      } catch (e2: any) {
        const msg = e?.response?.data?.email?.[0]
          || e?.response?.data?.detail
          || 'Registration failed. Check email/password and try again.'
        setError(msg)
      }
    }
  }
  // If already authenticated, redirect away from register page
  useEffect(() => {
    if (user) {
      navigate('/', { replace: true })
    }
  }, [user, navigate])

  return (
    <div className="mx-auto max-w-md p-8 md:py-12">
      <div className="mx-auto rounded-2xl bg-white/80 shadow-xl ring-1 ring-black/5 backdrop-blur-lg p-6 md:p-8">
        <h1 className="mb-6 text-2xl font-semibold tracking-tight">Create an account</h1>
        <form onSubmit={onSubmit} className="space-y-4" aria-label="Register form">
          <input type="email" required placeholder="Email" className="w-full rounded-md border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/30" value={email} onChange={e => setEmail(e.target.value)} />
          <input type="password" required placeholder="Password" className="w-full rounded-md border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/30" value={password} onChange={e => setPassword(e.target.value)} />
          <input placeholder="First name" className="w-full rounded-md border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/30" value={first} onChange={e => setFirst(e.target.value)} />
          <input placeholder="Last name" className="w-full rounded-md border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/30" value={last} onChange={e => setLast(e.target.value)} />
          {error && <div className="text-sm text-red-600" role="alert">{error}</div>}
          <Button type="submit" className="w-full">Sign up</Button>
        </form>
        {verifyToken && (
          <p className="mt-3 text-xs text-gray-600">Verification token issued (dev): {verifyToken}</p>
        )}
      </div>
    </div>
  )
}
