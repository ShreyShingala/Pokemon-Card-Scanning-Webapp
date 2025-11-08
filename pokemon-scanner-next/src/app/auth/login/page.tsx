'use client'

import { useState } from 'react'
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

  return (
    <div className="view active" style={{ maxWidth: '500px', margin: '80px auto', padding: '40px' }}>
      <h1 style={{ textAlign: 'center', marginBottom: '30px' }}>Login to PokéScanner</h1>
      
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
              color: isDarkMode ? '#e5e7eb' : '#1e293b'
            }}
            onFocus={(e) => e.currentTarget.style.borderColor = isDarkMode ? '#06B6D4' : '#2563EB'}
            onBlur={(e) => e.currentTarget.style.borderColor = isDarkMode ? '#475569' : '#e2e8f0'}
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
            placeholder="••••••••"
            style={{
              width: '100%',
              padding: '12px 16px',
              fontSize: '1rem',
              border: `2px solid ${isDarkMode ? '#475569' : '#e2e8f0'}`,
              borderRadius: '8px',
              outline: 'none',
              transition: 'border-color 0.2s',
              color: isDarkMode ? '#e5e7eb' : '#1e293b'
            }}
            onFocus={(e) => e.currentTarget.style.borderColor = isDarkMode ? '#06B6D4' : '#2563EB'}
            onBlur={(e) => e.currentTarget.style.borderColor = isDarkMode ? '#475569' : '#e2e8f0'}
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
          {loading ? 'Logging in...' : 'Login'}
        </button>

        {/* Google Sign-In */}
        {/* Google button will be placed below the divider to match request */}

        <div style={{ textAlign: 'center', marginTop: '10px' }}>
          <Link 
            href="/auth/forgot-password" 
            style={{ color: '#2563EB', textDecoration: 'none', fontSize: '0.95rem' }}
          >
            Forgot password?
          </Link>
        </div>

        <div style={{ 
          textAlign: 'center', 
          marginTop: '20px', 
          paddingTop: '20px', 
          borderTop: '1px solid #e2e8f0',
          color: '#64748b'
        }}>
          Don't have an account?{' '}
          <Link 
            href="/auth/signup" 
            style={{ color: '#2563EB', textDecoration: 'none', fontWeight: '600' }}
          >
            Sign up
          </Link>
        </div>

        {/* Official Google Sign-In button */}
        <button
          type="button"
          onClick={handleGoogleSignIn}
          disabled={loading}
          aria-label="Sign in with Google"
          style={{
            width: '100%',
            padding: '0',
            marginTop: '16px',
            background: isDarkMode ? '#1f2937' : '#ffffff',
            color: isDarkMode ? '#e5e7eb' : '#3c4043',
            border: isDarkMode ? '1px solid #374151' : '1px solid #dadce0',
            borderRadius: '4px',
            cursor: loading ? 'not-allowed' : 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            height: '40px',
            fontFamily: '"Roboto", sans-serif',
            fontSize: '14px',
            fontWeight: 500,
            letterSpacing: '0.25px',
            boxShadow: isDarkMode ? '0 1px 1px 0 rgba(0,0,0,0.3)' : '0 1px 1px 0 rgba(0,0,0,0.05)',
            transition: 'background-color 0.2s, box-shadow 0.2s'
          }}
          onMouseEnter={(e) => { 
            if (!loading) {
              e.currentTarget.style.backgroundColor = isDarkMode ? '#374151' : '#f8f9fa'
              e.currentTarget.style.boxShadow = isDarkMode ? '0 1px 2px 0 rgba(0,0,0,0.4)' : '0 1px 2px 0 rgba(0,0,0,0.1)'
            }
          }}
          onMouseLeave={(e) => { 
            if (!loading) {
              e.currentTarget.style.backgroundColor = isDarkMode ? '#1f2937' : '#ffffff'
              e.currentTarget.style.boxShadow = isDarkMode ? '0 1px 1px 0 rgba(0,0,0,0.3)' : '0 1px 1px 0 rgba(0,0,0,0.05)'
            }
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
  )
}
