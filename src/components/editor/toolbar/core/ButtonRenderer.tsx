/**
 * ButtonRenderer Component
 * Renders different button types based on configuration
 * This component acts as a factory for creating toolbar buttons
 */

import React from 'react'
import type { ButtonConfig, BaseButtonConfig } from '../config/buttonConfigs'
import ToolbarButton from '../buttons/ToolbarButton'
import CommandButton from '../buttons/CommandButton'
import ToggleButton from '../buttons/ToggleButton'

// Picker components
import ColorPicker from '../pickers/ColorPicker'
import ImagePicker from '../pickers/ImagePicker'
import TablePicker from '../pickers/TablePicker'
import LineSpacingPicker from '../pickers/LineSpacingPicker'

// Input components
import ToolbarSelect from '../inputs/ToolbarSelect'
import ToolbarDropdown from '../inputs/ToolbarDropdown'

export interface ButtonRendererProps {
  /** Button configuration */
  config: ButtonConfig
  /** Whether the button is disabled */
  disabled?: boolean
  /** Whether the button is active (for toggle/command buttons) */
  isActive?: boolean
  /** Current value (for select inputs) */
  value?: string
  /** Callback when a command is executed */
  onCommand?: (command: string, arg?: string) => void
  /** Callback for color selection */
  onColorSelect?: (color: string, type: 'text' | 'background') => void
  /** Callback for image selection */
  onImageSelect?: (imageUrl: string) => void
  onFloatingImageSelect?: (imageUrl: string) => void
  /** Callback for table selection */
  onTableSelect?: (rows: number, cols: number) => void
  /** Callback for line spacing selection */
  onLineSpacingSelect?: (value: string) => void
  /** Callback for select change */
  onSelectChange?: (id: string, value: string) => void
}

const ButtonRenderer: React.FC<ButtonRendererProps> = ({
  config,
  disabled = false,
  isActive = false,
  value,
  onCommand,
  onColorSelect,
  onImageSelect,
  onFloatingImageSelect,
  onTableSelect,
  onLineSpacingSelect,
  onSelectChange
}) => {
  const handleCommand = (command: string, arg?: string) => {
    if (onCommand) {
      onCommand(command, arg)
    }
  }

  // Helper to get heading style for preview
  const getHeadingStyle = (tag: string) => {
    switch (tag) {
      case 'p': return { fontSize: '14px', color: '#3b82f6', fontWeight: 500 }
      case 'h1': return { fontSize: '26px', fontWeight: 'bold', color: '#000000', margin: 0, lineHeight: 1.2 }
      case 'h2': return { fontSize: '22px', fontWeight: 'bold', color: '#000000', margin: 0, lineHeight: 1.2 }
      case 'h3': return { fontSize: '18px', fontWeight: 'bold', color: '#000000', margin: 0, lineHeight: 1.2 }
      case 'h4': return { fontSize: '16px', fontWeight: 'bold', color: '#000000', margin: 0, lineHeight: 1.2 }
      case 'h5': return { fontSize: '14px', fontWeight: 'bold', color: '#000000', margin: 0, lineHeight: 1.2 }
      case 'h6': return { fontSize: '12px', fontWeight: 'bold', color: '#000000', margin: 0, lineHeight: 1.2 }
      case 'code': return { fontFamily: 'monospace', backgroundColor: '#f5f5f5', padding: '2px 4px', borderRadius: '4px' }
      case 'blockquote': return { borderLeft: '4px solid #ccc', paddingLeft: '10px', color: '#666' }
      default: return {}
    }
  }

  // Render based on button type
  switch (config.type) {
    case 'command':
      return (
        <CommandButton
          key={config.id}
          config={config}
          disabled={disabled}
          isActive={isActive}
          onClick={() => handleCommand(config.command, config.commandArg)}
        />
      )

    case 'toggle':
      return (
        <ToggleButton
          key={config.id}
          config={config}
          disabled={disabled}
          isActive={isActive}
          onClick={() => handleCommand(config.command)}
        />
      )

    case 'picker':
      switch (config.picker) {
        case 'color-text':
          return (
            <ColorPicker
              key={config.id}
              type="text"
              disabled={disabled}
              onColorSelect={(color) => onColorSelect?.(color, 'text')}
            />
          )
        case 'color-background':
          return (
            <ColorPicker
              key={config.id}
              type="background"
              disabled={disabled}
              onColorSelect={(color) => onColorSelect?.(color, 'background')}
            />
          )
        case 'image':
          return onImageSelect ? (
            <ImagePicker
              key={config.id}
              disabled={disabled}
              title={config.label}
              onImageSelect={onImageSelect}
              icon={config.icon}
            />
          ) : null
        case 'image-floating':
          return onFloatingImageSelect ? (
            <ImagePicker
              key={config.id}
              disabled={disabled}
              title={config.label}
              onImageSelect={onFloatingImageSelect}
              icon={config.icon}
            />
          ) : null
        case 'table':
          return onTableSelect ? (
            <TablePicker
              key={config.id}
              disabled={disabled}
              onTableSelect={onTableSelect}
            />
          ) : null
        case 'line-spacing':
          return onLineSpacingSelect ? (
            <LineSpacingPicker
              key={config.id}
              disabled={disabled}
              onLineSpacingSelect={onLineSpacingSelect}
              icon={config.icon}
            />
          ) : null
        default:
          return null
      }

    case 'select':
      // Special rendering for font family to show preview
      if (config.id === 'font-family') {
        return (
          <ToolbarDropdown
            key={config.id}
            label={config.selectLabel}
            value={value}
            options={config.options.map(opt => ({
              ...opt,
              style: { fontFamily: opt.value }
            }))}
            disabled={disabled}
            onChange={(val) => onSelectChange?.(config.id, val)}
            width={90}
            renderItem={(item) => (
              <span style={{ fontFamily: item.value }}>{item.label}</span>
            )}
          />
        )
      }
      
      // Special rendering for font size
      if (config.id === 'font-size') {
        return (
          <ToolbarDropdown
            key={config.id}
            label={config.selectLabel}
            value={value}
            options={config.options}
            disabled={disabled}
            onChange={(val) => onSelectChange?.(config.id, val)}
            width={50}
            editable={true}
          />
        )
      }

      // Special rendering for heading format
      if (config.id === 'heading') {
        return (
          <ToolbarDropdown
            key={config.id}
            label={config.selectLabel}
            value={value}
            options={config.options}
            disabled={disabled}
            onChange={(val) => onSelectChange?.(config.id, val)}
            width={90}
            renderItem={(item) => (
              <span style={getHeadingStyle(item.value)}>{item.label}</span>
            )}
          />
        )
      }

      // Fallback to native select for others
      return (
        <ToolbarSelect
          key={config.id}
          label={config.selectLabel}
          options={config.options}
          defaultValue={config.defaultValue}
          value={value} // Use controlled value if provided
          disabled={disabled}
          onChange={(e) => onSelectChange?.(config.id, e.target.value)}
        />
      )

    default:
      // Unknown type - render as basic toolbar button
      // Use type assertion for the fallback case
      const fallbackConfig = config as BaseButtonConfig
      return (
        <ToolbarButton
          key={fallbackConfig.id}
          title={fallbackConfig.label}
          disabled={disabled}
        >
          {fallbackConfig.id}
        </ToolbarButton>
      )
  }
}

export default ButtonRenderer
