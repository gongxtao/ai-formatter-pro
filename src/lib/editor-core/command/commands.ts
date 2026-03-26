/**
 * Built-in Commands Registration
 *
 * 注册所有内置编辑器命令到 CommandManager
 */

import { CommandManager } from './CommandManager'

/**
 * Apply custom style to selection
 */
function applyStyle(doc: Document, styleName: string, styleValue: string): void {
  const selection = doc.getSelection()
  if (!selection || selection.rangeCount === 0) return

  const range = selection.getRangeAt(0)
  const span = doc.createElement('span')
  span.style[styleName as any] = styleValue

  if (selection.isCollapsed) {
    const textNode = doc.createTextNode('\u200B')
    span.appendChild(textNode)
    range.insertNode(span)
    const newRange = doc.createRange()
    newRange.setStart(textNode, 1)
    newRange.setEnd(textNode, 1)
    selection.removeAllRanges()
    selection.addRange(newRange)
    return
  }

  const fragment = range.extractContents()
  span.appendChild(fragment)
  range.insertNode(span)
  selection.removeAllRanges()
  const newRange = doc.createRange()
  newRange.selectNodeContents(span)
  selection.addRange(newRange)
}

/**
 * Apply line height to block element
 */
function applyLineHeight(doc: Document, value: string): void {
  const selection = doc.getSelection()
  if (!selection || selection.rangeCount === 0) return

  let node = selection.anchorNode
  // If node is text node, get parent
  if (node && node.nodeType === 3) {
    node = node.parentNode
  }

  // Traverse up to find a block element
  while (node && node !== doc.body) {
    const el = node as HTMLElement
    const display = typeof window !== 'undefined' ? window.getComputedStyle(el).display : 'block'

    if (['P', 'DIV', 'H1', 'H2', 'H3', 'H4', 'H5', 'H6', 'LI', 'BLOCKQUOTE'].includes(el.nodeName) || display === 'block') {
      el.style.lineHeight = value
      break
    }
    node = node.parentNode
  }
}

/**
 * 在指定文档中插入节点到当前选择位置
 */
function insertNodeAtSelection(doc: Document, node: Node): void {
  const selection = doc.getSelection()
  if (!selection) return

  const range = selection.getRangeAt(0)
  range.deleteContents()
  range.insertNode(node)
}

/**
 * 注册所有内置命令
 */
