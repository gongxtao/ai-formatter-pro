# Editor Core API 文档

## 概述

Editor Core 是一个可复用的富文本编辑器核心引擎，提供了命令管理、状态管理、历史管理、插件系统、配置系统和主题系统。

## 快速开始

### 基础用法示例

```typescript
'use client'

import { useRef, useEffect } from 'react'
import {
  CommandManager,
  StateManager,
  HistoryManager,
  registerBuiltinCommands
} from '@/lib/editor-core'

export function MyEditor() {
  const iframeRef = useRef<HTMLIFrameElement>(null)

  // 初始化核心管理器
  const commandManager = useRef<CommandManager | null>(null)
  const stateManager = useRef<StateManager | null>(null)
  const historyManager = useRef<HistoryManager | null>(null)

  useEffect(() => {
    // 初始化
    commandManager.current = new CommandManager()
    stateManager.current = new StateManager({ content: '<p>Hello World</p>' })
    historyManager.current = new HistoryManager()

    // 注册内置命令
    registerBuiltinCommands(commandManager.current)

    // 保存初始状态
    historyManager.current.push(stateManager.current.getState())
  }, [])

  const getIframeDoc = () => iframeRef.current?.contentDocument

  const handleBold = () => {
    const doc = getIframeDoc()
    if (doc && commandManager.current) {
      commandManager.current.execute('bold', doc)

      // 更新状态
      const newContent = doc.documentElement.outerHTML
      stateManager.current?.partialUpdate({ content: newContent })

      // 保存历史
      historyManager.current?.push(stateManager.current.getState())
    }
  }

  const handleUndo = () => {
    const previous = historyManager.current?.undo()
    if (previous && stateManager.current) {
      stateManager.current.setState(previous)

      // 更新 iframe 内容
      const doc = getIframeDoc()
      if (doc && previous.content) {
        doc.documentElement.outerHTML = previous.content
      }
    }
  }

  return (
    <div>
      <button onClick={handleBold}>Bold</button>
      <button
        onClick={handleUndo}
        disabled={!historyManager.current?.canUndo()}
      >
        Undo
      </button>
      <iframe ref={iframeRef} />
    </div>
  )
}
```

## 核心模块

### CommandManager - 命令管理器

负责编辑器命令的注册、执行和状态查询。

#### API

```typescript
import { CommandManager } from '@/lib/editor-core'

const manager = new CommandManager()

// 注册命令
manager.register('bold', (doc: Document) => {
  doc.execCommand('bold')
})

// 执行命令
manager.execute('bold', doc)

// 查询命令状态
const isActive = manager.queryState('bold', doc)

// 查询命令值
const value = manager.queryValue('foreColor', doc)
```

#### 方法

| 方法 | 描述 |
|------|------|
| `register(name, handler, stateQuery?, valueQuery?)` | 注册命令 |
| `execute(name, ...args)` | 执行命令 |
| `queryState(name)` | 查询命令状态 |
| `queryValue(name)` | 查询命令值 |
| `unregister(name)` | 注销命令 |
| `has(name)` | 检查命令是否存在 |
| `getCommandNames()` | 获取所有命令名称 |
| `clear()` | 清空所有命令 |

### StateManager - 状态管理器

负责编辑器状态的管理和通知。

#### API

```typescript
import { StateManager, DEFAULT_STATE } from '@/lib/editor-core'

const manager = new StateManager({
  content: '<p>Hello</p>',
  isEditing: true
})

// 获取状态
const state = manager.getState()

// 更新状态
manager.setState({ content: '<p>New content</p>' })

// 部分更新
manager.partialUpdate({ isEditing: false })

// 订阅状态变化
const unsubscribe = manager.subscribe((newState, oldState) => {
  console.log('State changed:', newState)
})

// 批量更新
manager.beginBatch()
manager.partialUpdate({ content: '...' })
manager.partialUpdate({ isEditing: true })
manager.endBatch()
```

#### 方法

