import { useState, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Percent, DollarSign, X, Shield, Loader2, CheckCircle } from 'lucide-react';
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

interface DiscountInputProps {
  subtotal: number;
  onDiscountChange: (discountAmount: number) => void;
  className?: string;
  requireApprovalAbove?: number; // Amount above which admin approval is required
}

export function DiscountInput({ 
  subtotal, 
  onDiscountChange, 
  className,
  requireApprovalAbove = 50 // Default: require approval for discounts > $50
}: DiscountInputProps) {
  const [discountType, setDiscountType] = useState<DiscountType>('percentage');
  const [discountValue, setDiscountValue] = useState<string>('');
  const [isApproved, setIsApproved] = useState(false);
  const [showApprovalDialog, setShowApprovalDialog] = useState(false);
  const [approvalCode, setApprovalCode] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  
  // Calculate discount amount
  const discountAmount = (() => {
    const value = parseFloat(discountValue) || 0;
    if (value <= 0) return 0;
    
    if (discountType === 'percentage') {
      const cappedPercentage = Math.min(value, 100);
      return (subtotal * cappedPercentage) / 100;
    }
    return Math.min(value, subtotal);
  })();

  // Check if approval is needed
  const needsApproval = discountAmount > requireApprovalAbove && !isApproved;
  
  // Notify parent of discount amount
  useEffect(() => {
    if (needsApproval) {
      onDiscountChange(0); // Don't apply discount until approved
    } else {
      onDiscountChange(discountAmount);
    }
  }, [discountType, discountValue, subtotal, needsApproval, discountAmount, onDiscountChange]);

  const handleClearDiscount = () => {
    setDiscountValue('');
    setIsApproved(false);
  };

  const handleVerifyCode = async () => {
    if (!approvalCode.trim()) {
      toast.error('Ingresa el código de aprobación');
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
        .single();

      if (error || !data) {
        toast.error('Código inválido o expirado');
        return;
      }

      // Check expiration
      if (data.expires_at && new Date(data.expires_at) < new Date()) {
        toast.error('El código ha expirado');
        return;
      }

      // Decrement uses
      await supabase
        .from('admin_discount_codes')
        .update({ uses_remaining: data.uses_remaining - 1 })
        .eq('id', data.id);

      setIsApproved(true);
      setShowApprovalDialog(false);
      setApprovalCode('');
      toast.success('Descuento aprobado');
    } catch (error) {
      console.error('Error verifying code:', error);
      toast.error('Error al verificar código');
    } finally {
      setIsVerifying(false);
    }
  };

  return (
    <div className={cn('space-y-2', className)}>
      <div className="flex items-center justify-between">
        <Label className="text-sm font-medium">Descuento</Label>
        <div className="flex items-center gap-2">
          {isApproved && (
            <Badge variant="outline" className="gap-1 text-green-600 border-green-200">
              <CheckCircle className="w-3 h-3" />
              Aprobado
            </Badge>
          )}
          {discountAmount > 0 && !needsApproval && (
            <Badge variant="secondary" className="gap-1 text-green-600">
              -{discountAmount.toFixed(2)}
            </Badge>
          )}
        </div>
      </div>
      
      <div className="flex gap-2">
        {/* Type Toggle */}
        <div className="flex rounded-lg border overflow-hidden">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => setDiscountType('percentage')}
            className={cn(
              'rounded-none h-9 px-3',
              discountType === 'percentage' 
                ? 'bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground' 
                : 'hover:bg-muted'
            )}
          >
            <Percent className="w-4 h-4" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => setDiscountType('fixed')}
            className={cn(
              'rounded-none h-9 px-3 border-l',
              discountType === 'fixed' 
                ? 'bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground' 
                : 'hover:bg-muted'
            )}
          >
            <DollarSign className="w-4 h-4" />
          </Button>
        </div>
        
        {/* Value Input */}
        <div className="relative flex-1">
          <Input
            type="number"
            min="0"
            max={discountType === 'percentage' ? 100 : subtotal}
            step={discountType === 'percentage' ? 1 : 0.01}
            placeholder={discountType === 'percentage' ? '0%' : 'RD$ 0.00'}
            value={discountValue}
            onChange={(e) => {
              setDiscountValue(e.target.value);
              setIsApproved(false); // Reset approval when value changes
            }}
            className="pr-8"
          />
          {discountValue && (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="absolute right-1 top-1/2 -translate-y-1/2 h-6 w-6 text-muted-foreground hover:text-foreground"
              onClick={handleClearDiscount}
            >
              <X className="w-3 h-3" />
            </Button>
          )}
        </div>
      </div>
      
      {/* Quick percentage buttons */}
      {discountType === 'percentage' && (
        <div className="flex gap-1.5">
          {[5, 10, 15, 20].map((percent) => (
            <Button
              key={percent}
              type="button"
              variant="outline"
              size="sm"
              className="flex-1 h-7 text-xs"
              onClick={() => {
                setDiscountValue(percent.toString());
                setIsApproved(false);
              }}
            >
              {percent}%
            </Button>
          ))}
        </div>
      )}

      {/* Approval Required Warning */}
      {needsApproval && (
        <div className="flex items-center gap-2 p-2 bg-amber-500/10 border border-amber-500/30 rounded-lg">
          <Shield className="w-4 h-4 text-amber-500" />
          <span className="text-xs text-amber-700 dark:text-amber-400 flex-1">
            Descuentos mayores a ${requireApprovalAbove} requieren aprobación
          </span>
          <Button 
            size="sm" 
            variant="outline"
            className="h-7 text-xs"
            onClick={() => setShowApprovalDialog(true)}
          >
            Solicitar
          </Button>
        </div>
      )}

      {/* Approval Dialog */}
      <Dialog open={showApprovalDialog} onOpenChange={setShowApprovalDialog}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Shield className="w-5 h-5 text-primary" />
              Aprobación de Descuento
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="text-center">
              <p className="text-sm text-muted-foreground mb-2">
                Ingresa el código de autorización del administrador
              </p>
              <p className="text-2xl font-bold text-primary">
                Descuento: ${discountAmount.toFixed(2)}
              </p>
            </div>
            
            <Input
              placeholder="Código de aprobación"
              value={approvalCode}
              onChange={(e) => setApprovalCode(e.target.value.toUpperCase())}
              className="text-center text-lg tracking-widest"
              maxLength={10}
            />
            
            <Button 
              className="w-full" 
              onClick={handleVerifyCode}
              disabled={isVerifying}
            >
              {isVerifying ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Verificando...
                </>
              ) : (
                'Verificar Código'
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