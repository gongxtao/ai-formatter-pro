/**
 * EditorToolbar Component
 * Configuration-driven toolbar implementation
 * Uses CommandManager from core engine directly
 */

'use client'

import React, { RefObject, useRef, useMemo, useCallback } from 'react'

// Core components
import ToolbarRow from './toolbar/core/ToolbarRow'
import ButtonRenderer from './toolbar/core/ButtonRenderer'

// Groups
import ToolbarGroup from './toolbar/groups/ToolbarGroup'
import ToolbarSeparator from './toolbar/groups/ToolbarSeparator'

// Core Engine
import { CommandManager, registerBuiltinCommands } from '@/lib/editor-core'

// Hooks
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

// ============================================================================
// Module-level constants (created once, never re-created per render)
// ============================================================================

const ICON_MAP: Record<string, React.ComponentType<IconProps>> = {
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

type IconableConfig = CommandButtonConfig | ToggleButtonConfig | PickerButtonConfig

function assignIconsToConfigs<T extends IconableConfig>(configs: T[]): T[] {
  if (!configs) return []
  return configs.map(config => ({
    ...config,
    icon: ICON_MAP[config.id] as unknown as T['icon']
  }))
}

// Pre-compute button configs with icons (immutable, created once)
const HISTORY_BUTTONS = assignIconsToConfigs(BUTTON_GROUPS.history)
const FORMAT_BUTTONS = assignIconsToConfigs(BUTTON_GROUPS.format)
const ALIGNMENT_BUTTONS = assignIconsToConfigs(BUTTON_GROUPS.alignment)
const INDENT_BUTTONS = assignIconsToConfigs(BUTTON_GROUPS.indent)
const LIST_BUTTONS = assignIconsToConfigs(BUTTON_GROUPS.lists)
const LINK_BUTTONS = assignIconsToConfigs(BUTTON_GROUPS.links)
const MEDIA_BUTTONS = assignIconsToConfigs(BUTTON_GROUPS.media)
const COLOR_BUTTONS = BUTTON_GROUPS.colors

// Pre-resolve select configs (immutable)
const FONT_FAMILY_CONFIG = TOOLBAR_CONFIG.rows[0].groups.find(g => g.id === 'font-family')?.items[0] as SelectButtonConfig | undefined
const FONT_SIZE_CONFIG = TOOLBAR_CONFIG.rows[0].groups.find(g => g.id === 'font-size')?.items[0] as SelectButtonConfig | undefined
const HEADING_CONFIG = TOOLBAR_CONFIG.rows[0].groups.find(g => g.id === 'heading')?.items[0] as SelectButtonConfig | undefined

// ============================================================================
// Types
// ============================================================================

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

// ============================================================================
// Component
// ============================================================================

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
  // CommandManager — use core engine singleton per instance
  const commandManagerRef = useRef<CommandManager | null>(null)
  if (!commandManagerRef.current) {
    commandManagerRef.current = new CommandManager()
    registerBuiltinCommands(commandManagerRef.current)
  }
  const commandManager = commandManagerRef.current

  const disabled = propsDisabled || !isEditing

  // Get iframe document
  const getIframeDoc = useCallback(() => {
    return iframeRef.current?.contentDocument ||
           iframeRef.current?.contentWindow?.document ||
           null
  }, [iframeRef])

  // Editor state hook — for querying format states
  const { editorState } = useEditorState({ iframeRef, refreshToken })

  // Format painter state
  const [isFormatPainterActive, setIsFormatPainterActive] = React.useState(false)
  const savedStylesRef = useRef<Record<string, unknown>>({})
  const savedSelectionRangeRef = useRef<Range | null>(null)

  // ---- Selection capture/restore ----

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
      // Range may be invalid
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

  // ---- Core helper: execute command and sync content back ----

  const executeAndSync = useCallback((cmd: string, ...args: unknown[]) => {
    const doc = getIframeDoc()
    if (doc && commandManager) {
      commandManager.execute(cmd, doc, ...args)
      onContentChange(doc.documentElement.outerHTML)
    }
  }, [getIframeDoc, commandManager, onContentChange])

  // ---- Query command states (for format painter) ----

  const queryCommandStates = (doc: Document): Record<string, unknown> => {
    const styles: Record<string, unknown> = {}

    const booleanStates = ['bold', 'italic', 'underline', 'strikeThrough', 'subscript', 'superscript', 'insertOrderedList', 'insertUnorderedList']
    booleanStates.forEach(cmd => {
      try {
        styles[cmd] = doc.queryCommandState(cmd)
      } catch (e) {
        styles[cmd] = false
      }
    })

    try {
      styles.foreColor = doc.queryCommandValue('foreColor')
      styles.backColor = doc.queryCommandValue('backColor') || doc.queryCommandValue('hiliteColor')
      styles.fontName = doc.queryCommandValue('fontName')
      styles.fontSize = doc.queryCommandValue('fontSize')

      if (doc.queryCommandState('justifyCenter')) styles.justify = 'justifyCenter'
      else if (doc.queryCommandState('justifyRight')) styles.justify = 'justifyRight'
      else if (doc.queryCommandState('justifyFull')) styles.justify = 'justifyFull'
      else if (doc.queryCommandState('justifyLeft')) styles.justify = 'justifyLeft'
    } catch (e) {
      console.warn('Failed to query style values', e)
    }

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

  // ---- Apply saved styles (format painter) ----

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

    if (typeof styles.foreColor === 'string' && styles.foreColor) {
      commandManager.execute('foreColor', doc, styles.foreColor)
    }

    if (typeof styles.backColor === 'string' && styles.backColor && styles.backColor !== 'rgba(0, 0, 0, 0)' && styles.backColor !== 'transparent') {
      commandManager.execute('hiliteColor', doc, styles.backColor)
    }

    if (styles.fontName) {
      const normalizedFontName = String(styles.fontName)
        .split(',')[0]
        .trim()
        .replace(/^['"]|['"]$/g, '')
      if (normalizedFontName) {
        commandManager.execute('fontFamily', doc, normalizedFontName)
      }
    }

    if (typeof styles.computedFontSize === 'string' && styles.computedFontSize) {
      commandManager.execute('fontSize', doc, styles.computedFontSize)
    } else if (typeof styles.fontSize === 'string' && styles.fontSize) {
      doc.execCommand('fontSize', false, styles.fontSize)
    }

    if (typeof styles.computedLineHeight === 'string' && styles.computedLineHeight !== 'normal') {
      commandManager.execute('lineHeight', doc, styles.computedLineHeight)
    }
  }, [commandManager])

  // ---- Commands (deduplicated via executeAndSync) ----

  const commands = useMemo(() => ({
    // History — has callback override
    undo: () => {
      if (onUndo) return onUndo()
      executeAndSync('undo')
    },
    redo: () => {
      if (onRedo) return onRedo()
      executeAndSync('redo')
    },

    // Format painter — custom toggle logic
    formatPainter: () => {
      const doc = getIframeDoc()
      if (!doc) return
      if (isFormatPainterActive) {
        setIsFormatPainterActive(false)
        savedStylesRef.current = {}
      } else {
        savedStylesRef.current = queryCommandStates(doc)
        setIsFormatPainterActive(true)
      }
    },

    // Simple toggle commands
    bold: () => executeAndSync('bold'),
    italic: () => executeAndSync('italic'),
    underline: () => executeAndSync('underline'),
    strikeThrough: () => executeAndSync('strikeThrough'),
    superscript: () => executeAndSync('superscript'),
    subscript: () => executeAndSync('subscript'),

    // Alignment
    justifyLeft: () => executeAndSync('justifyLeft'),
    justifyCenter: () => executeAndSync('justifyCenter'),
    justifyRight: () => executeAndSync('justifyRight'),
    justifyFull: () => executeAndSync('justifyFull'),

    // Indentation
    indent: () => executeAndSync('indent'),
    outdent: () => executeAndSync('outdent'),

    // Lists
    insertUnorderedList: () => executeAndSync('insertUnorderedList'),
    insertOrderedList: () => executeAndSync('insertOrderedList'),

    // Links
    createLink: (url?: string) => executeAndSync('createLink', url),
    unlink: () => executeAndSync('unlink'),

    // Insert — insertImage needs setTimeout for content sync
    insertImage: (imageUrl: string) => {
      const doc = getIframeDoc()
      if (!doc || !commandManager) return
      commandManager.execute('insertImage', doc, imageUrl)
      setTimeout(() => {
        if (doc.body) onContentChange(doc.documentElement.outerHTML)
      }, 20)
    },
    insertHorizontalRule: () => executeAndSync('insertHorizontalRule'),

    // Block format
    formatBlock: (tag: string) => executeAndSync('formatBlock', tag),

    // Colors
    foreColor: (color: string) => executeAndSync('foreColor', color),
    hiliteColor: (color: string) => executeAndSync('hiliteColor', color),

    // Clear formatting
    removeFormat: () => executeAndSync('removeFormat'),

    // Custom styles
    fontFamily: (name: string) => executeAndSync('fontFamily', name),
    fontSize: (size: string) => executeAndSync('fontSize', size),
    lineHeight: (value: string) => executeAndSync('lineHeight', value),

    // Table
    insertTable: (rows: number, cols: number) => executeAndSync('insertTable', rows, cols)
  }), [executeAndSync, getIframeDoc, commandManager, onContentChange, onUndo, onRedo, isFormatPainterActive])

  // Format painter auto-apply
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

  // Button active state helper
  const getButtonState = (id: string): { isActive: boolean } => {
    switch (id) {
      case 'align-left': return { isActive: editorState.align === 'left' }
      case 'align-center': return { isActive: editorState.align === 'center' }
      case 'align-right': return { isActive: editorState.align === 'right' }
      case 'align-justify': return { isActive: editorState.align === 'justify' }
      case 'bulleted-list': return { isActive: editorState.isUnorderedList }
      case 'numbered-list': return { isActive: editorState.isOrderedList }
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

  const handleImageSelect = (imageUrl: string) => {
    prepareEditorSelection()
    commands.insertImage(imageUrl)
  }

  const handleFloatingImageSelect = (imageUrl: string) => {
    onFloatingImageInsert?.(imageUrl)
  }

  const handleTableSelect = (rows: number, cols: number) => {
    commands.insertTable(rows, cols)
  }

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

  const handleLineSpacingSelect = (value: string) => {
    commands.lineHeight(value)
  }

  return (
    <div className="flex flex-col">
      <ToolbarRow id="toolbar-row-1" showBorder={false}>
        <ToolbarGroup id="history">
          {HISTORY_BUTTONS.map(config => (
            <ButtonRenderer
              key={config.id}
              config={config}
              disabled={disabled}
              onCommand={handleCommand}
            />
          ))}
        </ToolbarGroup>
        <ToolbarSeparator />

        <ToolbarGroup id="heading">
          {HEADING_CONFIG && (
            <ButtonRenderer
              key={HEADING_CONFIG.id}
              config={HEADING_CONFIG}
              disabled={disabled}
              value={editorState.formatBlock}
              onSelectChange={handleSelectChange}
            />
          )}
        </ToolbarGroup>

        <ToolbarGroup id="font-family">
          {FONT_FAMILY_CONFIG && (
            <ButtonRenderer
              key={FONT_FAMILY_CONFIG.id}
              config={FONT_FAMILY_CONFIG}
              disabled={disabled}
              value={editorState.fontName}
              onSelectChange={handleSelectChange}
            />
          )}
        </ToolbarGroup>

        <ToolbarGroup id="font-size">
          {FONT_SIZE_CONFIG && (
            <ButtonRenderer
              key={FONT_SIZE_CONFIG.id}
              config={FONT_SIZE_CONFIG}
              disabled={disabled}
              value={editorState.fontSize}
              onSelectChange={handleSelectChange}
            />
          )}
        </ToolbarGroup>
        <ToolbarSeparator />

        <ToolbarGroup id="format">
          {FORMAT_BUTTONS.map(config => (
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

        <ToolbarGroup id="colors">
          {COLOR_BUTTONS.map(config => (
            <ButtonRenderer
              key={config.id}
              config={config}
              disabled={disabled}
              onColorSelect={handleColorSelect}
            />
          ))}
        </ToolbarGroup>
        <ToolbarSeparator />

        <ToolbarGroup id="alignment">
          {ALIGNMENT_BUTTONS.map(config => (
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

        <ToolbarGroup id="indent">
          {INDENT_BUTTONS.map(config => (
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

        <ToolbarGroup id="lists">
          {LIST_BUTTONS.map(config => (
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

        <ToolbarGroup id="links">
          {LINK_BUTTONS.map(config => (
            <ButtonRenderer
              key={config.id}
              config={config}
              disabled={disabled}
              onCommand={handleCommand}
            />
          ))}
        </ToolbarGroup>
        <ToolbarSeparator />

        <ToolbarGroup id="media">
          {MEDIA_BUTTONS.map(config => (
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
