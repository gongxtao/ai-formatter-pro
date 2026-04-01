'use client'

import { useEffect, type RefObject } from 'react'
import { useDashboardStore } from '@/stores/useDashboardStore'

interface AutoSaveHandle {
  schedule: (content: string) => void
  cancel: () => void
  flush: () => void
}

interface UseTemplateLoaderOptions {
  autoSaveRef: RefObject<AutoSaveHandle>
  onDocTitleChange: (title: string) => void
}

export function useTemplateLoader({ autoSaveRef, onDocTitleChange }: UseTemplateLoaderOptions) {
  const selectedTemplateId = useDashboardStore((s) => s.selectedTemplateId)

  useEffect(() => {
    if (!selectedTemplateId) return

    const loadTemplate = async () => {
      const dashStore = useDashboardStore.getState()
      dashStore.setIsTemplateLoading(true)
      try {
        const res = await fetch(`/api/templates?id=${selectedTemplateId}`)
        if (!res.ok) throw new Error('Failed to load template')
        const data = await res.json()
        if (data.html) {
          dashStore.setCurrentEditorHtml(data.html)
          autoSaveRef.current?.schedule(data.html)
          if (data.template?.name) onDocTitleChange(data.template.name)
        }
      } catch (e) {
        console.error('Failed to load template:', e)
      } finally {
        dashStore.setSelectedTemplateId(null)
        dashStore.setIsTemplateLoading(false)
      }
    }
    loadTemplate()
  }, [selectedTemplateId, autoSaveRef, onDocTitleChange])
}
