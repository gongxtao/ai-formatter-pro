/**
 * useDropdownState Hook
 * Manages dropdown state (open/close) with automatic click-outside handling
 */

import { useState, useEffect, useCallback, type Dispatch, type RefObject, type SetStateAction } from 'react'

export interface UseDropdownStateOptions {
  /** Initial open state */
  initialOpen?: boolean
  /** Callback when dropdown state changes */
  onStateChange?: (isOpen: boolean) => void
  /** Optional ref to the dropdown container */
  containerRef?: RefObject<HTMLElement | null>
}

export function useDropdownState(options: UseDropdownStateOptions = {}) {
  const { initialOpen = false, onStateChange, containerRef } = options
  const [internalOpen, setInternalOpen] = useState(initialOpen)
  const hasInitialOpen = Object.prototype.hasOwnProperty.call(options, 'initialOpen')
  const isOpen = hasInitialOpen ? initialOpen : internalOpen

  const setIsOpen: Dispatch<SetStateAction<boolean>> = useCallback((value) => {
    if (hasInitialOpen) {
      return
    }
    setInternalOpen(value)
  }, [hasInitialOpen])

  // Notify state change
  useEffect(() => {
    onStateChange?.(isOpen)
  }, [isOpen, onStateChange])

  // Close on click outside
  useEffect(() => {
    if (!isOpen || !containerRef) return

    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Node
      const isInsideContainer = !!(containerRef.current && containerRef.current.contains(target))
      const isInsidePortal = target instanceof Element && !!target.closest('[data-toolbar-dropdown-portal="true"]')
      if (!isInsideContainer && !isInsidePortal) {
        setIsOpen(false)
      }
    }

    // Handle iframe clicks
    const handleIframeClick = () => {
      setIsOpen(false)
    }

    // Add listener to main document
    document.addEventListener('mousedown', handleClickOutside)
    
    // Add listener to all iframes
    const iframes = document.querySelectorAll('iframe')
    iframes.forEach(iframe => {
      try {
        iframe.contentWindow?.document.addEventListener('mousedown', handleIframeClick)
      } catch (e) {
        // Ignore cross-origin issues
      }
    })

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      iframes.forEach(iframe => {
        try {
          iframe.contentWindow?.document.removeEventListener('mousedown', handleIframeClick)
        } catch (e) {
          // Ignore
        }
      })
    }
  }, [isOpen, containerRef])

  // Close on escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        setIsOpen(false)
      }
    }
    document.addEventListener('keydown', handleEscape)
    return () => document.removeEventListener('keydown', handleEscape)
  }, [isOpen])

  // Toggle open state
  const toggle = () => setIsOpen(prev => !prev)

  // Open dropdown
  const open = () => setIsOpen(true)

  // Close dropdown
  const close = () => setIsOpen(false)

  return {
    isOpen,
    setIsOpen,
    toggle,
    open,
    close
  }
}
