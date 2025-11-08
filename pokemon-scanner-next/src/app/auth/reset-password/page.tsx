'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'

export default function ResetPasswordPage() {
  const router = useRouter()
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [loading, setLoading] = useState(false)
  const [validToken, setValidToken] = useState(false)

  useEffect(() => {
    // Check if we have a valid session from the reset link
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        setValidToken(true)
      } else {
        setError('Invalid or expired reset link. Please request a new one.')
      }
    })
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (password.length < 6) {
      setError('Password must be at least 6 characters long')
      return
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match')
      return
    }

    setLoading(true)

    const { error: updateError } = await supabase.auth.updateUser({
      password: password
    })

    if (updateError) {
      setError(updateError.message)
      setLoading(false)
    } else {
      setSuccess(true)
      setLoading(false)
      setTimeout(() => {
        router.push('/auth/login')
      }, 2000)
    }
  }

  if (success) {
    return (
      <div className="view active" style={{ maxWidth: '500px', margin: '80px auto', padding: '40px', textAlign: 'center' }}>
        <div style={{ fontSize: '4rem', marginBottom: '20px' }}>YAY!</div>
        <h1 style={{ marginBottom: '20px', color: '#10b981' }}>Password Updated!</h1>
        <p style={{ fontSize: '1.1rem', color: '#64748b', marginBottom: '30px', lineHeight: '1.6' }}>
          Your password has been successfully updated. Redirecting you to login...
        </p>
      </div>
    )
  }

  if (!validToken) {
    return (
      <div className="view active" style={{ maxWidth: '500px', margin: '80px auto', padding: '40px', textAlign: 'center' }}>
        <div style={{ fontSize: '4rem', marginBottom: '20px' }}>Uh Oh!</div>
        <h1 style={{ marginBottom: '20px', color: '#ef4444' }}>Invalid Reset Link</h1>
        <p style={{ fontSize: '1.1rem', color: '#64748b', marginBottom: '30px', lineHeight: '1.6' }}>
          This password reset link is invalid or has expired. Please request a new one.
        </p>
        <Link href="/auth/forgot-password">
          <button className="control-button primary">
            Request New Link
          </button>
        </Link>
      </div>
    )
  }

  return (
    <div className="view active" style={{ maxWidth: '500px', margin: '80px auto', padding: '40px' }}>
      <h1 style={{ textAlign: 'center', marginBottom: '30px' }}>Set New Password</h1>
      
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
          <label htmlFor="password" style={{ display: 'block', marginBottom: '8px', fontWeight: '600', color: '#334155' }}>
            New Password
          </label>
          <input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            placeholder="At least 6 characters"
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

        <div>
          <label htmlFor="confirmPassword" style={{ display: 'block', marginBottom: '8px', fontWeight: '600', color: '#334155' }}>
            Confirm New Password
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
          {loading ? 'Updating...' : 'Update Password'}
        </button>
      </form>
    </div>
  )
}
