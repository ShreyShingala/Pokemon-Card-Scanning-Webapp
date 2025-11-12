'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useTheme } from '@/contexts/ThemeContext'
import { useToast } from '@/contexts/ToastContext'

interface LeaderboardEntry {
  user_id: string
  name: string
  unique_cards: number
  total_cards: number
}

export default function LeaderboardPage() {
  const router = useRouter()
  const { isDarkMode } = useTheme()
  const { showToast } = useToast()
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([])
  const [filteredLeaderboard, setFilteredLeaderboard] = useState<LeaderboardEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 5

  // Track whether we're on a small/mobile viewport if so make it so clicking on name leads to profile viewing
  const [isMobileViewport, setIsMobileViewport] = useState(false)
  // Sorting helpers (copied from collection page to keep parity)
  const rarityTiers: { [key: string]: number } = {
    'Common': 1,
    'Uncommon': 2,
    'Rare': 3,
    'Rare ACE': 3,
    'Rare Prime': 3,
    'Promo': 3,
    'Rare BREAK': 4,
    'Rare Holo': 4,
    'Rare Holo EX': 4,
    'Rare Holo GX': 4,
    'Rare Holo LV.X': 4,
    'Rare Holo Star': 4,
    'Rare Holo V': 4,
    'Rare Holo VMAX': 4,
    'Amazing Rare': 5,
    'LEGEND': 5,
    'Ultra Rare': 5,
    'Rare Ultra': 5,
    'Rare Prism Star': 5,
    'Secret Rare': 6,
    'Rare Secret': 6,
    'Rare Rainbow': 6,
    'Rare Shining': 6,
    'Rare Shiny': 6,
    'Rare Shiny GX': 6,
    'Rare MEGA': 6,
    'Illustration Rare': 7,
    'Double Rare': 7
  }

  const stageTiers: { [key: string]: number } = {
    'Baby': 0,
    'Basic': 1,
    'Stage 1': 2,
    'Stage 2': 3,
    'Level-Up': 4,
    'Restored': 1,
  }

  const exTiers: { [key: string]: number } = {
    'Baby': 0,
    'Basic': 1,
    'Stage 1': 2,
    'Stage 2': 3,
    'Level-Up': 4,
    'Restored': 1,
    'BREAK': 8,
    'EX': 9,
    'ex': 9,
    'GX': 5,
    'MEGA': 10,
    'V': 6,
    'VMAX': 7,
    'LEGEND': 8,
  }

  const getFamilyKey = (card: any): number | string => {
    const pokedexArr = card.national_pokedex_numbers || []
    if (Array.isArray(pokedexArr) && pokedexArr.length > 0) {
      return Number(pokedexArr[0]) || pokedexArr[0]
    }
    if (card.evolves_from) return (card.evolves_from as string).toLowerCase()
    const name = (card.name || '').toString()
    if (!name) return ''
    const cleaned = name.replace(/\s+(EX|GX|MEGA|VMAX|VSTAR|V|LEGEND|BREAK|Prime|Star|Shining)\b/gi, '')
    return cleaned.trim().toLowerCase()
  }

  const computeStageScore = (card: any): number => {
    const subtypes = card.subtypes || []
    let stageScore = 0
    for (const s of subtypes) if (stageTiers[s]) stageScore = Math.max(stageScore, stageTiers[s])
    let exScore = 0
    for (const s of subtypes) if (exTiers[s]) exScore = Math.max(exScore, exTiers[s])
    return exScore * 100 + stageScore
  }

  useEffect(() => {
    const mql = window.matchMedia('(max-width: 640px)')
    const update = () => setIsMobileViewport(mql.matches)
    update()
    if (mql.addEventListener) mql.addEventListener('change', update)
    else mql.addListener(update)
    return () => {
      if (mql.removeEventListener) mql.removeEventListener('change', update)
      else mql.removeListener(update)
    }
  }, [])

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
        showToast('Unable to check collection visibility', 'error')
        return
      }
      const data = await response.json()
      if (!data.success || !data.is_public) {
        showToast(`${userName}'s collection is private`, 'info')
        return
      }

      // If public, navigate to the public collection page instead of opening an in-page modal
      router.push(`/collection/${userId}?name=${encodeURIComponent(userName)}`)
    } catch (error) {
      showToast('Error checking collection visibility', 'error')
    }
  }

  // Viewing modal and delete helpers removed; the leaderboard navigates to the
  // public collection page at /collection/:userId instead of rendering an
  // in-page modal.

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

  // Responsive container: use minHeight instead of fixed pixel heights/widths
  const CONTAINER_MIN_HEIGHT = '60vh'

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
      <>
        <div
          className="lb-row"
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
            boxSizing: 'border-box',
            flexWrap: 'wrap'
          }}
        >
          <div className="lb-rank" style={{ fontSize: '1.25rem', fontWeight: 800, color: isTopThree ? (isDarkMode ? '#fbbf24' : '#92400e') : (isDarkMode ? '#94a3b8' : '#94a3b8'), minWidth: '56px', textAlign: 'center' }}>
            {isPlaceholder ? '#' : rank === 1 ? '🥇' : rank === 2 ? '🥈' : rank === 3 ? '🥉' : `#${rank}`}
          </div>

          <div
            style={{ flex: 1, minWidth: 0, cursor: isMobileViewport && !isPlaceholder ? 'pointer' : undefined }}
            role={isMobileViewport && !isPlaceholder ? 'button' : undefined}
            tabIndex={isMobileViewport && !isPlaceholder ? 0 : undefined}
            onClick={() => {
              if (isMobileViewport && !isPlaceholder && entry) {
                handleViewCollection(entry.user_id, entry.name)
              }
            }}
            onKeyDown={(e) => {
              if (isMobileViewport && !isPlaceholder && entry && (e.key === 'Enter' || e.key === ' ')) {
                e.preventDefault()
                handleViewCollection(entry.user_id, entry.name)
              }
            }}
          >
            <div style={{ fontSize: '1.05rem', fontWeight: isMobileViewport && !isPlaceholder ? 800 : 700, textDecoration: isMobileViewport && !isPlaceholder ? 'underline' : undefined, color: isDarkMode ? '#f1f5f9' : '#1e293b', marginBottom: '6px' }}>
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

          <div className="btn-wrap" style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center' }}>
            {isPlaceholder ? (
              <div style={{ width: '96px', height: '36px', background: isDarkMode ? '#334155' : '#f1f5f9', borderRadius: '8px' }} />
            ) : (
              /* Only render the visible in-row View Collection button on non-mobile viewports */
              !isMobileViewport ? (
                <button
                  onClick={() => handleViewCollection(entry!.user_id, entry!.name)}
                  className="view-btn"
                  style={{
                    padding: '10px 12px',
                    background: '#3B4CCA',
                    color: 'white',
                    border: 'none',
                    borderRadius: '10px',
                    fontSize: '0.95rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                    transition: 'all 0.15s',
                    whiteSpace: 'nowrap',
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center'
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
              ) : null
            )}
          </div>
        </div>
      </>
    )
  }

  return (
    <div className="leaderboard-page" style={{
      minHeight: '100vh',
      background: 'transparent',
      padding: '40px 20px',
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'flex-start'
    }}>
      {/* Main centered column that is responsive */}
  <div className="leaderboard-inner" style={{
  width: '100%',
  maxWidth: '100%',
  minHeight: CONTAINER_MIN_HEIGHT,
  display: 'flex',
  flexDirection: 'column',
  gap: '20px'
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
          <div className="pagination-controls" style={{
            marginTop: '6px',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            gap: '10px'
          }}>
            <button
              className="prev-btn"
              onClick={() => goToPage(currentPage - 1)}
              disabled={currentPage === 1}
              style={{
                padding: '8px 14px',
                width: '96px',
                height: '40px',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxSizing: 'border-box',
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

            <div className="page-indicator" style={{ padding: '8px 12px', flex: 1, minWidth: 0, height: '40px', display: 'flex', alignItems: 'center', justifyContent: 'center', boxSizing: 'border-box', background: isDarkMode ? '#334155' : 'white', borderRadius: '8px', fontSize: '0.95rem', fontWeight: 600, color: isDarkMode ? '#e5e7eb' : '#334155' }}>
              Page {currentPage} of {totalPages}
            </div>

            <button
              className="next-btn"
              onClick={() => goToPage(currentPage + 1)}
              disabled={currentPage === totalPages}
              style={{
                padding: '8px 14px',
                width: '96px',
                height: '40px',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxSizing: 'border-box',
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

      {/* Viewing modal removed: navigation to /collection/:userId is used instead. */}

      {/* Mobile-only styles */}
      <style jsx>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        /* Mobile-only overrides: keep desktop unchanged */
        @media (max-width: 640px) {
  .lb-row {
    flex-direction: column !important;
    align-items: center !important;
    text-align: center !important;
    gap: 8px !important;
    padding: 14px !important;
  }

  .lb-rank {
    font-size: 1.2rem !important;
    min-width: unset !important;
    margin-bottom: 4px !important;
    text-align: center !important;
  }

  .lb-content {
    width: 100% !important;
  }

  .lb-row > div:nth-child(2) {
    width: 100% !important;
    text-align: center !important;
  }

  .lb-row > div:nth-child(2) div {
    justify-content: center !important;
    flex-wrap: wrap !important;
    gap: 8px !important;
  }

  .btn-wrap {
    width: 100% !important;
    margin-top: 10px !important;
    display: none !important; /* hide desktop button on mobile - clickable name will be used */
    justify-content: center !important;
  }
  /* Hide the mobile button; the row itself is clickable on mobile instead of a separate button */
  .mobile-btn-wrap { display: none !important; width: 100% !important; text-align: center !important; }
  .view-btn-mobile {
    display: inline-block !important;
    width: 100% !important;
    max-width: 420px !important;
    padding: 10px 14px !important;
    border-radius: 8px !important;
    font-size: 0.95rem !important;
    box-sizing: border-box !important;
    white-space: nowrap !important;
  }

  .view-btn {
    display: none !important; /* hide desktop view button on mobile */
  }
}

        /* Pagination: prevent wrapping and shrink on very small screens so "Page X of Y" stays on one line */
        .pagination-controls { gap: 10px; }
        .pagination-controls .page-indicator,
        .pagination-controls button { white-space: nowrap; }

        @media (max-width: 480px) {
          .pagination-controls .page-indicator {
            font-size: 0.82rem !important;
            padding: 6px 8px !important;
            /* center takes remaining space on very small screens */
            display: flex !important;
            align-items: center !important;
            justify-content: center !important;
          }
          .pagination-controls button {
            font-size: 0.82rem !important;
            padding: 6px 8px !important;
            width: 68px !important;
          }
        }

        @media (min-width: 1024px) {
          .leaderboard-inner {
            /* Slightly larger than the original 1200px: use 1280px max width, keep a reasonable min-width */
            max-width: 1280px !important;
            min-width: 760px !important;
            height: 700px !important;
            margin: 0 auto !important;
          }
        }
      `}</style>
    </div>
  )
}
