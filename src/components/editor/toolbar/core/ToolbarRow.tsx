/**
 * ToolbarRow Component
 * A single row container in the toolbar
 */

import React from 'react'

export interface ToolbarRowProps {
  /** Unique identifier for the row */
  id: string
  /** Row content */
  children: React.ReactNode
  /** Additional className */
  className?: string
  /** Whether to show a border on top (for rows after the first) */
  showBorder?: boolean
}

const ToolbarRow = React.forwardRef<HTMLDivElement, ToolbarRowProps>(
  ({ id, children, className = '', showBorder = false }, ref) => {
    return (
      <div
        ref={ref}
        id={id}
        className={`flex items-center flex-wrap px-3 py-2 gap-1 ${showBorder ? 'border-t border-gray-200' : ''} ${className}`}
      >
        {children}
      </div>
    )
  }
)

ToolbarRow.displayName = 'ToolbarRow'

export default ToolbarRow
