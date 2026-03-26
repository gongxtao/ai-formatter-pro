/**
 * Editor Core - 编辑器核心引擎
 *
 * 提供编辑器的核心功能：
 * - 命令管理 (CommandManager)
 * - 状态管理 (StateManager)
 * - 历史管理 (HistoryManager)
 * - 插件系统 (PluginManager)
 * - 配置管理 (ConfigManager)
 * - 主题管理 (ThemeManager)
 */

// 核心模块
export { CommandManager } from './command'
export { StateManager, DEFAULT_STATE } from './state'
export { HistoryManager } from './history'
export { PluginManager, EventBus } from './plugin'
export { ConfigManager, DEFAULT_CONFIG } from './config'
export { ThemeManager, BUILTIN_THEMES } from './theme'
export { registerBuiltinCommands } from './command/commands'

// 类型定义
export type {
  EditorState,
  FloatingImageItem,
  CommandHandler,
  CommandStateQuery,
  CommandValueQuery,
  StateUpdater,
  StateListener,
  HistorySnapshot,
  SavedSelection,
  Plugin,
  PluginInstance,
  PluginState,
  EditorAPI,
  CommandExtension,
  ToolbarExtension,
  EditorConfig,
  ToolbarConfig,
  Theme,
  ThemeColors
} from './types'
