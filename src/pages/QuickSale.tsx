import { useState, useMemo } from 'react';
import { Order, OrderItem, ItemType } from '@/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent } from '@/components/ui/card';
import { OrderQRCode } from '@/components/orders/OrderQRCode';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  User,
  Phone,
  MapPin,
  Plus,
  Minus,
  Trash2,
  Truck,
  Waves,
  Flame,
  Sparkles,
  Eraser,
  Droplet,
  Zap,
  Scale,
  Shirt,
  Package,
  ShoppingCart,
  CreditCard,
  Banknote,
  Smartphone,
  CheckCircle,
  Receipt,
  RefreshCw,
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

// Quick services with large touch buttons
const QUICK_SERVICES = [
  { id: 'wash_dry', name: 'Lavado + Secado', price: 5.00, icon: Waves, color: 'bg-blue-500', unit: 'kg' },
  { id: 'wash_dry_iron', name: 'Lavado Completo', price: 8.00, icon: Flame, color: 'bg-orange-500', unit: 'kg' },
  { id: 'dry_clean', name: 'Lavado en Seco', price: 12.00, icon: Sparkles, color: 'bg-purple-500', unit: 'pieza' },
  { id: 'shirts', name: 'Camisas', price: 3.00, icon: Shirt, color: 'bg-cyan-500', unit: 'pieza' },
  { id: 'pants', name: 'Pantalones', price: 4.00, icon: Package, color: 'bg-indigo-500', unit: 'pieza' },
  { id: 'blankets', name: 'Cobijas', price: 15.00, icon: Package, color: 'bg-teal-500', unit: 'pieza' },
];

// Extra services
const EXTRA_SERVICES = [
  { id: 'stain_removal', name: 'Desmanchado', price: 3.00, icon: Eraser },
  { id: 'premium_softener', name: 'Suavizante Premium', price: 2.00, icon: Droplet },
  { id: 'express', name: 'Express 24h', price: 10.00, icon: Zap },
];

// Payment methods
const PAYMENT_METHODS = [
  { id: 'cash', name: 'Efectivo', icon: Banknote },
  { id: 'card', name: 'Tarjeta', icon: CreditCard },
  { id: 'transfer', name: 'Transferencia', icon: Smartphone },
];

interface CartItem {
  id: string;
  serviceId: string;
  name: string;
  quantity: number;
  unitPrice: number;
  unit: string;
}

