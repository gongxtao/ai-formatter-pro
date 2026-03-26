/**
 * CommandButton Component
 * A button that executes a single command when clicked
 * Used for one-time actions like undo, redo, insert link, etc.
 */

import React, { ButtonHTMLAttributes } from 'react'
import type { CommandButtonConfig } from '../config/buttonConfigs'

export interface CommandButtonProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'onClick'> {
  /** Button configuration */
  config: CommandButtonConfig
  /** Click handler */
  onClick?: () => void
  /** Whether the button is disabled */
  disabled?: boolean
  /** Whether the button is active */
  isActive?: boolean
}

const CommandButton = React.forwardRef<HTMLButtonElement, CommandButtonProps>(
  ({ config, onClick, disabled = false, isActive = false, className = '', ...props }, ref) => {
    const { label, icon: Icon, shortcut } = config

    // Build title with shortcut if available
    const title = shortcut ? `${label} (${shortcut})` : label

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
          bg-transparent border-none rounded hover:bg-gray-100
          text-gray-700
          disabled:text-gray-400
          ${isActive ? 'bg-gray-200' : ''}
          ${className}
        `}
        {...props}
      >
        {Icon ? <Icon /> : null}
      </button>
    )
  }
)

CommandButton.displayName = 'CommandButton'

export default CommandButton
