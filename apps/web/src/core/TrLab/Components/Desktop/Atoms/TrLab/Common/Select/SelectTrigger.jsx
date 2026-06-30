import * as SelectPrimitive from '@radix-ui/react-select';
import { ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';

export function SelectTrigger({ className, children, ...props }) {
  return (
    <SelectPrimitive.Trigger
      className={cn('flex h-9 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm font-medium ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring', className)}
      {...props}
    >
      {children}
      <SelectPrimitive.Icon asChild>
        <ChevronDown className="h-4 w-4 opacity-50" />
      </SelectPrimitive.Icon>
    </SelectPrimitive.Trigger>
  );
}
