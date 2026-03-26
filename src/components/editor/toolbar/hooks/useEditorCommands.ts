/**
 * useEditorCommands Hook - 已迁移到使用 CommandManager
 *
 * 使用新的核心引擎进行命令执行，同时保持原有 API 不变
 * 特殊功能（如格式刷）保留在 Hook 中
 */

import { useRef, RefObject, useState, useEffect, useCallback } from 'react'
import { CommandManager, registerBuiltinCommands } from '@/lib/editor-core'

export interface UseEditorCommandsOptions {
  /** Ref to the iframe element */
  iframeRef: RefObject<HTMLIFrameElement>
  /** Callback when content changes */
  onContentChange: (content: string) => void
  /** Whether editing is currently active */
  isEditing: boolean
}

/**
 * 查询命令状态
 */
type SavedCommandStyles = Record<string, unknown> & {
  justify?: string
  foreColor?: string
  backColor?: string
  fontName?: string
  fontSize?: string
  computedFontSize?: string
  computedLineHeight?: string
}

function queryCommandStates(doc: Document): SavedCommandStyles {
  const styles: SavedCommandStyles = {}

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
 * 应用保存的样式
 */
function applySavedStyles(doc: Document, commandManager: CommandManager, styles: SavedCommandStyles) {
  const booleanStates = ['bold', 'italic', 'underline', 'strikeThrough', 'subscript', 'superscript', 'insertOrderedList', 'insertUnorderedList']
  booleanStates.forEach(cmd => {
    const currentState = doc.queryCommandState(cmd)
    const targetState = Boolean(styles[cmd])
    if (currentState !== targetState) {
      commandManager.execute(cmd, doc)
    }
  })

  // Apply justification
  if (typeof styles.justify === 'string') {
    const currentJustify =
      doc.queryCommandState('justifyCenter') ? 'justifyCenter' :
        doc.queryCommandState('justifyRight') ? 'justifyRight' :
          doc.queryCommandState('justifyFull') ? 'justifyFull' : 'justifyLeft'

    if (currentJustify !== styles.justify) {
      commandManager.execute(styles.justify, doc)
    }
  }

  // Apply values
  if (typeof styles.foreColor === 'string') commandManager.execute('foreColor', doc, styles.foreColor)

  // Background color
  if (typeof styles.backColor === 'string' && styles.backColor !== 'rgba(0, 0, 0, 0)' && styles.backColor !== 'transparent') {
    commandManager.execute('hiliteColor', doc, styles.backColor)
  }

  // Font Name
  if (typeof styles.fontName === 'string') {
    const normalizedFontName = String(styles.fontName)
      .split(',')[0]
      .trim()
      .replace(/^['"]|['"]$/g, '')
    if (normalizedFontName) {
      commandManager.execute('fontFamily', doc, normalizedFontName)
    }
  }

  // Font Size - use fontSize custom command
  if (typeof styles.computedFontSize === 'string') {
    commandManager.execute('fontSize', doc, styles.computedFontSize)
  } else if (typeof styles.fontSize === 'string') {
    doc.execCommand('fontSize', false, styles.fontSize)
  }

  // Line Height - use lineHeight custom command
  if (typeof styles.computedLineHeight === 'string' && styles.computedLineHeight !== 'normal') {
    commandManager.execute('lineHeight', doc, styles.computedLineHeight)
  }
}

export function useEditorCommands({
  iframeRef,
  onContentChange,
  isEditing
}: UseEditorCommandsOptions) {
  const isUpdatingRef = useRef(false)
  const [isFormatPainterActive, setIsFormatPainterActive] = useState(false)
  const savedStylesRef = useRef<SavedCommandStyles>({})

  // 使用 useRef 保持 CommandManager 实例在重新渲染之间保持不变
  const commandManagerRef = useRef<CommandManager | null>(null)

  // 创建并初始化 CommandManager
  if (!commandManagerRef.current) {
    commandManagerRef.current = new CommandManager()
    registerBuiltinCommands(commandManagerRef.current)
  }

  const commandManager = commandManagerRef.current

  // Get the iframe document
  const getIframeDoc = useCallback(() => {
    return iframeRef.current?.contentDocument ||
      iframeRef.current?.contentWindow?.document ||
      null
  }, [iframeRef])

  // Apply a format function to the editor
  const applyFormat = useCallback((fn: (doc: Document) => void) => {
    const doc = getIframeDoc()
    if (!doc || !isEditing) return

    // Save current selection before applying format
    const selection = doc.getSelection()
    const range = selection && selection.rangeCount > 0 ? selection.getRangeAt(0) : null

    // Apply the format
    fn(doc)

    // Restore focus to iframe
    const iframe = iframeRef.current
    if (iframe) {
      iframe.focus()
    }

    // Restore selection if possible, otherwise place cursor at end
    const body = doc.body
    if (body) {
      if (range && selection) {
        try {
          selection.removeAllRanges()
          selection.addRange(range)
        } catch (e) {
          // If restoration fails, place cursor at end
          const newRange = doc.createRange()
          newRange.selectNodeContents(body)
          newRange.collapse(false)
          selection.removeAllRanges()
          selection.addRange(newRange)
        }
      } else if (selection) {
        // No previous selection, place cursor at end
        const newRange = doc.createRange()
        newRange.selectNodeContents(body)
        newRange.collapse(false)
        selection.removeAllRanges()
        selection.addRange(newRange)
      }
    }

    // Notify content change
    isUpdatingRef.current = true
    const newHtml = doc.documentElement.outerHTML
    onContentChange(newHtml)
    setTimeout(() => {
      isUpdatingRef.current = false
    }, 50)
  }, [getIframeDoc, isEditing, iframeRef, onContentChange])

  // ============================================================================
  // Commands
  // ============================================================================

  const commands = {
    // History
    undo: () => applyFormat(doc => commandManager.execute('undo', doc)),
    redo: () => applyFormat(doc => commandManager.execute('redo', doc)),

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
    bold: () => applyFormat(doc => commandManager.execute('bold', doc)),
    italic: () => applyFormat(doc => commandManager.execute('italic', doc)),
    underline: () => applyFormat(doc => commandManager.execute('underline', doc)),
    strikeThrough: () => applyFormat(doc => commandManager.execute('strikeThrough', doc)),
    superscript: () => applyFormat(doc => commandManager.execute('superscript', doc)),
    subscript: () => applyFormat(doc => commandManager.execute('subscript', doc)),

    // Alignment
    justifyLeft: () => applyFormat(doc => commandManager.execute('justifyLeft', doc)),
    justifyCenter: () => applyFormat(doc => commandManager.execute('justifyCenter', doc)),
    justifyRight: () => applyFormat(doc => commandManager.execute('justifyRight', doc)),
    justifyFull: () => applyFormat(doc => commandManager.execute('justifyFull', doc)),

    // Indentation
    indent: () => applyFormat(doc => commandManager.execute('indent', doc)),
    outdent: () => applyFormat(doc => commandManager.execute('outdent', doc)),

    // Lists
    insertUnorderedList: () => applyFormat(doc => commandManager.execute('insertUnorderedList', doc)),
    insertOrderedList: () => applyFormat(doc => commandManager.execute('insertOrderedList', doc)),

    // Insert
    createLink: (url?: string) => {
      const doc = getIframeDoc()
      if (!doc || !isEditing) return
      applyFormat(() => commandManager.execute('createLink', doc, url))
    },
    unlink: () => applyFormat(doc => commandManager.execute('unlink', doc)),
    insertImage: (imageUrl: string) => {
      const doc = getIframeDoc()
      if (!doc || !isEditing) return
      commandManager.execute('insertImage', doc, imageUrl)
      // Sync change manually
      isUpdatingRef.current = true
      const newHtml = doc.documentElement.outerHTML
      onContentChange(newHtml)
      setTimeout(() => {
        isUpdatingRef.current = false
      }, 50)
    },
    insertHorizontalRule: () => applyFormat(doc => commandManager.execute('insertHorizontalRule', doc)),

    // Block format
    formatBlock: (tag: string) => applyFormat(doc => commandManager.execute('formatBlock', doc, tag)),

    // Colors
    foreColor: (color: string) => applyFormat(doc => commandManager.execute('foreColor', doc, color)),
    hiliteColor: (color: string) => applyFormat(doc => commandManager.execute('hiliteColor', doc, color)),

    // Clear formatting
    removeFormat: () => applyFormat(doc => commandManager.execute('removeFormat', doc)),

    // Custom styles
    fontFamily: (name: string) => applyFormat(doc => commandManager.execute('fontFamily', doc, name)),
    fontSize: (size: string) => applyFormat(doc => commandManager.execute('fontSize', doc, size)),
    lineHeight: (value: string) => applyFormat(doc => commandManager.execute('lineHeight', doc, value)),

    // Insert table
    insertTable: (rows: number, cols: number) => applyFormat(doc => commandManager.execute('insertTable', doc, rows, cols))
  }

  // Handle format painter auto-apply
  useEffect(() => {
    if (!isFormatPainterActive) return

    const doc = getIframeDoc()
    if (!doc) return

    const handleMouseUp = () => {
      const selection = doc.getSelection()
      if (selection && !selection.isCollapsed) {
        try {
          applyFormat((doc) => applySavedStyles(doc, commandManager, savedStylesRef.current))
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
  }, [isFormatPainterActive, applyFormat, commandManager, getIframeDoc])

  return {
    commands,
    isFormatPainterActive,
    isUpdating: isUpdatingRef.current,
    getIframeDoc
  }
}
