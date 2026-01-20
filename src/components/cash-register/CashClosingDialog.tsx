import { useState } from 'react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  DollarSign,
  Loader2,
  CheckCircle,
  AlertTriangle,
  Lock,
  TrendingUp,
  TrendingDown,
  Calculator,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatCurrency } from '@/lib/currency';

interface CashClosingDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedDate: Date;
  openingBalance: number;
  totalIncome: number;
  totalExpense: number;
  expectedBalance: number;
  currency: string;
  onClose: (data: {
    actualBalance: number;
    notes: string;
  }) => Promise<void>;
  existingClosing?: {
    actual_balance: number | null;
    difference: number | null;
    notes: string | null;
    created_at: string;
  } | null;
}

export function CashClosingDialog({
  open,
  onOpenChange,
  selectedDate,
  openingBalance,
  totalIncome,
  totalExpense,
  expectedBalance,
  currency,
  onClose,
  existingClosing,
}: CashClosingDialogProps) {
  const [actualBalance, setActualBalance] = useState('');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const parsedActualBalance = parseFloat(actualBalance) || 0;
  const difference = parsedActualBalance - expectedBalance;

  const handleSubmit = () => {
    if (!actualBalance || parsedActualBalance < 0) {
      return;
    }
    setShowConfirm(true);
  };

  const handleConfirmClose = async () => {
    setIsSubmitting(true);
    try {
      await onClose({
        actualBalance: parsedActualBalance,
        notes,
      });
      setActualBalance('');
      setNotes('');
      setShowConfirm(false);
      onOpenChange(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  const isClosed = existingClosing?.actual_balance !== null;

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Lock className="w-5 h-5 text-primary" />
              Cierre de Caja
            </DialogTitle>
            <DialogDescription>
              {format(selectedDate, "EEEE, d 'de' MMMM 'de' yyyy", { locale: es })}
            </DialogDescription>
          </DialogHeader>

          {isClosed ? (
            <div className="space-y-4 py-4">
              <div className="bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800 rounded-lg p-4">
                <div className="flex items-center gap-2 text-green-700 dark:text-green-300 font-medium mb-2">
                  <CheckCircle className="w-5 h-5" />
                  Caja cerrada
                </div>
                <p className="text-sm text-muted-foreground">
                  Cerrado el {format(new Date(existingClosing?.created_at || new Date()), "dd/MM/yyyy 'a las' HH:mm", { locale: es })}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">Saldo esperado</p>
                  <p className="text-lg font-medium">{formatCurrency(expectedBalance, currency)}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">Saldo real</p>
                  <p className="text-lg font-medium">{formatCurrency(existingClosing?.actual_balance || 0, currency)}</p>
                </div>
              </div>

              {existingClosing?.difference !== null && existingClosing?.difference !== 0 && (
                <div className={cn(
                  "p-3 rounded-lg",
                  existingClosing.difference > 0 
                    ? "bg-green-50 dark:bg-green-950 text-green-700 dark:text-green-300"
                    : "bg-red-50 dark:bg-red-950 text-red-700 dark:text-red-300"
                )}>
                  <div className="flex items-center justify-between">
                    <span>Diferencia:</span>
                    <span className="font-bold">
                      {existingClosing.difference > 0 ? '+' : ''}
                      {formatCurrency(existingClosing.difference, currency)}
                    </span>
                  </div>
                </div>
              )}

              {existingClosing?.notes && (
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">Notas</p>
                  <p className="text-sm bg-muted p-2 rounded">{existingClosing.notes}</p>
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-4 py-4">
              {/* Summary */}
              <div className="bg-muted/50 rounded-lg p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Saldo inicial</span>
                  <span className="font-medium">{formatCurrency(openingBalance, currency)}</span>
                </div>
                <div className="flex items-center justify-between text-green-600">
                  <span className="flex items-center gap-1">
                    <TrendingUp className="w-4 h-4" />
                    Ingresos
                  </span>
                  <span className="font-medium">+{formatCurrency(totalIncome, currency)}</span>
                </div>
                <div className="flex items-center justify-between text-red-600">
                  <span className="flex items-center gap-1">
                    <TrendingDown className="w-4 h-4" />
                    Egresos
                  </span>
                  <span className="font-medium">-{formatCurrency(totalExpense, currency)}</span>
                </div>
                <Separator />
                <div className="flex items-center justify-between font-bold text-lg">
                  <span className="flex items-center gap-1">
                    <Calculator className="w-4 h-4" />
                    Saldo esperado
                  </span>
                  <span className="text-primary">{formatCurrency(expectedBalance, currency)}</span>
                </div>
              </div>

              {/* Actual balance input */}
              <div className="space-y-2">
                <Label htmlFor="actual-balance">Saldo real en caja</Label>
                <div className="relative">
                  <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    id="actual-balance"
                    type="number"
                    placeholder="0.00"
                    value={actualBalance}
                    onChange={(e) => setActualBalance(e.target.value)}
                    className="pl-9 text-lg"
                  />
                </div>
              </div>

              {/* Difference preview */}
              {actualBalance && (
                <div className={cn(
                  "p-3 rounded-lg flex items-center justify-between",
                  difference === 0
                    ? "bg-green-50 dark:bg-green-950 text-green-700 dark:text-green-300"
                    : difference > 0
                    ? "bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-300"
                    : "bg-red-50 dark:bg-red-950 text-red-700 dark:text-red-300"
                )}>
                  <span className="flex items-center gap-2">
                    {difference === 0 ? (
                      <CheckCircle className="w-4 h-4" />
                    ) : (
                      <AlertTriangle className="w-4 h-4" />
                    )}
                    {difference === 0 ? 'Cuadrado' : 'Diferencia'}
                  </span>
                  <span className="font-bold">
                    {difference > 0 ? '+' : ''}
                    {formatCurrency(difference, currency)}
                  </span>
                </div>
              )}

              {/* Notes */}
              <div className="space-y-2">
                <Label htmlFor="notes">Notas (opcional)</Label>
                <Textarea
                  id="notes"
                  placeholder="Observaciones sobre el cierre..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={2}
                />
              </div>
            </div>
          )}

          {!isClosed && (
            <DialogFooter>
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                Cancelar
              </Button>
              <Button
                onClick={handleSubmit}
                disabled={!actualBalance || parsedActualBalance < 0}
                className="gap-2"
              >
                <Lock className="w-4 h-4" />
                Cerrar Caja
              </Button>
            </DialogFooter>
          )}
        </DialogContent>
      </Dialog>

      <AlertDialog open={showConfirm} onOpenChange={setShowConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Confirmar cierre de caja?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción cerrará la caja del día con un saldo de{' '}
              <span className="font-bold">{formatCurrency(parsedActualBalance, currency)}</span>.
              {difference !== 0 && (
                <span className={cn(
                  "block mt-2 font-medium",
                  difference > 0 ? "text-blue-600" : "text-red-600"
                )}>
                  Existe una diferencia de {difference > 0 ? '+' : ''}
                  {formatCurrency(difference, currency)}
                </span>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isSubmitting}>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmClose} disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Confirmar Cierre
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
