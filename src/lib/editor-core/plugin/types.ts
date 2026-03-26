/**
 * Plugin System Type Definitions
 */

import type { CommandManager, StateManager, HistoryManager } from '..'
import type { EventBus } from './EventBus'
import type { ComponentType } from 'react'

// ==================== 插件核心类型 ====================

/**
 * 插件状态
 */
export type PluginState = 'registered' | 'active'

/**
 * 插件实例
 */
export interface PluginInstance {
  plugin: Plugin
  config?: any
  state: PluginState
}

/**
 * 插件接口
 */
export interface Plugin<TConfig = any> {
  // 插件元信息
  name: string
  version: string
  description?: string
  author?: string

  // 依赖管理
  dependencies?: string[]
  peerDependencies?: string[]

  // 生命周期钩子
  install: (api: EditorAPI, config?: TConfig) => void | Promise<void>
  uninstall?: () => void | Promise<void>

  // 激活/停用
  activate?: () => void | Promise<void>
  deactivate?: () => void | Promise<void>

  // 扩展点
  extends?: PluginExtensions
}

/**
 * 插件扩展点
 */
export interface PluginExtensions {
  // 自定义命令
  commands?: Record<string, CommandExtension>

  // 工具栏扩展
  toolbar?: ToolbarExtension

  // 快捷键扩展
  shortcuts?: ShortcutExtension[]

  // 事件监听器
  eventListeners?: EventListenerExtension[]

  // 生命周期钩子
  hooks?: HookExtension
}

// ==================== 命令扩展类型 ====================

/**
 * 命令扩展
 */
export interface CommandExtension {
  execute: (...args: any[]) => void
  queryState?: () => boolean
  queryValue?: () => string
}

// ==================== 工具栏扩展类型 ====================

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
  active?: () => boolean
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
 * 工具栏扩展
 */
export interface ToolbarExtension {
  position?: 'left' | 'right' | 'custom'
  groups?: ToolbarGroup[]
  buttons?: ToolbarButton[]
}

/**
 * 工具栏组
 */
export interface ToolbarGroup {
  id: string
  items: ToolbarItem[]
  separator?: boolean
}

/**
 * 工具栏项类型
 */
export type ToolbarItem = ToolbarButton | ToolbarSelect

// ==================== 快捷键扩展类型 ====================

/**
 * 快捷键扩展
 */
export interface ShortcutExtension {
  key: string
  command: string
  commandArgs?: any[]
  preventDefault?: boolean
}

// ==================== 事件监听器类型 ====================

/**
 * 事件监听器扩展
 */
export interface EventListenerExtension {
  event: string
  handler: (...args: any[]) => void
  priority?: number
}

// ==================== 生命周期钩子类型 ====================

/**
 * 内容变化上下文
 */
export interface ContentChangeContext {
  content: string
  selection: Selection | null
}

/**
 * 命令执行上下文
 */
export interface CommandContext {
  command: string
  args: any[]
}

/**
 * 钩子扩展
 */
export interface HookExtension {
  beforeContentChange?: (context: ContentChangeContext) => void | Promise<void>
  afterContentChange?: (context: ContentChangeContext) => void | Promise<void>
  beforeCommand?: (context: CommandContext) => CommandContext | Promise<CommandContext>
  afterCommand?: (context: CommandContext) => void | Promise<void>
}

// ==================== 编辑器 API 类型 ====================

/**
 * 编辑器核心 API
 * 提供给插件使用
 */
export interface EditorAPI {
  // 核心模块
  commands: CommandManager
  state: StateManager
  history: HistoryManager
  events: EventBus

  // 工具函数
  utils: {
    getDocument: () => Document | null
  }
}
