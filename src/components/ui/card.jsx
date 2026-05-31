import { cn } from '@/lib/utils';

export function Card({ className, ...props }) {
  return <div className={cn('rounded-lg border border-border/80 bg-card text-card-foreground shadow-[0_1px_2px_rgba(15,23,42,0.04)]', className)} {...props} />;
}

export function CardHeader({ className, ...props }) {
  return <div className={cn('flex flex-col space-y-1.5 p-4', className)} {...props} />;
}

export function CardTitle({ className, ...props }) {
  return <h3 className={cn('text-base font-black leading-tight tracking-tight text-slate-950', className)} {...props} />;
}

export function CardDescription({ className, ...props }) {
  return <p className={cn('text-xs font-bold uppercase tracking-normal text-muted-foreground', className)} {...props} />;
}

export function CardContent({ className, ...props }) {
  return <div className={cn('p-4 pt-0', className)} {...props} />;
}