| 方法 | 描述 |
|------|------|
| `getState()` | 获取当前状态 |
| `setState(updater)` | 更新状态 |
| `partialUpdate(partial)` | 部分更新状态 |
| `subscribe(listener)` | 订阅状态变化 |
| `beginBatch()` | 开始批量更新 |
| `endBatch()` | 结束批量更新 |
| `reset()` | 重置到初始状态 |

### HistoryManager - 历史管理器

负责编辑器的撤销/重做功能。

#### API

```typescript
import { HistoryManager } from '@/lib/editor-core'

const manager = new HistoryManager(100) // 最多保存100条历史

// 保存状态
manager.push(currentState)

// 撤销
const previous = manager.undo()

// 重做
const next = manager.redo()

// 检查是否可以撤销/重做
if (manager.canUndo()) {
  manager.undo()
}
```

#### 方法

| 方法 | 描述 |
|------|------|
| `push(state)` | 保存状态到历史 |
| `undo()` | 撤销 |
| `redo()` | 重做 |
| `canUndo()` | 检查是否可以撤销 |
| `canRedo()` | 检查是否可以重做 |
| `clear()` | 清空历史 |
| `setEnabled(enabled)` | 启用/禁用历史记录 |
| `getStats()` | 获取历史统计信息 |

### PluginManager - 插件管理器

负责插件的注册、激活和管理。

#### API

```typescript
import { PluginManager, EventBus } from '@/lib/editor-core'

const eventBus = new EventBus()
const manager = new PluginManager(api, eventBus)

// 注册插件
await manager.register({
  name: 'my-plugin',
  version: '1.0.0',
  install: (api) => {
    // 插件初始化
  },
  extends: {
    commands: {
      customCommand: {
        execute: (...args) => {
          // 命令实现
        }
      }
    }
  }
})

// 激活插件
await manager.activate('my-plugin')

// 停用插件
await manager.deactivate('my-plugin')
```

#### 插件接口

```typescript
interface Plugin {
  name: string
  version: string
  description?: string
  author?: string
  dependencies?: string[]
  peerDependencies?: string[]

  install: (api: EditorAPI, config?: any) => void | Promise<void>
  uninstall?: () => void | Promise<void>
  activate?: () => void | Promise<void>
  deactivate?: () => void | Promise<void>

  extends?: {
    commands?: Record<string, CommandExtension>
    toolbar?: ToolbarExtension
    shortcuts?: ShortcutExtension[]
    eventListeners?: EventListenerExtension[]
    hooks?: HookExtension
  }
}
```

### EventBus - 事件总线

实现发布-订阅模式的事件系统。

#### API

```typescript
import { EventBus } from '@/lib/editor-core'

const bus = new EventBus()

// 订阅事件
const unsubscribe = bus.on('content-change', (data) => {
  console.log('Content changed:', data)
})

// 一次性订阅
bus.once('init', () => {
  console.log('Initialized')
})

// 触发事件
bus.emit('content-change', { content: '...' })

// 批量触发
bus.emitBatch([
  { event: 'event1', args: ['arg1'] },
  { event: 'event2', args: ['arg2'] }
])

// 取消订阅
unsubscribe()
```

### ConfigManager - 配置管理器

负责编辑器配置的管理和验证。

#### API

```typescript
import { ConfigManager, DEFAULT_CONFIG } from '@/lib/editor-core'

const manager = new ConfigManager({
  locale: 'en-US',
  image: {
    maxSize: 10 * 1024 * 1024
  }
})

// 获取配置
const locale = manager.get('locale')

// 设置配置
manager.set('readonly', true)

// 合并配置
manager.merge({
  toolbar: {
    position: 'bottom'
  }
})

// 订阅配置变化
manager.subscribe('locale', (key, newValue, oldValue) => {
  console.log(`${key} changed from ${oldValue} to ${newValue}`)
})
```

### ThemeManager - 主题管理器

基于 Tailwind CSS 的主题系统。

#### API

