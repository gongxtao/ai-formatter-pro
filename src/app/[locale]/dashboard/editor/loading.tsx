import { Skeleton } from '@/components/ui/Skeleton';

export default function EditorLoading() {
  return (
    <div className="flex h-screen flex-col">
      <div className="h-[68px] border-b border-gray-100 flex items-center px-4 gap-3">
        <Skeleton width={120} height={24} />
        <Skeleton width={160} height={24} />
        <div className="flex-1" />
        <Skeleton width={64} height={32} className="rounded-lg" />
        <Skeleton width={100} height={32} className="rounded-lg" />
      </div>
      <div className="flex-1 overflow-y-auto bg-[#F3F4F6] p-8">
        <div className="mx-auto max-w-[210mm]">
          <Skeleton width="100%" height="1123px" className="rounded-sm" />
        </div>
      </div>
    </div>
  );
}
