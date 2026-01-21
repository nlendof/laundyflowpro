import { Badge } from '@/components/ui/badge';
import { SubscriptionStatus } from '@/hooks/useSubscription';
import { Clock, CheckCircle, AlertTriangle, XCircle, Ban } from 'lucide-react';

interface SubscriptionStatusBadgeProps {
  status: SubscriptionStatus;
  daysRemaining?: number;
  className?: string;
}

const statusConfig: Record<SubscriptionStatus, {
  label: string;
  variant: 'default' | 'secondary' | 'destructive' | 'outline';
  icon: typeof Clock;
  className: string;
}> = {
  trial: {
    label: 'Período de Prueba',
    variant: 'secondary',
    icon: Clock,
    className: 'bg-blue-100 text-blue-800 hover:bg-blue-100'
  },
  active: {
    label: 'Activa',
    variant: 'default',
    icon: CheckCircle,
    className: 'bg-green-100 text-green-800 hover:bg-green-100'
  },
  past_due: {
    label: 'Pago Vencido',
    variant: 'destructive',
    icon: AlertTriangle,
    className: 'bg-yellow-100 text-yellow-800 hover:bg-yellow-100'
  },
  suspended: {
    label: 'Suspendida',
    variant: 'destructive',
    icon: Ban,
    className: 'bg-red-100 text-red-800 hover:bg-red-100'
  },
  cancelled: {
    label: 'Cancelada',
    variant: 'outline',
    icon: XCircle,
    className: 'bg-gray-100 text-gray-800 hover:bg-gray-100'
  }
};

export function SubscriptionStatusBadge({ 
  status, 
  daysRemaining,
  className 
}: SubscriptionStatusBadgeProps) {
  const config = statusConfig[status];
  const Icon = config.icon;

  return (
    <Badge 
      variant={config.variant}
      className={`${config.className} ${className || ''}`}
    >
      <Icon className="h-3 w-3 mr-1" />
      {config.label}
      {status === 'trial' && daysRemaining !== undefined && (
        <span className="ml-1">({daysRemaining} días)</span>
      )}
    </Badge>
  );
}
