'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

export default function AuthCallbackPage() {
  const router = useRouter()

  useEffect(() => {
    const handleCallback = async () => {
      // Get the hash from the URL (Supabase sends tokens in the hash)
      const hashParams = new URLSearchParams(window.location.hash.substring(1))
      const accessToken = hashParams.get('access_token')
      const refreshToken = hashParams.get('refresh_token')
      const type = hashParams.get('type')

      if (accessToken && refreshToken) {
        // Set the session
        await supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken
        })

        // Get the user data
        const { data: { user } } = await supabase.auth.getUser()

        // If this is an OAuth login, aka google login, (not recovery), add user to database if they don't exist
        if (user && type !== 'recovery') {
          try {
            const apiUrl = process.env.NEXT_PUBLIC_API_URL
            
            // Extract name from user metadata (Google provides full_name)
            const name = user.user_metadata?.full_name || 
                        user.user_metadata?.name || 
                        user.email?.split('@')[0] || 
                        'User'

            console.log('OAuth user login detected:', {
              userId: user.id,
              email: user.email,
              name: name
            })

            // Call the API to add user (it will handle if user already exists)
            const response = await fetch(`${apiUrl}/add_user/`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                user_id: user.id,
                email: user.email,
                password: 'oauth_user', // Placeholder for OAuth users
                name: name,
              }),
            })
            
            const result = await response.json()
            
            if (response.ok) {
              console.log('User added/verified in database:', result)
            } else {
              console.error('API error:', result)
            }
          } catch (apiError) {
            console.error('Error adding OAuth user to database:', apiError)
          }
        }

        // Redirect based on type
        if (type === 'recovery') {
          router.push('/auth/reset-password')
        } else {
          router.push('/')
        }
      } else {
        // If no tokens, redirect to login
        router.push('/auth/login')
      }
    }

    handleCallback()
  }, [router])

  return (
    <div className="view active" style={{ textAlign: 'center', padding: '80px 40px' }}>
      <div className="spinner"></div>
      <p>Verifying your account...</p>
    </div>
  )
}
