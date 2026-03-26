import React, { useCallback, useEffect, useRef, useState } from 'react'
import Image from 'next/image'

export interface FloatingImageItem {
  id: string
  src: string
  x: number
  y: number
  width: number
  height: number
}

interface FloatingImageLayerProps {
  images: FloatingImageItem[]
  onChange: (images: FloatingImageItem[]) => void
  isEditing: boolean
  selectedId: string | null
  onSelect: (id: string | null) => void
  onCommit?: () => void
  scrollOffset: { x: number; y: number }
}

export default function FloatingImageLayer({
  images,
  onChange,
  isEditing,
  selectedId,
  onSelect,
  onCommit,
  scrollOffset
}: FloatingImageLayerProps) {
  const [isResizing, setIsResizing] = useState(false)
  const [currentSize, setCurrentSize] = useState<{ width: number; height: number } | null>(null)
  const imagesRef = useRef(images)
  const layerRef = useRef<HTMLDivElement | null>(null)
  const ignoreNextGlobalDownRef = useRef(false)
  const dragRafRef = useRef<number | null>(null)
  const dragPendingRef = useRef<{ x: number; y: number } | null>(null)
  const dragStateRef = useRef<{ id: string; startX: number; startY: number; startLeft: number; startTop: number } | null>(null)
  const resizeRafRef = useRef<number | null>(null)
  const resizePendingRef = useRef<{ width: number; height: number; x: number; y: number } | null>(null)
  const resizeStateRef = useRef<{
    id: string
    direction: string
    startX: number
    startY: number
    startWidth: number
    startHeight: number
    startLeft: number
    startTop: number
    ratio: number
  } | null>(null)

  const updateImage = useCallback((id: string, updates: Partial<FloatingImageItem>) => {
    onChange(
      imagesRef.current.map(image =>
        image.id === id ? { ...image, ...updates } : image
      )
    )
  }, [onChange])

  useEffect(() => {
    imagesRef.current = images
  }, [images])

  useEffect(() => {
    if (!isEditing) return

    const handleGlobalMouseDown = (event: MouseEvent) => {
      if (ignoreNextGlobalDownRef.current) {
        ignoreNextGlobalDownRef.current = false
        return
      }

      const target = event.target as Node | null
      if (layerRef.current && target && layerRef.current.contains(target)) {
        return
      }

      onSelect(null)
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onSelect(null)
      }

      if ((event.key === 'Delete' || event.key === 'Backspace') && selectedId) {
        event.preventDefault()
        event.stopPropagation()
        onChange(imagesRef.current.filter(image => image.id !== selectedId))
        onSelect(null)
        onCommit?.()
      }
    }

    window.addEventListener('mousedown', handleGlobalMouseDown, true)
    window.addEventListener('keydown', handleKeyDown, true)
    return () => {
      window.removeEventListener('mousedown', handleGlobalMouseDown, true)
      window.removeEventListener('keydown', handleKeyDown, true)
    }
  }, [isEditing, onSelect, onChange, selectedId, onCommit])

  const handlePointerDown = (e: React.PointerEvent, id: string) => {
    if (!isEditing || e.button !== 0) return
    e.preventDefault()
    e.stopPropagation()
    onSelect(id)
    ignoreNextGlobalDownRef.current = true

    const image = imagesRef.current.find(item => item.id === id)
    if (!image) return

    dragStateRef.current = {
      id,
      startX: e.clientX,
      startY: e.clientY,
      startLeft: image.x,
      startTop: image.y
    }

    e.currentTarget.setPointerCapture(e.pointerId)
  }

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!dragStateRef.current) return
    e.preventDefault()
    e.stopPropagation()

    const { id, startX, startY, startLeft, startTop } = dragStateRef.current
    const dx = e.clientX - startX
    const dy = e.clientY - startY
    dragPendingRef.current = { x: startLeft + dx, y: startTop + dy }

    if (dragRafRef.current === null) {
      dragRafRef.current = window.requestAnimationFrame(() => {
        dragRafRef.current = null
        const pending = dragPendingRef.current
        if (!pending) return
        updateImage(id, { x: pending.x, y: pending.y })
      })
    }
  }

  const handlePointerUp = (e: React.PointerEvent) => {
    if (!dragStateRef.current) return
    e.preventDefault()
    e.stopPropagation()

    const { id } = dragStateRef.current
    if (dragRafRef.current !== null) {
      window.cancelAnimationFrame(dragRafRef.current)
      dragRafRef.current = null
    }
    const pending = dragPendingRef.current
    if (pending) {
      updateImage(id, { x: pending.x, y: pending.y })
    }
    dragPendingRef.current = null
    dragStateRef.current = null
    e.currentTarget.releasePointerCapture(e.pointerId)
    onCommit?.()
  }

  const handleResizePointerDown = (e: React.PointerEvent, id: string, direction: string) => {
    if (!isEditing || e.button !== 0) return
    e.preventDefault()
    e.stopPropagation()
    onSelect(id)
    setIsResizing(true)

    const image = imagesRef.current.find(item => item.id === id)
    if (!image) return

    resizeStateRef.current = {
      id,
      direction,
      startX: e.clientX,
      startY: e.clientY,
      startWidth: image.width,
      startHeight: image.height,
      startLeft: image.x,
      startTop: image.y,
      ratio: image.height === 0 ? 1 : image.width / image.height
    }

    setCurrentSize({ width: Math.round(image.width), height: Math.round(image.height) })
    e.currentTarget.setPointerCapture(e.pointerId)
  }

  const handleResizePointerMove = (e: React.PointerEvent) => {
    if (!resizeStateRef.current) return
    e.preventDefault()
    e.stopPropagation()

    const {
      id,
      direction,
      startX,
      startY,
      startWidth,
      startHeight,
      startLeft,
      startTop,
      ratio
    } = resizeStateRef.current

    const dx = e.clientX - startX
    const dy = e.clientY - startY

    let newWidth = startWidth
    let newHeight = startHeight
    let newLeft = startLeft
    let newTop = startTop

    if (['nw', 'ne', 'sw', 'se'].includes(direction)) {
      if (direction.includes('e')) newWidth = startWidth + dx
      if (direction.includes('w')) newWidth = startWidth - dx
      newWidth = Math.max(20, newWidth)
      newHeight = newWidth / ratio
      if (direction.includes('w')) newLeft = startLeft + (startWidth - newWidth)
      if (direction.includes('n')) newTop = startTop + (startHeight - newHeight)
    } else {
      if (direction === 'e') newWidth = startWidth + dx
      if (direction === 'w') newWidth = startWidth - dx
      if (direction === 's') newHeight = startHeight + dy
      if (direction === 'n') newHeight = startHeight - dy
      newWidth = Math.max(20, newWidth)
      newHeight = Math.max(20, newHeight)
      if (direction === 'w') newLeft = startLeft + (startWidth - newWidth)
      if (direction === 'n') newTop = startTop + (startHeight - newHeight)
    }

    resizePendingRef.current = { width: newWidth, height: newHeight, x: newLeft, y: newTop }

    if (resizeRafRef.current === null) {
      resizeRafRef.current = window.requestAnimationFrame(() => {
        resizeRafRef.current = null
        const pending = resizePendingRef.current
        if (!pending) return
        setCurrentSize({ width: Math.round(pending.width), height: Math.round(pending.height) })
        updateImage(id, { width: pending.width, height: pending.height, x: pending.x, y: pending.y })
      })
    }
  }

  const handleResizePointerUp = (e: React.PointerEvent) => {
    if (!resizeStateRef.current) return
    e.preventDefault()
    e.stopPropagation()

    const { id } = resizeStateRef.current
    setIsResizing(false)
    setCurrentSize(null)
    if (resizeRafRef.current !== null) {
      window.cancelAnimationFrame(resizeRafRef.current)
      resizeRafRef.current = null
    }
    const pending = resizePendingRef.current
    if (pending) {
      updateImage(id, { width: pending.width, height: pending.height, x: pending.x, y: pending.y })
    }
    resizePendingRef.current = null
    resizeStateRef.current = null
    e.currentTarget.releasePointerCapture(e.pointerId)
    onCommit?.()
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

  const renderHandle = (id: string, dir: string, cursor: string, pos: React.CSSProperties) => (
    <div
      className="floating-resizer-handle"
      style={{ ...handleStyle, ...pos, cursor }}
      onPointerDown={(e) => handleResizePointerDown(e, id, dir)}
      onPointerMove={handleResizePointerMove}
      onPointerUp={handleResizePointerUp}
      onPointerCancel={handleResizePointerUp}
    />
  )

  return (
    <div
      ref={layerRef}
      data-floating-layer="true"
      style={{
        position: 'absolute',
        inset: 0,
        pointerEvents: 'none',
        zIndex: 40,
        transform: `translate(${-scrollOffset.x}px, ${-scrollOffset.y}px)`
      }}
    >
      {images.map(image => {
        const isSelected = image.id === selectedId
        return (
          <div
            key={image.id}
            style={{
              position: 'absolute',
              left: image.x,
              top: image.y,
              width: image.width,
              height: image.height,
              pointerEvents: isEditing ? 'auto' : 'none'
            }}
            onPointerDown={(e) => handlePointerDown(e, image.id)}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerCancel={handlePointerUp}
          >
            <Image
              src={image.src}
              alt=""
              width={Math.round(image.width)}
              height={Math.round(image.height)}
              style={{ width: '100%', height: '100%', display: 'block', cursor: 'move' }}
              unoptimized
            />
            {isEditing && isSelected && (
              <div
                style={{
                  position: 'absolute',
                  inset: 0,
                  border: '1px solid #3b82f6',
                  pointerEvents: 'none'
                }}
              >
                {isResizing && currentSize && (
                  <div
                    style={{
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
                    }}
                  >
                    {currentSize.width} x {currentSize.height}
                  </div>
                )}
                {renderHandle(image.id, 'nw', 'nw-resize', { top: -6, left: -6 })}
                {renderHandle(image.id, 'ne', 'ne-resize', { top: -6, right: -6 })}
                {renderHandle(image.id, 'sw', 'sw-resize', { bottom: -6, left: -6 })}
                {renderHandle(image.id, 'se', 'se-resize', { bottom: -6, right: -6 })}
                {renderHandle(image.id, 'n', 'n-resize', { top: -6, left: '50%', transform: 'translateX(-50%)' })}
                {renderHandle(image.id, 's', 's-resize', { bottom: -6, left: '50%', transform: 'translateX(-50%)' })}
                {renderHandle(image.id, 'w', 'w-resize', { left: -6, top: '50%', transform: 'translateY(-50%)' })}
                {renderHandle(image.id, 'e', 'e-resize', { right: -6, top: '50%', transform: 'translateY(-50%)' })}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
