'use client'

import { useState } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { useTheme } from '@/contexts/ThemeContext'
import { useToast } from '@/contexts/ToastContext'

interface DetectedCard {
  card_number: number
  detection_confidence: number
  card_id: string
  card_name: string
  similarity: number
  set_name: string
  card_number_in_set: string
  cropped_image: string
  bbox: number[]
  card_data: any
  ocr_info?: any
  all_matches?: Array<{
    rank: number
    card_id: string
    card_name: string
    similarity: number
    set_name: string
    card_number_in_set: string
    card_data: any
  }>
}

interface ScanResult {
  success: boolean
  total_detected: number
  successfully_processed: number
  failed: number
  detection_image: string
  cards: DetectedCard[]
  failed_cards?: Array<{
    card_number: number
    error: string
    confidence: number
  }>
}

interface MultiCardScannerProps {
  onBack: () => void
  imageBlob: Blob
  showProcess: boolean
}

export default function MultiCardScanner({ onBack, imageBlob, showProcess }: MultiCardScannerProps) {
  const { user } = useAuth()
  const { isDarkMode } = useTheme()
  const { showToast } = useToast()
  const [isScanning, setIsScanning] = useState(true)
  const [scanResult, setScanResult] = useState<ScanResult | null>(null)
  const [error, setError] = useState<string>('')
  const [currentCardIndex, setCurrentCardIndex] = useState(0)
  const [addedCards, setAddedCards] = useState<Set<number>>(new Set())
  const [skippedCards, setSkippedCards] = useState<Set<number>>(new Set())
  const [showingProcess, setShowingProcess] = useState(false)
  // Track which match variant we're showing for each card
  const [currentVariantIndex, setCurrentVariantIndex] = useState<Map<number, number>>(new Map())

  const processImage = async () => {
    try {
      setIsScanning(true)
      const apiBase = (process.env.NEXT_PUBLIC_API_URL || '').replace('0.0.0.0', '127.0.0.1')

      const formData = new FormData()
      formData.append('file', imageBlob, 'cards.jpg')

      const response = await fetch(`${apiBase}/scan_multiple_cards/`, {
        method: 'POST',
        body: formData
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to scan cards')
      }

      const result: ScanResult = await response.json()
      
      if (!result.success || result.cards.length === 0) {
        throw new Error(result.failed_cards?.[0]?.error || 'No cards detected with sufficient confidence')
      }

      setScanResult(result)
      setIsScanning(false)
      setCurrentCardIndex(0)
      
      // If showProcess is true, show the process view first
      if (showProcess) {
        setShowingProcess(true)
      }
    } catch (err) {
      console.error('Scanning error:', err)
      setError((err as Error).message || 'Failed to scan cards')
      setIsScanning(false)
    }
  }

  const addCurrentCard = async () => {
    if (!user) {
      showToast('Please login to add cards to your collection', 'info')
      return
    }

    if (!scanResult) return

    const card = scanResult.cards[currentCardIndex]
    const variantIdx = currentVariantIndex.get(currentCardIndex) || 0
    
    // Get the current variant (or default to best match if no variants)
    let cardToAdd = card
    if (card.all_matches && card.all_matches.length > 0) {
      const variant = card.all_matches[variantIdx]
      cardToAdd = {
        ...card,
        card_id: variant.card_id,
        card_name: variant.card_name,
        similarity: variant.similarity,
        set_name: variant.set_name,
        card_number_in_set: variant.card_number_in_set,
        card_data: variant.card_data
      }
    }
    
    try {
      const apiBase = (process.env.NEXT_PUBLIC_API_URL || '').replace('0.0.0.0', '127.0.0.1')

      const response = await fetch(`${apiBase}/add_to_collection/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          card_id: cardToAdd.card_id,
          username: user.id,
          quantity: 1
        })
      })
      
      if (!response.ok) {
        throw new Error('Failed to add card to collection')
      }
      
      const result = await response.json()
      
      if (result.success) {
        setAddedCards(prev => new Set([...prev, currentCardIndex]))
        
        // Reset variant index for this card and move to next card
        setCurrentVariantIndex(prev => {
          const newMap = new Map(prev)
          newMap.delete(currentCardIndex)
          return newMap
        })
        
        // Move to next card
        if (currentCardIndex + 1 < scanResult.cards.length) {
          setCurrentCardIndex(currentCardIndex + 1)
        } else {
          // All cards processed
          showSummary()
        }
      } else {
        throw new Error(result.error || 'Unknown error')
      }
    } catch (err) {
      console.error('Add card error:', err)
      showToast(`Failed to add card:\n${(err as Error).message}`, 'error')
    }
  }

  const skipCurrentCard = () => {
    if (!scanResult) return
    
    const card = scanResult.cards[currentCardIndex]
    const currentVariant = currentVariantIndex.get(currentCardIndex) || 0
    const totalVariants = card.all_matches?.length || 1
    
    // If there are more variants to show, show the next one
    if (currentVariant + 1 < totalVariants) {
      setCurrentVariantIndex(prev => {
        const newMap = new Map(prev)
        newMap.set(currentCardIndex, currentVariant + 1)
        return newMap
      })
    } else {
      // No more variants - skip this card entirely and move to next
      setSkippedCards(prev => new Set([...prev, currentCardIndex]))
      
      // Reset variant index for this card
      setCurrentVariantIndex(prev => {
        const newMap = new Map(prev)
        newMap.delete(currentCardIndex)
        return newMap
      })
      
      // Move to next card
      if (currentCardIndex + 1 < scanResult.cards.length) {
        setCurrentCardIndex(currentCardIndex + 1)
      } else {
        // All cards processed
        showSummary()
      }
    }
  }

  const showSummary = () => {
    const totalCards = scanResult?.cards.length || 0
    const added = addedCards.size
    const skipped = skippedCards.size
    
    showToast(`Scanning Complete!\n\nAdded: ${added} cards\nSkipped: ${skipped} cards\nTotal detected: ${totalCards} cards`, 'info')
    onBack()
  }

  const goToCard = (index: number) => {
    setCurrentCardIndex(index)
  }
  
  const startReviewing = () => {
    setShowingProcess(false)
    setCurrentCardIndex(0)
  }

  // Process image on mount
  useState(() => {
    processImage()
  })

  // Loading state
  if (isScanning) {
    return (
      <div className="view active" style={{ 
        textAlign: 'center', 
        padding: '80px 40px',
        width: '100%',
        maxWidth: '800px',
        minHeight: '500px',
        margin: '0 auto',
        display: 'flex', 
        flexDirection: 'column', 
        alignItems: 'center', 
        justifyContent: 'center',
        boxSizing: 'border-box',
        background: isDarkMode ? '#1e293b' : 'white'
      }}>
        <div className="spinner"></div>
        <p style={{ fontSize: '1.3em', marginTop: '20px', color: isDarkMode ? '#f1f5f9' : '#1e293b' }}>Scanning multiple cards...</p>
        <p style={{ fontSize: '0.9rem', color: isDarkMode ? '#94a3b8' : '#64748b', marginTop: '10px' }}>
          This may take a moment for binder pages
        </p>
      </div>
    )
  }

  // Error state
  if (error) {
    return (
      <div className="view active" style={{ 
        textAlign: 'center', 
        padding: '60px 40px',
        background: isDarkMode ? '#1e293b' : 'white'
      }}>
        <div className="error-container">
          <h2>Error</h2>
          <p>{error}</p>
          <button onClick={onBack} className="control-button primary">Go Back</button>
        </div>
      </div>
    )
  }

  // Display detected cards
  if (scanResult && showingProcess) {
    return (
      <div className="view active" style={{ 
        padding: '40px',
        background: isDarkMode ? '#1e293b' : 'white',
        maxWidth: '100%',
        margin: '0 auto'
      }}>
        <h2 style={{ textAlign: 'center', marginBottom: '10px', color: isDarkMode ? '#f1f5f9' : '#1e293b' }}>Detection Results</h2>
        <p style={{ textAlign: 'center', color: isDarkMode ? '#94a3b8' : '#64748b', marginBottom: '12px' }}>
          Detected {scanResult.total_detected} card(s) • {scanResult.successfully_processed} processed successfully
        </p>

        {/* Wrap everything that can overflow on small screens in a scrollable container */}
        <div className="detection-results">
          {/* Detection Image with Bounding Boxes */}
          <div style={{ maxWidth: '800px', margin: '0 auto 20px' }}>
            <h3 style={{ marginBottom: '12px' }}>All Detected Cards</h3>
            <img 
              src={scanResult.detection_image} 
              alt="Detection Results" 
              style={{ 
                width: '100%', 
                borderRadius: '10px', 
                boxShadow: '0 4px 6px rgba(0,0,0,0.1)' 
              }} 
            />
          </div>

          {/* Individual Cards */}
          <div style={{ maxWidth: '1200px', margin: '0 auto', paddingBottom: '12px' }}>
            <h3 style={{ marginBottom: '16px' }}>Individual Cards</h3>
            <div style={{ 
              display: 'grid', 
              gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', 
              gap: '16px',
              marginBottom: '16px'
            }}>
              {scanResult.cards.map((card, idx) => (
                <div 
                  key={idx}
                  style={{
                    border: `1px solid ${isDarkMode ? '#334155' : '#e2e8f0'}`,
                    borderRadius: '10px',
                    padding: '12px',
                    background: isDarkMode ? '#1e293b' : 'white',
                    transition: 'all 0.3s'
                  }}
                >
                  <div style={{ position: 'relative' }}>
                    <img 
                      src={card.cropped_image} 
                      alt={`Card ${idx + 1}`}
                      style={{ 
                        width: '100%', 
                        borderRadius: '8px',
                        marginBottom: '8px'
                      }}
                    />
                  </div>
                  <p style={{ fontWeight: 'bold', fontSize: '0.9rem', marginBottom: '6px' }}>
                    Card #{idx + 1}
                  </p>
                  <p style={{ fontSize: '0.85rem', color: '#64748b' }}>
                    Detection: {(card.detection_confidence * 100).toFixed(1)}%
                  </p>
                  <p style={{ fontSize: '0.85rem', color: '#64748b' }}>
                    Match: {(card.similarity * 100).toFixed(1)}%
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="detection-actions">
          <button onClick={onBack} className="control-button cancel">
            Go Back
          </button>
          <button onClick={startReviewing} className="control-button primary">
            Review Cards One by One
          </button>
        </div>
      </div>
    )
  }

  // Card review/confirmation mode
  if (scanResult && scanResult.cards.length > 0) {
    const card = scanResult.cards[currentCardIndex]
    const variantIdx = currentVariantIndex.get(currentCardIndex) || 0
    const totalVariants = card.all_matches?.length || 1
    
    // Get the current variant to display (or use best match if no variants)
    let displayCard = card
    if (card.all_matches && card.all_matches.length > 0) {
      const variant = card.all_matches[variantIdx]
      displayCard = {
        ...card,
        card_id: variant.card_id,
        card_name: variant.card_name,
        similarity: variant.similarity,
        set_name: variant.set_name,
        card_number_in_set: variant.card_number_in_set,
        card_data: variant.card_data
      }
    }
    
    const progress = `${currentCardIndex + 1} / ${scanResult.cards.length}`
    const isProcessed = addedCards.has(currentCardIndex) || skippedCards.has(currentCardIndex)

    return (
      <div className="view active final-add-view" style={{ 
        maxWidth: '800px', 
        margin: '0 auto',
        width: '100%',
        boxSizing: 'border-box',
        padding: '15px',
        background: isDarkMode ? '#1e293b' : 'white'
      }}>
        <div style={{ textAlign: 'center', marginBottom: '5px' }}>
          <h2 style={{ fontSize: '1.3em', marginBottom: '5px', color: isDarkMode ? '#f1f5f9' : '#1e293b' }}>Review Card {progress}</h2>
          <p style={{ color: isDarkMode ? '#94a3b8' : '#64748b', fontSize: '0.75rem', marginBottom: '2px' }}>
            Added: {addedCards.size} • Skipped: {skippedCards.size} • Remaining: {scanResult.cards.length - addedCards.size - skippedCards.size}
          </p>
          {totalVariants > 1 && (
            <p style={{ color: '#8b5cf6', fontSize: '0.7rem', marginTop: '2px', fontWeight: 'bold' }}>
              Showing Match {variantIdx + 1} of {totalVariants}
            </p>
          )}
        </div>

        <div className="confirmation-container final-add">
          <div className="final-add-content">
            <div className="match-info" style={{ marginBottom: '5px' }}>
            <p style={{ fontSize: '0.8rem', marginBottom: '2px' }}><strong>Detection Confidence: {(card.detection_confidence * 100).toFixed(1)}%</strong></p>
            <p className="similarity-score" style={{ fontSize: '0.8rem', marginBottom: '2px' }}>Match Confidence: {(displayCard.similarity * 100).toFixed(2)}%</p>
            {totalVariants > 1 && (
              <p style={{ fontSize: '0.7rem', color: isDarkMode ? '#94a3b8' : '#64748b', marginTop: '2px' }}>
                {variantIdx + 1 < totalVariants 
                  ? `Click "Skip" to see next match variant (${totalVariants - variantIdx - 1} more available)`
                  : 'This is the last match variant'}
              </p>
            )}
            {isProcessed && (
              <p style={{ 
                marginTop: '3px', 
                padding: '4px 8px', 
                borderRadius: '4px',
                background: addedCards.has(currentCardIndex) ? '#dcfce7' : '#fee2e2',
                color: addedCards.has(currentCardIndex) ? '#166534' : '#991b1b',
                fontWeight: 'bold',
                fontSize: '0.8rem'
              }}>
                {addedCards.has(currentCardIndex) ? '✓ Already Added' : 'Skipped'}
              </p>
            )}
            </div>
            
            <div className="card-image-container" style={{ 
            maxHeight: '400px',
            maxWidth: '300px',
            margin: '0 auto',
            display: 'flex', 
            justifyContent: 'center', 
            alignItems: 'center',
            background: 'transparent',
            boxShadow: 'none',
            overflow: 'visible'
          }}>
            <img 
              src={displayCard.card_data?.image_large || card.cropped_image}
              alt={displayCard.card_data?.name || displayCard.card_name}
              style={{ maxHeight: '400px', width: 'auto', objectFit: 'contain' }}
            />
            </div>
            
            <div className="card-details" style={{ textAlign: 'center', marginBottom: '2px' }}>
            <h3 style={{ fontSize: '1em', marginBottom: '1px' }}>{displayCard.card_data?.name || displayCard.card_name.replace(/_/g, ' ').replace('.jpg', '')}</h3>
            <p style={{ fontSize: '0.8rem', marginBottom: '1px' }}>{displayCard.set_name} • #{displayCard.card_number_in_set}</p>
            {displayCard.card_data?.hp && <p style={{ fontSize: '0.8rem', marginBottom: '1px' }}>HP: {displayCard.card_data.hp}</p>}
            {displayCard.card_data?.types && (
              <p style={{ marginTop: '1px', fontSize: '0.8rem' }}>
                {displayCard.card_data.types.join(', ')}
              </p>
            )}
            </div>
            
            <div className="confirmation-buttons" style={{ 
              display: 'flex', 
              gap: '10px', 
              justifyContent: 'center',
              marginBottom: '8px'
            }}>
            <button 
              onClick={skipCurrentCard} 
              className="confirm-btn no-btn"
              disabled={isProcessed}
              style={{ opacity: isProcessed ? 0.5 : 1 }}
            >
              Skip
            </button>
            <button 
              onClick={addCurrentCard} 
              className="confirm-btn yes-btn"
              disabled={isProcessed}
              style={{ opacity: isProcessed ? 0.5 : 1 }}
            >
              {addedCards.has(currentCardIndex) ? 'Added ✓' : 'Add to Collection'}
            </button>
            </div>

            {/* Navigation */}
            <div style={{ display: 'flex', gap: '10px', justifyContent: 'center', marginBottom: '8px' }}>
              <button
                onClick={() => setCurrentCardIndex(Math.max(0, currentCardIndex - 1))}
                disabled={currentCardIndex === 0}
                className="control-button"
                style={{ 
                  padding: '8px 16px',
                  opacity: currentCardIndex === 0 ? 0.5 : 1
                }}
              >
                ← Previous
              </button>
              <button
                onClick={() => setCurrentCardIndex(Math.min(scanResult.cards.length - 1, currentCardIndex + 1))}
                disabled={currentCardIndex === scanResult.cards.length - 1}
                className="control-button"
                style={{ 
                  padding: '8px 16px',
                  opacity: currentCardIndex === scanResult.cards.length - 1 ? 0.5 : 1
                }}
              >
                Next →
              </button>
            </div>
          </div>

          <div className="final-add-footer">
            <div className="detection-actions">
              <button 
                onClick={onBack} 
                className="control-button cancel"
              >
                Cancel &amp; Go Back
              </button>
              <button 
                onClick={showSummary} 
                className="control-button primary"
              >
                Finish &amp; See Summary
              </button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return null
}
