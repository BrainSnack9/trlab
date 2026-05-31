import { cn } from '@/lib/utils';

export function Badge({ className, variant = 'default', ...props }) {
  return (
    <div
      className={cn(
        'inline-flex min-h-6 items-center rounded-full border px-2.5 py-0.5 text-[11px] font-black leading-none transition-colors',
        variant === 'default' && 'border-transparent bg-primary text-primary-foreground',
        variant === 'secondary' && 'border-transparent bg-secondary text-secondary-foreground',
        variant === 'destructive' && 'border-transparent bg-red-600 text-white',
        variant === 'outline' && 'border-border bg-white text-foreground',
        className
      )}
      {...props}
    />
  );
}
