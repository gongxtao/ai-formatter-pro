import React, { useState, type ComponentType, type SVGProps } from 'react'
import ToolbarButton from '../buttons/ToolbarButton'
import PickerDropdown from './PickerDropdown'
import { LineSpacingIcon } from '../../icons'

export interface LineSpacingPickerProps {
  /** Callback when a line spacing is selected */
  onLineSpacingSelect: (value: string) => void
  /** Whether the picker is disabled */
  disabled?: boolean
  /** Custom icon component */
  icon?: ComponentType<SVGProps<SVGSVGElement>>
}

const LINE_SPACING_OPTIONS = [
  { label: '1.0', value: '1.0' },
  { label: '1.15', value: '1.15' },
  { label: '1.5', value: '1.5' },
  { label: '2.0', value: '2.0' },
  { label: '2.5', value: '2.5' },
  { label: '3.0', value: '3.0' }
]

const LineSpacingPicker: React.FC<LineSpacingPickerProps> = ({ 
  onLineSpacingSelect, 
  disabled = false,
  icon: Icon 
}) => {
  const [isOpen, setIsOpen] = useState(false)
  const [currentValue, setCurrentValue] = useState('1.15') // Default

  const handleSelect = (value: string) => {
    setCurrentValue(value)
    onLineSpacingSelect(value)
    setIsOpen(false)
  }

  return (
    <div className="relative">
      <ToolbarButton
        title="Line Spacing"
        onClick={() => setIsOpen(!isOpen)}
        disabled={disabled}
      >
        {Icon ? <Icon /> : <LineSpacingIcon />}
      </ToolbarButton>

      <PickerDropdown isOpen={isOpen} onClose={() => setIsOpen(false)} width="w-24">
        <div className="py-1">
          {LINE_SPACING_OPTIONS.map((option) => (
            <button
              key={option.value}
              className={`
                w-full text-left px-4 py-2 text-sm hover:bg-gray-100 flex items-center justify-center
                ${currentValue === option.value ? 'text-blue-600 font-medium' : 'text-gray-700'}
              `}
              onClick={() => handleSelect(option.value)}
            >
              {option.label}
            </button>
          ))}
        </div>
      </PickerDropdown>
    </div>
  )
}

export default LineSpacingPicker
