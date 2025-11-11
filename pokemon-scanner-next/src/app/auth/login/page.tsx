'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useAuth } from '@/contexts/AuthContext'
import { useTheme } from '@/contexts/ThemeContext'
import { supabase } from '@/lib/supabase'

export default function LoginPage() {
  const router = useRouter()
  const { signIn } = useAuth()
  const { isDarkMode } = useTheme()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    const { error: signInError } = await signIn(email, password)

    if (signInError) {
      setError(signInError.message)
      setLoading(false)
    } else {
      router.push('/')
    }
  }

  const handleGoogleSignIn = async () => {
    setError('')
    setLoading(true)
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
        },
      })

      if (error) {
        setError(error.message)
        setLoading(false)
      } else {
        // Supabase will redirect the browser to the provider; keep loading state
      }
    } catch (err: any) {
      setError(err?.message || 'Google sign-in failed')
      setLoading(false)
    }
  }

  if (!mounted) {
    return <div className="container" />
  }

  return (
    <div className="container">
      <div className="view active auth-container-card" style={{ maxWidth: 500, margin: '80px auto', padding: 40 }}>
        <h1 className="auth-title" style={{ textAlign: 'center', marginBottom: 30 }}>Login to PokéScanner</h1>

        <form onSubmit={handleSubmit} className="auth-form">
          {error && (
            <div className="auth-error">{error}</div>
          )}

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
              placeholder="••••••••"
              className="auth-input"
            />
          </div>

          <button type="submit" disabled={loading} className="control-button primary auth-button">
            {loading ? 'Logging in...' : 'Login'}
          </button>

          <div style={{ textAlign: 'center' }}>
            <Link href="/auth/forgot-password" style={{ color: '#2563EB', textDecoration: 'none', fontSize: '0.95rem' }}>
              Forgot password?
            </Link>
          </div>

          <div className="auth-divider"> </div>

          <div className="auth-footer">Don't have an account?{' '}
            <Link href="/auth/signup" style={{ color: '#2563EB', textDecoration: 'none', fontWeight: '600' }}>Sign up</Link>
          </div>

          <button
            type="button"
            onClick={handleGoogleSignIn}
            disabled={loading}
            aria-label="Sign in with Google"
            className="google-btn"
            style={{
              width: '100%',
              marginTop: '12px',
              background: isDarkMode ? '#1f2937' : '#ffffff',
              color: isDarkMode ? '#e5e7eb' : '#3c4043',
              border: isDarkMode ? '1px solid #374151' : '1px solid #dadce0'
            }}
          >
            <svg width="18" height="18" viewBox="0 0 18 18" style={{ marginRight: '8px' }} xmlns="http://www.w3.org/2000/svg">
              <g>
                <path d="M17.64 9.2045c0-.6381-.0573-1.2518-.1636-1.8409H9v3.4814h4.8436c-.2086 1.125-.8427 2.0782-1.7959 2.7164v2.2581h2.9087c1.7018-1.5668 2.6836-3.874 2.6836-6.615z" fill="#4285F4"/>
                <path d="M9 18c2.43 0 4.4673-.806 5.9564-2.1805l-2.9087-2.2581c-.8059.54-1.8368.859-3.0477.859-2.344 0-4.3282-1.5831-5.036-3.7104H.9574v2.3318C2.4382 15.9832 5.4818 18 9 18z" fill="#34A853"/>
                <path d="M3.964 10.71c-.18-.54-.2822-1.1168-.2822-1.71s.1023-1.17.2822-1.71V4.9582H.9573A8.9965 8.9965 0 0 0 0 9c0 1.4523.3477 2.8268.9573 4.0418L3.964 10.71z" fill="#FBBC05"/>
                <path d="M9 3.5795c1.3214 0 2.5077.4541 3.4405 1.346l2.5813-2.5814C13.4632.8918 11.426 0 9 0 5.4818 0 2.4382 2.0168.9574 4.9582L3.964 7.29C4.6718 5.1627 6.6559 3.5795 9 3.5795z" fill="#EA4335"/>
              </g>
            </svg>
            {loading ? 'Opening…' : 'Sign in with Google'}
          </button>
        </form>
      </div>
    </div>
  )
}
