import { OrderStatus } from '@/types';
import { cn } from '@/lib/utils';
import * as Icons from 'lucide-react';
import { useOperationsFlow } from '@/hooks/useOperationsFlow';

interface StatusBadgeProps {
  status: OrderStatus;
  showIcon?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

export function StatusBadge({ status, showIcon = true, size = 'md' }: StatusBadgeProps) {
  const { getStatusConfig } = useOperationsFlow();
  const config = getStatusConfig(status);
  
  if (!config) {
    return (
      <span className="inline-flex items-center gap-1.5 font-medium rounded-full bg-muted text-muted-foreground px-3 py-1 text-sm">
        {status}
      </span>
    );
  }
  
  const IconComponent = Icons[config.icon as keyof typeof Icons] as React.ComponentType<{ className?: string }>;
  
  const sizeClasses = {
    sm: 'text-xs px-2 py-0.5',
    md: 'text-sm px-3 py-1',
    lg: 'text-base px-4 py-1.5',
  };
  
  const iconSizes = {
    sm: 'w-3 h-3',
    md: 'w-4 h-4',
    lg: 'w-5 h-5',
  };

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 font-medium rounded-full transition-all',
        config.bgColor,
        config.color,
        sizeClasses[size]
      )}
    >
      {showIcon && IconComponent && (
        <IconComponent className={iconSizes[size]} />
      )}
      {config.labelEs}
    </span>
  );
}
