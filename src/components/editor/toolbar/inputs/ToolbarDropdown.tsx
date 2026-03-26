
import React, { useState, useRef, useLayoutEffect } from 'react'
import { createPortal } from 'react-dom'
import { useDropdownState } from '../hooks/useDropdownState'
import { ChevronDownIcon } from '../../icons'

export interface ToolbarDropdownProps {
  label?: string
  value?: string
  options: Array<{
    value: string
    label: string
    disabled?: boolean
    style?: React.CSSProperties
  }>
  disabled?: boolean
  onChange?: (value: string) => void
  placeholder?: string
  width?: number | string
  className?: string
  editable?: boolean // Support manual input
  // Custom render function for items (e.g., for font preview)
  renderItem?: (item: { value: string; label: string; style?: React.CSSProperties }) => React.ReactNode
}

const ToolbarDropdown: React.FC<ToolbarDropdownProps> = ({
  label,
  value,
  options,
  disabled = false,
  onChange,
  placeholder = 'Select...',
  width = 120,
  className = '',
  editable = false,
  renderItem
}) => {
  const containerRef = useRef<HTMLDivElement>(null)
  const { isOpen, toggle, close, open } = useDropdownState({ containerRef })
  const [internalInputValue, setInternalInputValue] = useState(value || '')
  const [dropdownPosition, setDropdownPosition] = useState<{ top: number; left: number } | null>(null)
  const inputValue = value ?? internalInputValue

  // Calculate dropdown position before paint to avoid flicker at top-left
  useLayoutEffect(() => {
    if (isOpen && containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect()
      setDropdownPosition({
        top: rect.bottom + window.scrollY,
        left: rect.left + window.scrollX
      })
    } else if (!isOpen) {
      setDropdownPosition(null)
    }
  }, [isOpen])

  const selectedOption = options.find(opt => opt.value === (inputValue || value))
  const displayLabel = selectedOption ? selectedOption.label : (label || placeholder)

  // Dynamic font size for long labels
  const getLabelStyle = () => {
    if (typeof displayLabel === 'string') {
      if (displayLabel.length > 15) return 'text-[10px]'
      if (displayLabel.length > 10) return 'text-xs'
    }
    return ''
  }

  const handleSelect = (optionValue: string) => {
    if (onChange) {
      onChange(optionValue)
    }
    setInternalInputValue(optionValue)
    close()
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newVal = e.target.value
    setInternalInputValue(newVal)
    // Only update parent if it's a valid value or if we want real-time updates
    // For font size, we might want to debounce or validate
  }

  const handleInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      if (onChange) {
        onChange(inputValue)
      }
      close()
    }
  }

  const dropdownContent = (
    <div
      data-toolbar-dropdown-portal="true"
      className="origin-top-right absolute rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5 focus:outline-none z-[9999] max-h-60 overflow-y-auto"
      style={{
        top: `${dropdownPosition?.top ?? 0}px`,
        left: `${dropdownPosition?.left ?? 0}px`,
        minWidth: typeof width === 'number' ? `${Math.max(width, 100)}px` : width
      }}
      role="menu"
      aria-orientation="vertical"
    >
      <div className="py-1" role="none">
        {options.map((option) => (
          <button
            key={option.value}
            className={`
              block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 hover:text-gray-900 whitespace-nowrap
              ${option.value === value ? 'bg-gray-100 font-medium' : ''}
              ${option.disabled ? 'opacity-50 cursor-not-allowed' : ''}
            `}
            role="menuitem"
            disabled={option.disabled}
            onClick={() => !option.disabled && handleSelect(option.value)}
            style={option.style}
          >
            {renderItem ? renderItem(option) : option.label}
          </button>
        ))}
      </div>
    </div>
  )

  return (
    <div
      ref={containerRef}
      className={`relative inline-block text-left ${className}`}
      style={{ width }}
    >
      {editable ? (
        <div
          className={`
            inline-flex items-center w-full rounded-md
            hover:bg-gray-100
            ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
            ${isOpen ? 'bg-gray-100' : ''}
          `}
          style={{ height: '32px' }}
        >
          <input
            type="text"
            className="flex-1 min-w-0 px-1.5 text-sm font-medium text-gray-700 bg-transparent border-none focus:ring-0 focus:outline-none h-full"
            value={inputValue}
            onChange={handleInputChange}
            onKeyDown={handleInputKeyDown}
            onFocus={open}
            disabled={disabled}
            placeholder={placeholder}
          />
          <button
            type="button"
            className="px-1 hover:bg-gray-200 focus:outline-none rounded-sm mr-0.5"
            onClick={toggle}
            disabled={disabled}
            tabIndex={-1}
          >
            <ChevronDownIcon size={12} className="h-3 w-3 text-gray-500 opacity-70" />
          </button>
        </div>
      ) : (
        <button
          type="button"
          className={`
            inline-flex justify-between items-center w-full rounded-md
            px-1.5 text-xs font-medium text-gray-700
            hover:bg-gray-100 focus:outline-none
            ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
            ${isOpen ? 'bg-gray-100' : ''}
          `}
          style={{ height: '32px' }}
          onClick={toggle}
          disabled={disabled}
          aria-haspopup="true"
          aria-expanded={isOpen}
        >
          <span className={`truncate block flex-1 text-left ${getLabelStyle()}`}>
            {displayLabel}
          </span>
          <ChevronDownIcon size={12} className="ml-1 h-3 w-3 text-gray-500 opacity-70" />
        </button>
      )}

      {isOpen && !!dropdownPosition && !disabled && typeof document !== 'undefined' && createPortal(
        dropdownContent,
        document.body
      )}
    </div>
  )
}

export default ToolbarDropdown
