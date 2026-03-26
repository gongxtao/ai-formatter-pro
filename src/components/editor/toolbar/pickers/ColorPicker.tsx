/**
 * Unified ColorPicker Component
 * Replaces the separate ColorPicker and BackgroundColorPicker components
 * Supports both text and background color selection via the 'type' prop
 */

import React, { useState } from 'react'
import ToolbarButton from '../buttons/ToolbarButton'
import PickerDropdown from './PickerDropdown'
import ColorGrid from './ColorGrid'
import { DEFAULT_COLORS, THEME_COLORS } from '../config/constants'

export type ColorPickerType = 'text' | 'background'

export interface ColorPickerProps {
  /** Type of color picker (text or background) */
  type: ColorPickerType
  /** Callback when a color is selected */
  onColorSelect: (color: string) => void
  /** Whether the picker is disabled */
  disabled?: boolean
  /** Additional className for the button */
  className?: string
}

const ColorIndicator = ({ type, color }: { type: ColorPickerType; color: string }) => {
  if (type === 'text') {
    return (
      <div className="flex flex-col items-center justify-center relative w-6 h-6">
        <svg viewBox="0 0 24 24" className="w-full h-full">
          <text x="50%" y="18" fontSize="18" fontWeight="bold" fontFamily="serif" textAnchor="middle" fill="currentColor">A</text>
        </svg>
        <div 
          className="h-[3px] absolute bottom-0 left-1 right-1" 
          style={{ backgroundColor: color === 'transparent' ? '#000' : color }}
        />
      </div>
    )
  }

  // Background color indicator
  return (
    <div className="flex flex-col items-center justify-center relative w-6 h-6">
      <svg viewBox="0 0 24 24" className="w-5 h-5" fill="currentColor" style={{ transform: 'scale(0.85)' }}>
        <path d="M16.56 8.94L7.62 0 6.21 1.41l2.38 2.38-5.15 5.15c-.59.59-.59 1.54 0 2.12l5.5 5.5c.29.29.68.44 1.06.44s.77-.15 1.06-.44l5.5-5.5c.59-.58.59-1.53 0-2.12zM5.21 10L10 5.21 14.79 10H5.21zM19 11.5s-2 2.17-2 3.5c0 1.1.9 2 2 2s2-.9 2-2c0-1.33-2-3.5-2-3.5z"/><path d="M0 20h24v4H0z"/>
      </svg>
      <div 
        className="h-[3px] absolute bottom-0 left-1 right-1" 
        style={{ backgroundColor: color === 'transparent' ? 'transparent' : color }}
      />
    </div>
  )
}

const ColorPicker: React.FC<ColorPickerProps> = ({
  type,
  onColorSelect,
  disabled = false,
  className = ''
}) => {
  const [isOpen, setIsOpen] = useState(false)
  const [selectedColor, setSelectedColor] = useState(
    type === 'text' ? '#000000' : 'transparent'
  )

  const handleColorClick = (color: string) => {
    setSelectedColor(color)
    onColorSelect(color)
    setIsOpen(false)
  }

  const handleCustomColor = () => {
    const customColor = window.prompt('Enter custom color (hex):', '#')
    if (customColor && /^#[0-9A-F]{6}$/i.test(customColor)) {
      handleColorClick(customColor)
    }
  }

  const isTextType = type === 'text'
  const label = isTextType ? 'Text color' : 'Background color'

  return (
    <div className="relative">
      {/* Main Color Button */}
      <ToolbarButton
        title={label}
        onClick={() => setIsOpen(!isOpen)}
        disabled={disabled}
        className={`px-1 ${className}`}
      >
        <ColorIndicator type={type} color={selectedColor} />
      </ToolbarButton>

      {/* Dropdown */}
      <PickerDropdown isOpen={isOpen} onClose={() => setIsOpen(false)}>
        {/* Header */}
        <div className="mb-3 border-b border-gray-200 pb-2">
          <p className="text-sm font-medium text-gray-700">{label}</p>
        </div>

        {/* No Color Option (for background type) */}
        {!isTextType && (
          <div className="mb-3">
            <button
              type="button"
              onClick={() => handleColorClick('transparent')}
              className="w-full flex items-center gap-3 px-1 py-1.5 hover:bg-gray-50 rounded transition-colors"
            >
              <div className="w-6 h-6 border border-gray-300 rounded-sm flex items-center justify-center relative">
                <div className="absolute w-4 h-0.5 bg-red-600 transform rotate-45" />
              </div>
              <span className="text-sm text-gray-700">No color</span>
            </button>
          </div>
        )}

        {/* Theme Colors */}
        <ColorGrid
          colors={THEME_COLORS}
          onColorClick={handleColorClick}
          label="Theme colors"
        />

        {/* Default Colors */}
        <ColorGrid
          colors={DEFAULT_COLORS}
          onColorClick={handleColorClick}
          label="Default colors"
          columns={10}
        />
        
        {/* Custom Color Button */}
        <div className="mt-3 pt-2 border-t border-gray-200">
          <button
            type="button"
            onClick={handleCustomColor}
            className="w-full text-center text-sm text-blue-600 hover:text-blue-800 py-1"
          >
            Custom color...
          </button>
        </div>
      </PickerDropdown>
    </div>
  )
}

export default ColorPicker
