/**
 * ToolbarButton Component
 * Base button component for the toolbar
 * Optimized with React.memo to prevent unnecessary re-renders
 */

import React, { ButtonHTMLAttributes, memo } from 'react'

export interface ToolbarButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  /** Tooltip title for the button */
  title: string
  /** Icon to display (can be React node, string, or any element) */
  icon?: React.ReactNode
  /** Visual style variant */
  variant?: 'default' | 'color' | 'text'
  /** Size of the button */
  size?: 'sm' | 'md' | 'lg'
}

const ToolbarButton = memo(
  React.forwardRef<HTMLButtonElement, ToolbarButtonProps>(
    ({ title, icon, variant = 'default', size = 'md', className = '', disabled, children, onMouseDown, ...props }, ref) => {
      const baseStyles = 'transition-colors disabled:cursor-not-allowed disabled:opacity-50'

      const variantStyles = {
        default: 'w-8 h-8 flex items-center justify-center bg-transparent border-none rounded hover:bg-gray-100 disabled:opacity-50 text-gray-700',
        color: 'w-8 h-8 flex items-center justify-center bg-transparent border-none rounded hover:bg-gray-100 disabled:opacity-50 relative',
        text: 'h-8 px-2 flex items-center bg-transparent border-none rounded hover:bg-gray-100 disabled:opacity-50 text-gray-700 font-medium text-sm'
      }

      const sizeStyles = {
        sm: '',
        md: '',
        lg: ''
      }

      return (
        <button
          ref={ref}
          title={title}
          aria-label={title}
          disabled={disabled}
          className={`
            ${baseStyles}
            ${variantStyles[variant]}
            ${sizeStyles[size]}
            ${className}
          `}
          onMouseDown={(e) => {
            if (!disabled) {
              e.preventDefault()
            }
            onMouseDown?.(e)
          }}
          {...props}
        >
          {icon || children}
        </button>
      )
    }
  )
)

ToolbarButton.displayName = 'ToolbarButton'

export default ToolbarButton
