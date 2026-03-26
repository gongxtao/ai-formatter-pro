import React, { ButtonHTMLAttributes } from 'react'

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

const ToolbarButton = React.forwardRef<HTMLButtonElement, ToolbarButtonProps>(
  ({ title, icon, variant = 'default', size = 'md', className = '', disabled, children, ...props }, ref) => {
    const baseStyles = 'transition-all duration-200 disabled:cursor-not-allowed disabled:opacity-50'

    const variantStyles = {
      default: 'px-2.5 py-1.5 bg-white border border-neutral-200 rounded-lg hover:bg-neutral-50 hover:border-neutral-300 disabled:bg-neutral-50 disabled:text-neutral-400',
      color: 'w-8 h-8 border border-neutral-200 rounded-lg hover:bg-neutral-50 hover:border-neutral-300 disabled:bg-neutral-50 disabled:opacity-50',
      text: 'px-2.5 py-1.5 font-medium hover:bg-neutral-50 rounded-lg disabled:text-neutral-400'
    }

    const sizeStyles = {
      sm: 'text-xs',
      md: 'text-sm',
      lg: 'text-base'
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
        {...props}
      >
        {icon || children}
      </button>
    )
  }
)

ToolbarButton.displayName = 'ToolbarButton'

export default ToolbarButton
