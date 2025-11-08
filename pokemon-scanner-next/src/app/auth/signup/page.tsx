'use client'

import { useState } from 'react'
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

  if (success) {
    return (
      <div className="view active" style={{ maxWidth: '500px', margin: '80px auto', padding: '40px', textAlign: 'center' }}>
        <div style={{ fontSize: '4rem', marginBottom: '20px' }}>🎉</div>
        <h1 style={{ marginBottom: '20px', color: '#10b981' }}>Welcome!</h1>
        <p style={{ fontSize: '1.1rem', color: '#64748b', marginBottom: '30px', lineHeight: '1.6' }}>
          Your account has been created successfully. Have fun building your deck!
        </p>
        <Link href="/auth/login">
          <button className="control-button primary">
            Go to Login
          </button>
        </Link>
      </div>
    )
  }

  return (
    <div className="view active" style={{ maxWidth: '500px', margin: '80px auto', padding: '40px' }}>
      <h1 style={{ textAlign: 'center', marginBottom: '30px' }}>Create Account</h1>
      
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
        {error && (
          <div style={{ 
            padding: '15px', 
            background: '#fee2e2', 
            color: '#dc2626', 
            borderRadius: '8px',
            fontSize: '0.95rem'
          }}>
            {error}
          </div>
        )}

        <div>
          <label htmlFor="name" style={{ display: 'block', marginBottom: '8px', fontWeight: '600', color: isDarkMode ? '#e5e7eb' : '#334155' }}>
            Name
          </label>
          <input
            id="name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            placeholder="Your name"
            maxLength={50}
            style={{
              width: '100%',
              padding: '12px 16px',
              fontSize: '1rem',
              border: `2px solid ${isDarkMode ? '#475569' : '#e2e8f0'}`,
              borderRadius: '8px',
              outline: 'none',
              transition: 'border-color 0.2s',
              background: isDarkMode ? '#0b1220' : 'white',
              color: isDarkMode ? '#e5e7eb' : 'inherit'
            }}
            onFocus={(e) => e.target.style.borderColor = isDarkMode ? '#06B6D4' : '#2563EB'}
            onBlur={(e) => e.target.style.borderColor = isDarkMode ? '#475569' : '#e2e8f0'}
          />
          <div style={{ marginTop: '8px', fontSize: '0.85rem', color: isDarkMode ? '#94a3b8' : '#64748b' }}>
            Letters only, maximum 50 characters
          </div>
        </div>

        <div>
          <label htmlFor="email" style={{ display: 'block', marginBottom: '8px', fontWeight: '600', color: isDarkMode ? '#e5e7eb' : '#334155' }}>
            Email
          </label>
          <input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            placeholder="your.email@example.com"
            style={{
              width: '100%',
              padding: '12px 16px',
              fontSize: '1rem',
              border: `2px solid ${isDarkMode ? '#475569' : '#e2e8f0'}`,
              borderRadius: '8px',
              outline: 'none',
              transition: 'border-color 0.2s',
              background: isDarkMode ? '#0b1220' : 'white',
              color: isDarkMode ? '#e5e7eb' : 'inherit'
            }}
            onFocus={(e) => e.target.style.borderColor = isDarkMode ? '#06B6D4' : '#2563EB'}
            onBlur={(e) => e.target.style.borderColor = isDarkMode ? '#475569' : '#e2e8f0'}
          />
        </div>

        <div>
          <label htmlFor="password" style={{ display: 'block', marginBottom: '8px', fontWeight: '600', color: isDarkMode ? '#e5e7eb' : '#334155' }}>
            Password
          </label>
          <input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            placeholder="Create a strong password"
            style={{
              width: '100%',
              padding: '12px 16px',
              fontSize: '1rem',
              border: `2px solid ${isDarkMode ? '#475569' : '#e2e8f0'}`,
              borderRadius: '8px',
              outline: 'none',
              transition: 'border-color 0.2s',
              background: isDarkMode ? '#0b1220' : 'white',
              color: isDarkMode ? '#e5e7eb' : 'inherit'
            }}
            onFocus={(e) => e.target.style.borderColor = isDarkMode ? '#06B6D4' : '#2563EB'}
            onBlur={(e) => e.target.style.borderColor = isDarkMode ? '#475569' : '#e2e8f0'}
          />
          <div style={{ marginTop: '8px', fontSize: '0.85rem', color: isDarkMode ? '#94a3b8' : '#64748b' }}>
            Must contain: one uppercase, one lowercase, and one number (minimum 6 characters)
          </div>
        </div>

        <div>
          <label htmlFor="confirmPassword" style={{ display: 'block', marginBottom: '8px', fontWeight: '600', color: isDarkMode ? '#e5e7eb' : '#334155' }}>
            Confirm Password
          </label>
          <input
            id="confirmPassword"
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            required
            placeholder="Re-enter your password"
            style={{
              width: '100%',
              padding: '12px 16px',
              fontSize: '1rem',
              border: `2px solid ${isDarkMode ? '#475569' : '#e2e8f0'}`,
              borderRadius: '8px',
              outline: 'none',
              transition: 'border-color 0.2s',
              background: isDarkMode ? '#0b1220' : 'white',
              color: isDarkMode ? '#e5e7eb' : 'inherit'
            }}
            onFocus={(e) => e.target.style.borderColor = isDarkMode ? '#06B6D4' : '#2563EB'}
            onBlur={(e) => e.target.style.borderColor = isDarkMode ? '#475569' : '#e2e8f0'}
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="control-button primary"
          style={{
            width: '100%',
            padding: '14px',
            fontSize: '1.1rem',
            marginTop: '10px',
            opacity: loading ? 0.6 : 1,
            cursor: loading ? 'not-allowed' : 'pointer'
          }}
        >
          {loading ? 'Creating account...' : 'Sign Up'}
        </button>

        <div style={{ 
          textAlign: 'center', 
          marginTop: '20px', 
          paddingTop: '20px', 
          borderTop: '1px solid #e2e8f0',
          color: isDarkMode ? '#94a3b8' : '#64748b'
        }}>
          Already have an account?{' '}
          <Link 
            href="/auth/login" 
            style={{ color: '#2563EB', textDecoration: 'none', fontWeight: '600' }}
          >
            Login
          </Link>
        </div>
      </form>
    </div>
  )
}
