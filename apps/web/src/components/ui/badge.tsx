import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '../../lib/utils';

const badgeVariants = cva(
  'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium transition-colors',
  {
    variants: {
      variant: {
        default: 'bg-indigo-500/20 text-indigo-300',
        income: 'bg-green-500/20 text-green-300',
        expense: 'bg-red-500/20 text-red-300',
        secondary: 'bg-gray-700 text-gray-300',
        outline: 'border border-gray-600 text-gray-300',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  },
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

export function Badge({ className, variant, style, ...props }: BadgeProps) {
  return <div className={cn(badgeVariants({ variant }), className)} style={style} {...props} />;
}
