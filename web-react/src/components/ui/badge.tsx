import * as React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'

const badgeVariants = cva(
  'inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-medium transition-colors',
  {
    variants: {
      variant: {
        default: 'border-transparent bg-primary/10 text-primary',
        secondary: 'border-transparent bg-muted text-muted-foreground',
        destructive: 'border-transparent bg-destructive/10 text-destructive',
        outline: 'text-foreground',
        amber: 'border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900 dark:bg-amber-950/60 dark:text-amber-300',
        rose: 'border-rose-200 bg-rose-50 text-rose-600 dark:border-rose-900 dark:bg-rose-950/60 dark:text-rose-300'
      }
    },
    defaultVariants: { variant: 'default' }
  }
)

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />
}

export { Badge, badgeVariants }