export default function QuickSale() {
  // Customer info
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  
  // Delivery
  const [isDelivery, setIsDelivery] = useState(false);
  const [customerAddress, setCustomerAddress] = useState('');
  
  // Cart
  const [cart, setCart] = useState<CartItem[]>([]);
  const [selectedExtras, setSelectedExtras] = useState<string[]>([]);
  
  // Payment
  const [paymentMethod, setPaymentMethod] = useState<string>('cash');
  const [amountReceived, setAmountReceived] = useState<string>('');
  
  // Completed order
  const [completedOrder, setCompletedOrder] = useState<{ ticketCode: string; customerName: string } | null>(null);
  const [showSuccess, setShowSuccess] = useState(false);

  // Calculate totals
  const cartTotal = useMemo(() => {
    return cart.reduce((sum, item) => sum + (item.quantity * item.unitPrice), 0);
  }, [cart]);

  const extrasTotal = useMemo(() => {
    return selectedExtras.reduce((sum, extraId) => {
      const extra = EXTRA_SERVICES.find(e => e.id === extraId);
      return sum + (extra?.price || 0);
    }, 0);
  }, [selectedExtras]);

  const totalAmount = cartTotal + extrasTotal;
  const change = parseFloat(amountReceived || '0') - totalAmount;

  // Generate ticket code
  const generateTicketCode = () => {
    const date = new Date();
    const prefix = 'LC';
    const dateStr = `${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, '0')}${String(date.getDate()).padStart(2, '0')}`;
    const random = Math.random().toString(36).substring(2, 6).toUpperCase();
    return `${prefix}-${dateStr}-${random}`;
  };

  // Add service to cart
  const addToCart = (service: typeof QUICK_SERVICES[0]) => {
    const existingItem = cart.find(item => item.serviceId === service.id);
    
    if (existingItem) {
      setCart(prev => prev.map(item => 
        item.serviceId === service.id 
          ? { ...item, quantity: item.quantity + 1 }
          : item
      ));
    } else {
      setCart(prev => [...prev, {
        id: crypto.randomUUID(),
        serviceId: service.id,
        name: service.name,
        quantity: 1,
        unitPrice: service.price,
        unit: service.unit,
      }]);
    }
  };

  // Update cart item quantity
  const updateCartQuantity = (itemId: string, delta: number) => {
    setCart(prev => prev.map(item => {
      if (item.id === itemId) {
        const newQty = Math.max(0.5, item.quantity + delta);
        return { ...item, quantity: newQty };
      }
      return item;
    }).filter(item => item.quantity > 0));
  };

  // Remove from cart
  const removeFromCart = (itemId: string) => {
    setCart(prev => prev.filter(item => item.id !== itemId));
  };

  // Toggle extra
  const toggleExtra = (extraId: string) => {
    setSelectedExtras(prev => 
      prev.includes(extraId) 
        ? prev.filter(id => id !== extraId)
        : [...prev, extraId]
    );
  };

  // Quick amount buttons
  const quickAmounts = [50, 100, 200, 500];

  // Process sale
  const processSale = () => {
    if (cart.length === 0) {
      toast.error('Agrega al menos un servicio');
      return;
    }
    if (!customerName) {
      toast.error('Ingresa el nombre del cliente');
      return;
    }

    const ticketCode = generateTicketCode();
    
    setCompletedOrder({
      ticketCode,
      customerName,
    });
    setShowSuccess(true);
    
    toast.success(`Venta completada: ${ticketCode}`);
  };

  // Reset form
  const resetSale = () => {
    setCustomerName('');
    setCustomerPhone('');
    setIsDelivery(false);
    setCustomerAddress('');
    setCart([]);
    setSelectedExtras([]);
    setPaymentMethod('cash');
    setAmountReceived('');
    setShowSuccess(false);
    setCompletedOrder(null);
  };

  return (
    <div className="h-[calc(100vh-2rem)] flex flex-col lg:flex-row gap-4 p-4 lg:p-6">
      {/* Left Panel - Services */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <div className="mb-4">
          <h1 className="text-2xl lg:text-3xl font-bold flex items-center gap-3">
            <ShoppingCart className="w-8 h-8 text-primary" />
            Venta Rápida
          </h1>
          <p className="text-muted-foreground">Selecciona los servicios para crear un pedido</p>
        </div>

        {/* Quick Services Grid */}
        <div className="flex-1 overflow-y-auto">
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 lg:gap-4">
            {QUICK_SERVICES.map((service) => {
              const Icon = service.icon;
              const inCart = cart.find(item => item.serviceId === service.id);
              
              return (
                <button
                  key={service.id}
                  onClick={() => addToCart(service)}
                  className={cn(
                    'relative p-4 lg:p-6 rounded-2xl border-2 transition-all duration-200',
                    'hover:scale-[1.02] active:scale-[0.98]',
                    'flex flex-col items-center justify-center text-center gap-2',
                    'min-h-[120px] lg:min-h-[150px]',
                    inCart 
                      ? 'border-primary bg-primary/10 ring-2 ring-primary/20' 
                      : 'border-border hover:border-primary/50 bg-card'
                  )}
                >
                  {inCart && (
                    <Badge className="absolute top-2 right-2 h-6 min-w-6">
                      {inCart.quantity}
                    </Badge>
                  )}
                  <div className={cn('w-12 h-12 lg:w-14 lg:h-14 rounded-xl flex items-center justify-center text-white', service.color)}>
                    <Icon className="w-6 h-6 lg:w-7 lg:h-7" />
                  </div>
                  <span className="font-semibold text-sm lg:text-base">{service.name}</span>
                  <span className="text-primary font-bold text-lg lg:text-xl">
                    ${service.price.toFixed(2)}/{service.unit}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Extra Services */}
          <div className="mt-6">
            <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide mb-3">
              Servicios Extra
            </h3>
            <div className="flex flex-wrap gap-2">
              {EXTRA_SERVICES.map((extra) => {
                const Icon = extra.icon;
                const isSelected = selectedExtras.includes(extra.id);
                
                return (
                  <button
                    key={extra.id}
                    onClick={() => toggleExtra(extra.id)}
                    className={cn(
                      'flex items-center gap-2 px-4 py-2.5 rounded-xl border transition-all',
                      isSelected
                        ? 'border-primary bg-primary/10 text-primary'
                        : 'border-border hover:border-primary/50 bg-card'
                    )}
                  >
                    <Icon className="w-4 h-4" />
                    <span className="font-medium">{extra.name}</span>
                    <Badge variant={isSelected ? 'default' : 'secondary'}>
                      +${extra.price.toFixed(2)}
                    </Badge>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Right Panel - Cart & Checkout */}
      <div className="w-full lg:w-[400px] flex flex-col bg-card rounded-2xl border shadow-lg overflow-hidden">
        {/* Customer Info */}
        <div className="p-4 border-b bg-muted/30">
          <div className="grid gap-3">
            <div className="flex gap-2">
              <div className="relative flex-1">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Nombre del cliente *"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  className="pl-10"
                />
              </div>
              <div className="relative flex-1">
                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Teléfono"
                  value={customerPhone}
                  onChange={(e) => setCustomerPhone(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Truck className="w-4 h-4 text-primary" />
                <span className="text-sm font-medium">Delivery</span>
              </div>
              <Switch checked={isDelivery} onCheckedChange={setIsDelivery} />
            </div>

            {isDelivery && (
              <div className="relative">
                <MapPin className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Dirección de entrega"
                  value={customerAddress}
                  onChange={(e) => setCustomerAddress(e.target.value)}
                  className="pl-10"
                />
              </div>
            )}
          </div>
        </div>

        {/* Cart Items */}
        <div className="flex-1 overflow-y-auto p-4">
          {cart.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center text-muted-foreground">
              <ShoppingCart className="w-12 h-12 mb-2 opacity-30" />
              <p>Carrito vacío</p>
              <p className="text-sm">Selecciona servicios para agregar</p>
            </div>
          ) : (
            <div className="space-y-3">
              {cart.map((item) => (
                <div 
                  key={item.id} 
                  className="flex items-center justify-between p-3 bg-muted/50 rounded-xl"
                >
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{item.name}</p>
                    <p className="text-sm text-muted-foreground">
                      ${item.unitPrice.toFixed(2)} / {item.unit}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="flex items-center bg-background rounded-lg">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => updateCartQuantity(item.id, -0.5)}
                      >
                        <Minus className="w-3 h-3" />
                      </Button>
                      <span className="w-10 text-center text-sm font-medium">
                        {item.quantity}
                      </span>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => updateCartQuantity(item.id, 0.5)}
                      >
                        <Plus className="w-3 h-3" />
                      </Button>
                    </div>
                    <span className="font-bold w-16 text-right">
                      ${(item.quantity * item.unitPrice).toFixed(2)}
                    </span>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-destructive hover:text-destructive"
                      onClick={() => removeFromCart(item.id)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))}

              {/* Extras in cart */}
              {selectedExtras.length > 0 && (
                <>
                  <Separator />
                  {selectedExtras.map((extraId) => {
                    const extra = EXTRA_SERVICES.find(e => e.id === extraId);
                    if (!extra) return null;
                    return (
                      <div key={extraId} className="flex items-center justify-between px-3 py-2 text-sm">
                        <span className="text-muted-foreground">+ {extra.name}</span>
                        <span className="font-medium">${extra.price.toFixed(2)}</span>
                      </div>
                    );
                  })}
                </>
              )}
            </div>
          )}
        </div>

        {/* Payment Section */}
        <div className="border-t p-4 space-y-4 bg-muted/30">
          {/* Payment Methods */}
          <div className="flex gap-2">
            {PAYMENT_METHODS.map((method) => {
              const Icon = method.icon;
              return (
                <button
                  key={method.id}
                  onClick={() => setPaymentMethod(method.id)}
                  className={cn(
                    'flex-1 flex items-center justify-center gap-2 p-3 rounded-xl border transition-all',
                    paymentMethod === method.id
                      ? 'border-primary bg-primary text-primary-foreground'
                      : 'border-border hover:border-primary/50'
                  )}
                >
                  <Icon className="w-4 h-4" />
                  <span className="font-medium text-sm">{method.name}</span>
                </button>
              );
            })}
          </div>

          {/* Cash Payment */}
          {paymentMethod === 'cash' && (
            <div className="space-y-2">
              <Label className="text-sm">Monto Recibido</Label>
              <div className="flex gap-2">
                <Input
                  type="number"
                  placeholder="$0.00"
                  value={amountReceived}
                  onChange={(e) => setAmountReceived(e.target.value)}
                  className="text-lg font-bold"
                />
              </div>
              <div className="flex gap-2">
                {quickAmounts.map((amount) => (
                  <Button
                    key={amount}
                    variant="outline"
                    size="sm"
                    className="flex-1"
                    onClick={() => setAmountReceived(amount.toString())}
                  >
                    ${amount}
                  </Button>
                ))}
              </div>
              {parseFloat(amountReceived) >= totalAmount && totalAmount > 0 && (
                <div className="flex items-center justify-between p-3 bg-green-500/10 rounded-xl border border-green-500/30">
                  <span className="text-green-700 dark:text-green-400">Cambio:</span>
                  <span className="text-2xl font-bold text-green-600 dark:text-green-400">
                    ${change.toFixed(2)}
                  </span>
                </div>
              )}
            </div>
          )}

          {/* Total */}
          <div className="flex items-center justify-between p-4 bg-primary/10 rounded-xl">
            <span className="text-lg font-medium">Total:</span>
            <span className="text-3xl font-bold text-primary">${totalAmount.toFixed(2)}</span>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3">
            <Button 
              variant="outline" 
              size="lg" 
              className="flex-1 gap-2"
              onClick={resetSale}
            >
              <RefreshCw className="w-4 h-4" />
              Limpiar
            </Button>
            <Button 
              size="lg" 
              className="flex-1 gap-2"
              onClick={processSale}
              disabled={cart.length === 0 || !customerName}
            >
              <Receipt className="w-4 h-4" />
              Cobrar
            </Button>
          </div>
        </div>
      </div>

      {/* Success Dialog */}
      <Dialog open={showSuccess} onOpenChange={setShowSuccess}>
        <DialogContent className="max-w-sm text-center">
          <DialogHeader>
            <DialogTitle className="flex flex-col items-center gap-4">
              <div className="w-20 h-20 rounded-full bg-green-500/20 flex items-center justify-center">
                <CheckCircle className="w-10 h-10 text-green-500" />
              </div>
              <span>¡Venta Completada!</span>
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="text-3xl font-bold text-primary">
              ${totalAmount.toFixed(2)}
            </div>
            
            {paymentMethod === 'cash' && change > 0 && (
              <div className="p-3 bg-green-500/10 rounded-xl">
                <span className="text-sm text-muted-foreground">Cambio:</span>
                <p className="text-2xl font-bold text-green-600">${change.toFixed(2)}</p>
              </div>
            )}

            <div className="flex gap-3">
              <Button variant="outline" className="flex-1" onClick={resetSale}>
                Nueva Venta
              </Button>
              {completedOrder && (
                <Button 
                  className="flex-1"
                  onClick={() => {
                    setShowSuccess(false);
                  }}
                >
                  Ver Ticket
                </Button>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* QR Code Modal */}
      {completedOrder && !showSuccess && (
        <OrderQRCode
          ticketCode={completedOrder.ticketCode}
          customerName={completedOrder.customerName}
          isOpen={!!completedOrder && !showSuccess}
          onClose={resetSale}
        />
      )}
    </div>
  );
}
