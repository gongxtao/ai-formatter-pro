import React, { useEffect, useState, useCallback } from 'react'

interface ImageResizerProps {
  target: HTMLImageElement | null
  iframeDoc: Document | null
  onUpdate: () => void
}

export default function ImageResizer({ target, iframeDoc, onUpdate }: ImageResizerProps) {
  const [rect, setRect] = useState<{ top: number, left: number, width: number, height: number } | null>(null)
  const [isResizing, setIsResizing] = useState(false)
  const [currentSize, setCurrentSize] = useState<{ width: number, height: number } | null>(null)

  const updateRect = useCallback(() => {
    if (target && iframeDoc) {
      const domRect = target.getBoundingClientRect()
      const win = iframeDoc.defaultView
      const scrollX = win?.scrollX || 0
      const scrollY = win?.scrollY || 0
      
      setRect({
        top: domRect.top + scrollY,
        left: domRect.left + scrollX,
        width: domRect.width,
        height: domRect.height
      })
    }
  }, [target, iframeDoc])

  useEffect(() => {
    window.requestAnimationFrame(() => {
      updateRect()
    })
    
    if (!target || !iframeDoc) return

    // Listen to events that might shift the image
    const win = iframeDoc.defaultView
    win?.addEventListener('resize', updateRect)
    win?.addEventListener('scroll', updateRect)
    iframeDoc.addEventListener('input', updateRect) // Text changes causing reflow
    
    // ResizeObserver for the image itself
    let ro: ResizeObserver | null = null
    if (typeof ResizeObserver !== 'undefined') {
        ro = new ResizeObserver(updateRect)
        ro.observe(target)
    }

    return () => {
        win?.removeEventListener('resize', updateRect)
        win?.removeEventListener('scroll', updateRect)
        iframeDoc.removeEventListener('input', updateRect)
        ro?.disconnect()
    }
  }, [target, iframeDoc, updateRect])

  if (!target || !rect || !iframeDoc) return null

  const handleMouseDown = (e: React.MouseEvent, direction: string) => {
    e.preventDefault()
    e.stopPropagation()

    setIsResizing(true)
    const startX = e.clientX
    const startY = e.clientY
    const startWidth = rect.width
    const startHeight = rect.height
    const ratio = startWidth / startHeight

    setCurrentSize({ width: Math.round(startWidth), height: Math.round(startHeight) })

    const onMouseMove = (e: MouseEvent) => {
      e.preventDefault()
      e.stopPropagation()
      
      const dx = e.clientX - startX
      const dy = e.clientY - startY
      
      let newWidth = startWidth
      let newHeight = startHeight

      // Corner resizing (Maintain aspect ratio)
      if (['nw', 'ne', 'sw', 'se'].includes(direction)) {
        if (direction.includes('e')) newWidth = startWidth + dx
        if (direction.includes('w')) newWidth = startWidth - dx
        
        // Use width to drive height for aspect ratio
        newWidth = Math.max(20, newWidth)
        newHeight = newWidth / ratio
      }
      // Side resizing (Free resize)
      else {
        if (direction === 'e') newWidth = startWidth + dx
        if (direction === 'w') newWidth = startWidth - dx
        if (direction === 's') newHeight = startHeight + dy
        if (direction === 'n') newHeight = startHeight - dy
        
        newWidth = Math.max(20, newWidth)
        newHeight = Math.max(20, newHeight)
      }

      // Update current size for tooltip
      setCurrentSize({ width: Math.round(newWidth), height: Math.round(newHeight) })

      // Apply to image
      target.style.width = `${newWidth}px`
      target.style.height = `${newHeight}px`
      
      // Force update rect locally to sync overlay
      updateRect()
    }

    const onMouseUp = () => {
      setIsResizing(false)
      setCurrentSize(null)
      iframeDoc.removeEventListener('mousemove', onMouseMove)
      iframeDoc.removeEventListener('mouseup', onMouseUp)
      onUpdate() // Trigger history push
    }

    iframeDoc.addEventListener('mousemove', onMouseMove)
    iframeDoc.addEventListener('mouseup', onMouseUp)
  }

  const handleStyle: React.CSSProperties = {
    position: 'absolute',
    width: '10px',
    height: '10px',
    backgroundColor: '#fff',
    border: '1px solid #3b82f6',
    zIndex: 50,
    pointerEvents: 'auto',
    boxShadow: '0 0 2px rgba(0,0,0,0.2)'
  }

  // Helper to create handles
  const renderHandle = (dir: string, cursor: string, pos: React.CSSProperties) => (
    <div 
      className="resizer-handle"
      style={{ ...handleStyle, ...pos, cursor }} 
      onMouseDown={(e) => handleMouseDown(e, dir)} 
    />
  )

  return (
      <div style={{
          position: 'absolute',
          top: rect.top,
          left: rect.left,
          width: rect.width,
          height: rect.height,
          border: '1px solid #3b82f6',
          pointerEvents: 'none', // Allow clicking through to image
          zIndex: 2147483647 // Max z-index to ensure visibility
      }}>
          {/* Tooltip */}
          {isResizing && currentSize && (
            <div style={{
              position: 'absolute',
              top: -30,
              left: '50%',
              transform: 'translateX(-50%)',
              backgroundColor: 'rgba(0,0,0,0.8)',
              color: 'white',
              padding: '4px 8px',
              borderRadius: '4px',
              fontSize: '12px',
              whiteSpace: 'nowrap',
              pointerEvents: 'none'
            }}>
              {currentSize.width} x {currentSize.height}
            </div>
          )}

          {/* Corner Handles */}
          {renderHandle('nw', 'nw-resize', { top: -6, left: -6 })}
          {renderHandle('ne', 'ne-resize', { top: -6, right: -6 })}
          {renderHandle('sw', 'sw-resize', { bottom: -6, left: -6 })}
          {renderHandle('se', 'se-resize', { bottom: -6, right: -6 })}

          {/* Side Handles */}
          {renderHandle('n', 'n-resize', { top: -6, left: '50%', transform: 'translateX(-50%)' })}
          {renderHandle('s', 's-resize', { bottom: -6, left: '50%', transform: 'translateX(-50%)' })}
          {renderHandle('w', 'w-resize', { left: -6, top: '50%', transform: 'translateY(-50%)' })}
          {renderHandle('e', 'e-resize', { right: -6, top: '50%', transform: 'translateY(-50%)' })}
      </div>
  )
}