export function registerBuiltinCommands(manager: CommandManager): void {
  // ============================================================================
  // History Commands
  // ============================================================================

  manager.register('undo', (doc) => doc.execCommand('undo'))
  manager.register('redo', (doc) => doc.execCommand('redo'))

  // ============================================================================
  // Text Formatting Commands
  // ============================================================================

  manager.register('bold', (doc) => doc.execCommand('bold'))
  manager.register('italic', (doc) => doc.execCommand('italic'))
  manager.register('underline', (doc) => doc.execCommand('underline'))
  manager.register('strikeThrough', (doc) => doc.execCommand('strikeThrough'))
  manager.register('superscript', (doc) => doc.execCommand('superscript'))
  manager.register('subscript', (doc) => doc.execCommand('subscript'))

  // ============================================================================
  // Alignment Commands
  // ============================================================================

  manager.register('justifyLeft', (doc) => doc.execCommand('justifyLeft'))
  manager.register('justifyCenter', (doc) => doc.execCommand('justifyCenter'))
  manager.register('justifyRight', (doc) => doc.execCommand('justifyRight'))
  manager.register('justifyFull', (doc) => doc.execCommand('justifyFull'))

  // ============================================================================
  // Indentation Commands
  // ============================================================================

  manager.register('indent', (doc) => doc.execCommand('indent'))
  manager.register('outdent', (doc) => doc.execCommand('outdent'))

  // ============================================================================
  // List Commands
  // ============================================================================

  manager.register('insertUnorderedList', (doc) => doc.execCommand('insertUnorderedList'))
  manager.register('insertOrderedList', (doc) => doc.execCommand('insertOrderedList'))

  // ============================================================================
  // Insert Commands
  // ============================================================================

  manager.register('createLink', (doc, url?: string) => {
    const linkUrl = url || (typeof window !== 'undefined' ? window.prompt('Enter link URL') : null)
    if (!linkUrl) return

    const sel = doc.getSelection()
    if (sel && sel.rangeCount > 0 && !sel.isCollapsed) {
      doc.execCommand('createLink', false, linkUrl)
    } else {
      doc.execCommand('insertHTML', false, `<a href="${linkUrl}" target="_blank" rel="noopener noreferrer">${linkUrl}</a>`)
    }
  })

  manager.register('unlink', (doc) => doc.execCommand('unlink'))

  manager.register('insertImage', (doc, imageUrl: string) => {
    const image = doc.createElement('img')
    image.src = imageUrl
    image.style.maxWidth = '100%'
    image.style.height = 'auto'

    const selection = doc.getSelection()
    if (selection && selection.rangeCount > 0) {
      const range = selection.getRangeAt(0)
      range.deleteContents()
      range.insertNode(image)
      range.setStartAfter(image)
      range.setEndAfter(image)
      selection.removeAllRanges()
      selection.addRange(range)
    } else {
      doc.body?.appendChild(image)
    }

    setTimeout(() => {
      doc.body?.dispatchEvent(new Event('input', { bubbles: true }))
    }, 10)
  })

  manager.register('insertHorizontalRule', (doc) => doc.execCommand('insertHorizontalRule'))

  // ============================================================================
  // Block Format Commands
  // ============================================================================

  manager.register('formatBlock', (doc, tag: string) => {
    doc.execCommand('formatBlock', false, tag)
  })

  // ============================================================================
  // Color Commands
  // ============================================================================

  manager.register('foreColor', (doc, color: string) => {
    doc.execCommand('foreColor', false, color)
  })

  manager.register('hiliteColor', (doc, color: string) => {
    if (doc.queryCommandSupported('hiliteColor')) {
      doc.execCommand('hiliteColor', false, color)
    } else {
      doc.execCommand('backColor', false, color)
    }
  })

  // ============================================================================
  // Clear Formatting
  // ============================================================================

  manager.register('removeFormat', (doc) => doc.execCommand('removeFormat'))

  // ============================================================================
  // Table Commands
  // ============================================================================

  manager.register('insertTable', (doc, rows: number, cols: number) => {
    let html = '<table style="border-collapse: collapse; width: 100%;"><tbody>'
    for (let i = 0; i < rows; i++) {
      html += '<tr>'
      for (let j = 0; j < cols; j++) {
        html += '<td style="border: 1px solid #ccc; padding: 8px; min-width: 60px; height: 32px;"></td>'
      }
      html += '</tr>'
    }
    html += '</tbody></table>'
    doc.execCommand('insertHTML', false, html)
  })

  // ============================================================================
  // Command State Queries (for UI state)
  // ============================================================================

  // 为文本格式化命令注册状态查询函数
  const formatCommands = ['bold', 'italic', 'underline', 'strikeThrough', 'subscript', 'superscript', 'insertOrderedList', 'insertUnorderedList']
  formatCommands.forEach(cmd => {
    const registration = manager['commands'].get(cmd)
    if (registration) {
      registration.stateQuery = (doc: Document) => {
        try {
          return doc.queryCommandState(cmd)
        } catch {
          return false
        }
      }
    }
  })

  // 为对齐命令注册状态查询
  const justifyCommands = ['justifyLeft', 'justifyCenter', 'justifyRight', 'justifyFull']
  justifyCommands.forEach(cmd => {
    const registration = manager['commands'].get(cmd)
    if (registration) {
      registration.stateQuery = (doc: Document) => {
        try {
          return doc.queryCommandState(cmd)
        } catch {
          return false
        }
      }
    }
  })

  // 为颜色命令注册值查询
  const colorRegistration = manager['commands'].get('foreColor')
  if (colorRegistration) {
    colorRegistration.valueQuery = (doc: Document) => {
      try {
        return doc.queryCommandValue('foreColor')
      } catch {
        return ''
      }
    }
  }

  // ============================================================================
  // Custom Style Commands
  // ============================================================================

  manager.register('fontFamily', (doc, name: string) => applyStyle(doc, 'fontFamily', name))
  manager.register('fontSize', (doc, size: string) => applyStyle(doc, 'fontSize', size))
  manager.register('lineHeight', (doc, value: string) => applyLineHeight(doc, value))
}
