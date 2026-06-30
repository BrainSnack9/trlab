import { Slot } from '@radix-ui/react-slot';
import { cva } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium leading-none transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50',
  {
    variants: {
      variant: {
        default: 'bg-primary text-primary-foreground shadow hover:bg-primary/90',
        secondary: 'bg-secondary text-secondary-foreground hover:bg-secondary/80',
        outline: 'border border-border bg-white hover:border-slate-300 hover:bg-accent hover:text-accent-foreground',
        ghost: 'hover:bg-accent hover:text-accent-foreground',
        destructive: 'bg-red-600 text-white shadow hover:bg-red-700'
      },
      size: {
        default: 'h-9 px-3.5 py-2',
        sm: 'h-8 px-2.5 text-xs',
        icon: 'h-9 w-9'
      }
    },
    defaultVariants: {
      variant: 'default',
      size: 'default'
    }
  }
);

export function Button({ className, variant, size, asChild = false, ...props }) {
  const Comp = asChild ? Slot : 'button';
  return <Comp className={cn(buttonVariants({ variant, size, className }))} {...props} />;
}
