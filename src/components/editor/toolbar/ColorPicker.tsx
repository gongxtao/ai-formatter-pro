import React, { useState } from 'react'
import ToolbarButton from './ToolbarButton'

interface ColorPickerProps {
  onColorSelect: (color: string) => void
  disabled?: boolean
}

const DEFAULT_COLORS = [
  // Row 1: Black to White
  '#000000', '#424242', '#636363', '#757575', '#9E9E9E', '#BDBDBD', '#D1D1D1', '#EEEEEE', '#F5F5F5', '#FFFFFF',
  // Row 2: Red variations
  '#FFEBEE', '#FFCDD2', '#EF9A9A', '#E57373', '#EF5350', '#F44336', '#E53935', '#C62828', '#B71C1C',
  // Row 3: Orange variations
  '#FFF3E0', '#FFE0B2', '#FFCC80', '#FFB74D', '#FFA726', '#FF9800', '#FB8C00', '#EF6C00', '#E65100',
  // Row 4: Yellow variations
  '#FFFDE7', '#FFF9C4', '#FFF59D', '#FFF176', '#FFEE58', '#FFEB3B', '#FDD835', '#F9A825', '#F57F17',
  // Row 5: Green variations
  '#E8F5E9', '#C8E6C9', '#A5D6A7', '#81C784', '#66BB6A', '#4CAF50', '#43A047', '#2E7D32', '#1B5E20',
  // Row 6: Blue variations
  '#E3F2FD', '#BBDEFB', '#90CAF9', '#64B5F6', '#42A5F5', '#2196F3', '#1E88E5', '#1565C0', '#0D47A1',
  // Row 7: Purple variations
  '#F3E5F5', '#E1BEE7', '#CE93D8', '#BA68C8', '#AB47BC', '#9C27B0', '#8E24AA', '#6A1B9A', '#4A148C',
  // Row 8: Pink variations
  '#FCE4EC', '#F8BBD0', '#F48FB1', '#F06292', '#EC407A', '#E91E63', '#D81B60', '#C2185B', '#AD1457'
]

const THEME_COLORS = [
  '#1A73E8', '#185ABC', '#0B8043', '#0469C3',
  '#D93025', '#C5221F', '#137333', '#9334E6',
  '#FF6D00', '#F4511E', '#0F9D58', '#4285F4'
]

const ColorPicker: React.FC<ColorPickerProps> = ({ onColorSelect, disabled = false }) => {
  const [isOpen, setIsOpen] = useState(false)
  const [selectedColor, setSelectedColor] = useState('#000000')

  const handleColorClick = (color: string) => {
    setSelectedColor(color)
    onColorSelect(color)
    setIsOpen(false)
  }

  return (
    <div className="relative">
      {/* Main Color Button - matches toolbar button style */}
      <ToolbarButton
        title="Text color"
        onClick={() => setIsOpen(!isOpen)}
        disabled={disabled}
        className="min-w-[40px] px-2"
      >
        {/* Text color icon: letter A with underline */}
        <div className="w-full h-full flex items-center justify-center relative">
          <svg width="16" height="16" viewBox="0 0 16 16" className="text-gray-700">
            <text x="8" y="10" textAnchor="middle" fontSize="10" fontWeight="bold" fill="currentColor" fontFamily="Arial">A</text>
            <rect x="4" y="11.5" width="8" height="1.5" fill="currentColor" opacity="0.8" rx="0.5"/>
          </svg>
          <div
            className="absolute bottom-[3px] left-1/2 transform -translate-x-1/2 w-2 h-0.5 rounded-full"
            style={{ backgroundColor: selectedColor }}
          />
        </div>
      </ToolbarButton>

      {/* Dropdown */}
      {isOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-40"
            onClick={() => setIsOpen(false)}
          />

          {/* Color Picker Panel - narrower, cleaner */}
          <div className="absolute z-50 top-full left-0 mt-1 bg-white border border-gray-300 rounded-md shadow-lg p-3 w-80">
            {/* Header */}
            <div className="mb-3 border-b border-gray-200 pb-2">
              <p className="text-sm font-medium text-gray-700">
                Text color
              </p>
            </div>

            {/* Theme Colors */}
            <div className="mb-3">
              <p className="text-xs text-gray-500 mb-2 px-1">Theme colors</p>
              <div className="grid grid-cols-10 gap-1">
                {THEME_COLORS.map((color) => (
                  <button
                    key={color}
                    onClick={() => handleColorClick(color)}
                    className="w-6 h-6 border border-gray-300 rounded-sm hover:border-gray-500 transition-colors"
                    style={{ backgroundColor: color }}
                    title={color}
                  />
                ))}
              </div>
            </div>

            {/* Default Colors */}
            <div className="mb-3">
              <p className="text-xs text-gray-500 mb-2 px-1">Default colors</p>
              <div className="grid grid-cols-10 gap-1">
                {DEFAULT_COLORS.map((color) => (
                  <button
                    key={color}
                    onClick={() => handleColorClick(color)}
                    className="w-6 h-6 border border-gray-300 rounded-sm hover:border-gray-500 transition-colors"
                    style={{ backgroundColor: color }}
                    title={color}
                  />
                ))}
              </div>
            </div>

            {/* Custom Color */}
            <div className="border-t border-gray-200 pt-3">
              <button
                onClick={() => {
                  const customColor = window.prompt('Enter custom color (hex):', '#')
                  if (customColor && /^#[0-9A-F]{6}$/i.test(customColor)) {
                    handleColorClick(customColor)
                  }
                }}
                className="w-full text-left px-1 py-1.5 text-sm text-blue-600 hover:bg-blue-50 rounded transition-colors"
              >
                Custom...
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  )
}

export default ColorPicker
