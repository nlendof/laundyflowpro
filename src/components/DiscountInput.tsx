import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Percent, DollarSign, Shield, Loader2, CheckCircle, Bell } from 'lucide-react';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

export type DiscountType = 'percentage' | 'fixed';

interface AppliedDiscount {
  type: DiscountType;
  value: number;
  amount: number;
  code: string;
}

interface DiscountInputProps {
  subtotal: number;
  onDiscountChange: (discountAmount: number) => void;
  className?: string;
}

export function DiscountInput({ 
  subtotal, 
  onDiscountChange, 
  className,
}: DiscountInputProps) {
  const [showCodeDialog, setShowCodeDialog] = useState(false);
  const [approvalCode, setApprovalCode] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  const [appliedDiscount, setAppliedDiscount] = useState<AppliedDiscount | null>(null);

  const handleRequestCode = () => {
    // Notify admins (in a real app, this would send a push notification)
    toast.info('Solicitud enviada a los administradores', {
      description: 'Un administrador generará un código de descuento para ti',
    });
    setShowCodeDialog(true);
  };

  const handleVerifyCode = async () => {
    if (!approvalCode.trim()) {
      toast.error('Ingresa el código de descuento');
      return;
    }

    setIsVerifying(true);
    try {
      // Check if code exists and is valid
      const { data, error } = await supabase
        .from('admin_discount_codes')
        .select('*')
        .eq('code', approvalCode.toUpperCase())
        .eq('is_active', true)
        .gt('uses_remaining', 0)
        .maybeSingle();

      if (error) {
        console.error('Error verifying code:', error);
        toast.error('Error al verificar código');
        return;
      }

      if (!data) {
        toast.error('Código inválido o expirado');
        return;
      }

      // Check expiration
      if (data.expires_at && new Date(data.expires_at) < new Date()) {
        toast.error('El código ha expirado');
        return;
      }

      // Get discount type and value from the code
      const discountType = (data.discount_type as DiscountType) || 'percentage';
      const discountValue = Number(data.discount_value) || 0;
      
      // Calculate discount amount
      let discountAmount = 0;
      if (discountType === 'percentage') {
        discountAmount = (subtotal * Math.min(discountValue, 100)) / 100;
      } else {
        discountAmount = Math.min(discountValue, subtotal);
      }

      // Decrement uses
      await supabase
        .from('admin_discount_codes')
        .update({ uses_remaining: data.uses_remaining - 1 })
        .eq('id', data.id);

      setAppliedDiscount({
        type: discountType,
        value: discountValue,
        amount: discountAmount,
        code: data.code,
      });
      
      onDiscountChange(discountAmount);
      setShowCodeDialog(false);
      setApprovalCode('');
      toast.success(`Descuento aplicado: ${discountType === 'percentage' ? `${discountValue}%` : `RD$ ${discountValue}`}`);
    } catch (error) {
      console.error('Error verifying code:', error);
      toast.error('Error al verificar código');
    } finally {
      setIsVerifying(false);
    }
  };

  const handleRemoveDiscount = () => {
    setAppliedDiscount(null);
    onDiscountChange(0);
    toast.info('Descuento removido');
  };

  return (
    <div className={cn('space-y-2', className)}>
      <div className="flex items-center justify-between">
        <Label className="text-sm font-medium">Descuento</Label>
        {appliedDiscount && (
          <Badge variant="outline" className="gap-1 text-green-600 border-green-200">
            <CheckCircle className="w-3 h-3" />
            {appliedDiscount.type === 'percentage' 
              ? `${appliedDiscount.value}%` 
              : `RD$ ${appliedDiscount.value}`}
          </Badge>
        )}
      </div>
      
      {appliedDiscount ? (
        <div className="flex items-center gap-2 p-3 bg-green-500/10 border border-green-500/30 rounded-lg">
          <CheckCircle className="w-5 h-5 text-green-600" />
          <div className="flex-1">
            <p className="text-sm font-medium text-green-700 dark:text-green-400">
              Descuento aplicado: -{appliedDiscount.amount.toFixed(2)}
            </p>
            <p className="text-xs text-green-600 dark:text-green-500">
              Código: {appliedDiscount.code}
            </p>
          </div>
          <Button 
            variant="ghost" 
            size="sm" 
            className="text-red-500 hover:text-red-600 hover:bg-red-50"
            onClick={handleRemoveDiscount}
          >
            Quitar
          </Button>
        </div>
      ) : (
        <Button 
          variant="outline" 
          className="w-full gap-2 border-dashed"
          onClick={handleRequestCode}
        >
          <Shield className="w-4 h-4" />
          Solicitar Código de Descuento
        </Button>
      )}

      {/* Code Entry Dialog */}
      <Dialog open={showCodeDialog} onOpenChange={setShowCodeDialog}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Shield className="w-5 h-5 text-primary" />
              Código de Descuento
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="text-center space-y-2">
              <div className="flex items-center justify-center gap-2 text-amber-600 bg-amber-50 dark:bg-amber-900/20 p-3 rounded-lg">
                <Bell className="w-5 h-5" />
                <span className="text-sm">
                  Notificación enviada a administradores
                </span>
              </div>
              <p className="text-sm text-muted-foreground">
                Ingresa el código que te proporcionó el administrador
              </p>
            </div>
            
            <Input
              placeholder="Código de descuento"
              value={approvalCode}
              onChange={(e) => setApprovalCode(e.target.value.toUpperCase())}
              className="text-center text-lg tracking-widest font-mono"
              maxLength={10}
              autoFocus
            />
            
            <p className="text-xs text-center text-muted-foreground">
              El descuento será aplicado automáticamente según el código
            </p>
            
            <Button 
              className="w-full" 
              onClick={handleVerifyCode}
              disabled={isVerifying || !approvalCode.trim()}
            >
              {isVerifying ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Verificando...
                </>
              ) : (
                'Aplicar Código'
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// Hook for managing discount state
export function useDiscount() {
  const [discountAmount, setDiscountAmount] = useState(0);
  
  const resetDiscount = () => {
    setDiscountAmount(0);
  };
  
  return {
    discountAmount,
    setDiscountAmount,
    resetDiscount,
  };
}