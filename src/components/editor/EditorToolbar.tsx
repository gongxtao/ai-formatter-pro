/**
 * EditorToolbar Component (彻底迁移到核心引擎)
 * Configuration-driven toolbar implementation
 * 直接使用 CommandManager 而非通过 Hook
 */

'use client'

import React, { RefObject, useRef, useMemo, useCallback } from 'react'

// Core components
import ToolbarRow from './toolbar/core/ToolbarRow'
import ButtonRenderer from './toolbar/core/ButtonRenderer'

// Groups
import ToolbarGroup from './toolbar/groups/ToolbarGroup'
import ToolbarSeparator from './toolbar/groups/ToolbarSeparator'

// Core Engine - 直接使用
import { CommandManager, registerBuiltinCommands } from '@/lib/editor-core'

// Hooks - 仅保留查询状态的 Hook
import { useEditorState } from './toolbar/hooks/useEditorState'

// Config
import { BUTTON_GROUPS, TOOLBAR_CONFIG } from './toolbar/config'

// Icons
import {
  AlignIcon,
  ListIcon,
  LinkIcon,
  UnlinkIcon,
  DividerIcon,
  UndoIcon,
  RedoIcon,
  IndentIcon,
  OutdentIcon,
  SuperscriptIcon,
  SubscriptIcon,
  RemoveFormatIcon,
  LineSpacingIcon,
  BoldIcon,
  ItalicIcon,
  UnderlineIcon,
  StrikeThroughIcon,
  FloatingImageIcon,
  ImageIcon,
  FormatPainterIcon
} from './icons'
import type { IconProps } from './icons/IconProps'
import type {
  CommandButtonConfig,
  ToggleButtonConfig,
  PickerButtonConfig,
  SelectButtonConfig
} from './toolbar/config'

/**
 * Props for the EditorToolbar component
 */
export interface EditorToolbarProps {
  iframeRef: RefObject<HTMLIFrameElement>
  onContentChange: (content: string) => void
  isEditing: boolean
  disabled?: boolean
  onFloatingImageInsert?: (imageUrl: string) => void
  onUndo?: () => void
  onRedo?: () => void
  refreshToken?: number
}

/**
 * Main toolbar component - 直接使用 CommandManager
 */
