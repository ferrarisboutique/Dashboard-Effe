import { cn } from "@/components/ui/utils"

function Skeleton({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("animate-pulse rounded-md bg-muted", className)}
      {...props}
    />
  )
}

// Dashboard card skeleton
function CardSkeleton({ className }: { className?: string }) {
  return (
    <div className={cn("rounded-lg border bg-card p-6", className)}>
      <Skeleton className="h-4 w-1/3 mb-2" />
      <Skeleton className="h-8 w-2/3 mb-4" />
      <Skeleton className="h-3 w-1/2" />
    </div>
  )
}

// Metric card skeleton
function MetricCardSkeleton() {
  return (
    <div className="rounded-lg border bg-card p-6">
      <Skeleton className="h-4 w-24 mb-3" />
      <Skeleton className="h-10 w-32 mb-2" />
      <div className="flex items-center gap-2">
        <Skeleton className="h-4 w-16" />
        <Skeleton className="h-3 w-24" />
      </div>
    </div>
  )
}

// Chart skeleton
function ChartSkeleton({ height = 300 }: { height?: number }) {
  return (
    <div className="rounded-lg border bg-card p-6">
      <Skeleton className="h-5 w-40 mb-4" />
      <div className="flex items-end justify-between gap-2" style={{ height }}>
        {Array.from({ length: 12 }).map((_, i) => (
          <Skeleton 
            key={i} 
            className="flex-1" 
            style={{ height: `${20 + Math.random() * 60}%` }} 
          />
        ))}
      </div>
    </div>
  )
}

// Table row skeleton
function TableRowSkeleton({ columns = 5 }: { columns?: number }) {
  return (
    <div className="flex items-center gap-4 p-4 border-b">
      {Array.from({ length: columns }).map((_, i) => (
        <Skeleton 
          key={i} 
          className={cn("h-4", i === 0 ? "w-32" : "flex-1")} 
        />
      ))}
    </div>
  )
}

// Table skeleton
function TableSkeleton({ rows = 10, columns = 5 }: { rows?: number; columns?: number }) {
  return (
    <div className="rounded-lg border bg-card">
      <div className="flex items-center gap-4 p-4 border-b bg-muted/50">
        {Array.from({ length: columns }).map((_, i) => (
          <Skeleton key={i} className={cn("h-4", i === 0 ? "w-24" : "flex-1")} />
        ))}
      </div>
      {Array.from({ length: rows }).map((_, i) => (
        <TableRowSkeleton key={i} columns={columns} />
      ))}
    </div>
  )
}

// Dashboard overview skeleton
function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      {/* Title skeleton */}
      <div className="flex items-center gap-2">
        <Skeleton className="h-6 w-6" />
        <Skeleton className="h-6 w-48" />
      </div>
      
      {/* Metric cards grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <MetricCardSkeleton key={i} />
        ))}
      </div>
      
      {/* Second row of metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <MetricCardSkeleton key={i} />
        ))}
      </div>
      
      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ChartSkeleton height={400} />
        <ChartSkeleton height={400} />
      </div>
    </div>
  )
}

// Inventory skeleton
function InventorySkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-2">
          <Skeleton className="h-6 w-6" />
          <Skeleton className="h-6 w-32" />
        </div>
        <div className="flex gap-2">
          <Skeleton className="h-9 w-36" />
          <Skeleton className="h-9 w-28" />
        </div>
      </div>
      
      {/* Filters */}
      <div className="flex gap-4">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-10 w-40" />
        <Skeleton className="h-10 w-40" />
      </div>
      
      {/* Table */}
      <TableSkeleton rows={10} columns={6} />
      
      {/* Pagination */}
      <div className="flex justify-between items-center">
        <Skeleton className="h-4 w-48" />
        <div className="flex gap-2">
          <Skeleton className="h-9 w-9" />
          <Skeleton className="h-9 w-9" />
          <Skeleton className="h-9 w-9" />
        </div>
      </div>
    </div>
  )
}

export { 
  Skeleton, 
  CardSkeleton, 
  MetricCardSkeleton, 
  ChartSkeleton, 
  TableRowSkeleton, 
  TableSkeleton,
  DashboardSkeleton,
  InventorySkeleton
}
