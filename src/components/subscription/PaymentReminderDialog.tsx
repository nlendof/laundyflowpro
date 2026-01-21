import { useState } from 'react';
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { AlertTriangle, CreditCard, Clock } from 'lucide-react';
import { useSubscription, SubscriptionCheckResult } from '@/hooks/useSubscription';
import { useNavigate } from 'react-router-dom';

interface PaymentReminderDialogProps {
  open: boolean;
  onClose: () => void;
  onProceed?: () => void;
  checkResult: SubscriptionCheckResult;
}

export function PaymentReminderDialog({
  open,
  onClose,
  onProceed,
  checkResult
}: PaymentReminderDialogProps) {
  const navigate = useNavigate();
  const [acknowledged, setAcknowledged] = useState(false);

  const handleGoToPayment = () => {
    navigate('/settings?tab=subscription');
    onClose();
  };

  const handleProceed = () => {
    if (onProceed) {
      onProceed();
    }
    onClose();
  };

  const isGracePeriod = checkResult.isInGracePeriod;
  const isSuspended = checkResult.status === 'suspended';

  return (
    <AlertDialog open={open} onOpenChange={onClose}>
      <AlertDialogContent className="max-w-md">
        <AlertDialogHeader>
          <div className="flex items-center gap-3 mb-2">
            <div className={`p-3 rounded-full ${isSuspended ? 'bg-destructive/10' : 'bg-warning/10'}`}>
              {isSuspended ? (
                <AlertTriangle className="h-6 w-6 text-destructive" />
              ) : (
                <Clock className="h-6 w-6 text-warning" />
              )}
            </div>
            <AlertDialogTitle className="text-xl">
              {isSuspended ? 'Suscripción Suspendida' : 'Pago Pendiente'}
            </AlertDialogTitle>
          </div>
          <AlertDialogDescription asChild>
            <div className="space-y-3 text-left">
              {isSuspended ? (
                <>
                  <p className="text-foreground">
                    La suscripción de esta sucursal ha sido suspendida por falta de pago.
                  </p>
                  <p className="text-muted-foreground">
                    No es posible crear pedidos ni realizar ventas hasta regularizar el pago.
                  </p>
                </>
              ) : (
                <>
                  <p className="text-foreground">
                    El pago de la suscripción de esta sucursal está vencido.
                  </p>
                  <div className="bg-warning/10 border border-warning/20 rounded-lg p-3">
                    <p className="text-sm font-medium text-warning">
                      Tienes {checkResult.daysUntilSuspension} día(s) restantes para realizar el pago
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Después de este período, la sucursal será suspendida.
                    </p>
                  </div>
                </>
              )}
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>

        <AlertDialogFooter className="flex-col sm:flex-row gap-2">
          <Button
            variant="default"
            onClick={handleGoToPayment}
            className="w-full sm:w-auto"
          >
            <CreditCard className="mr-2 h-4 w-4" />
            Ir a Pagar
          </Button>
          
          {!isSuspended && onProceed && (
            <Button
              variant="outline"
              onClick={handleProceed}
              className="w-full sm:w-auto"
            >
              Continuar de todos modos
            </Button>
          )}
          
          {isSuspended && (
            <Button
              variant="ghost"
              onClick={onClose}
              className="w-full sm:w-auto"
            >
              Cerrar
            </Button>
          )}
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
