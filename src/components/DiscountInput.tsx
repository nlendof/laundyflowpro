import { useState, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Percent, DollarSign, X } from 'lucide-react';
import { cn } from '@/lib/utils';

export type DiscountType = 'percentage' | 'fixed';

interface DiscountInputProps {
  subtotal: number;
  onDiscountChange: (discountAmount: number) => void;
  className?: string;
}

export function DiscountInput({ subtotal, onDiscountChange, className }: DiscountInputProps) {
  const [discountType, setDiscountType] = useState<DiscountType>('percentage');
  const [discountValue, setDiscountValue] = useState<string>('');
  
  // Calculate and notify parent of discount amount
  useEffect(() => {
    const value = parseFloat(discountValue) || 0;
    
    if (value <= 0) {
      onDiscountChange(0);
      return;
    }
    
    let discountAmount = 0;
    
    if (discountType === 'percentage') {
      // Cap percentage at 100%
      const cappedPercentage = Math.min(value, 100);
      discountAmount = (subtotal * cappedPercentage) / 100;
    } else {
      // Cap fixed discount at subtotal
      discountAmount = Math.min(value, subtotal);
    }
    
    onDiscountChange(discountAmount);
  }, [discountType, discountValue, subtotal, onDiscountChange]);

  const handleClearDiscount = () => {
    setDiscountValue('');
  };

  const discountAmount = (() => {
    const value = parseFloat(discountValue) || 0;
    if (value <= 0) return 0;
    
    if (discountType === 'percentage') {
      const cappedPercentage = Math.min(value, 100);
      return (subtotal * cappedPercentage) / 100;
    }
    return Math.min(value, subtotal);
  })();

  return (
    <div className={cn('space-y-2', className)}>
      <div className="flex items-center justify-between">
        <Label className="text-sm font-medium">Descuento</Label>
        {discountAmount > 0 && (
          <Badge variant="secondary" className="gap-1 text-green-600">
            -{discountAmount.toFixed(2)}
          </Badge>
        )}
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
            onChange={(e) => setDiscountValue(e.target.value)}
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
              onClick={() => setDiscountValue(percent.toString())}
            >
              {percent}%
            </Button>
          ))}
        </div>
      )}
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
