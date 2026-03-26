import { Skeleton } from '@/components/ui/Skeleton';

export default function DashboardLoading() {
  return (
    <div className="flex h-screen w-full max-w-[1920px] mx-auto">
      <aside className="w-[72px] bg-white border-r border-gray-200 h-full flex-shrink-0">
        <div className="flex flex-col items-center py-4 gap-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} variant="circular" width={32} height={32} />
          ))}
        </div>
      </aside>
      <main className="flex-1 min-w-0 bg-white p-6">
        <Skeleton width={300} height={32} className="mb-6" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} height={200} className="rounded-xl" />
          ))}
        </div>
      </main>
    </div>
  );
}
