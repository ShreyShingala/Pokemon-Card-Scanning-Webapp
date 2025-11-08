'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useAuth } from '@/contexts/AuthContext'

export default function ForgotPasswordPage() {
  const { resetPassword } = useAuth()
  const [email, setEmail] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setSuccess(false)
    setLoading(true)

    const { error: resetError } = await resetPassword(email)

    if (resetError) {
      setError(resetError.message)
      setLoading(false)
    } else {
      setSuccess(true)
      setLoading(false)
    }
  }

  if (success) {
    return (
      <div className="view active" style={{ maxWidth: '500px', margin: '80px auto', padding: '40px', textAlign: 'center' }}>
        <div style={{ fontSize: '4rem', marginBottom: '20px' }}>✉️</div>
        <h1 style={{ marginBottom: '20px', color: '#10b981' }}>Check Your Email!</h1>
        <p style={{ fontSize: '1.1rem', color: '#64748b', marginBottom: '30px', lineHeight: '1.6' }}>
          We've sent you a password reset link. Please check your email and click the link to reset your password.
        </p>
        <Link href="/auth/login">
          <button className="control-button primary">
            Back to Login
          </button>
        </Link>
      </div>
    )
  }

  return (
    <div className="view active" style={{ maxWidth: '500px', margin: '80px auto', padding: '40px' }}>
      <h1 style={{ textAlign: 'center', marginBottom: '30px' }}>Reset Password</h1>
      <p style={{ textAlign: 'center', color: '#64748b', marginBottom: '30px', fontSize: '1.05rem' }}>
        Enter your email address and we'll send you a link to reset your password.
      </p>
      
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
          <label htmlFor="email" style={{ display: 'block', marginBottom: '8px', fontWeight: '600', color: '#334155' }}>
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
              border: '2px solid #e2e8f0',
              borderRadius: '8px',
              outline: 'none',
              transition: 'border-color 0.2s'
            }}
            onFocus={(e) => e.target.style.borderColor = '#2563EB'}
            onBlur={(e) => e.target.style.borderColor = '#e2e8f0'}
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
          {loading ? 'Sending...' : 'Send Reset Link'}
        </button>

        <div style={{ textAlign: 'center', marginTop: '20px' }}>
          <Link 
            href="/auth/login" 
            style={{ color: '#2563EB', textDecoration: 'none', fontSize: '0.95rem' }}
          >
            ← Back to login
          </Link>
        </div>
      </form>
    </div>
  )
}
