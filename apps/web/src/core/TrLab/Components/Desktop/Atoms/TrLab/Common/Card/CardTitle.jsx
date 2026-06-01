import { cn } from '@/lib/utils';

export function CardTitle({ className, ...props }) {
  return <h3 className={cn('text-base font-black leading-tight tracking-tight text-slate-950', className)} {...props} />;
}
