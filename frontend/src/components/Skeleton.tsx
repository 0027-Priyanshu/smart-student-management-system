export default function Skeleton({ className }: { className?: string }) {
  return (
    <div className={`animate-pulse bg-slate-100 rounded-md ${className}`} />
  );
}

export function TableSkeleton({ rows = 5, cols = 4 }: { rows?: number; cols?: number }) {
  return (
    <div className="w-full space-y-3 p-4">
      {/* Header Skeleton */}
      <div className="flex gap-4">
        {[...Array(cols)].map((_, i) => (
          <Skeleton key={`h-${i}`} className="h-6 flex-1 bg-white/10" />
        ))}
      </div>
      {/* Row Skeletons */}
      {[...Array(rows)].map((_, r) => (
        <div key={`r-${r}`} className="flex gap-4 pt-2">
          {[...Array(cols)].map((_, c) => (
            <Skeleton key={`c-${c}`} className="h-8 flex-1 bg-slate-100" />
          ))}
        </div>
      ))}
    </div>
  );
}

export function CardSkeleton() {
  return (
    <div className="p-6 bg-white/40 border border-slate-200 rounded-3xl space-y-4">
      <Skeleton className="h-5 w-1/3 bg-white/10" />
      <Skeleton className="h-10 w-full" />
      <div className="space-y-2">
        <Skeleton className="h-4 w-5/6" />
        <Skeleton className="h-4 w-4/6" />
      </div>
    </div>
  );
}
