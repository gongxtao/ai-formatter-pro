/**
 * ToolbarGroup Component
 * A container for grouping related toolbar buttons
 */

import React from 'react'

export interface ToolbarGroupProps {
  /** Unique identifier for the group */
  id?: string
  /** Group label (optional) */
  label?: string
  /** Group content */
  children: React.ReactNode
  /** Additional className */
  className?: string
}

const ToolbarGroup = React.memo<ToolbarGroupProps>(({ id, label, children, className = '' }) => {
  return (
    <div id={id} className={`flex items-center gap-1 ${className}`}>
      {label && <span className="text-sm text-gray-600 mr-1">{label}</span>}
      {children}
    </div>
  )
})

ToolbarGroup.displayName = 'ToolbarGroup'

export default ToolbarGroup
