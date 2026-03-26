/**
 * ToolbarSection Component
 * A section/group within a toolbar row
 */

import React from 'react'
import ToolbarGroup from '../groups/ToolbarGroup'
import ToolbarSeparator from '../groups/ToolbarSeparator'

export interface ToolbarSectionProps {
  /** Unique identifier for the section */
  id: string
  /** Optional label for the section */
  label?: string
  /** Section content - can be direct children or button configs */
  children?: React.ReactNode
  /** Items to render (button configs) */
  items?: Array<{ id?: string; type?: string; [key: string]: unknown }>
  /** Whether to show a separator after this section */
  separator?: boolean
  /** Additional className */
  className?: string
}

const ToolbarSection: React.FC<ToolbarSectionProps> = ({
  id,
  label,
  children,
  items,
  separator = false,
  className = ''
}) => {
  return (
    <>
      <ToolbarGroup id={id} label={label} className={className}>
        {children || (items && items.map((item, index) => (
          <React.Fragment key={item.id || index}>
            {/* Items will be rendered by ButtonRenderer */}
            {React.createElement('div', {
              'data-button-id': item.id,
              'data-button-type': item.type,
              'data-button-config': JSON.stringify(item)
            })}
          </React.Fragment>
        )))}
      </ToolbarGroup>
      {separator && <ToolbarSeparator />}
    </>
  )
}

export default ToolbarSection
