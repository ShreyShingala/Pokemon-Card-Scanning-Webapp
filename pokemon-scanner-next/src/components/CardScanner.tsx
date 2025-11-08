'use client'

import { useState } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { useTheme } from '@/contexts/ThemeContext'

type ViewType = 'confirmation' | 'error' | 'captured_image' | 'bounding_box' | 'cropped_image' | 'ocr_extracted'

interface Match {
  card_name: string
  card_path: string
  similarity: number
}

interface CardData {
  card_data?: {
    id: string
    name: string
    image_large: string
    supertype: string
    subtypes: string[]
    hp: string
    types: string[]
    rarity: string
    artist: string
    set_name: string
    number: string
    attacks?: Array<{
      name: string
      cost: string[]
      damage: string
      description: string
    }>
    abilities?: Array<{
      name: string
      type: string
      text: string
    }>
    weaknesses?: Array<{ type: string; value: string }>
    resistances?: Array<{ type: string; value: string }>
    retreat_cost?: string[]
    flavor_text?: string
  }
  top_matches?: Match[]
}

interface CardScannerProps {
  onBack: () => void
  imageBlob: Blob
  showProcess: boolean
}

export default function CardScanner({ onBack, imageBlob, showProcess }: CardScannerProps) {
  const { user } = useAuth()
  const { isDarkMode } = useTheme()
  const [currentView, setCurrentView] = useState<ViewType | 'loading'>('loading')
  const [currentMatches, setCurrentMatches] = useState<Match[]>([])
  const [currentMatchIndex, setCurrentMatchIndex] = useState(0)
  const [currentCardData, setCurrentCardData] = useState<CardData | null>(null)
  const [errorMessage, setErrorMessage] = useState('')
  const [currentProcessStep, setCurrentProcessStep] = useState(0)
  const [capturedImage, setCapturedImage] = useState<string>('')
  const [bboxImage, setBboxImage] = useState<string>('')
  const [croppedImage, setCroppedImage] = useState<string>('')
  const [ocrImage, setOcrImage] = useState<string>('')
  const [ocrText, setOcrText] = useState<string>('')
  const showProcessPath: ViewType[] = ['captured_image', 'bounding_box', 'cropped_image', 'ocr_extracted', 'confirmation']

  const processImage = async () => {
    try {
      setCurrentView('loading')
      
      const formData = new FormData()
      formData.append('file', imageBlob, 'card.jpg')

      let response;
      if (showProcess) {
        response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/scan_card_extra_info/`, {
          method: 'POST',
          body: formData
        })
      } else {
        response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/scan_card/`, {
          method: 'POST',
          body: formData
        })
      }

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'API request failed')
      }

      const result = await response.json()
      
      if (showProcess) {
        setCapturedImage(result.base_image)
        setBboxImage(result.bbox_image)
        setCroppedImage(result.cropped_image)
        setOcrImage(result.annotated_image)
        
        const cardInfo = result.card_info
        const ocrTextFormatted = `Detected Card Information:
            Name: ${cardInfo.name || 'Not detected'}
            HP: ${cardInfo.hp || 'Not detected'}
            Card Number: ${cardInfo.card_number || 'Not detected'}`
        setOcrText(ocrTextFormatted)
        
        const matches = result.top_matches || []
        const filteredMatches = matches.filter((match: Match) => match.similarity > 0.70)
        setCurrentMatches(filteredMatches)
        setCurrentMatchIndex(0)
        setCurrentCardData({ card_data: result.card_data, top_matches: filteredMatches })
        
        setCurrentProcessStep(0)
        setCurrentView('captured_image')
      } else {
        showConfirmation(result)
      }
    } catch (error) {
      console.error('Processing error:', error)
      showError((error as Error).message || 'Failed to process card. Please try again.')
    }
  }

  const showConfirmation = (data: CardData) => {
    const matches = data.top_matches || []
    const filteredMatches = matches.filter(match => match.similarity > 0.70)
    
    setCurrentMatches(filteredMatches)
    setCurrentCardData(data)
    
    if (filteredMatches.length === 0) {
      showError('No matches found for this card with sufficient confidence (>70%).')
      return
    }
    
    displayCurrentMatch(0, filteredMatches, data)
  }

  const displayCurrentMatch = async (index: number, matches?: Match[], data?: CardData) => {
    const matchesData = matches || currentMatches
    const matchIndex = index

    if (matchIndex >= matchesData.length) {
      showError('No more matches available. Please try scanning again.')
      return
    }
    
    setCurrentMatchIndex(matchIndex)
    
    const match = matchesData[matchIndex]
    const filename = match.card_name
    const parts = filename.split("_")
    const cardNum = parts[parts.length - 1].replace(".jpg", "")
    const setName = parts[parts.length - 2]
    const cardId = `${setName}-${cardNum}`

    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/card/${cardId}`)
      if (response.ok) {
        const fetchedData = await response.json()
        setCurrentCardData(fetchedData)
      }
    } catch (err) {
      console.error('Error fetching card data:', err)
    }
    
    setCurrentView('confirmation')
  }

  const confirmCard = async () => {
    // Check if user is logged in
    if (!user) {
      alert('Please login to add cards to your collection')
      return
    }

    const match = currentMatches[currentMatchIndex]
    const filename = match.card_name
    const parts = filename.split("_")
    const cardNum = parts[parts.length - 1].replace(".jpg", "")
    const setName = parts[parts.length - 2]
    const cardId = `${setName}-${cardNum}`
    
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/add_to_collection/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          card_id: cardId,
          username: user.id,
          quantity: 1
        })
      })
      
      if (!response.ok) {
        throw new Error('Failed to add card to collection')
      }
      
      const result = await response.json()
      
      if (result.success) {
        const action = result.action === 'updated' ? 'updated' : 'added'
        const quantity = result.new_quantity || result.quantity
        
        alert(`Success!\n\nCard ${action} to your collection!\nYou now have ${quantity} of this card.`)
        onBack()
      } else {
        throw new Error(result.error || 'Unknown error')
      }
    } catch (error) {
      console.error('Upload error:', error)
      alert(`Failed to add card to collection:\n${(error as Error).message}`)
      onBack()
    }
  }

  const rejectCard = () => {
    const newIndex = currentMatchIndex + 1
    
    if (newIndex >= currentMatches.length) {
      alert('No more matches available.')
      onBack()
      return
    }
    
    displayCurrentMatch(newIndex)
  }

  const showError = (message: string) => {
    setErrorMessage(message)
    setCurrentView('error')
  }

  const handleConfirm = () => {
    const nextStep = currentProcessStep + 1
    setCurrentProcessStep(nextStep)
    
    if (nextStep < showProcessPath.length) {
      setCurrentView(showProcessPath[nextStep])
    } else {
      if (currentMatches.length > 0) {
        displayCurrentMatch(0)
      }
    }
  }

  // Process the image on mount
  useState(() => {
    processImage()
  })
  // Loading View
  if (currentView === 'loading') {
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
        <p style={{ fontSize: '1.3em', marginTop: '20px', color: isDarkMode ? '#f1f5f9' : '#1e293b' }}>Analyzing card...</p>
      </div>
    )
  }

  // Captured Image View
  if (currentView === 'captured_image') {
    return (
      <div className="view active" style={{ 
        textAlign: 'center', 
        padding: '40px',
        background: isDarkMode ? '#1e293b' : 'white'
      }}>
        <h2 style={{ color: isDarkMode ? '#f1f5f9' : '#1e293b' }}>Captured Image</h2>
        <p style={{ color: isDarkMode ? '#94a3b8' : '#64748b', marginBottom: '20px' }}>This is the image we'll scan for Pokemon cards</p>
        <div className="image-container" style={{ maxWidth: '600px', margin: '0 auto 30px' }}>
          <img src={capturedImage} alt="Captured" style={{ width: '100%', borderRadius: '10px', boxShadow: '0 4px 6px rgba(0,0,0,0.1)' }} />
        </div>
        <div className="controls" style={{ display: 'flex', gap: '15px', justifyContent: 'center' }}>
          <button onClick={onBack} className="control-button cancel">Go Back</button>
          <button onClick={handleConfirm} className="control-button primary">Continue</button>
        </div>
      </div>
    )
  }

  // Bounding Box View
  if (currentView === 'bounding_box') {
    return (
      <div className="view active" style={{ 
        textAlign: 'center', 
        padding: '40px',
        background: isDarkMode ? '#1e293b' : 'white'
      }}>
        <h2 style={{ color: isDarkMode ? '#f1f5f9' : '#1e293b' }}>Card Detection</h2>
        <p style={{ color: isDarkMode ? '#94a3b8' : '#64748b', marginBottom: '20px' }}>The card was detected in the image with a bounding box</p>
        <div className="image-container" style={{ maxWidth: '600px', margin: '0 auto 30px' }}>
          <img src={bboxImage} alt="Bounding Box" style={{ width: '100%', borderRadius: '10px', boxShadow: '0 4px 6px rgba(0,0,0,0.1)' }} />
        </div>
        <div className="controls" style={{ display: 'flex', gap: '15px', justifyContent: 'center' }}>
          <button onClick={onBack} className="control-button cancel">Go Back</button>
          <button onClick={handleConfirm} className="control-button primary">Continue</button>
        </div>
      </div>
    )
  }

  // Cropped Image View
  if (currentView === 'cropped_image') {
    return (
      <div className="view active" style={{ 
        textAlign: 'center', 
        padding: '40px',
        background: isDarkMode ? '#1e293b' : 'white'
      }}>
        <h2 style={{ color: isDarkMode ? '#f1f5f9' : '#1e293b' }}>Cropped Card</h2>
        <p style={{ color: isDarkMode ? '#94a3b8' : '#64748b', marginBottom: '20px' }}>The card has been cropped from the image</p>
        <div className="image-container" style={{ maxWidth: '400px', margin: '0 auto 30px' }}>
          <img src={croppedImage} alt="Cropped Card" style={{ width: '100%', borderRadius: '10px', boxShadow: '0 4px 6px rgba(0,0,0,0.1)' }} />
        </div>
        <div className="controls" style={{ display: 'flex', gap: '15px', justifyContent: 'center' }}>
          <button onClick={onBack} className="control-button cancel">Go Back</button>
          <button onClick={handleConfirm} className="control-button primary">Continue</button>
        </div>
      </div>
    )
  }

  // OCR Extracted View
  if (currentView === 'ocr_extracted') {
    return (
      <div className="view active" style={{ 
        textAlign: 'center', 
        padding: '40px',
        background: isDarkMode ? '#1e293b' : 'white'
      }}>
        <h2 style={{ color: isDarkMode ? '#f1f5f9' : '#1e293b' }}>Text Extraction (OCR)</h2>
        <p style={{ color: isDarkMode ? '#94a3b8' : '#64748b', marginBottom: '20px' }}>Text has been extracted from the card</p>
        <div style={{ maxWidth: '800px', margin: '0 auto' }}>
          <div className="image-container" style={{ maxWidth: '400px', margin: '0 auto 20px' }}>
            <img src={ocrImage} alt="OCR Annotated Image" style={{ width: '100%', borderRadius: '10px', boxShadow: '0 4px 6px rgba(0,0,0,0.1)' }} />
          </div>
          <div style={{ 
            background: isDarkMode ? '#334155' : '#f1f5f9', 
            padding: '20px', 
            borderRadius: '10px', 
            marginBottom: '30px' 
          }}>
            <pre style={{ 
              textAlign: 'left', 
              margin: 0, 
              fontSize: '0.95rem', 
              whiteSpace: 'pre-wrap',
              color: isDarkMode ? '#e5e7eb' : '#1e293b'
            }}>{ocrText}</pre>
          </div>
        </div>
        <div className="controls" style={{ display: 'flex', gap: '15px', justifyContent: 'center' }}>
          <button onClick={onBack} className="control-button cancel">Go Back</button>
          <button onClick={handleConfirm} className="control-button primary">Continue to Matching</button>
        </div>
      </div>
    )
  }

  // Confirmation View
  if (currentView === 'confirmation') {
    const match = currentMatches[currentMatchIndex]
    const filename = match?.card_name || ''
    const parts = filename.split("_")
    const cardNum = parts[parts.length - 1]?.replace(".jpg", "") || ''
    const setName = parts[parts.length - 2] || ''

    return (
      <div className="view active" style={{ 
        maxWidth: '800px', 
        margin: '0 auto',
        width: '100%',
        boxSizing: 'border-box',
        padding: '15px',
        textAlign: 'center',
        background: isDarkMode ? '#1e293b' : 'white'
      }}>
        <h2 style={{ color: isDarkMode ? '#f1f5f9' : '#1e293b' }}>Is this your card?</h2>
        <div className="confirmation-container">
          <div className="match-info">
            <p><strong>Card {currentMatchIndex + 1} of {currentMatches.length}</strong></p>
            <p className="similarity-score">Confidence: {((match?.similarity || 0) * 100).toFixed(2)}%</p>
            {currentMatches.length > 1 && (
              <p style={{ fontSize: '0.9rem', color: isDarkMode ? '#94a3b8' : '#64748b', marginTop: '5px' }}>
                Reviewing Cards
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
              src={currentCardData?.card_data?.image_large || 'https://via.placeholder.com/400x560?text=Loading...'}
              alt={currentCardData?.card_data?.name || match?.card_name || 'Card'}
              style={{ maxHeight: '400px', width: 'auto', objectFit: 'contain' }}
            />
          </div>
          
          <div className="card-details" style={{ textAlign: 'center' }}>
            <h3>{currentCardData?.card_data?.name || match?.card_name.replace(/_/g, ' ').replace('.jpg', '') || 'Unknown Card'}</h3>
            <p>{setName} • #{cardNum}</p>
          </div>
          
          <div className="confirmation-buttons">
            <button onClick={rejectCard} className="confirm-btn no-btn">
              {currentMatchIndex + 1 < currentMatches.length ? 'Skip' : 'No'}
            </button>
            <button onClick={confirmCard} className="confirm-btn yes-btn">
              {currentMatchIndex + 1 < currentMatches.length ? 'Add & Next' : 'Yes'}
            </button>
          </div>
          
          <div style={{ marginTop: '20px', textAlign: 'center' }}>
            <button 
              onClick={onBack} 
              className="control-button cancel"
              style={{ fontSize: '0.9em', padding: '8px 20px' }}
            >
              Stop & Return to Menu
            </button>
          </div>
        </div>
      </div>
    )
  }

  // Error View
  if (currentView === 'error') {
    return (
      <div className="view active" style={{ textAlign: 'center', padding: '60px 40px' }}>
        <div className="error-container">
          <h2>Error</h2>
          <p id="errorMessage">{errorMessage}</p>
          <button onClick={onBack} className="control-button primary">Go Back</button>
        </div>
      </div>
    )
  }

  return null
}