```typescript
import { ThemeManager, BUILTIN_THEMES } from '@/lib/editor-core'

const manager = new ThemeManager()

// 设置主题
manager.setTheme('dark')

// 切换暗色模式
manager.toggleDarkMode()

// 获取主题类名（用于 Tailwind）
const themeClass = manager.getThemeClass() // 'dark' 或 ''

// 订阅主题变化
manager.onChange((theme) => {
  console.log('Theme changed to:', theme.name)
})

// 注册自定义主题
manager.registerTheme({
  name: 'custom',
  mode: 'light',
  colors: {
    primary: '#ff0000',
    secondary: '#00ff00',
    background: '#ffffff',
    surface: '#f0f0f0',
    border: '#cccccc',
    text: '#000000',
    textSecondary: '#666666'
  }
})
```

## useEditorCore Hook

整合所有核心模块的便捷 Hook。

```typescript
import { useEditorCore } from '@/components/editor/hooks/useEditorCore'

function MyEditor() {
  const {
    // 执行命令
    executeCommand,
    queryCommandState,
    queryCommandValue,

    // 历史操作
    undo,
    redo,
    canUndo,
    canRedo,

    // 状态操作
    getState,
    setState,
    subscribe,

    // 工具函数
    getIframeDoc,
    setEditing
  } = useEditorCore({
    initialContent: '<p>Hello World</p>',
    onContentChange: (content) => {
      console.log('Content changed:', content)
    },
    iframeRef
  })

  return (
    <div>
      <button onClick={() => executeCommand('bold')}>Bold</button>
      <button onClick={undo} disabled={!canUndo()}>Undo</button>
    </div>
  )
}
```

## 内置命令

Editor Core 注册了以下内置命令：

### 文本格式化
- `bold` - 粗体
- `italic` - 斜体
- `underline` - 下划线
- `strikeThrough` - 删除线
- `superscript` - 上标
- `subscript` - 下标

### 段落格式
- `formatBlock` - 格式块（标题、段落等）
- `justifyLeft` - 左对齐
- `justifyCenter` - 居中对齐
- `justifyRight` - 右对齐
- `justifyFull` - 两端对齐

### 列表
- `insertUnorderedList` - 无序列表
- `insertOrderedList` - 有序列表

### 插入
- `createLink` - 插入链接
- `unlink` - 取消链接
- `insertImage` - 插入图片
- `insertHorizontalRule` - 插入分割线
- `insertTable` - 插入表格

### 其他
- `foreColor` - 文字颜色
- `hiliteColor` - 背景颜色
- `removeFormat` - 清除格式
- `undo` - 撤销
- `redo` - 重做

## 开发插件

创建一个简单的插件：

```typescript
import type { Plugin, EditorAPI } from '@/lib/editor-core'

const wordCountPlugin: Plugin = {
  name: 'word-count',
  version: '1.0.0',
  description: 'Count words in the document',

  install(api, config) {
    // 注册命令
    api.commands.register('countWords', () => {
      const content = api.state.getState().content
      const count = content.split(/\s+/).filter(w => w.length > 0).length
      console.log(`Word count: ${count}`)
    })

    // 监听内容变化
    api.events.on('content-change', () => {
      console.log('Content changed, updating word count...')
    })
  },

  uninstall() {
    console.log('Word count plugin uninstalled')
  }
}
```

使用插件：

```typescript
import { PluginManager, EventBus } from '@/lib/editor-core'
import { CommandManager, StateManager, HistoryManager } from '@/lib/editor-core'

const commandManager = new CommandManager()
const stateManager = new StateManager()
const historyManager = new HistoryManager()
const eventBus = new EventBus()

const api = {
  commands: commandManager,
  state: stateManager,
  history: historyManager,
  events: eventBus,
  utils: { getDocument: () => null }
}

const pluginManager = new PluginManager(api, eventBus)
await pluginManager.register(wordCountPlugin)
```

## 类型定义

所有核心模块都有完整的 TypeScript 类型定义：

```typescript
import type {
  EditorState,
  CommandHandler,
  Plugin,
  EditorAPI,
  EditorConfig,
  Theme,
  // ... 更多类型
} from '@/lib/editor-core'
```
