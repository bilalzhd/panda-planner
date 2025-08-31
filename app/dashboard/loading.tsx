import { Skeleton } from '@/components/ui/skeleton'

export default function Loading() {
  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-4">
        <Skeleton className="h-24" />
        <Skeleton className="h-24" />
        <Skeleton className="h-24" />
        <Skeleton className="h-24" />
      </div>
      <div className="grid gap-4 md:grid-cols-3">
        <Skeleton className="h-48 md:col-span-2" />
        <Skeleton className="h-48" />
      </div>
      <Skeleton className="h-96" />
    </div>
  )
}

