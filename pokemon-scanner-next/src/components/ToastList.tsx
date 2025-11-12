"use client"

import React from 'react'

type ToastType = 'info' | 'success' | 'error'
type Toast = { id: number; message: string; type: ToastType }

export default function ToastList({ toasts, onRemove }: { toasts: Toast[]; onRemove: (id: number) => void }) {
  return (
    <div style={{ position: 'fixed', right: 20, bottom: 20, zIndex: 9999, display: 'flex', flexDirection: 'column', gap: 10 }}>
      {toasts.map((t) => (
        <div
          key={t.id}
          onClick={() => onRemove(t.id)}
          style={{
            minWidth: 220,
            maxWidth: 420,
            padding: '10px 14px',
            borderRadius: 10,
            color: 'white',
            background: t.type === 'success' ? '#16a34a' : t.type === 'error' ? '#dc2626' : '#2563eb',
            boxShadow: '0 6px 20px rgba(0,0,0,0.18)',
            cursor: 'pointer',
            whiteSpace: 'pre-wrap'
          }}
        >
          {t.message}
        </div>
      ))}
    </div>
  )
}
