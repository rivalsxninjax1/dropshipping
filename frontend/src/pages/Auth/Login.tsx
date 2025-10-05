import { useState } from 'react'
import { login, mergeCart } from '../../api'
import { useAuthStore } from '../../store/auth'
import Button from '../../components/Button'
import { useNavigate } from 'react-router-dom'

export default function Login() {
  const setTokens = useAuthStore(s => s.setTokens)
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    try {
      const tokens = await login(email, password)
      setTokens(tokens.access, tokens.refresh, tokens.user)
      try { await mergeCart() } catch {}
      navigate('/')
    } catch (e: any) {
      setError('Invalid credentials')
    }
  }
  return (
    <div className="mx-auto max-w-sm p-6">
      <h1 className="mb-4 text-xl font-semibold">Login</h1>
      <form onSubmit={onSubmit} className="space-y-3" aria-label="Login form">
        <input type="email" required placeholder="Email" className="w-full rounded border px-3 py-2" value={email} onChange={e => setEmail(e.target.value)} />
        <input type="password" required placeholder="Password" className="w-full rounded border px-3 py-2" value={password} onChange={e => setPassword(e.target.value)} />
        {error && <div className="text-sm text-red-600" role="alert">{error}</div>}
        <Button type="submit">Sign in</Button>
      </form>
    </div>
  )
}
