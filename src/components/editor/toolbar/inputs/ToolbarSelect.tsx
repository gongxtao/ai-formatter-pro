/**
 * ToolbarSelect Component
 * A select dropdown for toolbar options
 */

import React, { SelectHTMLAttributes, memo } from 'react'
import { ChevronDownIcon } from '../../icons'

export interface ToolbarSelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string
  options: Array<{
    value: string
    label: string
    disabled?: boolean
  }>
}

const ToolbarSelect = memo<ToolbarSelectProps>(({
  label,
  options,
  className = '',
  disabled,
  defaultValue,
  value,
  onChange,
  ...props
}) => {
  // Use label text if no value selected, otherwise find label for selected value
  const displayLabel = value 
    ? options.find(opt => opt.value === value)?.label || value 
    : label || options[0]?.label

  return (
    <div className={`relative inline-block ${className}`}>
      <select
        disabled={disabled}
        defaultValue={defaultValue || (label ? '' : undefined)}
        value={value}
        onChange={onChange}
        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed z-10"
        {...props}
      >
        {label && (
          <option value="" disabled>
            {label}
          </option>
        )}
        {options.map((option) => (
          <option key={option.value} value={option.value} disabled={option.disabled}>
            {option.label}
          </option>
        ))}
      </select>
      
      {/* Custom visual representation */}
      <div className={`
        flex items-center justify-between
        h-8 px-2 min-w-[60px]
        bg-transparent rounded hover:bg-gray-100
        text-sm font-medium text-gray-700
        transition-colors
        ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
      `}>
        <span className="truncate mr-1">{displayLabel}</span>
        <ChevronDownIcon size={12} className="opacity-50 flex-shrink-0" />
      </div>
    </div>
  )
})

ToolbarSelect.displayName = 'ToolbarSelect'

export default ToolbarSelect
