import { Dispatch, MutableRefObject, RefObject, SetStateAction, useEffect } from 'react'

interface UseEditablePreviewContentSyncProps {
  iframeRef: RefObject<HTMLIFrameElement>
  content: string
  isEditing: boolean
  isUpdatingRef: MutableRefObject<boolean>
  forceContentSyncRef: MutableRefObject<boolean>
  lastSyncedContentRef: MutableRefObject<string>
  isInitialLoadRef: MutableRefObject<boolean>
  scrollPositionRef: MutableRefObject<{ x: number; y: number }>
  restoreStateTimeoutRef: MutableRefObject<number | null>
  saveSelection: (iframeDoc: Document) => void
  restoreSelection: (iframeDoc: Document) => void
  debouncedSync: { cancel: () => void; flush: () => void }
  setIframeBody: Dispatch<SetStateAction<HTMLElement | null>>
  handleInput: () => void
  editorStyleCss: string
}

export const useEditablePreviewContentSync = ({
  iframeRef,
  content,
  isEditing,
  isUpdatingRef,
  forceContentSyncRef,
  lastSyncedContentRef,
  isInitialLoadRef,
  scrollPositionRef,
  restoreStateTimeoutRef,
  saveSelection,
  restoreSelection,
  debouncedSync,
  setIframeBody,
  handleInput,
  editorStyleCss
}: UseEditablePreviewContentSyncProps) => {
  useEffect(() => {
    if (!iframeRef.current) return
    if (isUpdatingRef.current) return

    const iframe = iframeRef.current
    const iframeDoc = iframe.contentDocument || iframe.contentWindow?.document
    if (!iframeDoc) return

    const isIframeEmpty = !iframeDoc.body || iframeDoc.body.childNodes.length === 0
    if (!forceContentSyncRef.current && content === lastSyncedContentRef.current && !isIframeEmpty) {
      return
    }

    debouncedSync.cancel()
    lastSyncedContentRef.current = content
    forceContentSyncRef.current = false

    if (!isInitialLoadRef.current && iframeDoc.body && isEditing) {
      scrollPositionRef.current = {
        x: iframeDoc.documentElement.scrollLeft || iframeDoc.body.scrollLeft,
        y: iframeDoc.documentElement.scrollTop || iframeDoc.body.scrollTop
      }
      saveSelection(iframeDoc)
    }

    iframeDoc.open()
    iframeDoc.write(content)
    iframeDoc.write('<div id="image-resizer-root" style="position: absolute; top: 0; left: 0; width: 0; height: 0; overflow: visible; z-index: 2147483647;"></div>')
    iframeDoc.close()

    try {
      iframeDoc.execCommand('styleWithCSS', false, 'true')
    } catch {
    }

    if (iframeDoc.body) {
      const resizerRoot = iframeDoc.getElementById('image-resizer-root')
      setIframeBody(resizerRoot || iframeDoc.body)
    }

    if (!isInitialLoadRef.current) {
      if (restoreStateTimeoutRef.current !== null) {
        window.clearTimeout(restoreStateTimeoutRef.current)
      }
      restoreStateTimeoutRef.current = window.setTimeout(() => {
        if (iframeDoc.body) {
          iframeDoc.documentElement.scrollLeft = scrollPositionRef.current.x
          iframeDoc.documentElement.scrollTop = scrollPositionRef.current.y
          iframeDoc.body.scrollLeft = scrollPositionRef.current.x
          iframeDoc.body.scrollTop = scrollPositionRef.current.y
          if (isEditing) {
            restoreSelection(iframeDoc)
          }
        }
      }, 0)
    } else {
      isInitialLoadRef.current = false
    }

    let handleBlur: (() => void) | null = null
    const existingStyle = iframeDoc.getElementById('editor-style')
    if (existingStyle) {
      existingStyle.remove()
    }
    const style = iframeDoc.createElement('style')
    style.id = 'editor-style'
    style.textContent = editorStyleCss
    iframeDoc.head.appendChild(style)

    const body = iframeDoc.body
    if (isEditing) {
      if (body) {
        body.contentEditable = 'true'
        body.style.outline = 'none'
        body.addEventListener('input', handleInput)
        handleBlur = () => {
          debouncedSync.flush()
        }
        body.addEventListener('blur', handleBlur)
      }
    } else if (body) {
      body.contentEditable = 'false'
    }

    return () => {
      if (restoreStateTimeoutRef.current !== null) {
        window.clearTimeout(restoreStateTimeoutRef.current)
      }
      if (body) {
        body.removeEventListener('input', handleInput)
        if (handleBlur) {
          body.removeEventListener('blur', handleBlur)
        }
      }
    }
  }, [
    iframeRef,
    content,
    isEditing,
    isUpdatingRef,
    forceContentSyncRef,
    lastSyncedContentRef,
    isInitialLoadRef,
    scrollPositionRef,
    restoreStateTimeoutRef,
    saveSelection,
    restoreSelection,
    debouncedSync,
    setIframeBody,
    handleInput,
    editorStyleCss
  ])
}
