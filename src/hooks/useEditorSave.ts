'use client'

import { useState, useCallback, type RefObject } from 'react'
import { useTranslations } from 'next-intl'
import { useDashboardStore } from '@/stores/useDashboardStore'
import { useHistoryStore } from '@/stores/useHistoryStore'
import { useToast } from '@/components/ui/Toast'
import type { EditablePreviewRef } from '@/components/editor/EditablePreview'

interface UseEditorSaveOptions {
  previewRef: RefObject<EditablePreviewRef | null>
}

export function useEditorSave({ previewRef }: UseEditorSaveOptions) {
  const t = useTranslations('editor')
  const th = useTranslations('history')
  const { toast } = useToast()

  const activeDocType = useDashboardStore((s) => s.activeDocType)
  const saveDocument = useHistoryStore((s) => s.saveDocument)

  const [docTitle, setDocTitle] = useState(t('untitled'))
  const [isSaving, setIsSaving] = useState(false)
  const [showSavedIcon, setShowSavedIcon] = useState(false)

  const handleSave = useCallback(() => {
    // Flush pending debounced content from iframe before reading
    previewRef.current?.flushContent?.()

    const html = useDashboardStore.getState().currentEditorHtml
    if (!html.trim()) {
      toast(t('noContentToSave'), 'info', 2000)
      return
    }

    setIsSaving(true)
    try {
      const ok = saveDocument({
        title: docTitle || t('untitled'),
        content: html,
        category: activeDocType
      })
      if (ok) {
        setShowSavedIcon(true)
        setTimeout(() => setShowSavedIcon(false), 2000)
        toast(th('saved'), 'success', 2000)
      } else {
        toast(th('storageFull'), 'error', 3000)
      }
    } finally {
      setIsSaving(false)
    }
  }, [docTitle, activeDocType, saveDocument, t, th, toast, previewRef])

  return { docTitle, setDocTitle, isSaving, showSavedIcon, handleSave }
}
