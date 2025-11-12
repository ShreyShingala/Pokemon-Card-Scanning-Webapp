'use client'

import { useEffect, useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import { useTheme } from '@/contexts/ThemeContext'
import { useToast } from '@/contexts/ToastContext'

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

export default function CollectionPage() {
  const router = useRouter()
  const {user, loading: authLoading} = useAuth()
  const { isDarkMode } = useTheme()
  const { showToast } = useToast()
  const [collection, setCollection] = useState<CardItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [totalCards, setTotalCards] = useState(0)
  const [totalQuantity, setTotalQuantity] = useState(0)
  const [sortBy, setSortBy] = useState<'name' | 'set' | 'rarity' | 'quantity' | 'hp' | 'type' | 'damage' | 'stage' | 'ability' | 'ex' | 'family' | 'pokedex'>('name')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc')
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCard, setSelectedCard] = useState<CardItem | null>(null)
  const [isPublic, setIsPublic] = useState<boolean | null>(null)
  const [togglingPublic, setTogglingPublic] = useState(false)
  const [deletePending, setDeletePending] = useState(false)
  const deleteTimeoutRef = useRef<number | null>(null)
  const [isMobileViewport, setIsMobileViewport] = useState(false)
  // scrollRef retained if needed for future small interactions; not required for fullscreen
  const scrollRef = useRef<HTMLDivElement | null>(null)

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
    // Core evolution stages
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
    // Wait for auth to load
    if (authLoading) return

    // Redirect to login if not authenticated
    if (!user) {
      router.push('/auth/login')
      return
    }

    loadCollection()
    loadProfilePublicStatus()
  }, [user, authLoading, router])

  useEffect(() => {
    const mql = window.matchMedia('(max-width: 768px)')
    const update = () => setIsMobileViewport(mql.matches)
    update()
    if (mql.addEventListener) mql.addEventListener('change', update)
    else mql.addListener(update)
    return () => {
      if (mql.removeEventListener) mql.removeEventListener('change', update)
      else mql.removeListener(update)
    }
  }, [])

  // Reset delete confirmation when selected card changes or component unmounts
  useEffect(() => {
    setDeletePending(false)
    if (deleteTimeoutRef.current) {
      window.clearTimeout(deleteTimeoutRef.current)
      deleteTimeoutRef.current = null
    }
    return () => {
      if (deleteTimeoutRef.current) {
        window.clearTimeout(deleteTimeoutRef.current)
        deleteTimeoutRef.current = null
      }
    }
  }, [selectedCard])

  const loadCollection = async () => {
    if (!user) return

    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/user_collection/${user.id}`)
      
      if (!response.ok) {
        throw new Error('Failed to fetch collection')
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

  // Fullscreen feature removed — no listeners required

    const loadProfilePublicStatus = async () => {
      if (!user) return
      try {
        const resp = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/profile_status/${user.id}`)
        if (!resp.ok) {
          const body = await resp.json().catch(() => null)
          console.warn('Could not load profile public status:', body || resp.status)
          setIsPublic(false)
          return
        }

        const data = await resp.json()
        if (data && data.success && typeof data.is_public !== 'undefined') {
          setIsPublic(!!data.is_public)
        } else {
          console.warn('Unexpected profile status response:', data)
          setIsPublic(false)
        }
      } catch (err) {
        console.error('Error loading profile status:', err)
        setIsPublic(false)
      }
    }

  const toggleSortOrder = () => {
    setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')
  }

  const updateQuantity = async (cardId: string, newQuantity: number) => {
    if (!user || newQuantity < 0) return

    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/update_quantity/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: user.id,
          card_id: cardId,
          quantity: newQuantity
        })
      })

      if (response.ok) {
        // Update local state
        setCollection(prev => prev.map(item => 
          item.card_id === cardId ? { ...item, quantity: newQuantity } : item
        ))
        if (selectedCard && selectedCard.card_id === cardId) {
          setSelectedCard({ ...selectedCard, quantity: newQuantity })
        }
        // Recalculate totals
        const newTotal = collection.reduce((sum, item) => 
          item.card_id === cardId ? sum + newQuantity : sum + item.quantity, 0
        )
        setTotalQuantity(newTotal)
      }
    } catch (err) {
      console.error('Failed to update quantity:', err)
    }
  }

  const deleteCard = async (cardId: string) => {
    // No confirm() here — confirmation is handled by in-modal double-click behavior.
    // Helper to remove locally (UI update)
    const removeLocally = () => {
      setCollection(prev => prev.filter(item => item.card_id !== cardId))
      setTotalCards(prev => Math.max(0, prev - 1))
      const deletedItem = collection.find(item => item.card_id === cardId)
      if (deletedItem) {
        setTotalQuantity(prev => Math.max(0, prev - deletedItem.quantity))
      }
      setSelectedCard(null) // Close modal
      setDeletePending(false)
      if (deleteTimeoutRef.current) {
        window.clearTimeout(deleteTimeoutRef.current)
        deleteTimeoutRef.current = null
      }
    }

    // If there's no authenticated user, just remove locally (works for local-only cards)
    if (!user) {
      removeLocally()
      return
    }

    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/delete_card/?user_id=${user.id}&card_id=${cardId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      })

      if (response.ok) {
        // Server deleted — remove from local state
        removeLocally()
      } else {
        // Server delete failed; remove locally so mobile UX remains responsive,
        // but inform the user that remote deletion did not complete.
        console.warn('Server responded with non-ok status when deleting card:', response.status)
        removeLocally()
        showToast('Card removed locally, but failed to delete on the server. It may reappear after a refresh if the server still has it.', 'error')
      }
    } catch (err) {
      console.error('Failed to delete card:', err)
      // Network error — remove locally so UX isn't blocked, but notify user
      removeLocally()
      showToast('Could not reach server to delete card. The card was removed locally and may still exist on the server.', 'error')
    }
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
      
      // Trainer Cards - Dark Mode
      'Trainer': '#78350f',    // Dark orange/brown
      'Item': '#164e63',       // Dark cyan
      'Supporter': '#831843',  // Dark pink
      'Stadium': '#14532d',    // Dark green
      'Tool': '#581c87',       // Dark purple

      // Special Energy - Dark Mode
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
      
      // Trainer Cards - Light Mode
      'Trainer': '#fff3e0',    // Light orange/beige
      'Item': '#e1f5fe',       // Light cyan
      'Supporter': '#fce4ec',  // Light pink
      'Stadium': '#f1f8e9',    // Light green
      'Tool': '#f3e5f5',       // Light purple

      // Special Energy - Light Mode
      'Special': '#ffe0b2',    // Light amber
    }
    
    // Handle Energy cards (have null/empty types)
    if (cardName && cardName.toLowerCase().includes('energy')) {
      // Check if it's a Special Energy first
      if (cardName.toLowerCase().includes('special')) {
        return typeColors['Special']
      }
      
      // Extract energy type from name (e.g., "Fire Energy" -> "Fire")
      const energyMatch = cardName.match(/^(\w+)\s+Energy/i)
      if (energyMatch) {
        const energyType = energyMatch[1]
        return typeColors[energyType] || typeColors['Special']
      }
      
      // Default for unmatched energy cards
      return typeColors['Special']
    }
    
    // Handle Trainer cards (have null/empty types)
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

    // Use evolves_from chain: if card has evolves_from, use that base name
    if (card.evolves_from) {
      return (card.evolves_from as string).toLowerCase()
    }

    // Derive species from card name, ignore suffix variants
    const name = (card.name || '').toString()
    if (!name) return ''
    const cleaned = name.replace(/\s+(EX|GX|MEGA|VMAX|VSTAR|V|LEGEND|BREAK|Prime|Star|Shining)\b/gi, '')
    return cleaned.trim().toLowerCase()
  }

 
  const computeStageScore = (card: any): number => { // returns a single numeric score combining stage and ex variant
    const subtypes = card.subtypes || []
    
    // Stage part (0-4): Basic, Stage 1, Stage 2, Level-Up
    let stageScore = 0
    for (const s of subtypes) {
      if (stageTiers[s]) {
        stageScore = Math.max(stageScore, stageTiers[s])
      }
    }

    // Special variant part (0-10): EX, GX, V, VMAX, MEGA, LEGEND, etc.
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

    // Sort the filtered results
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

          // Find max tier value
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
          // compute family
          const familyA = getFamilyKey(a.card_details)
          const familyB = getFamilyKey(b.card_details)

          // If family keys are numeric, compare numerically; otherwise compare strings
          if (typeof familyA === 'number' && typeof familyB === 'number') {
            // If same family, sort within family by stage/ex tier
            if (familyA === familyB) {
              // Best stage and ex tier
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
      <div className="collection-container" style={{
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
          <p style={{ fontSize: '1.2rem' }}>Loading your collection...</p>
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
    <div className="collection-container" id="collectionContainer">
      <div className="stats">
        <h2>My Collection</h2>
        <p>{totalCards} unique cards collected</p>
        <p>{totalQuantity} total cards (including duplicates)</p>
        
        <div style={{ marginTop: '10px' }}>
          <button
            onClick={async () => {
              if (!user || togglingPublic) return
              try {
                setTogglingPublic(true)
                const resp = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/make_collection_opposite/${user.id}`)
                if (!resp.ok) {
                  const err = await resp.json().catch(() => null)
                  throw new Error(err?.error || 'Failed to toggle public status')
                }
                const data = await resp.json()
                if (data && data.new_is_public_status !== undefined) {
                  setIsPublic(!!data.new_is_public_status)
                  showToast(`Your collection is now ${data.new_is_public_status ? 'Public' : 'Private'}`, 'success')
                } else {
                  showToast('Toggled privacy, but could not read new status', 'info')
                }
              } catch (e) {
                console.error('Toggle public failed:', e)
                showToast((e as Error).message || 'Failed to toggle public/private', 'error')
              } finally {
                setTogglingPublic(false)
              }
            }}
            style={{
              padding: '8px 16px',
              background: isPublic ? '#dc2626' : '#10b981',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              cursor: togglingPublic ? 'not-allowed' : 'pointer'
            }}
            disabled={togglingPublic}
            title={isPublic ? 'Make your collection private' : 'Make your collection public'}
          >
            {togglingPublic ? 'Updating…' : isPublic ? 'Make Private' : 'Make Public'}
          </button>
        </div>
      </div>

      {collection.length === 0 ? (
        <div style={{ gridColumn: '1/-1', textAlign: 'center', padding: '40px', color: isDarkMode ? '#e5e7eb' : '#64748b', background: 'transparent', borderRadius: '0', maxWidth: '720px', margin: '40px auto' }}>
          <h3 style={{ marginBottom: '8px', fontSize: '1.25rem', color: isDarkMode ? '#f1f5f9' : '#4d4242ff' }}>No cards in your collection yet</h3>
          <p style={{ marginBottom: '12px', color: isDarkMode ? '#e5e7eb' : '#4d4242ff' }}>Start scanning cards to build your collection!</p>
          <a href="/" style={{ color: isDarkMode ? '#cbd5e1' : '#a09b9bff', textDecoration: 'none', fontWeight: 700 }}>Go to scanner</a>
        </div>
      ) : (
        <>
          {/* Sorting Controls with Search */}
          <div className="sort-controls" style={{
            // On desktop keep the original flex layout; on mobile we render a block/grid inside
            ...(isMobileViewport ? { display: 'block' } : { display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }),
            maxWidth: '1400px',
            margin: '0 auto 20px auto',
            padding: '15px 20px',
            background: isDarkMode ? '#1e293b' : 'white',
            borderRadius: '12px',
            boxShadow: isDarkMode ? '0 2px 8px rgba(0, 0, 0, 0.3)' : '0 2px 8px rgba(0, 0, 0, 0.1)'
          }}>
            <span style={{ fontWeight: '600', color: isDarkMode ? '#cbd5e1' : '#334155', fontSize: '0.95rem', marginRight: '5px' }}>Sort:</span>

            {isMobileViewport ? (
              // Mobile: 3-column grid of sort buttons, then stacked sort-order + search below
              <div style={{ width: '100%' }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px', marginTop: '10px' }}>
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
                  ].map((option) => {
                    const isActive = sortBy === option.value
                    const btnStyle: React.CSSProperties = {
                      padding: '8px 10px',
                      fontSize: '0.9rem',
                      fontWeight: 500,
                      border: '2px solid',
                      borderColor: isActive ? (isDarkMode ? '#06B6D4' : '#2563EB') : (isDarkMode ? '#475569' : '#e2e8f0'),
                      borderRadius: 6,
                      background: isActive ? (isDarkMode ? '#2563EB' : '#2563EB') : (isDarkMode ? '#334155' : 'white'),
                      color: isActive ? 'white' : (isDarkMode ? '#e5e7eb' : '#334155'),
                      cursor: 'pointer',
                      width: '100%',
                      textAlign: 'center'
                    }

                    return (
                      <button
                        key={option.value}
                        onClick={() => setSortBy(option.value as any)}
                        style={btnStyle}
                      >
                        {option.label}
                      </button>
                    )
                  })}
                </div>

                <div style={{ marginTop: '10px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <button
                    onClick={toggleSortOrder}
                    style={{
                      padding: '10px 12px',
                      fontSize: '1rem',
                      border: `2px solid ${isDarkMode ? '#06B6D4' : '#2563EB'}`,
                      borderRadius: '6px',
                      background: isDarkMode ? '#334155' : 'white',
                      color: isDarkMode ? '#06B6D4' : '#2563EB',
                      cursor: 'pointer',
                      transition: 'all 0.2s',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      width: '100%'
                    }}
                    title={sortOrder === 'asc' ? 'Ascending' : 'Descending'}
                  >
                    {sortOrder === 'asc' ? 'Sort: Ascending ↑' : 'Sort: Descending ↓'}
                  </button>

                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                    <input
                      type="text"
                      placeholder="Search..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      style={{
                        flex: 1,
                        padding: '8px 12px',
                        fontSize: '0.95rem',
                        border: '2px solid',
                        borderColor: isDarkMode ? '#475569' : '#e2e8f0',
                        borderRadius: '6px',
                        background: isDarkMode ? '#334155' : 'white',
                        color: isDarkMode ? '#e5e7eb' : '#334155',
                        outline: 'none'
                      }}
                    />
                    {searchQuery && (
                      <span style={{ fontSize: '0.85rem', color: '#334155', whiteSpace: 'nowrap' }}>
                        {getSortedCollection().length} found
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              // Desktop / larger view — keep original inline layout
              <>
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
                ].map((option) => {
                  const isActive = sortBy === option.value
                  const baseStyle: React.CSSProperties = {
                    padding: isMobileViewport ? '6px 10px' : '8px 16px',
                    fontSize: '0.9rem',
                    fontWeight: 500,
                    border: '2px solid',
                    borderColor: isActive ? (isDarkMode ? '#06B6D4' : '#2563EB') : (isDarkMode ? '#475569' : '#e2e8f0'),
                    borderRadius: 6,
                    background: isActive ? (isDarkMode ? '#2563EB' : '#2563EB') : (isDarkMode ? '#334155' : 'white'),
                    color: isActive ? 'white' : (isDarkMode ? '#e5e7eb' : '#334155'),
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                    whiteSpace: isMobileViewport ? 'normal' : 'nowrap'
                  }

                  return (
                    <button
                      key={option.value}
                      onClick={() => setSortBy(option.value as any)}
                      style={baseStyle}
                      onMouseEnter={(e) => {
                        if (!isMobileViewport && !isActive) {
                          e.currentTarget.style.borderColor = isDarkMode ? '#06B6D4' : '#2563EB'
                          e.currentTarget.style.color = isDarkMode ? '#06B6D4' : '#2563EB'
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (!isMobileViewport && !isActive) {
                          e.currentTarget.style.borderColor = isDarkMode ? '#475569' : '#e2e8f0'
                          e.currentTarget.style.color = isDarkMode ? '#e5e7eb' : '#334155'
                        }
                      }}
                    >
                      {option.label}
                    </button>
                  )
                })}

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
              </>
            )}
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
                    color: '#475569'
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

          {/* Mobile-only scroll wrapper and fullscreen control (JS handles fullscreen) */}
          {isMobileViewport && (
            <div className="mobile-scroll-controls" style={{ position: 'relative' }}>
              {/* Fullscreen control removed */}

              <div ref={scrollRef} className="collection-scroll-wrapper">
                <div className="collection-grid mobile-inner">
                  {getSortedCollection().map((item) => {
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
                          color: '#475569'
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
                  })}
                </div>
              </div>
            </div>
          )}
        </>
      )}

      {/* Card Detail Modal */}
      {selectedCard && (
        <div className="modal-overlay" onClick={() => setSelectedCard(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            {/* Close Button */}
            <button
              className="modal-close"
              onClick={() => setSelectedCard(null)}
              style={{
                background: isDarkMode ? 'rgba(255,255,255,0.12)' : 'rgba(255,255,255,0.95)',
                color: isDarkMode ? '#ffffff' : '#334155',
                border: 'none',
                borderRadius: '50%',
                width: '35px',
                height: '35px',
                fontSize: '20px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                zIndex: 10,
                boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
                fontWeight: '700'
              }}
            >×</button>

            {/* Left Side - Card Image (hide on mobile) */}
            {!isMobileViewport && (
              <div className="modal-left">
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
            )}

            {/* Right Side - Card Details */}
            <div className="modal-right" style={{ padding: isMobileViewport ? '20px' : undefined }}>
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
                  {selectedCard.card_details.national_pokedex_numbers && selectedCard.card_details.national_pokedex_numbers.length > 0 && (
                    <>
                      <span style={{ fontWeight: '600', color: isDarkMode ? '#cbd5e1' : '#475569' }}>Pokédex #:</span>
                      <span style={{ color: isDarkMode ? '#e5e7eb' : '#334155' }}>{selectedCard.card_details.national_pokedex_numbers.join(', ')}</span>
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

              {/* Action Buttons */}
              <div className="modal-actions">
                {/* Quantity Controls */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <button
                    onClick={() => updateQuantity(selectedCard.card_id, selectedCard.quantity - 1)}
                    disabled={selectedCard.quantity <= 1}
                    style={{
                      padding: '8px 16px',
                      fontSize: '18px',
                      fontWeight: '600',
                      backgroundColor: selectedCard.quantity <= 1 ? (isDarkMode ? '#374151' : '#e2e8f0') : '#3b82f6',
                      color: selectedCard.quantity <= 1 ? '#94a3b8' : 'white',
                      border: 'none',
                      borderRadius: '8px',
                      cursor: selectedCard.quantity <= 1 ? 'not-allowed' : 'pointer',
                      transition: 'all 0.2s'
                    }}
                  >
                    −
                  </button>
                  <div style={{ 
                    fontSize: '18px', 
                    fontWeight: '600',
                    color: isDarkMode ? '#e5e7eb' : '#334155',
                    minWidth: '60px',
                    textAlign: 'center'
                  }}>
                    Qty: {selectedCard.quantity}
                  </div>
                  <button
                    onClick={() => updateQuantity(selectedCard.card_id, selectedCard.quantity + 1)}
                    style={{
                      padding: '8px 16px',
                      fontSize: '18px',
                      fontWeight: '600',
                      backgroundColor: '#3b82f6',
                      color: 'white',
                      border: 'none',
                      borderRadius: '8px',
                      cursor: 'pointer',
                      transition: 'all 0.2s'
                    }}
                  >
                    +
                  </button>
                </div>

                {/* Delete Button: first click arms confirmation (changes text to "Are you sure?"), second click actually deletes */}
                <button
                  onClick={() => {
                    if (!deletePending) {
                      setDeletePending(true)
                      // reset after 5s if user doesn't confirm
                      if (deleteTimeoutRef.current) window.clearTimeout(deleteTimeoutRef.current)
                      deleteTimeoutRef.current = window.setTimeout(() => {
                        setDeletePending(false)
                        deleteTimeoutRef.current = null
                      }, 5000)
                    } else {
                      // confirmed — perform delete
                      deleteCard(selectedCard.card_id)
                    }
                  }}
                  style={{
                    padding: '10px 24px',
                    fontSize: '15px',
                    fontWeight: '600',
                    backgroundColor: deletePending ? '#b91c1c' : '#dc2626',
                    color: 'white',
                    border: 'none',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    transition: 'all 0.2s'
                  }}
                >
                  {deletePending ? 'Are you sure?' : 'Delete Card'}
                </button>
              </div>
              </div>
          </div>
        </div>
      )}
    </div>
  )
}