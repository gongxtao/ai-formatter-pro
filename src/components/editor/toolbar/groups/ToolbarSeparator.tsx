/**
 * ToolbarSeparator Component
 * A visual separator between toolbar groups
 */

import React from 'react'

export interface ToolbarSeparatorProps {
  /** Orientation of the separator */
  orientation?: 'vertical' | 'horizontal'
  /** Additional className */
  className?: string
}

const ToolbarSeparator: React.FC<ToolbarSeparatorProps> = ({
  orientation = 'vertical',
  className = ''
}) => {
  if (orientation === 'vertical') {
    return (
      <div
        className={`w-px h-5 bg-gray-300 mx-2 ${className}`}
        role="separator"
        aria-orientation="vertical"
      />
    )
  }

  return (
    <div
      className={`h-px w-full bg-gray-300 my-1 ${className}`}
      role="separator"
      aria-orientation="horizontal"
    />
  )
}

export default ToolbarSeparator
