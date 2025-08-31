import { Skeleton } from '@/components/ui/skeleton'

export default function Loading() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-6 w-40" />
      <Skeleton className="h-20" />
      <div className="grid gap-4 md:grid-cols-3">
        <Skeleton className="h-60 md:col-span-2" />
        <Skeleton className="h-60" />
      </div>
      <Skeleton className="h-60" />
    </div>
  )
}

