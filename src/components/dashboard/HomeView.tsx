'use client';

import { DashboardHero } from './DashboardHero';
import { DashboardChatBox } from './DashboardChatBox';
import { DocumentTypeTags } from './DocumentTypeTags';
import { TemplateFilterBar } from './TemplateFilterBar';
import { TemplateCardGrid } from './TemplateCardGrid';

export function HomeView() {
  return (
    <div className="flex-1 min-w-0 overflow-y-auto pb-10">
      <div>
        <DashboardHero />
        <DashboardChatBox />
        <DocumentTypeTags />
      </div>

      <div className="w-full px-8 pb-20 text-left mt-10 bg-[#FAFAFA]">
        <TemplateFilterBar />
        <TemplateCardGrid />
      </div>
    </div>
  );
}
