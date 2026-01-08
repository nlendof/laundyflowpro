import { cn } from '@/lib/utils';
import { LucideIcon } from 'lucide-react';

interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: LucideIcon;
  trend?: {
    value: number;
    isPositive: boolean;
  };
  variant?: 'default' | 'primary' | 'success' | 'warning' | 'info';
  className?: string;
}

export function StatCard({
  title,
  value,
  subtitle,
  icon: Icon,
  trend,
  variant = 'default',
  className,
}: StatCardProps) {
  const variantStyles = {
    default: 'bg-card',
    primary: 'bg-primary/5 border-primary/20',
    success: 'bg-status-delivered-bg border-status-delivered/20',
    warning: 'bg-status-pending-bg border-status-pending/20',
    info: 'bg-status-washing-bg border-status-washing/20',
  };

  const iconStyles = {
    default: 'bg-muted text-muted-foreground',
    primary: 'bg-primary/10 text-primary',
    success: 'bg-status-delivered/10 text-status-delivered',
    warning: 'bg-status-pending/10 text-status-pending',
    info: 'bg-status-washing/10 text-status-washing',
  };

  return (
    <div
      className={cn(
        'relative overflow-hidden rounded-xl border p-6 shadow-sm transition-all hover:shadow-md animate-fade-in',
        variantStyles[variant],
        className
      )}
    >
      <div className="flex items-start justify-between">
        <div className="space-y-2">
          <p className="text-sm font-medium text-muted-foreground">{title}</p>
          <p className="text-3xl font-bold tracking-tight">{value}</p>
          {subtitle && (
            <p className="text-sm text-muted-foreground">{subtitle}</p>
          )}
          {trend && (
            <p
              className={cn(
                'text-sm font-medium',
                trend.isPositive ? 'text-status-delivered' : 'text-destructive'
              )}
            >
              {trend.isPositive ? '↑' : '↓'} {Math.abs(trend.value)}%
              <span className="text-muted-foreground font-normal"> vs ayer</span>
            </p>
          )}
        </div>
        <div className={cn('rounded-xl p-3', iconStyles[variant])}>
          <Icon className="h-6 w-6" />
        </div>
      </div>
    </div>
  );
}
