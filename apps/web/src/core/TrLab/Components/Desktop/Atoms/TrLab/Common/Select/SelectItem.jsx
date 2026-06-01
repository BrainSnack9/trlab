import * as SelectPrimitive from '@radix-ui/react-select';
import { Check } from 'lucide-react';
import { cn } from '@/lib/utils';

export function SelectItem({ className, children, ...props }) {
  return (
    <SelectPrimitive.Item className={cn('relative flex w-full cursor-default select-none items-center rounded-sm py-1.5 pl-8 pr-2 text-sm font-semibold outline-none focus:bg-accent', className)} {...props}>
      <span className="absolute left-2 flex h-3.5 w-3.5 items-center justify-center">
        <SelectPrimitive.ItemIndicator>
          <Check className="h-4 w-4" />
        </SelectPrimitive.ItemIndicator>
      </span>
      <SelectPrimitive.ItemText>{children}</SelectPrimitive.ItemText>
    </SelectPrimitive.Item>
  );
}
