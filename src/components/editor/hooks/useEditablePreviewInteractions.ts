import { useEffect, MutableRefObject, RefObject } from 'react'
import type { FloatingImageItem } from '../FloatingImageLayer'

interface UseEditablePreviewInteractionsProps {
  iframeRef: RefObject<HTMLIFrameElement>
  isEditing: boolean
  activeTableRef: MutableRefObject<HTMLTableElement | null>
  selectedImageRef: MutableRefObject<HTMLImageElement | null>
  selectedFloatingImageIdRef: MutableRefObject<string | null>
  floatingImagesRef: MutableRefObject<FloatingImageItem[]>
  canUndoRef: MutableRefObject<boolean>
  canRedoRef: MutableRefObject<boolean>
  setSelectedImage: (image: HTMLImageElement | null) => void
  setActiveTable: (table: HTMLTableElement | null) => void
  handleSelectFloatingImage: (id: string | null) => void
  onFloatingImagesChange: (images: FloatingImageItem[]) => void
  onFloatingImageDelete: (images: FloatingImageItem[]) => void
  handleUndo: () => void
  handleRedo: () => void
  isAtLineEnd: (range: Range) => boolean
  getCleanHtml: (doc: Document) => string
  debouncedSync: (html: string) => void
}

export const useEditablePreviewInteractions = ({
  iframeRef,
  isEditing,
  activeTableRef,
  selectedImageRef,
  selectedFloatingImageIdRef,
  floatingImagesRef,
  canUndoRef,
  canRedoRef,
  setSelectedImage,
  setActiveTable,
  handleSelectFloatingImage,
  onFloatingImagesChange,
  onFloatingImageDelete,
  handleUndo,
  handleRedo,
  isAtLineEnd,
  getCleanHtml,
  debouncedSync
}: UseEditablePreviewInteractionsProps) => {
  useEffect(() => {
    const iframe = iframeRef.current
    const iframeDoc = iframe?.contentDocument || iframe?.contentWindow?.document
    if (!iframeDoc) return

    const handleGlobalClick = (e: MouseEvent) => {
      if (!isEditing) {
        setSelectedImage(null)
        setActiveTable(null)
        return
      }
      let target = e.target as HTMLElement
      if (target.nodeType === 3 && target.parentElement) {
        target = target.parentElement
      }
      if (target.tagName === 'IMG') {
        setSelectedImage(target as HTMLImageElement)
        return
      }
      const table = target.closest('table')
      if (table) {
        if (activeTableRef.current !== table) {
          setActiveTable(table as HTMLTableElement)
        }
      } else {
        setActiveTable(null)
        setSelectedImage(null)
      }
    }

    const handleContextMenu = (e: MouseEvent) => {
      if (!isEditing) return
      let target = e.target as HTMLElement
      if (target.nodeType === 3 && target.parentElement) {
        target = target.parentElement
      }
      const table = target.closest('table')
      if (table) {
        setActiveTable(table as HTMLTableElement)
      }
    }

    const handleGlobalMouseDown = (e: MouseEvent) => {
      if (!isEditing) return
      let target = e.target as HTMLElement
      if (target.nodeType === 3 && target.parentElement) {
        target = target.parentElement
      }
      const isFloatingLayerTarget = !!target.closest('[data-floating-layer="true"]')
      if (isFloatingLayerTarget) {
        setSelectedImage(null)
        setActiveTable(null)
        return
      }
      if (target.tagName === 'IMG' || target.classList.contains('resizer-handle')) {
        return
      }
      handleSelectFloatingImage(null)
      const table = target.closest('table')
      if (table) {
        if (activeTableRef.current !== table) {
          setActiveTable(table as HTMLTableElement)
        }
        return
      }
      setSelectedImage(null)
      setActiveTable(null)
    }

    const handleMouseUp = (e: MouseEvent) => {
      if (!isEditing) return
      const target = e.target as HTMLElement
      if (target.closest('[data-floating-layer="true"]')) {
        return
      }
      handleSelectFloatingImage(null)
      if (target.tagName === 'IMG') {
        setSelectedImage(target as HTMLImageElement)
      }
    }

    const handleSelectionChange = () => {
      if (!isEditing) return
      const selection = iframeDoc.getSelection()
      if (selection && selection.rangeCount > 0) {
        const range = selection.getRangeAt(0)
        let node = range.startContainer
        if (node.nodeType === 3 && node.parentElement) {
          node = node.parentElement
        }
        const element = node as HTMLElement
        if (typeof element.closest !== 'function') {
          setActiveTable(null)
          return
        }
        const table = element.closest('table')
        if (table) {
          setActiveTable(table as HTMLTableElement)
        } else {
          setActiveTable(null)
        }
      }
    }

    const handlePaste = (e: ClipboardEvent) => {
      if (!isEditing) return
      const items = Array.from(e.clipboardData?.items || [])
      const imageItem = items.find(item => item.type.startsWith('image/'))
      if (!imageItem) return
      e.preventDefault()
      const file = imageItem.getAsFile()
      if (!file) return
      if (file.size > 10 * 1024 * 1024) {
        alert('粘贴失败：图片超过10MB，请压缩后重试')
        return
      }
      const reader = new FileReader()
      reader.onload = (event) => {
        const dataUrl = event.target?.result as string
        if (!dataUrl) return
        const img = iframeDoc.createElement('img')
        img.src = dataUrl
        img.style.maxWidth = '100%'
        img.style.height = 'auto'
        const selection = iframeDoc.getSelection()
        if (selection && selection.rangeCount > 0) {
          const range = selection.getRangeAt(0)
          range.deleteContents()
          range.insertNode(img)
          range.setStartAfter(img)
          range.setEndAfter(img)
          selection.removeAllRanges()
          selection.addRange(range)
        } else {
          iframeDoc.body.appendChild(img)
        }
        debouncedSync(getCleanHtml(iframeDoc))
      }
      reader.readAsDataURL(file)
    }

    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isEditing) return
      if (e.key === 'Enter') {
        const selection = iframeDoc.getSelection()
        if (!selection) return

        let range: Range | null = null
        if (selection.rangeCount > 0) {
          range = selection.getRangeAt(0)
        } else if (iframeDoc.body) {
          range = iframeDoc.createRange()
          range.selectNodeContents(iframeDoc.body)
          range.collapse(false)
          selection.removeAllRanges()
          selection.addRange(range)
        }
        if (!range) return

        const rangeContainer = range.startContainer.nodeType === Node.ELEMENT_NODE
          ? range.startContainer as Element
          : range.startContainer.parentElement
        const isInsideListItem = !!rangeContainer?.closest('li')
        if (isInsideListItem) {
          window.setTimeout(() => {
            debouncedSync(getCleanHtml(iframeDoc))
          }, 0)
          return
        }

        e.preventDefault()
        e.stopPropagation()
        range.deleteContents()
        isAtLineEnd(range)
        const br = iframeDoc.createElement('br')
        range.insertNode(br)
        range.setStartAfter(br)
        range.setEndAfter(br)
        selection.removeAllRanges()
        selection.addRange(range)
        const newHtml = getCleanHtml(iframeDoc)
        debouncedSync(newHtml)
        return
      }
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
        e.preventDefault()
        e.stopPropagation()
        if (e.shiftKey) {
          if (canRedoRef.current) {
            handleRedo()
          } else {
            iframeDoc.execCommand('redo')
          }
        } else {
          if (canUndoRef.current) {
            handleUndo()
          } else {
            iframeDoc.execCommand('undo')
          }
        }
        return
      }
      if (e.key === 'Delete' || e.key === 'Backspace') {
        const floatingId = selectedFloatingImageIdRef.current
        if (floatingId) {
          e.preventDefault()
          e.stopPropagation()
          const nextImages = floatingImagesRef.current.filter(image => image.id !== floatingId)
          onFloatingImagesChange(nextImages)
          handleSelectFloatingImage(null)
          onFloatingImageDelete(nextImages)
          return
        }
        const currentSelectedImage = selectedImageRef.current
        if (currentSelectedImage) {
          e.preventDefault()
          e.stopPropagation()
          currentSelectedImage.remove()
          setSelectedImage(null)
          const newHtml = getCleanHtml(iframeDoc)
          debouncedSync(newHtml)
        }
      }
    }

    const win = iframeDoc.defaultView || window
    win.addEventListener('mousedown', handleGlobalMouseDown, true)
    iframeDoc.addEventListener('mousedown', handleGlobalMouseDown, true)
    iframeDoc.addEventListener('click', handleGlobalClick, false)
    iframeDoc.addEventListener('mouseup', handleMouseUp, false)
    iframeDoc.addEventListener('contextmenu', handleContextMenu, false)
    iframeDoc.addEventListener('selectionchange', handleSelectionChange, false)
    iframeDoc.addEventListener('paste', handlePaste)
    iframeDoc.addEventListener('keydown', handleKeyDown)

    return () => {
      iframeDoc.removeEventListener('paste', handlePaste)
      iframeDoc.removeEventListener('keydown', handleKeyDown)
      iframeDoc.removeEventListener('selectionchange', handleSelectionChange, false)
      iframeDoc.removeEventListener('contextmenu', handleContextMenu, false)
      iframeDoc.removeEventListener('mouseup', handleMouseUp, false)
      iframeDoc.removeEventListener('click', handleGlobalClick, false)
      iframeDoc.removeEventListener('mousedown', handleGlobalMouseDown, true)
      win.removeEventListener('mousedown', handleGlobalMouseDown, true)
    }
  }, [
    iframeRef,
    isEditing,
    activeTableRef,
    selectedImageRef,
    selectedFloatingImageIdRef,
    floatingImagesRef,
    canUndoRef,
    canRedoRef,
    setSelectedImage,
    setActiveTable,
    handleSelectFloatingImage,
    onFloatingImagesChange,
    onFloatingImageDelete,
    handleUndo,
    handleRedo,
    isAtLineEnd,
    getCleanHtml,
    debouncedSync
  ])
}
