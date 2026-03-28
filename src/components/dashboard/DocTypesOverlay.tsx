'use client';

import { useRouter } from 'next/navigation';
import { useDashboardStore } from '@/stores/useDashboardStore';
import { DocumentCategoryList } from './DocumentCategoryList';

export function DocTypesOverlay() {
  const router = useRouter();
  const activeDocType = useDashboardStore((s) => s.activeDocType);
  const selectDocType = useDashboardStore((s) => s.selectDocType);
  const toggleDocTypesOverlay = useDashboardStore((s) => s.toggleDocTypesOverlay);
  const setActiveFilterTag = useDashboardStore((s) => s.setActiveFilterTag);

  const handleSelect = (cat: string) => {
    const isDifferentCategory = cat !== activeDocType;

    // 更新选中的类别
    selectDocType(cat);
    setActiveFilterTag(null);
    toggleDocTypesOverlay();

    // 如果选择了不同的类别，导航到 dashboard 页面
    if (isDifferentCategory) {
      router.push('/dashboard');
    }
  };

  return <DocumentCategoryList onSelect={handleSelect} overlay />;
}
