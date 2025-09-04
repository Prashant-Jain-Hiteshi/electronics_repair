import React from 'react'

type SkeletonProps = React.HTMLAttributes<HTMLDivElement> & {
  className?: string
  variant?: 'rect' | 'text' | 'circle'
}

export const Skeleton: React.FC<SkeletonProps> = ({ className = '', variant = 'rect', ...rest }) => {
  const base = 'animate-pulse bg-gray-200 dark:bg-gray-700'
  const shape = variant === 'circle' ? 'rounded-full' : 'rounded-md'
  return <div aria-hidden className={`${base} ${shape} ${className}`} {...rest} />
}

export const SkeletonText: React.FC<{ lines?: number; className?: string }> = ({ lines = 3, className = '' }) => {
  return (
    <div aria-hidden className={`space-y-2 ${className}`}>
      {Array.from({ length: lines }).map((_, i) => (
        <div key={i} className={`h-3 ${i === lines - 1 ? 'w-2/3' : 'w-full'} animate-pulse bg-gray-200 dark:bg-gray-700 rounded`} />
      ))}
    </div>
  )
}

export const SkeletonAvatar: React.FC<{ size?: number; className?: string }> = ({ size = 32, className = '' }) => (
  <div aria-hidden className={`animate-pulse bg-gray-200 dark:bg-gray-700 rounded-full ${className}`} style={{ width: size, height: size }} />
)

export const TableSkeleton: React.FC<{ rows?: number; cols?: number; className?: string }> = ({ rows = 5, cols = 5, className = '' }) => {
  return (
    <div role="status" aria-live="polite" className={`w-full ${className}`}>
      <div className="w-full border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
        <div className="bg-gray-100 dark:bg-gray-800 h-10" />
        <div className="divide-y divide-gray-200 dark:divide-gray-800">
          {Array.from({ length: rows }).map((_, r) => (
            <div key={r} className="grid" style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}>
              {Array.from({ length: cols }).map((__, c) => (
                <div key={c} className="p-3">
                  <div className="h-4 w-3/4 animate-pulse bg-gray-200 dark:bg-gray-700 rounded" />
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>
      <span className="sr-only">Loading content</span>
    </div>
  )
}

export default Skeleton
