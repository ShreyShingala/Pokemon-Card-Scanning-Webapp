'use client'

import Link from 'next/link'
import { useState, useEffect } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { useTheme } from '@/contexts/ThemeContext'

export default function Sidebar() {
  const [isOpen, setIsOpen] = useState(true)
  const [userName, setUserName] = useState<string | null>(null)
  const { user, signOut } = useAuth()
  const { isDarkMode, toggleDarkMode } = useTheme()

  useEffect(() => {
    // Fetch user's name from the database
    const fetchUserName = async () => {
      if (user) {
        try {
          const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'
          const response = await fetch(`${apiUrl}/user/${user.id}`)
          if (response.ok) {
            const data = await response.json()
            if (data.success && data.user.name) {
              setUserName(data.user.name)
            }
          }
        } catch (error) {
          console.error('Error fetching user name:', error)
        }
      } else {
        setUserName(null)
      }
    }

    fetchUserName()
  }, [user])

  useEffect(() => {
    // Update main-content and collection-container class when sidebar state changes
    const mainContent = document.querySelector('.main-content')
    const collectionContainer = document.querySelector('.collection-container')
    
    if (mainContent) {
      if (isOpen) {
        mainContent.classList.add('sidebar-open')
        mainContent.classList.remove('sidebar-closed')
      } else {
        mainContent.classList.remove('sidebar-open')
        mainContent.classList.add('sidebar-closed')
      }
    }
    
    if (collectionContainer) {
      if (isOpen) {
        collectionContainer.classList.remove('sidebar-closed')
        collectionContainer.classList.add('sidebar-open')
      } else {
        collectionContainer.classList.add('sidebar-closed')
        collectionContainer.classList.remove('sidebar-open')
      }
    }
    // Force a layout recalculation so centering is correct on first load
    if (typeof window !== 'undefined') {
      // requestAnimationFrame ensures this runs after the DOM updates
      window.requestAnimationFrame(() => window.dispatchEvent(new Event('resize')))
    }
  }, [isOpen])

  return (
    <>
      {/* Sidebar */}
      <div className={`sidebar ${isOpen ? '' : 'closed'}`}>
        <div className="sidebar-header">
          <h2>PokéScanner</h2>
          <button onClick={() => setIsOpen(false)} className="close-sidebar-btn">
            X
          </button>
        </div>
        <nav className="sidebar-nav" style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 100px)' }}>
          <div>
            <Link href="/" className="nav-item">
              <span className="nav-text">Homepage</span>
            </Link>
            <Link href="/scan" className="nav-item">
              <span className="nav-text">Scan</span>
            </Link>
            <Link href="/upload" className="nav-item">
              <span className="nav-text">Upload</span>
            </Link>
            <Link href="/collection" className="nav-item">
              <span className="nav-text">My Collection</span>
            </Link>
            <Link href="/leaderboard" className="nav-item">
              <span className="nav-text">Leaderboard</span>
            </Link>
            
            {/* Dark Mode Toggle */}
            <div className="nav-item" style={{ cursor: 'default', paddingTop: '25px', paddingBottom: '25px', borderTop: '1px solid rgba(255, 255, 255, 0.1)', marginTop: '15px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
                <span className="nav-text" style={{ color: 'rgba(255, 255, 255, 0.9)' }}>Dark Mode</span>
                <button
                  onClick={toggleDarkMode}
                  className="theme-toggle-switch"
                  role="switch"
                  aria-checked={isDarkMode}
                  aria-label="Toggle dark mode"
                  style={{
                    position: 'relative',
                    width: '52px',
                    height: '28px',
                    background: isDarkMode ? '#06B6D4' : '#cbd5e1',
                    borderRadius: '14px',
                    border: 'none',
                    cursor: 'pointer',
                    transition: 'background 0.3s ease',
                    padding: 0,
                  }}
                >
                  <span
                    style={{
                      position: 'absolute',
                      top: '3px',
                      left: isDarkMode ? '26px' : '3px',
                      width: '22px',
                      height: '22px',
                      background: 'white',
                      borderRadius: '50%',
                      transition: 'left 0.3s ease',
                      boxShadow: '0 2px 4px rgba(0, 0, 0, 0.2)',
                    }}
                  />
                </button>
              </div>
            </div>
          </div>
          
          {/* Auth Section - Pushed to bottom */}
          <div style={{ marginTop: 'auto', paddingTop: '20px', borderTop: '1px solid rgba(255, 255, 255, 0.1)' }}>
            {user ? (
              <>
                <div style={{ padding: '15px 25px', color: 'rgba(255, 255, 255, 0.9)', fontSize: '0.95rem' }}>
                  <div style={{ fontWeight: '600', color: 'white', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {userName || user.email}
                  </div>
                </div>
                <button
                  onClick={() => signOut()}
                  className="nav-item"
                  style={{
                    width: '100%',
                    background: 'transparent',
                    border: 'none',
                    textAlign: 'left',
                    cursor: 'pointer',
                    color: '#ef4444',
                    transition: 'all 0.3s ease'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = 'rgba(239, 68, 68, 0.1)'
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'transparent'
                  }}
                >
                  <span className="nav-text">Sign Out</span>
                </button>
              </>
            ) : (
              <>
                <Link href="/auth/login" className="nav-item">
                  <span className="nav-text">Login</span>
                </Link>
                <Link href="/auth/signup" className="nav-item">
                  <span className="nav-text">Sign Up</span>
                </Link>
              </>
            )}
          </div>
        </nav>
      </div>

      {/* Overlay */}
      {isOpen && (
        <div 
          className="sidebar-overlay active" 
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Menu toggle button */}
      {!isOpen && (
        <button 
          onClick={() => setIsOpen(true)} 
          className="menu-toggle-btn"
        >
          ☰
        </button>
      )}
    </>
  )
}