import { useState } from 'react'
import { register, login } from '../../api'
import { useAuthStore } from '../../store/auth'
import Button from '../../components/Button'
import { useNavigate } from 'react-router-dom'

export default function Register() {
  const setTokens = useAuthStore(s => s.setTokens)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [first, setFirst] = useState('')
  const [last, setLast] = useState('')
  const [verifyToken, setVerifyToken] = useState<string | null>(null)
  const [error, setError] = useState('')
  const navigate = useNavigate()

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    try {
      const res = await register({ email, password, first_name: first, last_name: last })
      setVerifyToken(res.verify_token)
      // Auto-login after registration
      const tokens = await login(email, password)
      setTokens(tokens.access, tokens.refresh, tokens.user)
      navigate('/')
    } catch (e: any) {
      // If the email is already registered, try to log in instead
      try {
        const tokens = await login(email, password)
        setTokens(tokens.access, tokens.refresh, tokens.user)
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

  return (
    <div className="mx-auto max-w-sm p-6">
      <h1 className="mb-4 text-xl font-semibold">Create an account</h1>
      <form onSubmit={onSubmit} className="space-y-3" aria-label="Register form">
        <input type="email" required placeholder="Email" className="w-full rounded border px-3 py-2" value={email} onChange={e => setEmail(e.target.value)} />
        <input type="password" required placeholder="Password" className="w-full rounded border px-3 py-2" value={password} onChange={e => setPassword(e.target.value)} />
        <input placeholder="First name" className="w-full rounded border px-3 py-2" value={first} onChange={e => setFirst(e.target.value)} />
        <input placeholder="Last name" className="w-full rounded border px-3 py-2" value={last} onChange={e => setLast(e.target.value)} />
        {error && <div className="text-sm text-red-600" role="alert">{error}</div>}
        <Button type="submit">Sign up</Button>
      </form>
      {verifyToken && (
        <p className="mt-3 text-xs text-gray-600">Verification token issued (dev): {verifyToken}</p>
      )}
    </div>
  )
}
