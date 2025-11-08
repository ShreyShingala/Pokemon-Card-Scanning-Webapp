'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useTheme } from '@/contexts/ThemeContext'

interface LeaderboardEntry {
  user_id: string
  name: string
  unique_cards: number
  total_cards: number
}

export default function LeaderboardPage() {
  const router = useRouter()
  const { isDarkMode } = useTheme()
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([])
  const [filteredLeaderboard, setFilteredLeaderboard] = useState<LeaderboardEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 5

  useEffect(() => {
    loadLeaderboard()
  }, [])

  useEffect(() => {
    // Filter leaderboard based on search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim()
      const filtered = leaderboard.filter(entry => 
        entry.name?.toLowerCase().includes(query)
      )
      setFilteredLeaderboard(filtered)
    } else {
      setFilteredLeaderboard(leaderboard)
    }
    setCurrentPage(1) // Reset to page 1 when search changes
  }, [searchQuery, leaderboard])

  const loadLeaderboard = async () => {
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/leaderboard/`)
      
      if (!response.ok) {
        throw new Error('Failed to fetch leaderboard')
      }

      const data = await response.json()
      
      if (!data.success) {
        throw new Error(data.error || 'Unknown error')
      }

      setLeaderboard(data.leaderboard || [])
      setFilteredLeaderboard(data.leaderboard || [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setLoading(false)
    }
  }

  const handleViewCollection = async (userId: string, userName: string) => {
    try {
      // Check if the user's collection is public
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/profile_status/${userId}`)
      if (!response.ok) {
        alert('Unable to check collection visibility')
        return
      }
      const data = await response.json()
      if (!data.success || !data.is_public) {
        alert(`${userName}'s collection is private`)
        return
      }
      // If public, navigate to view collection
      router.push(`/collection/${userId}?name=${encodeURIComponent(userName)}`)
    } catch (error) {
      alert('Error checking collection visibility')
    }
  }

  // Pagination calculations
  const totalPages = Math.max(1, Math.ceil(filteredLeaderboard.length / itemsPerPage))
  const startIndex = (currentPage - 1) * itemsPerPage
  const endIndex = startIndex + itemsPerPage
  const currentItems = filteredLeaderboard.slice(startIndex, endIndex)

  const goToPage = (page: number) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page)
      // Scroll to top of leaderboard
      window.scrollTo({ top: 0, behavior: 'smooth' })
    }
  }

  // Fixed height for the main content so empty doesn't make small
  const CONTAINER_HEIGHT_PX = 700
  const CARD_MIN_WIDTH_PX = 760

  if (loading) {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'transparent'
      }}>
        <div style={{
          textAlign: 'center',
          color: '#1e293b'
        }}>
          <div style={{
            width: '50px',
            height: '50px',
            border: '4px solid #e2e8f0',
            borderTop: '4px solid #2563EB',
            borderRadius: '50%',
            margin: '0 auto 20px',
            animation: 'spin 1s linear infinite'
          }} />
          <p style={{ fontSize: '1.2rem' }}>Loading leaderboard...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'transparent',
        padding: '20px'
      }}>
        <div style={{
          maxWidth: '500px',
          background: isDarkMode ? '#1e293b' : 'white',
          borderRadius: '15px',
          padding: '40px',
          textAlign: 'center',
          boxShadow: isDarkMode ? '0 10px 40px rgba(0,0,0,0.3)' : '0 10px 40px rgba(0,0,0,0.1)'
        }}>
          <h3 style={{ color: '#dc2626', marginBottom: '15px', fontSize: '1.5rem' }}>
            Failed to load leaderboard
          </h3>
          <p style={{ color: isDarkMode ? '#94a3b8' : '#64748b', marginBottom: '25px' }}>{error}</p>
          <button
            onClick={loadLeaderboard}
            style={{
              padding: '12px 30px',
              background: '#2563EB',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              fontSize: '1rem',
              fontWeight: '600',
              cursor: 'pointer',
              transition: 'all 0.2s'
            }}
            onMouseEnter={(e) => (e.currentTarget.style.background = '#1D4ED8')}
            onMouseLeave={(e) => (e.currentTarget.style.background = '#2563EB')}
          >
            Retry
          </button>
        </div>
      </div>
    )
  }

  // Helper to render a single row (real or placeholder)
  const Row = ({ entry, isPlaceholder = false, rank = 0 }: { entry?: LeaderboardEntry, isPlaceholder?: boolean, rank?: number }) => {
    const isTopThree = rank <= 3 && rank > 0
    return (
      <div
        style={{
          background: isTopThree
            ? (isDarkMode ? 'linear-gradient(135deg, #422006 0%, #713f12 100%)' : 'linear-gradient(135deg, #fef3c7 0%, #fde68a 100%)')
            : (isDarkMode ? '#1e293b' : 'white'),
          borderRadius: '12px',
          padding: '16px 18px',
          display: 'flex',
          alignItems: 'center',
          gap: '16px',
          boxShadow: isTopThree
            ? (isDarkMode ? '0 6px 20px rgba(120, 53, 15, 0.35)' : '0 6px 20px rgba(161, 98, 7, 0.15)')
            : (isDarkMode ? '0 2px 10px rgba(0,0,0,0.3)' : '0 2px 10px rgba(0,0,0,0.05)'),
          border: isTopThree ? (isDarkMode ? '2px solid #92400e' : '2px solid #f59e0b') : 'none',
          transition: 'all 0.15s',
          minHeight: '64px',
          boxSizing: 'border-box'
        }}
      >
        <div style={{ fontSize: '1.25rem', fontWeight: 800, color: isTopThree ? (isDarkMode ? '#fbbf24' : '#92400e') : (isDarkMode ? '#94a3b8' : '#94a3b8'), minWidth: '56px', textAlign: 'center' }}>
          {isPlaceholder ? '#' : rank === 1 ? '🥇' : rank === 2 ? '🥈' : rank === 3 ? '🥉' : `#${rank}`}
        </div>

        <div style={{ flex: 1 }}>
          <div style={{ fontSize: '1.05rem', fontWeight: 700, color: isDarkMode ? '#f1f5f9' : '#1e293b', marginBottom: '6px' }}>
            {isPlaceholder ? <div style={{ width: '160px', height: '14px', background: isDarkMode ? '#334155' : '#f1f5f9', borderRadius: '6px' }} /> : (entry?.name || 'Unknown User')}
          </div>
          <div style={{ display: 'flex', gap: '18px', fontSize: '0.9rem', color: isDarkMode ? '#94a3b8' : '#64748b' }}>
            {isPlaceholder ? (
              <>
                <div style={{ width: '120px', height: '12px', background: isDarkMode ? '#334155' : '#f1f5f9', borderRadius: '6px' }} />
                <div style={{ width: '80px', height: '12px', background: isDarkMode ? '#334155' : '#f1f5f9', borderRadius: '6px' }} />
              </>
            ) : (
              <>
                <div><span style={{ fontWeight: 600 }}>Unique Cards:</span> {entry?.unique_cards}</div>
                <div><span style={{ fontWeight: 600 }}>Total Cards:</span> {entry?.total_cards}</div>
              </>
            )}
          </div>
        </div>

        <div>
          {isPlaceholder ? (
            <div style={{ width: '96px', height: '36px', background: isDarkMode ? '#334155' : '#f1f5f9', borderRadius: '8px' }} />
          ) : (
            <button
              onClick={() => handleViewCollection(entry!.user_id, entry!.name)}
              style={{
                padding: '8px 16px',
                background: '#3B4CCA',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                fontSize: '0.9rem',
                fontWeight: 600,
                cursor: 'pointer',
                transition: 'all 0.15s',
                whiteSpace: 'nowrap'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = '#2E3A8A'
                e.currentTarget.style.transform = 'scale(1.03)'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = '#3B4CCA'
                e.currentTarget.style.transform = 'scale(1)'
              }}
            >
              View Collection
            </button>
          )}
        </div>
      </div>
    )
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: 'transparent',
      padding: '40px 20px',
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'flex-start'
    }}>
      {/* Main centered column that enforces a fixed visual size */}
      <div style={{
        width: '100%',
        maxWidth: '1200px',
        height: `${CONTAINER_HEIGHT_PX}px`,
        display: 'flex',
        flexDirection: 'column',
        gap: '20px',
        minWidth: `${CARD_MIN_WIDTH_PX}px`
      }}>
        {/* Header */}
        <div style={{ textAlign: 'center' }}>
          <h1 style={{
            fontSize: '2.25rem',
            fontWeight: 800,
            color: isDarkMode ? '#f1f5f9' : '#1e293b',
            margin: 0
          }}>
            🏆 Leaderboard
          </h1>
          <p style={{ marginTop: '6px', color: isDarkMode ? '#cbd5e1' : '#334155' }}>Top collectors with public profiles</p>
        </div>

        {/* Search */}
        <div style={{
          background: isDarkMode ? '#1e293b' : 'white',
          borderRadius: '12px',
          padding: '14px',
          boxShadow: isDarkMode ? '0 4px 15px rgba(0,0,0,0.3)' : '0 4px 15px rgba(0,0,0,0.06)'
        }}>
          <input
            type="text"
            placeholder="Search by name..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              width: '100%',
              padding: '10px 14px',
              fontSize: '1rem',
              border: '2px solid',
              borderColor: isDarkMode ? '#475569' : '#e2e8f0',
              borderRadius: '8px',
              background: isDarkMode ? '#334155' : 'white',
              color: isDarkMode ? '#e5e7eb' : '#1e293b',
              outline: 'none',
              transition: 'border-color 0.2s',
              boxSizing: 'border-box'
            }}
            onFocus={(e) => (e.currentTarget.style.borderColor = '#2563EB')}
            onBlur={(e) => (e.currentTarget.style.borderColor = isDarkMode ? '#475569' : '#e2e8f0')}
          />
          {searchQuery && (
            <div style={{ marginTop: '8px', fontSize: '0.9rem', color: isDarkMode ? '#94a3b8' : '#64748b' }}>
              Found {filteredLeaderboard.length} {filteredLeaderboard.length === 1 ? 'user' : 'users'}
            </div>
          )}
        </div>

        {/* Leaderboard card - this takes all remaining space so empty state won't collapse layout */}
        <div style={{
          background: isDarkMode ? '#1e293b' : 'white',
          borderRadius: '15px',
          padding: '20px',
          boxShadow: isDarkMode ? '0 4px 15px rgba(0,0,0,0.3)' : '0 4px 15px rgba(0,0,0,0.1)',
          display: 'flex',
          flexDirection: 'column',
          gap: '16px',
          flex: 1, 
          minHeight: 0,    
          boxSizing: 'border-box'
        }}>
          {/* List area (scrollable) */}
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '12px',
            width: '100%',
            flex: 1,
            minHeight: 0,
            overflowY: 'auto',
            paddingRight: '6px',
            boxSizing: 'border-box',
            // reserve scrollbar space in modern browsers to avoid layout shift
            scrollbarGutter: 'stable'
          }}>
            {currentItems.length === 0 ? (
              // Render placeholder rows equal to itemsPerPage so layout and width match the normal list
              Array.from({ length: itemsPerPage }).map((_, i) => (
                <Row key={`ph-${i}`} isPlaceholder rank={startIndex + i + 1} />
              ))
            ) : (
              // Actual list
              currentItems.map((entry, index) => (
                <Row key={entry.user_id} entry={entry} rank={startIndex + index + 1} />
              ))
            )}
          </div>

          {/* Pagination sits at the bottom of the card so the card maintains consistent height */}
          <div style={{
            marginTop: '6px',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            gap: '10px'
          }}>
            <button
              onClick={() => goToPage(currentPage - 1)}
              disabled={currentPage === 1}
              style={{
                padding: '8px 14px',
                background: currentPage === 1 ? (isDarkMode ? '#334155' : '#cbd5e1') : (isDarkMode ? '#334155' : 'white'),
                color: currentPage === 1 ? '#94a3b8' : (isDarkMode ? '#e5e7eb' : '#334155'),
                border: 'none',
                borderRadius: '8px',
                fontSize: '0.9rem',
                fontWeight: 600,
                cursor: currentPage === 1 ? 'not-allowed' : 'pointer'
              }}
            >
              ← Previous
            </button>

            <div style={{ padding: '8px 14px', background: isDarkMode ? '#334155' : 'white', borderRadius: '8px', fontSize: '0.95rem', fontWeight: 600, color: isDarkMode ? '#e5e7eb' : '#334155' }}>
              Page {currentPage} of {totalPages}
            </div>

            <button
              onClick={() => goToPage(currentPage + 1)}
              disabled={currentPage === totalPages}
              style={{
                padding: '8px 14px',
                background: currentPage === totalPages ? (isDarkMode ? '#334155' : '#cbd5e1') : (isDarkMode ? '#334155' : 'white'),
                color: currentPage === totalPages ? '#94a3b8' : (isDarkMode ? '#e5e7eb' : '#334155'),
                border: 'none',
                borderRadius: '8px',
                fontSize: '0.9rem',
                fontWeight: 600,
                cursor: currentPage === totalPages ? 'not-allowed' : 'pointer'
              }}
            >
              Next →
            </button>
          </div>
        </div>
      </div>

      <style jsx>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  )
}
