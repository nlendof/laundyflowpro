import { OrderStatus } from '@/types';
import { cn } from '@/lib/utils';
import * as Icons from 'lucide-react';
import { CheckCircle, Circle } from 'lucide-react';
import { useOperationsFlow } from '@/hooks/useOperationsFlow';

interface OrderStatusFlowProps {
  currentStatus: OrderStatus;
  compact?: boolean;
}

export function OrderStatusFlow({ currentStatus, compact = false }: OrderStatusFlowProps) {
  const { statusFlow, statusConfig } = useOperationsFlow();
  const currentIndex = statusFlow.indexOf(currentStatus);

  if (compact) {
    return (
      <div className="flex items-center gap-1">
        {statusFlow.map((status, index) => {
          const config = statusConfig[status];
          const isCompleted = index < currentIndex;
          const isCurrent = index === currentIndex;
          
          return (
            <div
              key={status}
              className={cn(
                'w-2 h-2 rounded-full transition-all',
                isCompleted && 'bg-green-500',
                isCurrent && config?.bgColor,
                !isCompleted && !isCurrent && 'bg-muted'
              )}
              title={config?.labelEs || status}
            />
          );
        })}
      </div>
    );
  }

  return (
    <div className="w-full">
      <div className="flex items-center justify-between">
        {statusFlow.map((status, index) => {
          const config = statusConfig[status];
          const isCompleted = index < currentIndex;
          const isCurrent = index === currentIndex;
          const iconName = config?.icon || 'Circle';
          const IconComponent = Icons[iconName as keyof typeof Icons] as React.ComponentType<{ className?: string }>;

          return (
            <div key={status} className="flex flex-col items-center relative flex-1">
              {/* Connector Line */}
              {index > 0 && (
                <div
                  className={cn(
                    'absolute top-5 right-1/2 w-full h-0.5 -translate-y-1/2',
                    index <= currentIndex ? 'bg-primary' : 'bg-muted'
                  )}
                  style={{ width: 'calc(100% - 40px)', right: 'calc(50% + 20px)' }}
                />
              )}
              
              {/* Status Icon */}
              <div
                className={cn(
                  'relative z-10 flex items-center justify-center w-10 h-10 rounded-full border-2 transition-all',
                  isCompleted && 'bg-green-500 border-green-500 text-white',
                  isCurrent && cn(config?.bgColor, 'border-current', config?.color),
                  !isCompleted && !isCurrent && 'bg-muted border-muted-foreground/20 text-muted-foreground'
                )}
              >
                {isCompleted ? (
                  <CheckCircle className="w-5 h-5" />
                ) : IconComponent ? (
                  <IconComponent className="w-5 h-5" />
                ) : (
                  <Circle className="w-5 h-5" />
                )}
              </div>
              
              {/* Label */}
              <span
                className={cn(
                  'mt-2 text-xs text-center font-medium max-w-[80px]',
                  isCurrent ? 'text-foreground' : 'text-muted-foreground'
                )}
              >
                {config?.labelEs || status}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