const EditorToolbar: React.FC<EditorToolbarProps> = ({
  iframeRef,
  onContentChange,
  isEditing,
  disabled: propsDisabled,
  onFloatingImageInsert,
  onUndo,
  onRedo,
  refreshToken = 0
}) => {
  // CommandManager - 直接使用核心引擎
  const commandManagerRef = useRef<CommandManager | null>(null)
  if (!commandManagerRef.current) {
    commandManagerRef.current = new CommandManager()
    registerBuiltinCommands(commandManagerRef.current)
  }
  const commandManager = commandManagerRef.current

  // Icon mapping for button configs
  const iconMap: Record<string, React.ComponentType<IconProps>> = {
    'undo': UndoIcon,
    'redo': RedoIcon,
    'align-left': () => <AlignIcon type="left" />,
    'align-center': () => <AlignIcon type="center" />,
    'align-right': () => <AlignIcon type="right" />,
    'align-justify': () => <AlignIcon type="justify" />,
    'outdent': OutdentIcon,
    'indent': IndentIcon,
    'bulleted-list': () => <ListIcon type="unordered" />,
    'numbered-list': () => <ListIcon type="ordered" />,
    'link': LinkIcon,
    'unlink': UnlinkIcon,
    'hr': DividerIcon,
    'superscript': SuperscriptIcon,
    'subscript': SubscriptIcon,
    'clear-format': RemoveFormatIcon,
    'line-spacing': LineSpacingIcon,
    'format-bold': BoldIcon,
    'format-italic': ItalicIcon,
    'format-underline': UnderlineIcon,
    'format-strike': StrikeThroughIcon,
    'image': ImageIcon,
    'floating-image': FloatingImageIcon,
    'format-painter': FormatPainterIcon
  }

  /**
   * Assign icons to button configs
   */
  const assignIconsToConfigs = <T extends CommandButtonConfig | ToggleButtonConfig | PickerButtonConfig>(configs: T[]): T[] => {
    if (!configs) return []
    return configs.map(config => ({
      ...config,
      icon: iconMap[config.id] as unknown as T['icon']
    }))
  }

  const disabled = propsDisabled || !isEditing

  // 获取 iframe document
  const getIframeDoc = useCallback(() => {
    return iframeRef.current?.contentDocument ||
           iframeRef.current?.contentWindow?.document ||
           null
  }, [iframeRef])

  // Use editor state hook - 保留用于查询格式状态
  const { editorState } = useEditorState({ iframeRef, refreshToken })

  // 格式刷状态 - 需要手动管理
  const [isFormatPainterActive, setIsFormatPainterActive] = React.useState(false)
  const savedStylesRef = useRef<Record<string, unknown>>({})
  const savedSelectionRangeRef = useRef<Range | null>(null)

  const captureSelectionRange = useCallback(() => {
    const doc = getIframeDoc()
    if (!doc) return
    const selection = doc.getSelection()
    if (selection && selection.rangeCount > 0) {
      savedSelectionRangeRef.current = selection.getRangeAt(0).cloneRange()
    }
  }, [getIframeDoc])

  const restoreSelectionRange = useCallback((doc: Document) => {
    const selection = doc.getSelection()
    const savedRange = savedSelectionRangeRef.current
    if (!selection || !savedRange) return
    try {
      selection.removeAllRanges()
      selection.addRange(savedRange.cloneRange())
    } catch (e) {
    }
  }, [])

  const prepareEditorSelection = useCallback(() => {
    const doc = getIframeDoc()
    if (!doc) return null
    iframeRef.current?.focus()
    const selection = doc.getSelection()
    if (!selection || selection.rangeCount === 0) {
      restoreSelectionRange(doc)
    }
    return doc
  }, [getIframeDoc, iframeRef, restoreSelectionRange])

  React.useEffect(() => {
    const doc = getIframeDoc()
    if (!doc) return

    const handleSelectionCapture = () => {
      captureSelectionRange()
    }

    doc.addEventListener('selectionchange', handleSelectionCapture)
    doc.addEventListener('mouseup', handleSelectionCapture)
    doc.addEventListener('keyup', handleSelectionCapture)

    return () => {
      doc.removeEventListener('selectionchange', handleSelectionCapture)
      doc.removeEventListener('mouseup', handleSelectionCapture)
      doc.removeEventListener('keyup', handleSelectionCapture)
    }
  }, [captureSelectionRange, getIframeDoc, refreshToken])

  /**
   * 查询命令状态
   */
  const queryCommandStates = (doc: Document): Record<string, unknown> => {
    const styles: Record<string, unknown> = {}

    // Query boolean states
    const booleanStates = ['bold', 'italic', 'underline', 'strikeThrough', 'subscript', 'superscript', 'insertOrderedList', 'insertUnorderedList']
    booleanStates.forEach(cmd => {
      try {
        styles[cmd] = doc.queryCommandState(cmd)
      } catch (e) {
        styles[cmd] = false
      }
    })

    // Query value states
    try {
      styles.foreColor = doc.queryCommandValue('foreColor')
      styles.backColor = doc.queryCommandValue('backColor') || doc.queryCommandValue('hiliteColor')
      styles.fontName = doc.queryCommandValue('fontName')
      styles.fontSize = doc.queryCommandValue('fontSize')

      // Query block states
      if (doc.queryCommandState('justifyCenter')) styles.justify = 'justifyCenter'
      else if (doc.queryCommandState('justifyRight')) styles.justify = 'justifyRight'
      else if (doc.queryCommandState('justifyFull')) styles.justify = 'justifyFull'
      else if (doc.queryCommandState('justifyLeft')) styles.justify = 'justifyLeft'
    } catch (e) {
      console.warn('Failed to query style values', e)
    }

    // Get computed styles for more accuracy
    const selection = doc.getSelection()
    if (selection && selection.rangeCount > 0) {
      const element = selection.anchorNode?.nodeType === 1
        ? selection.anchorNode as Element
        : selection.anchorNode?.parentElement

      if (element) {
        const win = doc.defaultView || window
        const computed = win.getComputedStyle(element)
        styles.computedColor = computed.color
        styles.computedBackgroundColor = computed.backgroundColor
        styles.computedFontFamily = computed.fontFamily
        styles.computedFontSize = computed.fontSize

        // Block computed styles
        let blockNode = element
        while (blockNode && blockNode !== doc.body) {
          const display = win.getComputedStyle(blockNode).display
          if (display === 'block' || display === 'list-item') {
            styles.computedLineHeight = win.getComputedStyle(blockNode).lineHeight
            break
          }
          blockNode = blockNode.parentElement as Element
        }
      }
    }

    return styles
  }

  /**
   * 应用保存的样式（格式刷）
   */
  const applySavedStyles = useCallback((doc: Document) => {
    const styles = savedStylesRef.current
    if (!styles) return

    const booleanStates = ['bold', 'italic', 'underline', 'strikeThrough', 'subscript', 'superscript', 'insertOrderedList', 'insertUnorderedList']
    booleanStates.forEach(cmd => {
      const currentState = doc.queryCommandState(cmd)
      const targetState = styles[cmd]
      if (currentState !== targetState) {
        commandManager!.execute(cmd, doc)
      }
    })

    // Apply justification
    const justifyValue = typeof styles.justify === 'string' ? styles.justify : null
    if (justifyValue) {
      const currentJustify =
        doc.queryCommandState('justifyCenter') ? 'justifyCenter' :
          doc.queryCommandState('justifyRight') ? 'justifyRight' :
            doc.queryCommandState('justifyFull') ? 'justifyFull' : 'justifyLeft'

      if (currentJustify !== justifyValue) {
        commandManager.execute(justifyValue, doc)
      }
    }

    // Apply values
    if (typeof styles.foreColor === 'string' && styles.foreColor) {
      commandManager.execute('foreColor', doc, styles.foreColor)
    }

    // Background color
    if (typeof styles.backColor === 'string' && styles.backColor && styles.backColor !== 'rgba(0, 0, 0, 0)' && styles.backColor !== 'transparent') {
      commandManager.execute('hiliteColor', doc, styles.backColor)
    }

    // Font Name
    if (styles.fontName) {
      const normalizedFontName = String(styles.fontName)
        .split(',')[0]
        .trim()
        .replace(/^['"]|['"]$/g, '')
      if (normalizedFontName) {
        commandManager.execute('fontFamily', doc, normalizedFontName)
      }
    }

    // Font Size - use fontSize custom command
    if (typeof styles.computedFontSize === 'string' && styles.computedFontSize) {
      commandManager.execute('fontSize', doc, styles.computedFontSize)
    } else if (typeof styles.fontSize === 'string' && styles.fontSize) {
      doc.execCommand('fontSize', false, styles.fontSize)
    }

    // Line Height - use lineHeight custom command
    if (typeof styles.computedLineHeight === 'string' && styles.computedLineHeight !== 'normal') {
      commandManager.execute('lineHeight', doc, styles.computedLineHeight)
    }
  }, [commandManager])

  /**
   * 创建命令对象（映射到 CommandManager）
   */
  const commands = useMemo(() => ({
    // History
    undo: () => {
      if (onUndo) {
        onUndo()
        return
      }
      const doc = getIframeDoc()
      if (doc && commandManager) commandManager.execute('undo', doc)
    },
    redo: () => {
      if (onRedo) {
        onRedo()
        return
      }
      const doc = getIframeDoc()
      if (doc && commandManager) commandManager.execute('redo', doc)
    },

    // Format Painter
    formatPainter: () => {
      const doc = getIframeDoc()
      if (!doc) return

      if (isFormatPainterActive) {
        // Deactivate
        setIsFormatPainterActive(false)
        savedStylesRef.current = {}
      } else {
        // Activate and capture
        savedStylesRef.current = queryCommandStates(doc)
        setIsFormatPainterActive(true)
      }
    },

    // Text format
    bold: () => {
      const doc = getIframeDoc()
      if (doc && commandManager) {
        commandManager.execute('bold', doc)
        // 触发内容变化
        const newHtml = doc.documentElement.outerHTML
        onContentChange(newHtml)
      }
    },
    italic: () => {
      const doc = getIframeDoc()
      if (doc && commandManager) {
        commandManager.execute('italic', doc)
        const newHtml = doc.documentElement.outerHTML
        onContentChange(newHtml)
      }
    },
    underline: () => {
      const doc = getIframeDoc()
      if (doc && commandManager) {
        commandManager.execute('underline', doc)
        const newHtml = doc.documentElement.outerHTML
        onContentChange(newHtml)
      }
    },
    strikeThrough: () => {
      const doc = getIframeDoc()
      if (doc && commandManager) {
        commandManager.execute('strikeThrough', doc)
        const newHtml = doc.documentElement.outerHTML
        onContentChange(newHtml)
      }
    },
    superscript: () => {
      const doc = getIframeDoc()
      if (doc && commandManager) {
        commandManager.execute('superscript', doc)
        const newHtml = doc.documentElement.outerHTML
        onContentChange(newHtml)
      }
    },
    subscript: () => {
      const doc = getIframeDoc()
      if (doc && commandManager) {
        commandManager.execute('subscript', doc)
        const newHtml = doc.documentElement.outerHTML
        onContentChange(newHtml)
      }
    },

    // Alignment
    justifyLeft: () => {
      const doc = getIframeDoc()
      if (doc && commandManager) {
        commandManager.execute('justifyLeft', doc)
        const newHtml = doc.documentElement.outerHTML
        onContentChange(newHtml)
      }
    },
    justifyCenter: () => {
      const doc = getIframeDoc()
      if (doc && commandManager) {
        commandManager.execute('justifyCenter', doc)
        const newHtml = doc.documentElement.outerHTML
        onContentChange(newHtml)
      }
    },
    justifyRight: () => {
      const doc = getIframeDoc()
      if (doc && commandManager) {
        commandManager.execute('justifyRight', doc)
        const newHtml = doc.documentElement.outerHTML
        onContentChange(newHtml)
      }
    },
    justifyFull: () => {
      const doc = getIframeDoc()
      if (doc && commandManager) {
        commandManager.execute('justifyFull', doc)
        const newHtml = doc.documentElement.outerHTML
        onContentChange(newHtml)
      }
    },

    // Indentation
    indent: () => {
      const doc = getIframeDoc()
      if (doc && commandManager) {
        commandManager.execute('indent', doc)
        const newHtml = doc.documentElement.outerHTML
        onContentChange(newHtml)
      }
    },
    outdent: () => {
      const doc = getIframeDoc()
      if (doc && commandManager) {
        commandManager.execute('outdent', doc)
        const newHtml = doc.documentElement.outerHTML
        onContentChange(newHtml)
      }
    },

    // Lists
    insertUnorderedList: () => {
      const doc = getIframeDoc()
      if (doc && commandManager) {
        commandManager.execute('insertUnorderedList', doc)
        const newHtml = doc.documentElement.outerHTML
        onContentChange(newHtml)
      }
    },
    insertOrderedList: () => {
      const doc = getIframeDoc()
      if (doc && commandManager) {
        commandManager.execute('insertOrderedList', doc)
        const newHtml = doc.documentElement.outerHTML
        onContentChange(newHtml)
      }
    },

    // Insert
    createLink: (url?: string) => {
      const doc = getIframeDoc()
      if (!doc || !commandManager) return

      commandManager.execute('createLink', doc, url)
      const newHtml = doc.documentElement.outerHTML
      onContentChange(newHtml)
    },
    unlink: () => {
      const doc = getIframeDoc()
      if (doc && commandManager) {
        commandManager.execute('unlink', doc)
        const newHtml = doc.documentElement.outerHTML
        onContentChange(newHtml)
      }
    },
    insertImage: (imageUrl: string) => {
      const doc = getIframeDoc()
      if (!doc || !commandManager) return

      commandManager.execute('insertImage', doc, imageUrl)
      setTimeout(() => {
        if (doc.body) {
          const newHtml = doc.documentElement.outerHTML
          onContentChange(newHtml)
        }
      }, 20)
    },
    insertHorizontalRule: () => {
      const doc = getIframeDoc()
      if (doc && commandManager) {
        commandManager.execute('insertHorizontalRule', doc)
        const newHtml = doc.documentElement.outerHTML
        onContentChange(newHtml)
      }
    },

    // Block format
    formatBlock: (tag: string) => {
      const doc = getIframeDoc()
      if (doc && commandManager) {
        commandManager.execute('formatBlock', doc, tag)
        const newHtml = doc.documentElement.outerHTML
        onContentChange(newHtml)
      }
    },

    // Colors
    foreColor: (color: string) => {
      const doc = getIframeDoc()
      if (doc && commandManager) {
        commandManager.execute('foreColor', doc, color)
        const newHtml = doc.documentElement.outerHTML
        onContentChange(newHtml)
      }
    },
    hiliteColor: (color: string) => {
      const doc = getIframeDoc()
      if (doc && commandManager) {
        commandManager.execute('hiliteColor', doc, color)
        const newHtml = doc.documentElement.outerHTML
        onContentChange(newHtml)
      }
    },

    // Clear formatting
    removeFormat: () => {
      const doc = getIframeDoc()
      if (doc && commandManager) {
        commandManager.execute('removeFormat', doc)
        const newHtml = doc.documentElement.outerHTML
        onContentChange(newHtml)
      }
    },

    // Custom styles
    fontFamily: (name: string) => {
      const doc = getIframeDoc()
      if (doc && commandManager) {
        commandManager.execute('fontFamily', doc, name)
        const newHtml = doc.documentElement.outerHTML
        onContentChange(newHtml)
      }
    },
    fontSize: (size: string) => {
      const doc = getIframeDoc()
      if (doc && commandManager) {
        commandManager.execute('fontSize', doc, size)
        const newHtml = doc.documentElement.outerHTML
        onContentChange(newHtml)
      }
    },
    lineHeight: (value: string) => {
      const doc = getIframeDoc()
      if (doc && commandManager) {
        commandManager.execute('lineHeight', doc, value)
        const newHtml = doc.documentElement.outerHTML
        onContentChange(newHtml)
      }
    },

    // Insert table
    insertTable: (rows: number, cols: number) => {
      const doc = getIframeDoc()
      if (doc && commandManager) {
        commandManager.execute('insertTable', doc, rows, cols)
        const newHtml = doc.documentElement.outerHTML
        onContentChange(newHtml)
      }
    }
  }), [commandManager, onContentChange, isFormatPainterActive, getIframeDoc, onUndo, onRedo])

  // 格式刷自动应用逻辑
  React.useEffect(() => {
    if (!isFormatPainterActive) return

    const doc = getIframeDoc()
    if (!doc) return

    const handleMouseUp = () => {
      const selection = doc.getSelection()
      if (selection && !selection.isCollapsed) {
        try {
          applySavedStyles(doc)
          const newHtml = doc.documentElement.outerHTML
          onContentChange(newHtml)
        } finally {
          setIsFormatPainterActive(false)
          savedStylesRef.current = {}
        }
      }
    }

    doc.addEventListener('mouseup', handleMouseUp)
    return () => {
      doc.removeEventListener('mouseup', handleMouseUp)
    }
  }, [isFormatPainterActive, onContentChange, applySavedStyles, getIframeDoc])

  // Helper to determine button state
  const getButtonState = (id: string): { isActive: boolean } => {
    switch (id) {
      // Alignment
      case 'align-left': return { isActive: editorState.align === 'left' }
      case 'align-center': return { isActive: editorState.align === 'center' }
      case 'align-right': return { isActive: editorState.align === 'right' }
      case 'align-justify': return { isActive: editorState.align === 'justify' }

      // Lists
      case 'bulleted-list': return { isActive: editorState.isUnorderedList }
      case 'numbered-list': return { isActive: editorState.isOrderedList }

      // Toggles (Format)
      case 'format-bold': return { isActive: editorState.isBold }
      case 'format-italic': return { isActive: editorState.isItalic }
      case 'format-underline': return { isActive: editorState.isUnderline }
      case 'format-strike': return { isActive: editorState.isStrikeThrough }
      case 'subscript': return { isActive: editorState.isSubscript }
      case 'superscript': return { isActive: editorState.isSuperscript }
      case 'format-painter': return { isActive: isFormatPainterActive }

      default: return { isActive: false }
    }
  }

  // Prepare button configs with icons
  const historyButtons = assignIconsToConfigs(BUTTON_GROUPS.history)
  const formatButtons = assignIconsToConfigs(BUTTON_GROUPS.format)
  const colorButtons = BUTTON_GROUPS.colors
  const alignmentButtons = assignIconsToConfigs(BUTTON_GROUPS.alignment)
  const indentButtons = assignIconsToConfigs(BUTTON_GROUPS.indent)
  const listButtons = assignIconsToConfigs(BUTTON_GROUPS.lists)
  const linkButtons = assignIconsToConfigs(BUTTON_GROUPS.links)
  const mediaButtons = assignIconsToConfigs(BUTTON_GROUPS.media)

  // Configs for selects
  const fontFamilyConfig = TOOLBAR_CONFIG.rows[0].groups.find(g => g.id === 'font-family')?.items[0] as SelectButtonConfig | undefined
  const fontSizeConfig = TOOLBAR_CONFIG.rows[0].groups.find(g => g.id === 'font-size')?.items[0] as SelectButtonConfig | undefined
  const headingConfig = TOOLBAR_CONFIG.rows[0].groups.find(g => g.id === 'heading')?.items[0] as SelectButtonConfig | undefined

  // Command handler
  const handleCommand = (command: string, arg?: string) => {
    prepareEditorSelection()
    const cmd = commands[command as keyof typeof commands]
    if (typeof cmd === 'function') {
      if (arg !== undefined) {
        (cmd as (arg: string) => void)(arg)
      } else {
        (cmd as () => void)()
      }
    }
  }

  // Color selection handler
  const handleColorSelect = (color: string, type: 'text' | 'background') => {
    if (type === 'text') {
      commands.foreColor(color)
    } else {
      if (color === 'transparent') {
        commands.removeFormat()
      } else {
        commands.hiliteColor(color)
      }
    }
  }

  // Image selection handler
  const handleImageSelect = (imageUrl: string) => {
    prepareEditorSelection()
    commands.insertImage(imageUrl)
  }

  const handleFloatingImageSelect = (imageUrl: string) => {
    onFloatingImageInsert?.(imageUrl)
  }

  // Table selection handler
  const handleTableSelect = (rows: number, cols: number) => {
    commands.insertTable(rows, cols)
  }

  // Select change handler (for heading format, font, size)
  const handleSelectChange = (id: string, value: string) => {
    prepareEditorSelection()

    switch (id) {
      case 'font-family':
        commands.fontFamily(value)
        break
      case 'font-size':
        commands.fontSize(value)
        break
      case 'heading':
        if (value.startsWith('h')) {
          commands.formatBlock(value)
        } else if (value === 'p') {
          commands.formatBlock('p')
        }
        break
    }
  }

  // Line spacing handler
  const handleLineSpacingSelect = (value: string) => {
    commands.lineHeight(value)
  }

  return (
    <div className="flex flex-col">
      {/* Row 1: Core editing features */}
      <ToolbarRow id="toolbar-row-1" showBorder={false}>
        {/* History */}
        <ToolbarGroup id="history">
          {historyButtons.map(config => (
            <ButtonRenderer
              key={config.id}
              config={config}
              disabled={disabled}
              onCommand={handleCommand}
            />
          ))}
        </ToolbarGroup>
        <ToolbarSeparator />

        {/* Heading Format */}
        <ToolbarGroup id="heading">
          {headingConfig && (
            <ButtonRenderer
              key={headingConfig.id}
              config={headingConfig}
              disabled={disabled}
              value={editorState.formatBlock}
              onSelectChange={handleSelectChange}
            />
          )}
        </ToolbarGroup>

        {/* Font Family */}
        <ToolbarGroup id="font-family">
          {fontFamilyConfig && (
            <ButtonRenderer
              key={fontFamilyConfig.id}
              config={fontFamilyConfig}
              disabled={disabled}
              value={editorState.fontName}
              onSelectChange={handleSelectChange}
            />
          )}
        </ToolbarGroup>

        {/* Font Size */}
        <ToolbarGroup id="font-size">
          {fontSizeConfig && (
            <ButtonRenderer
              key={fontSizeConfig.id}
              config={fontSizeConfig}
              disabled={disabled}
              value={editorState.fontSize}
              onSelectChange={handleSelectChange}
            />
          )}
        </ToolbarGroup>
        <ToolbarSeparator />

        {/* Text Formatting */}
        <ToolbarGroup id="format">
          {formatButtons.map(config => (
            <ButtonRenderer
              key={config.id}
              config={config}
              disabled={disabled}
              isActive={getButtonState(config.id).isActive}
              onCommand={handleCommand}
            />
          ))}
        </ToolbarGroup>
        <ToolbarSeparator />

        {/* Colors */}
        <ToolbarGroup id="colors">
          {colorButtons.map(config => (
            <ButtonRenderer
              key={config.id}
              config={config}
              disabled={disabled}
              onColorSelect={handleColorSelect}
            />
          ))}
        </ToolbarGroup>
        <ToolbarSeparator />

        {/* Text Alignment */}
        <ToolbarGroup id="alignment">
          {alignmentButtons.map(config => (
            <ButtonRenderer
              key={config.id}
              config={config}
              disabled={disabled}
              isActive={getButtonState(config.id).isActive}
              onCommand={handleCommand}
            />
          ))}
        </ToolbarGroup>
        <ToolbarSeparator />

        {/* Indentation */}
        <ToolbarGroup id="indent">
          {indentButtons.map(config => (
            <ButtonRenderer
              key={config.id}
              config={config}
              disabled={disabled}
              onCommand={handleCommand}
              onLineSpacingSelect={handleLineSpacingSelect}
            />
          ))}
        </ToolbarGroup>
        <ToolbarSeparator />

        {/* Lists */}
        <ToolbarGroup id="lists">
          {listButtons.map(config => (
            <ButtonRenderer
              key={config.id}
              config={config}
              disabled={disabled}
              isActive={getButtonState(config.id).isActive}
              onCommand={handleCommand}
            />
          ))}
        </ToolbarGroup>
        <ToolbarSeparator />

        {/* Links */}
        <ToolbarGroup id="links">
          {linkButtons.map(config => (
            <ButtonRenderer
              key={config.id}
              config={config}
              disabled={disabled}
              onCommand={handleCommand}
            />
          ))}
        </ToolbarGroup>
        <ToolbarSeparator />

        {/* Media */}
        <ToolbarGroup id="media">
          {mediaButtons.map(config => (
            <ButtonRenderer
              key={config.id}
              config={config}
              disabled={disabled}
              onCommand={handleCommand}
              onImageSelect={handleImageSelect}
              onFloatingImageSelect={handleFloatingImageSelect}
              onTableSelect={handleTableSelect}
            />
          ))}
        </ToolbarGroup>
      </ToolbarRow>
    </div>
  )
}

export default EditorToolbar
