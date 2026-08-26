import * as React from 'react'
import { cn } from '@/lib/utils'

const Card = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(
        // 纸卡：微圆角、暖调分层阴影、上缘发丝高光
        'rounded-xl border border-border bg-card text-card-foreground',
        'shadow-[inset_0_1px_0_hsl(0_0%_100%/.6),0_1px_2px_hsl(var(--shadow-warm)/.05),0_4px_14px_-4px_hsl(var(--shadow-warm)/.16)]',
        'dark:shadow-[inset_0_1px_0_hsl(0_0%_100%/.04),0_4px_14px_-4px_hsl(0_0%_0%/.5)]',
        className
      )}
      {...props}
    />
  )
)
Card.displayName = 'Card'

const CardHeader = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn('flex flex-col space-y-1.5 p-5', className)} {...props} />
  )
)
CardHeader.displayName = 'CardHeader'

const CardTitle = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn('text-[15px] font-bold leading-none tracking-tight', className)} {...props} />
  )
)
CardTitle.displayName = 'CardTitle'

const CardDescription = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn('text-[13px] leading-relaxed text-muted-foreground', className)} {...props} />
  )
)
CardDescription.displayName = 'CardDescription'

const CardContent = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn('p-5 pt-0', className)} {...props} />
  )
)
CardContent.displayName = 'CardContent'

export { Card, CardHeader, CardTitle, CardDescription, CardContent }
