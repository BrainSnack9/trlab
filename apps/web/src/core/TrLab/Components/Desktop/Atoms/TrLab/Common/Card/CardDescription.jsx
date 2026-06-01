import { cn } from '@/lib/utils';

export function CardDescription({ className, ...props }) {
  return <p className={cn('text-xs font-bold uppercase tracking-normal text-muted-foreground', className)} {...props} />;
}
