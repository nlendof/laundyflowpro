import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { AlertTriangle, Loader2, Mail, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

interface Laundry {
  id: string;
  name: string;
}

interface DeleteLaundryDialogProps {
  laundry: Laundry | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onDeleted: () => void;
}

export function DeleteLaundryDialog({ 
  laundry, 
  open, 
  onOpenChange, 
  onDeleted 
}: DeleteLaundryDialogProps) {
  const [step, setStep] = useState<'confirm' | 'code'>('confirm');
  const [confirmText, setConfirmText] = useState('');
  const [confirmationCode, setConfirmationCode] = useState('');
  const [maskedEmail, setMaskedEmail] = useState('');
  const [loading, setLoading] = useState(false);

  const handleRequestCode = async () => {
    if (confirmText !== 'ELIMINAR') {
      toast.error('Escribe ELIMINAR para continuar');
      return;
    }

    if (!laundry) return;

    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('delete-laundry', {
        body: {
          laundry_id: laundry.id,
          action: 'request_code',
        },
      });

      if (error) throw error;
      if (data.error) throw new Error(data.error);

      setMaskedEmail(data.email || '');
      setStep('code');
      toast.success('Código enviado a tu correo');
    } catch (error) {
      console.error('Error requesting code:', error);
      toast.error(error instanceof Error ? error.message : 'Error al solicitar código');
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!confirmationCode.trim() || confirmationCode.length !== 6) {
      toast.error('Ingresa el código de 6 dígitos');
      return;
    }

    if (!laundry) return;

    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('delete-laundry', {
        body: {
          laundry_id: laundry.id,
          action: 'confirm_delete',
          confirmation_code: confirmationCode,
        },
      });

      if (error) throw error;
      if (data.error) throw new Error(data.error);

      toast.success(data.message || 'Lavandería eliminada');
      handleClose();
      onDeleted();
    } catch (error) {
      console.error('Error deleting laundry:', error);
      toast.error(error instanceof Error ? error.message : 'Error al eliminar');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setStep('confirm');
    setConfirmText('');
    setConfirmationCode('');
    setMaskedEmail('');
    onOpenChange(false);
  };

  if (!laundry) return null;

  return (
    <AlertDialog open={open} onOpenChange={handleClose}>
      <AlertDialogContent className="max-w-md">
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2 text-destructive">
            <AlertTriangle className="w-5 h-5" />
            {step === 'confirm' ? 'Eliminar Lavandería' : 'Confirmar Eliminación'}
          </AlertDialogTitle>
          <AlertDialogDescription className="space-y-3">
            {step === 'confirm' ? (
              <>
                <p>
                  Estás a punto de eliminar <strong className="text-foreground">{laundry.name}</strong> permanentemente.
                </p>
                <div className="bg-destructive/10 border border-destructive/30 rounded-lg p-3 text-sm">
                  <p className="font-semibold text-destructive mb-2">⚠️ Esta acción es IRREVERSIBLE</p>
                  <p className="text-muted-foreground">Se eliminarán:</p>
                  <ul className="text-muted-foreground list-disc list-inside mt-1 space-y-1">
                    <li>Todas las sucursales</li>
                    <li>Todos los pedidos e historial</li>
                    <li>Todos los clientes</li>
                    <li>Todo el inventario y catálogo</li>
                    <li>Todos los registros de caja</li>
                  </ul>
                </div>
                <div className="space-y-2 pt-2">
                  <Label htmlFor="confirm-text">
                    Escribe <span className="font-mono font-bold text-destructive">ELIMINAR</span> para continuar:
                  </Label>
                  <Input
                    id="confirm-text"
                    value={confirmText}
                    onChange={(e) => setConfirmText(e.target.value.toUpperCase())}
                    placeholder="ELIMINAR"
                    className="font-mono"
                  />
                </div>
              </>
            ) : (
              <>
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Mail className="w-4 h-4" />
                  <span>Código enviado a: <strong>{maskedEmail}</strong></span>
                </div>
                <p className="text-sm">
                  Ingresa el código de 6 dígitos que recibiste en tu correo para confirmar la eliminación.
                </p>
                <div className="space-y-2 pt-2">
                  <Label htmlFor="confirmation-code">Código de confirmación:</Label>
                  <Input
                    id="confirmation-code"
                    value={confirmationCode}
                    onChange={(e) => setConfirmationCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    placeholder="000000"
                    className="font-mono text-center text-2xl tracking-widest"
                    maxLength={6}
                  />
                </div>
                <p className="text-xs text-muted-foreground">
                  El código expira en 10 minutos.
                </p>
              </>
            )}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={loading}>
            Cancelar
          </Button>
          {step === 'confirm' ? (
            <Button
              variant="destructive"
              onClick={handleRequestCode}
              disabled={loading || confirmText !== 'ELIMINAR'}
              className="gap-2"
            >
              {loading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Mail className="w-4 h-4" />
              )}
              Enviar Código
            </Button>
          ) : (
            <Button
              variant="destructive"
              onClick={handleConfirmDelete}
              disabled={loading || confirmationCode.length !== 6}
              className="gap-2"
            >
              {loading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Trash2 className="w-4 h-4" />
              )}
              Eliminar Permanentemente
            </Button>
          )}
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
