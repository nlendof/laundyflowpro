import { ORDER_STATUS_CONFIG, ORDER_STATUS_FLOW } from '@/lib/constants';
import { OrderStatus } from '@/types';
import { cn } from '@/lib/utils';
import * as Icons from 'lucide-react';
import { CheckCircle, Circle } from 'lucide-react';

interface OrderStatusFlowProps {
  currentStatus: OrderStatus;
  compact?: boolean;
}

export function OrderStatusFlow({ currentStatus, compact = false }: OrderStatusFlowProps) {
  const currentIndex = ORDER_STATUS_FLOW.indexOf(currentStatus);

  if (compact) {
    return (
      <div className="flex items-center gap-1">
        {ORDER_STATUS_FLOW.map((status, index) => {
          const config = ORDER_STATUS_CONFIG[status];
          const isCompleted = index < currentIndex;
          const isCurrent = index === currentIndex;
          
          return (
            <div
              key={status}
              className={cn(
                'w-2 h-2 rounded-full transition-all',
                isCompleted && 'bg-status-delivered',
                isCurrent && config.color.replace('text-', 'bg-'),
                !isCompleted && !isCurrent && 'bg-muted'
              )}
              title={config.labelEs}
            />
          );
        })}
      </div>
    );
  }

  return (
    <div className="w-full">
      <div className="flex items-center justify-between">
        {ORDER_STATUS_FLOW.map((status, index) => {
          const config = ORDER_STATUS_CONFIG[status];
          const isCompleted = index < currentIndex;
          const isCurrent = index === currentIndex;
          const IconComponent = Icons[config.icon as keyof typeof Icons] as React.ComponentType<{ className?: string }>;

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
                  isCompleted && 'bg-status-delivered border-status-delivered text-primary-foreground',
                  isCurrent && cn(config.bgColor, 'border-current', config.color),
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
                {config.labelEs}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
