# 05 - 编辑器复用方案

## 概述

复用现有编辑器组件体系（~62 个文件），不做二次开发。编辑器基于 contenteditable（非 TipTap），使用 iframe 隔离样式。

## editor-core 库（18 个文件）

框架无关，直接从 `src/lib/editor-core/` 迁移。

```
src/lib/editor-core/
├── index.ts                    # 中心导出
├── README.md                   # API 文档
├── types/
│   └── index.ts              # EditorState, FloatingImageItem 等类型
├── command/
│   ├── CommandManager.ts      # 命令注册与执行
│   ├── commands.ts            # 内置命令（bold, italic, table 等 20+）
│   └── index.ts
├── state/
│   ├── StateManager.ts        # 可观察状态管理（batch updates, subscriptions）
│   └── index.ts
├── history/
│   ├── HistoryManager.ts      # 撤销/重做（past/present/future）
│   └── index.ts
├── plugin/
│   ├── PluginManager.ts       # 插件生命周期
│   ├── EventBus.ts            # 发布/订阅事件
│   ├── types.ts               # Plugin, EditorAPI 类型
│   └── index.ts
├── config/
│   ├── ConfigManager.ts       # 配置管理（验证, merge, subscribe）
│   ├── types.ts               # EditorConfig, ToolbarConfig 等
│   └── index.ts
└── theme/
    ├── ThemeManager.ts        # Tailwind 主题系统（light/dark）
    └── index.ts
```

### 内置命令（20+）

| 类别 | 命令 |
|------|------|
| 历史 | `undo`, `redo` |
| 文本 | `bold`, `italic`, `underline`, `strikeThrough`, `superscript`, `subscript` |
| 对齐 | `justifyLeft`, `justifyCenter`, `justifyRight`, `justifyFull` |
| 缩进 | `indent`, `outdent` |
| 列表 | `insertUnorderedList`, `insertOrderedList` |
| 插入 | `createLink`, `unlink`, `insertImage`, `insertHorizontalRule` |
| 块 | `formatBlock` |
| 颜色 | `foreColor`, `hiliteColor` |
| 表格 | `insertTable` |
| 其他 | `fontFamily`, `fontSize`, `lineHeight`, `removeFormat` |

## 编辑器组件（44 个文件）

React + TailwindCSS 组件，从 `src/components/editor/` 迁移。

### 核心组件

| 文件 | 功能 |
|------|------|
| `EditablePreview.tsx` | 主组件：contenteditable + iframe，A4 排版 |
| `EditorToolbar.tsx` | 格式化工具栏容器 |
| `FloatingImageLayer.tsx` | 可拖拽浮动图片层 |
| `ImageResizer.tsx` | 图片缩放手柄 |
| `Sidebar.tsx` | 编辑器侧栏 |

### Hooks

| 文件 | 功能 |
|------|------|
| `hooks/useEditablePreviewInteractions.ts` | 鼠标/键盘交互处理 |
| `hooks/useEditablePreviewContentSync.ts` | iframe 内容同步 |

### Utils

| 文件 | 功能 |
|------|------|
| `utils/table.ts` | TableHandler 表格操作类 |

### Toolbar 子目录（34 个文件）

```
toolbar/
├── index.ts
├── config/ (buttonConfigs, constants, toolbarConfig)
├── core/ (ButtonRenderer, ToolbarRow, ToolbarSection)
├── buttons/ (CommandButton, ToggleButton, ToolbarButton)
├── groups/ (ToolbarGroup, ToolbarSeparator)
├── pickers/ (ColorGrid, ColorPicker, ImagePicker, LineSpacingPicker, PickerDropdown, TablePicker)
├── inputs/ (ToolbarDropdown, ToolbarSelect)
└── hooks/ (useDropdownState, useEditorCommands, useEditorState)
```

### Icons（28 个 SVG 图标）

BoldIcon, ItalicIcon, UnderlineIcon, StrikeThroughIcon, SuperscriptIcon, SubscriptIcon,
AlignIcon, IndentIcon, OutdentIcon, ListIcon, LinkIcon, UnlinkIcon, ImageIcon, DividerIcon,
TableIcon, UndoIcon, RedoIcon, CodeIcon, QuoteIcon, RemoveFormatIcon, FormatPainterIcon,
FloatingImageIcon, LineSpacingIcon, ChevronDownIcon, AddRowIcon, AddColumnIcon,
DeleteRowIcon, DeleteColumnIcon

## EditablePreview 核心 API

```typescript
interface EditablePreviewProps {
  selectedFile: string | null          // 模板 HTML 文件 URL
  content: string                      // 编辑器 HTML 内容
  onContentChange: (content: string) => void
  floatingImages?: FloatingImageItem[]
  onFloatingImagesChange?: (images: FloatingImageItem[]) => void
  isGenerating?: boolean
  initialEditing?: boolean
  hideControls?: boolean
  hideToolbar?: boolean
  onBackToTemplates?: () => void
  onSave?: (payload: { htmlContent: string; floatingImages: FloatingImageItem[] }) => void
  onDownloadPDF?: (payload: { htmlContent: string; floatingImages: FloatingImageItem[] }) => void
  isSaving?: boolean
  isDownloadingPDF?: boolean
  iframeRef?: RefObject<HTMLIFrameElement>
  previewRef?: Ref<EditablePreviewRef>
}

interface EditablePreviewRef {
  insertFloatingImage: (imageUrl: string) => void
}
```

## 内部依赖

```
EditablePreview
  ├── EditorToolbar
  ├── ImageResizer
  ├── FloatingImageLayer
  ├── TableSmartToolbar
  ├── useEditablePreviewInteractions (hook)
  ├── useEditablePreviewContentSync (hook)
  ├── TableHandler (utils)
  └── editor-core/
      ├── HistoryManager
      └── EditorState (type)
```

## 注意事项

- EditablePreview 使用 iframe 隔离编辑内容，A4 样式在 iframe 内部定义
- 浮动图片层覆盖在 iframe 上方，通过 `FloatingImageLayer` 组件实现
- 工具栏按钮的命令通过 `CommandManager` 执行，支持扩展
