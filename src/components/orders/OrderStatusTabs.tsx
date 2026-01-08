import { OrderStatus } from '@/types';
import { ORDER_STATUS_CONFIG, ORDER_STATUS_FLOW } from '@/lib/constants';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import {
  Clock,
  Store,
  Waves,
  Wind,
  Flame,
  Package,
  Truck,
  CheckCircle,
} from 'lucide-react';

const iconMap: Record<string, React.ElementType> = {
  Clock,
  Store,
  Waves,
  Wind,
  Flame,
  Package,
  Truck,
  CheckCircle,
};

interface OrderStatusTabsProps {
  activeStatus: OrderStatus | 'all';
  onStatusChange: (status: OrderStatus | 'all') => void;
  counts: Record<OrderStatus, number>;
}

export function OrderStatusTabs({ activeStatus, onStatusChange, counts }: OrderStatusTabsProps) {
  const totalCount = Object.values(counts).reduce((a, b) => a + b, 0);

  return (
    <div className="flex flex-wrap gap-2">
      {/* All Tab */}
      <button
        onClick={() => onStatusChange('all')}
        className={cn(
          'flex items-center gap-2 px-4 py-2 rounded-lg border transition-all duration-200',
          activeStatus === 'all'
            ? 'bg-primary text-primary-foreground border-primary shadow-md'
            : 'bg-card border-border hover:bg-muted hover:border-primary/30'
        )}
      >
        <span className="font-medium">Todos</span>
        <Badge variant="secondary" className={cn(
          'h-6 min-w-6 flex items-center justify-center',
          activeStatus === 'all' && 'bg-primary-foreground/20 text-primary-foreground'
        )}>
          {totalCount}
        </Badge>
      </button>

      {/* Status Tabs */}
      {ORDER_STATUS_FLOW.map((statusKey) => {
        const status = ORDER_STATUS_CONFIG[statusKey];
        const Icon = iconMap[status.icon];
        const count = counts[statusKey as OrderStatus] || 0;
        const isActive = activeStatus === statusKey;

        return (
          <button
            key={statusKey}
            onClick={() => onStatusChange(statusKey as OrderStatus)}
            className={cn(
              'flex items-center gap-2 px-3 py-2 rounded-lg border transition-all duration-200',
              isActive
                ? `${status.bgColor} ${status.color} border-current shadow-md`
                : 'bg-card border-border hover:bg-muted'
            )}
          >
            <Icon className="w-4 h-4" />
            <span className="font-medium hidden sm:inline">{status.labelEs}</span>
            <Badge 
              variant="secondary" 
              className={cn(
                'h-5 min-w-5 text-xs flex items-center justify-center',
                isActive && 'bg-current/20'
              )}
            >
              {count}
            </Badge>
          </button>
        );
      })}
    </div>
  );
}
