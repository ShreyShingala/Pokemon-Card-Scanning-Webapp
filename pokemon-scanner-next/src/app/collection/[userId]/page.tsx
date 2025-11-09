'use client'

import { useEffect, useState, use } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useTheme } from '@/contexts/ThemeContext'

interface CardItem {
  id: string
  card_id: string
  quantity: number
  last_scanned_at: string
  card_details: {
    name: string
    image_large: string
    image_small?: string
    set_name: string
    number: string
    rarity: string
    types: string[]
    hp: string
    national_pokedex_numbers: number[]
    artist?: string
  }
  attack_details: Array<{
    name: string
    cost: string[]
    damage: string
    text: string
  }>
  weakness_details: Array<{
    type: string
    value: string
  }>
  resistance_details: Array<{
    type: string
    value: string
  }>
  ability_details: Array<{
    name: string
    text: string
    type: string
  }>
}

export default function UserCollectionPage({ params }: { params: Promise<{ userId: string }> }) {
  const router = useRouter()
  const { isDarkMode } = useTheme()
  const searchParams = useSearchParams()
  const userName = searchParams.get('name') || 'User'
  const resolvedParams = use(params)
  const userId = resolvedParams.userId
  const showBackToLeaderboard = !!searchParams.get('name')
  const [collection, setCollection] = useState<CardItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [totalCards, setTotalCards] = useState(0)
  const [totalQuantity, setTotalQuantity] = useState(0)
  const [sortBy, setSortBy] = useState<'name' | 'set' | 'rarity' | 'quantity' | 'hp' | 'type' | 'damage' | 'ability' | 'stage' | 'ex' | 'family' | 'pokedex'>('name')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc')
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCard, setSelectedCard] = useState<CardItem | null>(null)

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
    'Rare Shiny GX': 6
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

  useEffect(() => {
    loadCollection()
  }, [userId])

  // Detect sidebar state on mount and sync classes
  useEffect(() => {
    const syncSidebarState = () => {
      const sidebar = document.querySelector('.sidebar')
      const collectionContainer = document.querySelector('.collection-container')
      
      if (sidebar && collectionContainer) {
        const isSidebarClosed = sidebar.classList.contains('closed')
        
        if (isSidebarClosed) {
          collectionContainer.classList.add('sidebar-closed')
          collectionContainer.classList.remove('sidebar-open')
        } else {
          collectionContainer.classList.add('sidebar-open')
          collectionContainer.classList.remove('sidebar-closed')
        }
      }
    }

    // Run immediately
    syncSidebarState()
    
    // Also run after a short delay to ensure DOM is ready
    const timer = setTimeout(syncSidebarState, 100)
    
    // Listen for sidebar toggle events
    const handleSidebarToggle = () => syncSidebarState()
    window.addEventListener('resize', handleSidebarToggle)
    
    return () => {
      clearTimeout(timer)
      window.removeEventListener('resize', handleSidebarToggle)
    }
  }, [loading]) // Re-run when loading state changes

  const loadCollection = async () => {
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/user_collection/${userId}`)
      
      if (!response.ok) {
        if (response.status === 403) {
          setError('This collection is private')
        } else if (response.status === 404) {
          setError('User not found')
        } else {
          throw new Error('Failed to fetch collection')
        }
        return
      }

      const data = await response.json()
      
      if (!data.success) {
        throw new Error(data.error || 'Unknown error')
      }

      setCollection(data.collection || [])
      setTotalCards(data.total_cards || 0)
      
      const totalQty = (data.collection || []).reduce((sum: number, item: CardItem) => sum + item.quantity, 0)
      setTotalQuantity(totalQty)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setLoading(false)
    }
  }

  const toggleSortOrder = () => {
    setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')
  }

  const getTypeColor = (types: string[], cardName: string): string => {
    const typeColors: { [key: string]: string } = isDarkMode ? {
      // Energy Types - Dark Mode
      'Grass': '#2d5016',      // Dark green
      'Fire': '#7c2d12',       // Dark red/orange
      'Water': '#1e3a8a',      // Dark blue
      'Lightning': '#713f12',  // Dark yellow/amber
      'Electric': '#713f12',   // Dark yellow/amber
      'Psychic': '#581c87',    // Dark purple
      'Fighting': '#78350f',   // Dark brown
      'Darkness': '#375172ff',   // Very dark gray
      'Metal': '#374151',      // Dark steel gray
      'Dragon': '#4c1d95',     // Dark purple
      'Fairy': '#831843',      // Dark pink
      'Colorless': '#858687ff',  // Dark gray
      
      // Trainer Cards
      'Trainer': '#78350f',    // Dark orange/brown
      'Item': '#164e63',       // Dark cyan
      'Supporter': '#831843',  // Dark pink
      'Stadium': '#14532d',    // Dark green
      'Tool': '#581c87',       // Dark purple

      // Special Energy
      'Special': '#92400e',    // Dark amber
    } : {
      // Energy Types - Light Mode
      'Grass': '#c8e6c9',      // Vibrant green
      'Fire': '#e98e8bff',     // Vibrant orange/red
      'Water': '#bbdefb',      // Vibrant blue
      'Lightning': '#fff59d',  // Vibrant yellow
      'Electric': '#fff59d',   // Vibrant yellow
      'Psychic': '#e1bee7',    // Vibrant purple
      'Fighting': '#ddac78ff', // Vibrant brown/tan
      'Darkness': '#877b7bff', // Medium gray
      'Metal': '#a9b0b2ff',    // Vibrant steel gray
      'Dragon': '#d1c4e9',     // Vibrant purple
      'Fairy': '#f8bbd0',      // Vibrant pink
      'Colorless': '#e0e0e0',  // Light gray
      
      // Trainer Cards 
      'Trainer': '#fff3e0',    // Light orange/beige
      'Item': '#e1f5fe',       // Light cyan
      'Supporter': '#fce4ec',  // Light pink
      'Stadium': '#f1f8e9',    // Light green
      'Tool': '#f3e5f5',       // Light purple

      // Special Energy 
      'Special': '#ffe0b2',    // Light amber
    }
    
    // Handle Energy cards (they have null/empty types)
    if (cardName && cardName.toLowerCase().includes('energy')) {
      // Check if it's a Special Energy first
      if (cardName.toLowerCase().includes('special')) {
        return typeColors['Special']
      }
      
      // Extract energy type from name
      const energyMatch = cardName.match(/^(\w+)\s+Energy/i)
      if (energyMatch) {
        const energyType = energyMatch[1]
        return typeColors[energyType] || typeColors['Special']
      }
      
      // Default for unmatched energy cards
      return typeColors['Special']
    }
    
    // Handle Trainer cards 
    if (!types || types.length === 0) {
      // Default for trainer cards
      return typeColors['Trainer']
    }
    
    // Handle Pokémon cards with types
    const primaryType = types[0]
    return typeColors[primaryType] || '#f8fafc'
  }

  
  const getFamilyKey = (card: any): number | string => { //find family key for sorting
    // Prefer numeric Pokedex (first entry)
    const pokedexArr = card.national_pokedex_numbers || []
    if (Array.isArray(pokedexArr) && pokedexArr.length > 0) {
      // Use number (lowest entry if multiple)
      return Number(pokedexArr[0]) || pokedexArr[0]
    }

    if (card.evolves_from) {
      return (card.evolves_from as string).toLowerCase()
    }

    const name = (card.name || '').toString()
    if (!name) return ''
    const cleaned = name.replace(/\s+(EX|GX|MEGA|VMAX|VSTAR|V|LEGEND|BREAK|Prime|Star|Shining)\b/gi, '')
    return cleaned.trim().toLowerCase()
  }

 
  const computeStageScore = (card: any): number => { 
    const subtypes = card.subtypes || []
    
    let stageScore = 0
    for (const s of subtypes) {
      if (stageTiers[s]) {
        stageScore = Math.max(stageScore, stageTiers[s])
      }
    }

    let exScore = 0
    for (const s of subtypes) {
      if (exTiers[s]) {
        exScore = Math.max(exScore, exTiers[s])
      }
    }

    // Final combined score: exScore * 100 + stageScore
    return exScore * 100 + stageScore
  }

  const getSortedCollection = () => {
    // First, filter by search query
    let filtered = collection
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim()
      filtered = collection.filter(item => 
        item.card_details.name?.toLowerCase().includes(query)
      )
    }

    const sorted = [...filtered].sort((a, b) => {
      let compareA: any
      let compareB: any

      switch (sortBy) {
        case 'name':
          compareA = a.card_details.name?.toLowerCase() || ''
          compareB = b.card_details.name?.toLowerCase() || ''
          break
        case 'set':
          compareA = a.card_details.set_name?.toLowerCase() || ''
          compareB = b.card_details.set_name?.toLowerCase() || ''
          break
        case 'rarity':
          compareA = rarityTiers[a.card_details.rarity || ''] || 0
          compareB = rarityTiers[b.card_details.rarity || ''] || 0
          break
        case 'quantity':
          compareA = a.quantity
          compareB = b.quantity
          break
        case 'hp':
          compareA = a.card_details.hp ? parseInt(a.card_details.hp) : 0
          compareB = b.card_details.hp ? parseInt(b.card_details.hp) : 0
          break
        case 'type':
          compareA = a.card_details.types?.[0]?.toLowerCase() || ''
          compareB = b.card_details.types?.[0]?.toLowerCase() || ''
          break
        case 'damage':
          // Use the max damage from all attacks for each card

          const attacksA = (a.attack_details as any) || []
          const attacksB = (b.attack_details as any) || []

          const damageA = attacksA.reduce((max: number, attack: any) => {
            const dmg = parseInt(String(attack.damage)) || 0
            return Math.max(max, dmg)
          }, 0)

          const damageB = attacksB.reduce((max: number, attack: any) => {
            const dmg = parseInt(String(attack.damage)) || 0
            return Math.max(max, dmg)
          }, 0)

          compareA = damageA
          compareB = damageB
          break
        case 'ability':
          const abilitiesA = (a.ability_details as any) || []
          const abilitiesB = (b.ability_details as any) || []

          const abilityNameA = abilitiesA[0]?.name?.toLowerCase() || ''
          const abilityNameB = abilitiesB[0]?.name?.toLowerCase() || ''

          compareA = abilityNameA
          compareB = abilityNameB
          break
        case 'stage':
          const subtypesA = (a.card_details as any).subtypes || []
          const subtypesB = (b.card_details as any).subtypes || []

          const stageA = subtypesA.find((st: string) => Object.keys(stageTiers).includes(st)) || ''
          const stageB = subtypesB.find((st: string) => Object.keys(stageTiers).includes(st)) || ''

          compareA = stageTiers[stageA] || 0
          compareB = stageTiers[stageB] || 0
          break
        case 'ex':
          const subtypesexA = (a.card_details as any).subtypes || []
          const subtypesexB = (b.card_details as any).subtypes || []

         
          const exA = subtypesexA.reduce((max: number, subtype: string) => {
            const tierValue = exTiers[subtype] || 0
            return Math.max(max, tierValue)
          }, 0)

          
          const exB = subtypesexB.reduce((max: number, subtype: string) => {
            const tierValue = exTiers[subtype] || 0
            return Math.max(max, tierValue)
          }, 0)

          compareA = exA
          compareB = exB
          break
        case 'family':
          // compute family key for both cards
          const familyA = getFamilyKey(a.card_details)
          const familyB = getFamilyKey(b.card_details)

          // If family keys are numeric, compare numerically; otherwise compare strings
          if (typeof familyA === 'number' && typeof familyB === 'number') {
            // If same family, sort within family by stage/ex tier
            if (familyA === familyB) {
              // reuse stage/ex logic: compute best stage and ex tier
              const stageScoreA = computeStageScore(a.card_details)
              const stageScoreB = computeStageScore(b.card_details)
              compareA = stageScoreA
              compareB = stageScoreB
            } else {
              compareA = familyA
              compareB = familyB
            }
          } else {
            const fa = String(familyA || '')
            const fb = String(familyB || '')
            if (fa === fb) {
              const stageScoreA = computeStageScore(a.card_details)
              const stageScoreB = computeStageScore(b.card_details)
              compareA = stageScoreA
              compareB = stageScoreB
            } else {
              compareA = fa
              compareB = fb
            }
          }
          break
        case 'pokedex':
          const pokedexA = a.card_details.national_pokedex_numbers || []
          const pokedexB = b.card_details.national_pokedex_numbers || []

          compareA = (Array.isArray(pokedexA) && pokedexA.length > 0) ? Number(pokedexA[0]) : Infinity
          compareB = (Array.isArray(pokedexB) && pokedexB.length > 0) ? Number(pokedexB[0]) : Infinity
          break
        default:
          return 0
      }

      if (compareA < compareB) return sortOrder === 'asc' ? -1 : 1
      if (compareA > compareB) return sortOrder === 'asc' ? 1 : -1
      return 0
    })

    return sorted
  }

  if (loading) {
    return (
      <div className="collection-container">
        <div className="loading-spinner">
          <div className="spinner"></div>
          <p>Loading collection...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="collection-container">
        <div className="error-message">
          <h3>Failed to load collection</h3>
          <p>{error}</p>
        </div>
      </div>
    )
  }

  return (
    <div className={`collection-container ${showBackToLeaderboard ? 'sidebar-closed' : ''}`} id="collectionContainer">
      {/* Back to Leaderboard button in top-right corner */}
      {showBackToLeaderboard && (
        <button
          onClick={() => router.push('/leaderboard')}
          aria-label="Back to leaderboard"
          title="Back to leaderboard"
          className="menu-toggle-btn back-to-leaderboard-btn"
        >
          ←
        </button>
      )}

      <div className="stats">
        <h2>{userName}'s Collection</h2>
        <p>{totalCards} unique cards collected</p>
        <p>{totalQuantity} total cards (including duplicates)</p>
      </div>

      {collection.length === 0 ? (
        <div style={{ gridColumn: '1/-1', textAlign: 'center', padding: '50px' }}>
          <h3 style={{ color: isDarkMode ? '#f1f5f9' : '#000', marginBottom: '10px' }}>This collection is empty</h3>
          <p style={{ color: isDarkMode ? '#e5e7eb' : '#000' }}>No cards have been added yet.</p>
        </div>
      ) : (
        <>
          {/* Sorting Controls with Search */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '10px',
            maxWidth: '1400px',
            margin: '0 auto 20px auto',
            padding: '15px 20px',
            background: isDarkMode ? '#1e293b' : 'white',
            borderRadius: '12px',
            boxShadow: isDarkMode ? '0 2px 8px rgba(0, 0, 0, 0.3)' : '0 2px 8px rgba(0, 0, 0, 0.1)'
          }}>
            <span style={{ fontWeight: '600', color: isDarkMode ? '#cbd5e1' : '#334155', fontSize: '0.95rem', marginRight: '5px' }}>Sort:</span>
            
            {/* Sort Type Buttons */}
            {[
              { value: 'name', label: 'Name' },
              { value: 'set', label: 'Set' },
              { value: 'rarity', label: 'Rarity' },
              { value: 'quantity', label: 'Qty' },
              { value: 'hp', label: 'HP' },
              { value: 'type', label: 'Type' },
              { value: 'damage', label: 'Damage' },
              { value: 'ability', label: 'Ability' },
              { value: 'stage', label: 'Stage' },
              { value: 'ex', label: 'EX' },
              { value: 'family', label: 'Family' },
              { value: 'pokedex', label: 'Pokedex' }
            ].map((option) => (
              <button
                key={option.value}
                onClick={() => setSortBy(option.value as any)}
                style={{
                  padding: '8px 16px',
                  fontSize: '0.9rem',
                  fontWeight: '500',
                  border: '2px solid',
                  borderColor: sortBy === option.value ? (isDarkMode ? '#06B6D4' : '#2563EB') : (isDarkMode ? '#475569' : '#e2e8f0'),
                  borderRadius: '6px',
                  background: sortBy === option.value ? (isDarkMode ? '#2563EB' : '#2563EB') : (isDarkMode ? '#334155' : 'white'),
                  color: sortBy === option.value ? 'white' : (isDarkMode ? '#e5e7eb' : '#334155'),
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  whiteSpace: 'nowrap'
                }}
                onMouseEnter={(e) => {
                  if (sortBy !== option.value) {
                    e.currentTarget.style.borderColor = isDarkMode ? '#06B6D4' : '#2563EB'
                    e.currentTarget.style.color = isDarkMode ? '#06B6D4' : '#2563EB'
                  }
                }}
                onMouseLeave={(e) => {
                  if (sortBy !== option.value) {
                    e.currentTarget.style.borderColor = isDarkMode ? '#475569' : '#e2e8f0'
                    e.currentTarget.style.color = isDarkMode ? '#e5e7eb' : '#334155'
                  }
                }}
              >
                {option.label}
              </button>
            ))}

            {/* Sort Order Button */}
            <button
              onClick={toggleSortOrder}
              style={{
                padding: '8px 16px',
                fontSize: '1.1rem',
                border: `2px solid ${isDarkMode ? '#06B6D4' : '#2563EB'}`,
                borderRadius: '6px',
                background: isDarkMode ? '#334155' : 'white',
                color: isDarkMode ? '#06B6D4' : '#2563EB',
                cursor: 'pointer',
                transition: 'all 0.2s',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                minWidth: '36px',
                height: '36px'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = isDarkMode ? '#2563EB' : '#2563EB'
                e.currentTarget.style.color = 'white'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = isDarkMode ? '#334155' : 'white'
                e.currentTarget.style.color = isDarkMode ? '#06B6D4' : '#2563EB'
              }}
              title={sortOrder === 'asc' ? 'Ascending' : 'Descending'}
            >
              {sortOrder === 'asc' ? '↑' : '↓'}
            </button>

            {/* Spacer to push search to the right */}
            <div style={{ flex: 1 }} />

            {/* Search Bar */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: '250px' }}>
              <input
                type="text"
                placeholder="Search..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{
                  flex: 1,
                  padding: '6px 12px',
                  fontSize: '0.9rem',
                  border: '2px solid',
                  borderColor: isDarkMode ? '#475569' : '#e2e8f0',
                  borderRadius: '6px',
                  background: isDarkMode ? '#334155' : 'white',
                  color: isDarkMode ? '#e5e7eb' : '#334155',
                  outline: 'none',
                  transition: 'border-color 0.2s'
                }}
                onFocus={(e) => e.currentTarget.style.borderColor = '#2563EB'}
                onBlur={(e) => e.currentTarget.style.borderColor = isDarkMode ? '#475569' : '#e2e8f0'}
              />
              {searchQuery && (
                <span style={{ fontSize: '0.85rem', color: '#334155', whiteSpace: 'nowrap' }}>
                  {getSortedCollection().length} found
                </span>
              )}
            </div>
          </div>

          <div className="collection-grid">
            {getSortedCollection().length === 0 ? (
                <div style={{ gridColumn: '1/-1', textAlign: 'center', padding: '50px' }}>
                  <h3 style={{ color: isDarkMode ? '#f1f5f9' : '#1e293b', marginBottom: '10px' }}>No cards found</h3>
                  <p style={{ color: isDarkMode ? '#e5e7eb' : '#334155', marginBottom: '20px' }}>No cards match your search "{searchQuery}"</p>
                <button
                  onClick={() => setSearchQuery('')}
                  style={{
                    marginTop: '15px',
                    padding: '10px 20px',
                    fontSize: '1rem',
                    background: isDarkMode ? '#2563EB' : '#2563EB',
                    color: 'white',
                    border: 'none',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    transition: 'background 0.2s'
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.background = isDarkMode ? '#1D4ED8' : '#1D4ED8'}
                  onMouseLeave={(e) => e.currentTarget.style.background = isDarkMode ? '#2563EB' : '#2563EB'}
                >
                  Clear search
                </button>
              </div>
            ) : (
              getSortedCollection().map((item) => {
              const card = item.card_details
              const imageUrl = card.image_large || card.image_small || 'https://via.placeholder.com/250x350?text=No+Image'
              const bgColor = getTypeColor(card.types, card.name)
              
              return (
                <div 
                  key={item.id} 
                  className="card-item"
                  onClick={() => setSelectedCard(item)}
                  style={{ 
                    background: bgColor,
                    transition: 'all 0.3s ease',
                    cursor: 'pointer'
                  }}
                >
                  {/* Card Name - Centered at top */}
                  <div style={{
                    textAlign: 'center',
                    fontWeight: 'bold',
                    fontSize: '1.15em',
                    color: isDarkMode ? '#f1f5f9' : '#1e293b',
                    marginBottom: '12px',
                    padding: '0 5px',
                    lineHeight: '1.3'
                  }}>
                    {card.name || 'Unknown Card'}
                  </div>

                  {/* Card Image */}
                  <img 
                    src={imageUrl} 
                    alt={card.name}
                    onError={(e) => { (e.target as HTMLImageElement).src = 'https://via.placeholder.com/250x350?text=No+Image' }}
                    style={{
                      width: '100%',
                      borderRadius: '10px',
                      marginBottom: '12px'
                    }}
                  />

                  {/* Card Info - Compact at bottom */}
                  <div style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '6px',
                    fontSize: '0.9em',
                    color: isDarkMode ? '#e5e7eb' : '#475569'
                  }}>
                    {card.set_name && (
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontWeight: '600', color: isDarkMode ? '#e5e7eb' : '#334155' }}>Set:</span>
                        <span style={{ color: isDarkMode ? '#e5e7eb' : '#334155' }}>{card.set_name}</span>
                      </div>
                    )}
                    {card.number && (
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontWeight: '600', color: isDarkMode ? '#e5e7eb' : '#334155' }}>Card #:</span>
                        <span style={{ color: isDarkMode ? '#e5e7eb' : '#334155' }}>{card.number}</span>
                      </div>
                    )}
                    { // Pokédex Numbers
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontWeight: '600', color: isDarkMode ? '#e5e7eb' : '#334155' }}>Pokédex #:</span>
                      {(card as any).national_pokedex_numbers && (card as any).national_pokedex_numbers.length > 0 ? (
                        <span style={{ color: isDarkMode ? '#e5e7eb' : '#334155' }}>{(card as any).national_pokedex_numbers.join(', ')}</span>
                      ) : (
                        <span style={{ color: isDarkMode ? '#e5e7eb' : '#334155' }}>{"N/A"}</span>
                      )}
                      </div>
                    }
                    {card.rarity && (
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontWeight: '600', color: isDarkMode ? '#e5e7eb' : '#334155' }}>Rarity:</span>
                        <span style={{ color: isDarkMode ? '#e5e7eb' : '#334155' }}>{card.rarity}</span>
                      </div>
                    )}
                  </div>

                  {/* Quantity Badge */}
                  <div className="card-quantity" style={{ marginTop: '12px' }}>
                    Owned: {item.quantity}
                  </div>
                </div>
              )
            })
            )}
          </div>
        </>
      )}

      {/* Card Detail Modal - View Only */}
      {selectedCard && (
        <div 
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.7)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: '20px'
          }}
          onClick={() => setSelectedCard(null)}
        >
          <div 
            style={{
              backgroundColor: isDarkMode ? '#1e293b' : 'white',
              borderRadius: '15px',
              maxWidth: '1000px',
              maxHeight: '90vh',
              width: '100%',
              display: 'flex',
              flexDirection: 'row',
              overflow: 'hidden',
              position: 'relative'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Close Button */}
            <button
              onClick={() => setSelectedCard(null)}
              style={{
                position: 'absolute',
                top: '15px',
                right: '15px',
                background: 'rgba(255, 255, 255, 0.9)',
                border: 'none',
                borderRadius: '50%',
                width: '35px',
                height: '35px',
                fontSize: '20px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                zIndex: 10,
                boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
                fontWeight: 'bold',
                color: isDarkMode ? '#e5e7eb' : '#334155'
              }}
            >
              ×
            </button>

            {/* Left Side - Card Image */}
            <div style={{
              flex: '0 0 45%',
              padding: '40px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: isDarkMode ? '#0f172a' : '#f8fafc'
            }}>
              {selectedCard.card_details?.image_large ? (
                <img 
                  src={selectedCard.card_details.image_large} 
                  alt={selectedCard.card_details.name}
                  style={{
                    maxWidth: '100%',
                    maxHeight: '550px',
                    borderRadius: '12px',
                    boxShadow: '0 8px 24px rgba(0,0,0,0.15)'
                  }}
                />
              ) : (
                <div style={{
                  width: '100%',
                  height: '400px',
                  backgroundColor: '#e2e8f0',
                  borderRadius: '12px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#64748b'
                }}>
                  No Image Available
                </div>
              )}
            </div>

            {/* Right Side - Card Details */}
            <div style={{
              flex: '1',
              padding: '40px',
              overflowY: 'auto',
              display: 'flex',
              flexDirection: 'column'
            }}>
              {/* Card Name & HP */}
              <div style={{ marginBottom: '24px' }}>
                <h2 style={{ 
                  margin: '0 0 8px 0', 
                  fontSize: '28px',
                  color: isDarkMode ? '#f1f5f9' : '#1e293b',
                  fontWeight: '700'
                }}>
                  {selectedCard.card_details.name}
                </h2>
                {selectedCard.card_details.hp && (
                  <div style={{ 
                    fontSize: '18px', 
                    color: isDarkMode ? '#94a3b8' : '#64748b',
                    fontWeight: '600'
                  }}>
                    HP: {selectedCard.card_details.hp}
                  </div>
                )}
              </div>

              {/* Types */}
              {selectedCard.card_details.types && selectedCard.card_details.types.length > 0 && (
                <div style={{ marginBottom: '20px' }}>
                  <div style={{ fontWeight: '600', color: isDarkMode ? '#cbd5e1' : '#475569', marginBottom: '8px' }}>Type:</div>
                  <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                    {selectedCard.card_details.types.map((type: string) => (
                      <span key={type} style={{
                        padding: '4px 12px',
                        borderRadius: '16px',
                        backgroundColor: isDarkMode ? '#312e81' : '#e0e7ff',
                        color: isDarkMode ? '#c7d2fe' : '#4338ca',
                        fontSize: '14px',
                        fontWeight: '500'
                      }}>
                        {type}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Attacks */}
              {selectedCard.attack_details && selectedCard.attack_details.length > 0 && (
                <div style={{ marginBottom: '20px' }}>
                  <div style={{ fontWeight: '600', color: isDarkMode ? '#cbd5e1' : '#475569', marginBottom: '12px', fontSize: '16px' }}>Attacks:</div>
                  {selectedCard.attack_details.map((attack: any, idx: number) => (
                    <div key={idx} style={{
                      marginBottom: '16px',
                      padding: '12px',
                      backgroundColor: isDarkMode ? '#334155' : '#f8fafc',
                      borderRadius: '8px',
                      border: `1px solid ${isDarkMode ? '#475569' : '#e2e8f0'}`
                    }}>
                      <div style={{ 
                        display: 'flex', 
                        justifyContent: 'space-between',
                        marginBottom: '6px'
                      }}>
                        <span style={{ fontWeight: '600', color: isDarkMode ? '#f1f5f9' : '#334155' }}>{attack.name}</span>
                        {attack.damage && (
                          <span style={{ 
                            fontWeight: '700',
                            color: isDarkMode ? '#fca5a5' : '#dc2626',
                            fontSize: '16px'
                          }}>
                            {attack.damage}
                          </span>
                        )}
                      </div>
                      {attack.cost && attack.cost.length > 0 && (
                        <div style={{ 
                          fontSize: '13px', 
                          color: isDarkMode ? '#94a3b8' : '#64748b',
                          marginBottom: '6px'
                        }}>
                          Cost: {attack.cost.join(', ')}
                        </div>
                      )}
                      {attack.text && (
                        <div style={{ fontSize: '14px', color: isDarkMode ? '#cbd5e1' : '#475569', lineHeight: '1.5' }}>
                          {attack.text}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {/* Abilities */}
              {selectedCard.ability_details && selectedCard.ability_details.length > 0 && (
                <div style={{ marginBottom: '20px' }}>
                  <div style={{ fontWeight: '600', color: isDarkMode ? '#cbd5e1' : '#475569', marginBottom: '12px', fontSize: '16px' }}>Abilities:</div>
                  {selectedCard.ability_details.map((ability: any, idx: number) => (
                    <div key={idx} style={{
                      marginBottom: '12px',
                      padding: '12px',
                      backgroundColor: isDarkMode ? '#164e63' : '#E0F2FE',
                      borderRadius: '8px',
                      border: `1px solid ${isDarkMode ? '#0891b2' : '#06B6D4'}`
                    }}>
                      <div style={{ fontWeight: '600', color: isDarkMode ? '#06B6D4' : '#0891B2', marginBottom: '4px' }}>
                        {ability.name}
                      </div>
                      {ability.text && (
                        <div style={{ fontSize: '14px', color: isDarkMode ? '#67E8F9' : '#0E7490', lineHeight: '1.5' }}>
                          {ability.text}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {/* Weaknesses & Resistances */}
              <div style={{ display: 'flex', gap: '20px', marginBottom: '20px', flexWrap: 'wrap' }}>
                {selectedCard.weakness_details && selectedCard.weakness_details.length > 0 && (
                  <div style={{ flex: '1', minWidth: '150px' }}>
                    <div style={{ fontWeight: '600', color: isDarkMode ? '#cbd5e1' : '#475569', marginBottom: '8px' }}>Weakness:</div>
                    {selectedCard.weakness_details.map((weakness: any, idx: number) => (
                      <div key={idx} style={{ fontSize: '14px', color: isDarkMode ? '#fca5a5' : '#dc2626' }}>
                        {weakness.type} {weakness.value}
                      </div>
                    ))}
                  </div>
                )}
                {selectedCard.resistance_details && selectedCard.resistance_details.length > 0 && (
                  <div style={{ flex: '1', minWidth: '150px' }}>
                    <div style={{ fontWeight: '600', color: isDarkMode ? '#cbd5e1' : '#475569', marginBottom: '8px' }}>Resistance:</div>
                    {selectedCard.resistance_details.map((resistance: any, idx: number) => (
                      <div key={idx} style={{ fontSize: '14px', color: isDarkMode ? '#6ee7b7' : '#059669' }}>
                        {resistance.type} {resistance.value}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Set Info */}
              <div style={{ marginBottom: '20px', paddingTop: '20px', borderTop: `1px solid ${isDarkMode ? '#475569' : '#e2e8f0'}` }}>
                <div style={{ display: 'grid', gridTemplateColumns: '120px 1fr', gap: '8px', fontSize: '14px' }}>
                  {selectedCard.card_details.set_name && (
                    <>
                      <span style={{ fontWeight: '600', color: isDarkMode ? '#cbd5e1' : '#475569' }}>Set:</span>
                      <span style={{ color: isDarkMode ? '#e5e7eb' : '#334155' }}>{selectedCard.card_details.set_name}</span>
                    </>
                  )}
                  {selectedCard.card_details.number && (
                    <>
                      <span style={{ fontWeight: '600', color: isDarkMode ? '#cbd5e1' : '#475569' }}>Card Number:</span>
                      <span style={{ color: isDarkMode ? '#e5e7eb' : '#334155' }}>{selectedCard.card_details.number}</span>
                    </>
                  )}
                  {(selectedCard.card_details.national_pokedex_numbers && selectedCard.card_details.national_pokedex_numbers.length > 0) && (
                    <>
                      <span style={{ fontWeight: '600', color: isDarkMode ? '#cbd5e1' : '#475569' }}>Pokédex #:</span>
                      <span style={{ color: isDarkMode ? '#e5e7eb' : '#334155' }}>
                        {selectedCard.card_details.national_pokedex_numbers.join(', ')}
                      </span>
                    </>
                  )}
                  {selectedCard.card_details.rarity && (
                    <>
                      <span style={{ fontWeight: '600', color: isDarkMode ? '#cbd5e1' : '#475569' }}>Rarity:</span>
                      <span style={{ color: isDarkMode ? '#e5e7eb' : '#334155' }}>{selectedCard.card_details.rarity}</span>
                    </>
                  )}
                  {selectedCard.card_details.artist && (
                    <>
                      <span style={{ fontWeight: '600', color: isDarkMode ? '#cbd5e1' : '#475569' }}>Artist:</span>
                      <span style={{ color: isDarkMode ? '#e5e7eb' : '#334155' }}>{selectedCard.card_details.artist}</span>
                    </>
                  )}
                </div>
              </div>

              {/* Quantity Info - View Only */}
              <div style={{
                marginTop: 'auto',
                paddingTop: '20px',
                borderTop: '2px solid #e2e8f0',
                textAlign: 'center'
              }}>
                <div style={{ 
                  fontSize: '18px', 
                  fontWeight: '600',
                  color: isDarkMode ? '#e5e7eb' : '#334155'
                }}>
                  Owned: {selectedCard.quantity}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}