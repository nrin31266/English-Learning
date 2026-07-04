import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import type { VocabViewMode } from "../../hooks/useVocabTopicsCatalog";

export function VocabTopicsSkeleton({ viewMode }: { viewMode: VocabViewMode }) {
  if (viewMode === "list")
    return (
      <div className="space-y-2 [&_[data-slot=skeleton]]:bg-muted" aria-label="Loading topics">
        {Array.from({ length: 6 }).map((_, index) => (
          <Card key={index} className="p-4">
            <div className="flex items-center gap-4">
              <Skeleton className="h-14 w-14 shrink-0 rounded-xl" />
              <div className="flex-1 space-y-2.5">
                <Skeleton className="h-5 w-2/5" />
                <Skeleton className="h-3.5 w-3/4" />
                <Skeleton className="h-2.5 w-1/3" />
              </div>
              <Skeleton className="hidden h-9 w-24 rounded-lg sm:block" />
            </div>
          </Card>
        ))}
      </div>
    );
  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3 [&_[data-slot=skeleton]]:bg-muted" aria-label="Loading topics">
      {Array.from({ length: 6 }).map((_, index) => (
        <Card key={index} className="overflow-hidden">
          <Skeleton className="h-36 w-full rounded-none" />
          <CardContent className="space-y-3 p-4">
            <Skeleton className="h-5 w-3/4" />
            <Skeleton className="h-4 w-full" />
            <div className="flex gap-2"><Skeleton className="h-6 w-16" /><Skeleton className="h-6 w-20" /></div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

export function VocabProgressSkeleton() {
  return (
    <div className="grid gap-4 opacity-90 xl:grid-cols-[minmax(0,1fr)_360px] [&_[data-slot=skeleton]]:bg-muted" aria-label="Loading progress">
      <div className="space-y-4">
        <Skeleton className="h-32 rounded-2xl" />
        <Skeleton className="h-56 rounded-2xl" />
        <div className="grid gap-3 lg:grid-cols-2">
          <Skeleton className="h-28 rounded-2xl" /><Skeleton className="h-28 rounded-2xl" />
        </div>
      </div>
      <div className="space-y-4"><Skeleton className="h-40 rounded-2xl" /><Skeleton className="h-64 rounded-2xl" /></div>
    </div>
  );
}
