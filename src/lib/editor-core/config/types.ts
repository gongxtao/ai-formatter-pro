/**
 * Configuration System Type Definitions
 */

import type { ComponentType } from 'react'

// ==================== 编辑器配置类型 ====================

/**
 * 工具栏按钮类型
 */
export interface ToolbarButton {
  type: 'button'
  id: string
  icon?: string | ComponentType
  label?: string
  tooltip?: string
  command: string
  commandArgs?: any[]
  disabled?: boolean
  active?: (state: any) => boolean
}

/**
 * 工具栏选择器类型
 */
export interface ToolbarSelect {
  type: 'select'
  id: string
  label?: string
  items: Array<{ value: string; label: string }>
  defaultValue: string
  command: string
  onChange?: (value: string) => void
}

/**
 * 工具栏颜色选择器类型
 */
export interface ToolbarColorPicker {
  type: 'color-picker'
  id: string
  label?: string
  command: string
  colors?: string[]
}

/**
 * 工具栏项类型
 */
export type ToolbarItem = ToolbarButton | ToolbarSelect | ToolbarColorPicker

/**
 * 工具栏组
 */
export interface ToolbarGroup {
  id: string
  items: ToolbarItem[]
  separator?: boolean
}

/**
 * 工具栏行
 */
export interface ToolbarRow {
  groups: ToolbarGroup[]
}

/**
 * 工具栏配置
 */
export interface ToolbarConfig {
  position?: 'top' | 'bottom' | 'floating'
  rows?: ToolbarRow[]
  customButtons?: ToolbarButton[]
}

/**
 * 快捷键配置
 */
export interface ShortcutConfig {
  key: string
  command: string
  commandArgs?: any[]
  preventDefault?: boolean
}

/**
 * 图片配置
 */
export interface ImageConfig {
  maxSize: number // bytes
  maxWidth: number // px
  maxHeight: number // px
  defaultWidth: number
  defaultHeight: number
  resizeHandles: 'all' | 'corners' | 'disabled'
}

/**
 * 表格配置
 */
export interface TableConfig {
  maxSize: { rows: number; cols: number }
  defaultSize: { rows: number; cols: number }
  resizeEnabled: boolean
  mergeEnabled: boolean
  splitEnabled: boolean
}

/**
 * 浮动图片配置
 */
export interface FloatingImageConfig {
  enabled: boolean
  defaultWidth: number
  defaultHeight: number
  minSize: number
  maxSize: number
}

/**
 * 历史配置
 */
export interface HistoryConfig {
  maxSize: number
  debounceDelay: number
}

/**
 * 主题配置
 */
export interface ThemeConfig {
  mode: 'light' | 'dark'
  colors?: {
    primary?: string
    secondary?: string
    background?: string
    surface?: string
    border?: string
    text?: string
    textSecondary?: string
  }
}

/**
 * 编辑器完整配置
 */
export interface EditorConfig {
  // 基础配置
  locale?: string
  readonly?: boolean
  spellcheck?: boolean

  // 内容配置
  content?: {
    initialContent?: string
    placeholder?: string
    sanitize?: boolean
    allowedTags?: string[]
    allowedAttributes?: Record<string, string[]>
  }

  // 工具栏配置
  toolbar?: ToolbarConfig

  // 快捷键配置
  shortcuts?: ShortcutConfig[]

  // 图片配置
  image?: Partial<ImageConfig>

  // 表格配置
  table?: Partial<TableConfig>

  // 浮动图片配置
  floatingImage?: Partial<FloatingImageConfig>

  // 历史配置
  history?: Partial<HistoryConfig>

  // 主题配置
  theme?: ThemeConfig
}

/**
 * 验证结果
 */
export interface ValidationResult {
  valid: boolean
  errors: string[]
}

/**
 * 配置监听器
 */
export type ConfigListener<K extends keyof EditorConfig = keyof EditorConfig> = (
  key: K,
  newValue: EditorConfig[K],
  oldValue: EditorConfig[K]
) => void
