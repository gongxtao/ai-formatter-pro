'use client';

import { useDashboardStore } from '@/stores/useDashboardStore';
import { DocumentCategoryList } from './DocumentCategoryList';

export function DocumentPanel() {
  const selectDocType = useDashboardStore((s) => s.selectDocType);
  const setActiveFilterTag = useDashboardStore((s) => s.setActiveFilterTag);

  const handleSelect = (cat: string) => {
    selectDocType(cat);
    setActiveFilterTag(null);
  };

  return <DocumentCategoryList onSelect={handleSelect} />;
}
