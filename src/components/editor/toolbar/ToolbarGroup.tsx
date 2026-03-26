import React from 'react'

export interface ToolbarGroupProps {
  /** Group label (optional) */
  label?: string
  /** Group content */
  children: React.ReactNode
  /** Additional className */
  className?: string
}

const ToolbarGroup: React.FC<ToolbarGroupProps> = ({ label, children, className = '' }) => {
  return (
    <div className={`flex items-center gap-1 ${className}`}>
      {label && <span className="text-sm text-gray-600 mr-1">{label}</span>}
      {children}
    </div>
  )
}

export default ToolbarGroup
