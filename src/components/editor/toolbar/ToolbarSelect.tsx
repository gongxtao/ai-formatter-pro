import React, { SelectHTMLAttributes } from 'react'

export interface ToolbarSelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string
  options: Array<{
    value: string
    label: string
    disabled?: boolean
  }>
}

const ToolbarSelect: React.FC<ToolbarSelectProps> = ({
  label,
  options,
  className = '',
  disabled,
  defaultValue,
  ...props
}) => {
  return (
    <select
      disabled={disabled}
      defaultValue={defaultValue || (label ? '' : undefined)}
      className={`
        px-2 py-1 bg-white border rounded
        disabled:bg-gray-100 disabled:cursor-not-allowed
        ${className}
      `}
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
  )
}

export default ToolbarSelect
