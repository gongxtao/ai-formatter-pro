
import { useState, useEffect, useCallback } from 'react'
import { FONT_FAMILIES } from '../config/constants'

/**
 * Interface representing the current state of the editor
 * Includes toggle states (bold, italic, etc.) and value states (font, size, etc.)
 */
export interface EditorState {
  // Toggle states
  isBold: boolean
  isItalic: boolean
  isUnderline: boolean
  isStrikeThrough: boolean
  isSubscript: boolean
  isSuperscript: boolean
  isOrderedList: boolean
  isUnorderedList: boolean
  
  // Alignment states
  align: 'left' | 'center' | 'right' | 'justify'
  
  // Value states
  fontName: string
  fontSize: string
  formatBlock: string // p, h1, h2, etc.
  
  // Selection info (can be expanded)
  hasSelection: boolean
}

/**
 * Default initial state
 */
const INITIAL_STATE: EditorState = {
  isBold: false,
  isItalic: false,
  isUnderline: false,
  isStrikeThrough: false,
  isSubscript: false,
  isSuperscript: false,
  isOrderedList: false,
  isUnorderedList: false,
  align: 'left',
  fontName: 'Arial',
  fontSize: '16px', // Default to 16px
  formatBlock: 'p',
  hasSelection: false
}

interface UseEditorStateProps {
  iframeRef: React.RefObject<HTMLIFrameElement>
  refreshToken?: number
}

/**
 * Hook to track and synchronize editor state
 * Listens to selection changes and updates the state accordingly
 */
export const useEditorState = ({ iframeRef, refreshToken = 0 }: UseEditorStateProps) => {
  const [editorState, setEditorState] = useState<EditorState>(INITIAL_STATE)

  /**
   * Check and update the current state from the iframe document
   */
  const checkState = useCallback(() => {
    const iframe = iframeRef.current
    if (!iframe || !iframe.contentDocument) return

    const doc = iframe.contentDocument
    
    // Safety check for body
    if (!doc.body) return

    // Helper to safely query command state
    const queryState = (command: string): boolean => {
      try {
        return doc.queryCommandState(command)
      } catch (e) {
        return false
      }
    }

    // Helper to safely query command value
    const queryValue = (command: string): string => {
      try {
        return doc.queryCommandValue(command)
      } catch (e) {
        return ''
      }
    }

    // Helper to get computed style
    const getComputedStyleValue = (prop: keyof CSSStyleDeclaration): string => {
      const selection = doc.getSelection()
      const win = iframe.contentWindow || window
      const fallback = (win.getComputedStyle(doc.body)[prop] as string) || ''
      if (!selection || selection.rangeCount === 0) return fallback

      const range = selection.getRangeAt(0)
      let node: Node | null = range.startContainer || selection.focusNode || selection.anchorNode
      if (node && node.nodeType === 3) {
        node = node.parentElement
      }

      if (!node || !(node instanceof Element)) return fallback

      let element: Element | null = node
      while (element && element !== doc.body) {
        if (prop === 'fontFamily') {
          const face = element.getAttribute('face')
          const inlineFont = (element as HTMLElement).style.fontFamily
          if (face || inlineFont) {
            const computed = (win.getComputedStyle(element)[prop] as string) || ''
            return computed || face || inlineFont
          }
        }
        const computed = (win.getComputedStyle(element)[prop] as string) || ''
        if (computed) return computed
        element = element.parentElement
      }

      return fallback
    }

    // Determine alignment
    let align: EditorState['align'] = 'left'
    if (queryState('justifyCenter')) align = 'center'
    else if (queryState('justifyRight')) align = 'right'
    else if (queryState('justifyFull')) align = 'justify'

    const rawFontName = getComputedStyleValue('fontFamily') || queryValue('fontName') || 'Arial'
    
    // Normalize font name: remove quotes and take first font in stack
    const cleanFontName = rawFontName.replace(/['"]/g, '').split(',')[0]?.trim() || 'Arial'
    
    // Try to match with known font families (case-insensitive)
    const matchedFont = FONT_FAMILIES.find((font: { value: string, label: string }) => 
      font.value.toLowerCase() === cleanFontName.toLowerCase() ||
      font.label.toLowerCase() === cleanFontName.toLowerCase()
    )
    
    const normalizedFontName = matchedFont ? matchedFont.value : cleanFontName

    setEditorState({
      isBold: queryState('bold'),
      isItalic: queryState('italic'),
      isUnderline: queryState('underline'),
      isStrikeThrough: queryState('strikeThrough'),
      isSubscript: queryState('subscript'),
      isSuperscript: queryState('superscript'),
      isOrderedList: queryState('insertOrderedList'),
      isUnorderedList: queryState('insertUnorderedList'),
      
      align,
      
      fontName: normalizedFontName,
      fontSize: getComputedStyleValue('fontSize') || '16px',
      formatBlock: queryValue('formatBlock') || 'p',
      
      hasSelection: !doc.getSelection()?.isCollapsed
    })
  }, [iframeRef])

  /**
   * Set up event listeners
   */
  useEffect(() => {
    const iframe = iframeRef.current
    if (!iframe) return

    // We need to wait for the iframe to load
    const handleLoad = () => {
      const doc = iframe.contentDocument
      if (!doc) return

      // Events that might change the state
      const events = ['selectionchange', 'mouseup', 'keyup', 'click', 'input']
      
      const handleEvent = () => {
        // Use a small timeout to ensure the DOM has updated
        // especially for selection changes
        setTimeout(checkState, 0)
      }

      events.forEach(event => {
        doc.addEventListener(event, handleEvent)
      })

      // Initial check
      checkState()

      // Cleanup listeners
      return () => {
        events.forEach(event => {
          doc.removeEventListener(event, handleEvent)
        })
      }
    }

    // If already loaded
    if (iframe.contentDocument && iframe.contentDocument.readyState === 'complete') {
      const cleanup = handleLoad()
      return () => {
        if (cleanup) cleanup()
      }
    } else {
      iframe.addEventListener('load', handleLoad)
      return () => {
        iframe.removeEventListener('load', handleLoad)
      }
    }
  }, [iframeRef, checkState, refreshToken])

  return {
    editorState,
    checkState // Exported in case we need to force an update
  }
}
