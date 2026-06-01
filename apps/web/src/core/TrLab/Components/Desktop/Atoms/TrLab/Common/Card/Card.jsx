import { cn } from '@/lib/utils';

export function Card({ className, ...props }) {
  return (
    <div
      className={cn('rounded-lg border border-border/80 bg-card text-card-foreground shadow-[0_1px_2px_rgba(15,23,42,0.04)]', className)}
      {...props}
    />
  );
}
