/**
 * ToggleButton Component
 * A button that toggles a format state when clicked
 * Used for bold, italic, underline, etc.
 * Shows active state when the format is currently applied
 */

import React, { ButtonHTMLAttributes, useState, useEffect } from 'react'
import type { ToggleButtonConfig } from '../config/buttonConfigs'

export interface ToggleButtonProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'onClick'> {
  /** Button configuration */
  config: ToggleButtonConfig
  /** Click handler */
  onClick?: () => void
  /** Whether the button is disabled */
  disabled?: boolean
  /** Whether the toggle is currently active (optional, can be derived from editor state) */
  isActive?: boolean
}

const ToggleButton = React.forwardRef<HTMLButtonElement, ToggleButtonProps>(
  ({ config, onClick, disabled = false, isActive = false, className = '', ...props }, ref) => {
    const { label, icon: Icon, content, shortcut } = config

    // Build title with shortcut if available
    const title = shortcut ? `${label} (${shortcut})` : label

    // Determine button content
    const buttonContent = Icon ? (
      <Icon />
    ) : content ? (
      <span className={getFormattingClass(config.command)}>{content}</span>
    ) : null

    return (
      <button
        ref={ref}
        type="button"
        title={title}
        aria-label={label}
        aria-pressed={isActive}
        disabled={disabled}
        onMouseDown={(e) => {
          if (!disabled) {
            e.preventDefault()
          }
        }}
        onClick={onClick}
        className={`
          transition-colors disabled:cursor-not-allowed disabled:opacity-50
          w-8 h-8 flex items-center justify-center
          bg-transparent border-none rounded hover:bg-gray-200
          text-gray-600
          disabled:text-gray-400
          ${isActive ? 'bg-gray-200' : ''}
          ${className}
        `}
        {...props}
      >
        {buttonContent}
      </button>
    )
  }
)

ToggleButton.displayName = 'ToggleButton'

/**
 * Helper to get the CSS class for formatting text
 */
function getFormattingClass(command: string): string {
  switch (command) {
    case 'bold':
      return 'font-bold'
    case 'italic':
      return 'italic'
    case 'underline':
      return 'underline'
    case 'strikeThrough':
      return 'line-through'
    case 'subscript':
      return 'align-sub'
    case 'superscript':
      return 'align-super'
    default:
      return ''
  }
}

export default ToggleButton
