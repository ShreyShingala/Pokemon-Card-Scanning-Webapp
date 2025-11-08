'use client'

import { useState, useRef } from 'react'
import MultiCardScanner from '@/components/MultiCardScanner'
import { useTheme } from '@/contexts/ThemeContext'

export default function UploadPage() {
  const { isDarkMode } = useTheme()
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string>('')
  const [isScanning, setIsScanning] = useState(false)
  const [showProcess, setShowProcess] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file && (file.type.startsWith('image/') || file.name.toLowerCase().endsWith('.heic') || file.name.toLowerCase().endsWith('.heif'))) {
      setSelectedFile(file)
      setPreviewUrl(URL.createObjectURL(file))
    }
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    const file = e.dataTransfer.files?.[0]
    if (file && (file.type.startsWith('image/') || file.name.toLowerCase().endsWith('.heic') || file.name.toLowerCase().endsWith('.heif'))) {
      setSelectedFile(file)
      setPreviewUrl(URL.createObjectURL(file))
    }
  }

  const handleScan = () => {
    if (selectedFile) {
      setIsScanning(true)
    }
  }

  const handleBack = () => {
    setIsScanning(false)
    setSelectedFile(null)
    setPreviewUrl('')
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const clearSelection = () => {
    setSelectedFile(null)
    setPreviewUrl('')
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  // Scanning View - delegate to MultiCardScanner
  if (isScanning && selectedFile) {
    return (
      <div className="container">
        <MultiCardScanner onBack={handleBack} imageBlob={selectedFile} showProcess={showProcess} />
      </div>
    )
  }

  return (
    <div className="container">
      <div className="view active" style={{ 
        padding: '40px',
        background: isDarkMode ? '#1e293b' : 'white'
      }}>
        <h2 style={{ textAlign: 'center', color: isDarkMode ? '#f1f5f9' : '#1e293b' }}>Scan Pokemon Cards</h2>
        <p style={{ fontSize: '1.2rem', color: isDarkMode ? '#94a3b8' : '#64748b', marginBottom: '30px', textAlign: 'center' }}>
          Upload a photo of your Pokemon cards (works with binder pages!)
        </p>

      <div style={{ maxWidth: '600px', margin: '0 auto' }}>
        {/* File upload area */}
        <div 
          onDragOver={handleDragOver}
          onDrop={handleDrop}
          style={{ 
            border: `2px dashed ${isDarkMode ? '#475569' : '#cbd5e1'}`, 
            borderRadius: '10px', 
            padding: '40px', 
            marginBottom: '20px',
            cursor: previewUrl ? 'default' : 'pointer',
            transition: 'border-color 0.3s',
            background: previewUrl ? (isDarkMode ? '#334155' : '#f8fafc') : 'transparent'
          }}
          onClick={() => !previewUrl && fileInputRef.current?.click()}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*,.heic,.heif"
            onChange={handleFileSelect}
            style={{ display: 'none' }}
          />
          {previewUrl ? (
            <div style={{ textAlign: 'center' }}>
              <img 
                src={previewUrl} 
                alt="Preview" 
                style={{ maxWidth: '100%', maxHeight: '400px', borderRadius: '8px' }}
              />
            </div>
          ) : (
            <div style={{ textAlign: 'center' }}>
              <p style={{ fontSize: '1.1rem', marginBottom: '10px', fontWeight: '500', color: isDarkMode ? '#f1f5f9' : '#1e293b' }}>Click to select an image</p>
              <p style={{ fontSize: '0.9rem', color: isDarkMode ? '#cbd5e1' : '#94a3b8' }}>or drag and drop</p>
              <p style={{ fontSize: '0.85rem', color: isDarkMode ? '#94a3b8' : '#cbd5e1', marginTop: '10px' }}>Supports: JPG, PNG, WEBP, HEIC, HEIF</p>
            </div>
          )}
        </div>

        {/* Choose Different Image Button */}
        {previewUrl && (
          <div style={{ textAlign: 'center', marginBottom: '20px' }}>
            <button 
              onClick={clearSelection}
              className="control-button cancel"
              style={{ fontSize: '0.9em', padding: '8px 20px' }}
            >
              Choose Different Image
            </button>
          </div>
        )}

        {/* Show Process Toggle */}
        {selectedFile && (
          <div style={{ marginBottom: '20px', textAlign: 'center' }}>
            <label 
              style={{ 
                display: 'inline-flex', 
                alignItems: 'center', 
                gap: '10px',
                padding: '10px 20px',
                background: showProcess ? '#2563EB' : (isDarkMode ? '#334155' : '#e2e8f0'),
                color: showProcess ? '#ffffff' : (isDarkMode ? '#e5e7eb' : '#475569'),
                borderRadius: '8px',
                cursor: 'pointer',
                fontSize: '0.95rem',
                fontWeight: '500',
                transition: 'all 0.3s ease',
                userSelect: 'none'
              }}
            >
              <input 
                type="checkbox" 
                checked={showProcess}
                onChange={(e) => setShowProcess(e.target.checked)}
                style={{ 
                  width: '18px', 
                  height: '18px', 
                  cursor: 'pointer',
                  accentColor: '#2563EB'
                }}
              />
              <span>Show Process Steps</span>
            </label>
          </div>
        )}

        {/* Scan Button */}
        {selectedFile && (
          <div style={{ textAlign: 'center' }}>
            <button 
              onClick={handleScan}
              className="scan-button"
            >
              Scan Cards
            </button>
          </div>
        )}
      </div>
    </div>
    </div>
  )
}
