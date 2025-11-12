'use client'

import { useRef, useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useTheme } from '@/contexts/ThemeContext'
import CardScanner from '@/components/CardScanner'
import { useToast } from '@/contexts/ToastContext'

export default function ScanPage() {
  const router = useRouter()
  const { isDarkMode } = useTheme()
  const { showToast } = useToast()
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [stream, setStream] = useState<MediaStream | null>(null)
  const [showProcess, setShowProcess] = useState(false)
  const [capturedBlob, setCapturedBlob] = useState<Blob | null>(null)
  const [isScanning, setIsScanning] = useState(false)

  // Start camera on mount
  useEffect(() => {
    startCamera()
    
    // Cleanup: stop camera when unmounting or navigating away
    return () => {
 
      if (videoRef.current) {
        videoRef.current.srcObject = null
      }
      

      if (stream) {
        stream.getTracks().forEach(track => {
          track.stop()
          console.log('Cleanup: stopped', track.label)
        })
      }
    }
  }, [])

  const startCamera = async () => {
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { 
          facingMode: 'environment',
          width: { ideal: 1280 },
          height: { ideal: 720 }
        }
      })
      
      setStream(mediaStream)
      
      // Set video source - autoPlay prop will handle playing
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream
      }
    } catch (error) {
      console.error('Camera access error:', error)
      showToast('Could not access camera. Please grant camera permissions.', 'error')
      router.push('/')
    }
  }

  const stopCamera = () => {
    console.log('stopCamera called')
    
    // Clear video element FIRST to prevent play errors
    if (videoRef.current) {
      videoRef.current.srcObject = null
    }
    
    // Stop all tracks
    if (stream) {
      stream.getTracks().forEach(track => {
        track.stop()
        console.log('Camera track stopped:', track.label)
      })
      setStream(null)
    }
  }

  const captureImage = async (): Promise<Blob | null> => {
    if (!videoRef.current || !canvasRef.current) {
      console.error('Video or canvas ref is null')
      return null
    }

    const video = videoRef.current
    const canvas = canvasRef.current
    
    if (video.videoWidth === 0 || video.videoHeight === 0) {
      console.error('Video has no dimensions')
      return null
    }
    
    const context = canvas.getContext('2d')
    if (!context) {
      console.error('Could not get canvas context')
      return null
    }

    canvas.width = video.videoWidth
    canvas.height = video.videoHeight
    context.drawImage(video, 0, 0)

    return new Promise((resolve) => {
      canvas.toBlob((blob) => {
        resolve(blob)
      }, 'image/jpeg', 0.95)
    })
  }

  const handleCapture = async () => {
    try {
      const imageBlob = await captureImage()
      stopCamera()
      
      if (!imageBlob) {
        throw new Error('Failed to capture image from camera')
      }
      
      setCapturedBlob(imageBlob)
      setIsScanning(true)
    } catch (error) {
      console.error('Capture error:', error)
      showToast((error as Error).message || 'Failed to capture image. Please try again.', 'error')
      startCamera()
    }
  }

  const handleBackFromScanner = () => {
    stopCamera()
    setCapturedBlob(null)
    setIsScanning(false)
    router.push('/')
  }

  const handleCancel = () => {
    stopCamera()
    router.push('/')
  }

  // Scanning View - delegate to CardScanner
  if (isScanning && capturedBlob) {
    return <CardScanner onBack={handleBackFromScanner} imageBlob={capturedBlob} showProcess={showProcess} />
  }

  // Camera View
  return (
    <div className="container">
      <div className="view active">
        <h2 style={{ textAlign: 'center' }}>Capture Your Pokemon Card</h2>
        <p style={{ textAlign: 'center', fontSize: '0.9rem', marginTop: '-10px', marginBottom: '20px' }}>
          (Single cards only, for multiple use upload image)
        </p>
        <div className="camera-container">
          <video ref={videoRef} autoPlay playsInline id="videoElement" />
          <canvas ref={canvasRef} style={{ display: 'none' }} id="canvas" />
        </div>
        <div className="camera-controls">
          <button onClick={handleCancel} className="control-button cancel">Cancel</button>
          <button onClick={handleCapture} className="control-button capture">Capture</button>
        </div>
        <div style={{ marginTop: '20px', textAlign: 'center' }}>
          <label 
            style={{ 
              display: 'inline-flex', 
              alignItems: 'center', 
              gap: '10px',
              padding: '10px 20px',
              background: showProcess ? '#2563EB' : (isDarkMode ? '#334155' : '#e2e8f0'),
              color: showProcess ? '#ffffff' : (isDarkMode ? '#CBD5E1' : '#475569'),
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
      </div>
    </div>
  )
}
