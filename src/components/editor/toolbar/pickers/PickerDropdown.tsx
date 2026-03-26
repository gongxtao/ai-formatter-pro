/**
 * PickerDropdown Component
 * A reusable dropdown panel for picker components
 * Handles backdrop and positioning
 */

import React, { useEffect, useRef } from 'react'

export interface PickerDropdownProps {
  /** Whether the dropdown is open */
  isOpen: boolean
  /** Callback when dropdown should close */
  onClose: () => void
  /** Dropdown content */
  children: React.ReactNode
  /** Optional width for the dropdown */
  width?: string
  /** Additional className */
  className?: string
}

const PickerDropdown: React.FC<PickerDropdownProps> = ({
  isOpen,
  onClose,
  children,
  width = 'w-80',
  className = ''
}) => {
  const dropdownRef = useRef<HTMLDivElement>(null)

  // Close on escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose()
      }
    }
    document.addEventListener('keydown', handleEscape)
    return () => document.removeEventListener('keydown', handleEscape)
  }, [isOpen, onClose])

  if (!isOpen) return null

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Dropdown Panel */}
      <div
        ref={dropdownRef}
        className={`
          absolute z-50 top-full left-0 mt-1
          bg-white border border-gray-300 rounded-md shadow-lg p-3
          ${width}
          ${className}
        `}
        onClick={(e) => e.stopPropagation()}
      >
        {children}
      </div>
    </>
  )
}

export default PickerDropdown
