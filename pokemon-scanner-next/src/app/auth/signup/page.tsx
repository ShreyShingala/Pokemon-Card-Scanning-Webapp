'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useAuth } from '@/contexts/AuthContext'
import { useTheme } from '@/contexts/ThemeContext'

export default function SignupPage() {
  const router = useRouter()
  const { signUp } = useAuth()
  const { isDarkMode } = useTheme()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [loading, setLoading] = useState(false)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setSuccess(false)

    // Validate name
    if (!name || name.trim().length === 0) {
      setError('Name is required')
      return
    }

    if (name.length > 50) {
      setError('Name must be 50 characters or less')
      return
    }

    if (!/^[a-zA-Z]+$/.test(name)) {
      setError('Name must contain only letters (no spaces or special characters)')
      return
    }

    // Validation
    if (password.length < 6) {
      setError('Password must be at least 6 characters long')
      return
    }

    if (!/[A-Z]/.test(password)) {
      setError('Password must contain at least one uppercase letter')
      return
    }

    if (!/[a-z]/.test(password)) {
      setError('Password must contain at least one lowercase letter')
      return
    }

    if (!/[0-9]/.test(password)) {
      setError('Password must contain at least one number')
      return
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match')
      return
    }

    setLoading(true)

    const { error: signUpError } = await signUp(email, password, name)

    if (signUpError) {
      setError(signUpError.message)
      setLoading(false)
    } else {
      setSuccess(true)
      setLoading(false)
    }
  }

  if (!mounted) {
    return <div className="container" />
  }

  if (success) {
    return (
      <div className="view active auth-container-card" style={{ maxWidth: 500, margin: '80px auto', padding: 40, textAlign: 'center' }}>
        <div style={{ fontSize: '4rem', marginBottom: '20px' }}>🎉</div>
        <h1 style={{ marginBottom: '20px', color: '#10b981' }}>Welcome!</h1>
        <p style={{ fontSize: '1.1rem', color: '#64748b', marginBottom: '30px', lineHeight: '1.6' }}>
          Your account has been created successfully. Have fun building your deck!
        </p>
        <Link href="/auth/login">
          <button className="control-button primary auth-button">
            Go to Login
          </button>
        </Link>
      </div>
    )
  }

  return (
    <div className="container">
      <div className="view active auth-container-card" style={{ maxWidth: 500, margin: '80px auto', padding: 40 }}>
        <h1 className="auth-title" style={{ textAlign: 'center', marginBottom: 30 }}>Create Account</h1>

        <form onSubmit={handleSubmit} className="auth-form">
          {error && (
            <div className="auth-error">{error}</div>
          )}

        <div>
          <label htmlFor="name" className="auth-label">Name</label>
          <input
            id="name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            placeholder="Your name"
            maxLength={50}
            className="auth-input"
          />
          <div style={{ marginTop: '8px', fontSize: '0.85rem', color: isDarkMode ? '#94a3b8' : '#64748b' }}>
            Letters only, maximum 50 characters
          </div>
        </div>

        <div>
          <label htmlFor="email" className="auth-label">Email</label>
          <input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            placeholder="your.email@example.com"
            className="auth-input"
          />
        </div>

        <div>
          <label htmlFor="password" className="auth-label">Password</label>
          <input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            placeholder="Create a strong password"
            className="auth-input"
          />
          <div style={{ marginTop: '8px', fontSize: '0.85rem', color: isDarkMode ? '#94a3b8' : '#64748b' }}>
            Must contain: one uppercase, one lowercase, and one number (minimum 6 characters)
          </div>
        </div>

        <div>
          <label htmlFor="confirmPassword" className="auth-label">Confirm Password</label>
          <input
            id="confirmPassword"
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            required
            placeholder="Re-enter your password"
            className="auth-input"
          />
        </div>
          <button
            type="submit"
            disabled={loading}
            className="control-button primary auth-button"
          >
            {loading ? 'Creating account...' : 'Sign Up'}
          </button>

          <div className="auth-divider" style={{ color: isDarkMode ? '#94a3b8' : '#64748b' }}>
            Already have an account?{' '}
            <Link href="/auth/login" style={{ color: '#2563EB', textDecoration: 'none', fontWeight: '600' }}>Login</Link>
          </div>
      </form>
      </div>
    </div>
  )
}
