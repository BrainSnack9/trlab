import * as SelectPrimitive from '@radix-ui/react-select';
import { cn } from '@/lib/utils';

export function SelectContent({ className, children, ...props }) {
  return (
    <SelectPrimitive.Portal>
      <SelectPrimitive.Content className={cn('z-50 min-w-[8rem] overflow-hidden rounded-md border bg-card text-card-foreground shadow-md', className)} {...props}>
        <SelectPrimitive.Viewport className="p-1">{children}</SelectPrimitive.Viewport>
      </SelectPrimitive.Content>
    </SelectPrimitive.Portal>
  );
}
