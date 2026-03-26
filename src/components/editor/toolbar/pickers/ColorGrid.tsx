/**
 * ColorGrid Component
 * Displays a grid of color swatches for selection
 */

import React from 'react'

export interface ColorGridProps {
  /** Array of color hex values */
  colors: string[]
  /** Callback when a color is clicked */
  onColorClick: (color: string) => void
  /** Number of columns in the grid */
  columns?: number
  /** Optional label for the color section */
  label?: string
  /** Size of each color swatch */
  swatchSize?: string
  /** Additional className */
  className?: string
}

const ColorGrid: React.FC<ColorGridProps> = ({
  colors,
  onColorClick,
  columns = 10,
  label,
  swatchSize = 'w-6 h-6',
  className = ''
}) => {
  const gridStyle = {
    gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))`
  }

  return (
    <div className={`mb-3 ${className}`}>
      {label && (
        <p className="text-xs text-gray-500 mb-2 px-1">{label}</p>
      )}
      <div className="grid gap-1" style={gridStyle}>
        {colors.map((color) => (
          <button
            key={color}
            type="button"
            onClick={() => onColorClick(color)}
            className={`
              ${swatchSize} border border-gray-300 rounded-sm
              hover:border-gray-500 transition-colors
            `}
            style={{ backgroundColor: color }}
            title={color}
            aria-label={`Select color ${color}`}
          />
        ))}
      </div>
    </div>
  )
}

export default ColorGrid
