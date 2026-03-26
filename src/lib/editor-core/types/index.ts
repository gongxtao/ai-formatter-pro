/**
 * Editor Core Type Definitions
 */

// ==================== 基础类型 ====================

/**
 * 编辑器状态接口
 */
export interface EditorState {
  // 编辑状态
  isEditing: boolean
  readonly: boolean

  // 选择状态
  selection: Selection | null
  selectedImage: HTMLImageElement | null
  selectedFloatingImageId: string | null
  activeTable: HTMLTableElement | null

  // 内容状态
  content: string
  floatingImages: FloatingImageItem[]

  // UI 状态
  toolbarVisible: boolean
  sidebarVisible: boolean
}

/**
 * 浮动图片项
 */
export interface FloatingImageItem {
  id: string
  src: string
  x: number
  y: number
  width: number
  height: number
  ratio?: number
}

// ==================== 命令相关类型 ====================

/**
 * 命令处理函数
 */
export type CommandHandler = (...args: any[]) => void

/**
 * 命令状态查询函数
 */
export type CommandStateQuery = (...args: any[]) => boolean

/**
 * 命令值查询函数
 */
export type CommandValueQuery = (...args: any[]) => string

// ==================== 状态相关类型 ====================

/**
 * 状态更新函数
 */
export type StateUpdater =
  | Partial<EditorState>
  | ((currentState: EditorState) => EditorState)

/**
 * 状态监听器
 */
export type StateListener = (newState: EditorState, oldState: EditorState) => void

// ==================== 历史相关类型 ====================

/**
 * 历史状态快照
 */
export interface HistorySnapshot {
  state: EditorState
  timestamp: number
}

// ==================== 选择相关类型 ====================

/**
 * 保存的选择区
 */
export interface SavedSelection {
  startPath: number[]
  startOffset: number
  endPath: number[]
  endOffset: number
}

export type {
  Plugin,
  PluginInstance,
  PluginState,
  EditorAPI,
  CommandExtension,
  ToolbarExtension
} from '../plugin/types'

export type { EditorConfig, ToolbarConfig } from '../config/types'

export type { Theme, ThemeColors } from '../theme/ThemeManager'
