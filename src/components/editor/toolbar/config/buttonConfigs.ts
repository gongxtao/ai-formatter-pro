/**
 * Button configuration definitions
 * Each button type has a specific structure that the ButtonRenderer will use
 */

import type { ComponentType } from 'react'

// ============================================================================
// Types
// ============================================================================

export type ButtonType = 'command' | 'toggle' | 'picker' | 'select'

export interface BaseButtonConfig {
  id: string
  type: ButtonType
  label: string
  shortcut?: string
  disabled?: boolean
}

export interface CommandButtonConfig extends BaseButtonConfig {
  type: 'command'
  command: string
  commandArg?: string
  icon?: ComponentType<unknown>
}

export interface ToggleButtonConfig extends BaseButtonConfig {
  type: 'toggle'
  command: string
  icon?: ComponentType<unknown>
  content?: string // For text-based buttons like "B", "I", "U"
}

export interface PickerButtonConfig extends BaseButtonConfig {
  type: 'picker'
  picker: 'color-text' | 'color-background' | 'image' | 'image-floating' | 'table' | 'line-spacing'
  icon?: ComponentType<unknown>
}

export interface SelectButtonConfig extends Omit<BaseButtonConfig, 'label'> {
  type: 'select'
  options: Array<{ value: string; label: string; disabled?: boolean }>
  defaultValue?: string
  selectLabel?: string // Label for the select dropdown (placeholder)
  label: string // Required label for accessibility
}

export type ButtonConfig = CommandButtonConfig | ToggleButtonConfig | PickerButtonConfig | SelectButtonConfig

// ============================================================================
// History Buttons
// ============================================================================

export const HISTORY_BUTTONS: (CommandButtonConfig | ToggleButtonConfig)[] = [
  { id: 'undo', type: 'command', command: 'undo', label: 'Undo', shortcut: 'Ctrl+Z' },
  { id: 'redo', type: 'command', command: 'redo', label: 'Redo', shortcut: 'Ctrl+Y' },
  { id: 'format-painter', type: 'toggle', command: 'formatPainter', label: 'Format Painter' },
  { id: 'clear-format', type: 'command', command: 'removeFormat', label: 'Clear formatting', shortcut: 'Ctrl+Shift+N' }
]

// ============================================================================
// Format Buttons (Text formatting)
// ============================================================================

export const FORMAT_BUTTONS: ToggleButtonConfig[] = [
  { id: 'format-bold', type: 'toggle', command: 'bold', label: 'Bold', shortcut: 'Ctrl+B' },
  { id: 'format-italic', type: 'toggle', command: 'italic', label: 'Italic', shortcut: 'Ctrl+I' },
  { id: 'format-underline', type: 'toggle', command: 'underline', label: 'Underline', shortcut: 'Ctrl+U' },
  { id: 'format-strike', type: 'toggle', command: 'strikeThrough', label: 'Strikethrough', shortcut: 'Ctrl+Shift+S' },
  { id: 'superscript', type: 'toggle', command: 'superscript', label: 'Superscript' },
  { id: 'subscript', type: 'toggle', command: 'subscript', label: 'Subscript' }
]

// ============================================================================
// Color Buttons
// ============================================================================

export const COLOR_BUTTONS: PickerButtonConfig[] = [
  { id: 'text-color', type: 'picker', picker: 'color-text', label: 'Text color' },
  { id: 'background-color', type: 'picker', picker: 'color-background', label: 'Background color' }
]

// ============================================================================
// Alignment Buttons
// ============================================================================

export const ALIGNMENT_BUTTONS: CommandButtonConfig[] = [
  { id: 'align-left', type: 'command', command: 'justifyLeft', label: 'Align left', shortcut: 'Ctrl+L' },
  { id: 'align-center', type: 'command', command: 'justifyCenter', label: 'Align center', shortcut: 'Ctrl+E' },
  { id: 'align-right', type: 'command', command: 'justifyRight', label: 'Align right', shortcut: 'Ctrl+R' },
  { id: 'align-justify', type: 'command', command: 'justifyFull', label: 'Justify', shortcut: 'Ctrl+J' }
]

// ============================================================================
// Indentation Buttons
// ============================================================================

export const INDENT_BUTTONS: (CommandButtonConfig | PickerButtonConfig)[] = [
  { id: 'outdent', type: 'command', command: 'outdent', label: 'Outdent', shortcut: 'Shift+Tab' },
  { id: 'indent', type: 'command', command: 'indent', label: 'Indent', shortcut: 'Tab' },
  { id: 'line-spacing', type: 'picker', picker: 'line-spacing', label: 'Line Spacing' }
]

// ============================================================================
// List Buttons
// ============================================================================

export const LIST_BUTTONS: CommandButtonConfig[] = [
  { id: 'bulleted-list', type: 'command', command: 'insertUnorderedList', label: 'Bulleted list', shortcut: 'Ctrl+Shift+8' },
  { id: 'numbered-list', type: 'command', command: 'insertOrderedList', label: 'Numbered list', shortcut: 'Ctrl+Shift+7' }
]

// ============================================================================
// Link Buttons
// ============================================================================

export const LINK_BUTTONS: CommandButtonConfig[] = [
  { id: 'link', type: 'command', command: 'createLink', label: 'Insert link', shortcut: 'Ctrl+K' },
  { id: 'unlink', type: 'command', command: 'unlink', label: 'Remove link', shortcut: 'Ctrl+Shift+K' }
]

// ============================================================================
// Media Buttons (Image, Table, HR)
// ============================================================================

export const MEDIA_BUTTONS: (CommandButtonConfig | PickerButtonConfig)[] = [
  { id: 'image', type: 'picker', picker: 'image', label: 'Insert image' },
  { id: 'floating-image', type: 'picker', picker: 'image-floating', label: 'Insert floating image' },
  { id: 'table', type: 'picker', picker: 'table', label: 'Insert table' },
  { id: 'hr', type: 'command', command: 'insertHorizontalRule', label: 'Horizontal line' }
]

// ============================================================================
// Utility Buttons
// ============================================================================

export const UTILITY_BUTTONS: CommandButtonConfig[] = []

// ============================================================================
// Export groups for use in toolbar config
// ============================================================================

export const BUTTON_GROUPS = {
  history: HISTORY_BUTTONS,
  format: FORMAT_BUTTONS,
  colors: COLOR_BUTTONS,
  alignment: ALIGNMENT_BUTTONS,
  indent: INDENT_BUTTONS,
  lists: LIST_BUTTONS,
  links: LINK_BUTTONS,
  media: MEDIA_BUTTONS,
  utility: UTILITY_BUTTONS
} as const
