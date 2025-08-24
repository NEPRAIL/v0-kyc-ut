import { Skeleton } from "@/components/ui/skeleton"
import { Card, CardContent } from "@/components/ui/card"

export function ProductSkeleton() {
  return (
    <Card className="card-professional overflow-hidden">
      <CardContent className="p-6 sm:p-8">
        <div className="mb-6 sm:mb-8 flex items-center justify-center">
          <Skeleton className="w-[120px] h-[120px] rounded-2xl" />
        </div>

        <div className="space-y-4 sm:space-y-6">
          <div className="flex items-center justify-between">
            <Skeleton className="h-6 w-20 rounded-full" />
            <Skeleton className="h-6 w-24 rounded-full" />
          </div>

          <div>
            <Skeleton className="h-8 w-3/4 mb-3" />
            <Skeleton className="h-4 w-full mb-2" />
            <Skeleton className="h-4 w-2/3" />
          </div>

          <div className="flex items-center justify-between pt-4 sm:pt-6 border-t border-white/10">
            <div className="flex items-center gap-2 sm:gap-3">
              <Skeleton className="h-8 w-16" />
              <Skeleton className="h-5 w-12" />
            </div>
            <Skeleton className="h-4 w-20" />
          </div>
        </div>

        <div className="mt-4 pt-4 border-t border-white/10">
          <Skeleton className="h-10 w-full rounded-md" />
        </div>
      </CardContent>
    </Card>
  )
}

export function ProductGridSkeleton({ count = 8 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6 lg:gap-8">
      {Array.from({ length: count }).map((_, i) => (
        <ProductSkeleton key={i} />
      ))}
    </div>
  )
}
