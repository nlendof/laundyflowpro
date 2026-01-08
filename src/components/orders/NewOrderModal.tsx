import { useState, useMemo } from 'react';
import { Order, OrderItem, ItemType, OrderStatus } from '@/types';
import { QUICK_SERVICES } from '@/lib/constants';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  User,
  Phone,
  MapPin,
  Plus,
  Minus,
  Trash2,
  Truck,
  ShoppingBag,
  Waves,
  Flame,
  Sparkles,
  Eraser,
  Droplet,
  Zap,
  Scale,
  Shirt,
  Package,
} from 'lucide-react';

const iconMap: Record<string, React.ElementType> = {
  Waves, Flame, Sparkles, Eraser, Droplet, Zap,
};

// Categorías de prendas
const GARMENT_CATEGORIES = [
  { id: 'shirts', name: 'Camisas', icon: Shirt, pricePerPiece: 3.00, pricePerKg: 8.00 },
  { id: 'pants', name: 'Pantalones', icon: Package, pricePerPiece: 4.00, pricePerKg: 9.00 },
  { id: 'dresses', name: 'Vestidos', icon: Package, pricePerPiece: 6.00, pricePerKg: 12.00 },
  { id: 'jackets', name: 'Chaquetas', icon: Package, pricePerPiece: 8.00, pricePerKg: 15.00 },
  { id: 'blankets', name: 'Cobijas', icon: Package, pricePerPiece: 12.00, pricePerKg: 10.00 },
  { id: 'mixed', name: 'Ropa Mixta', icon: Package, pricePerPiece: 2.50, pricePerKg: 6.00 },
];

// Servicios extra
const EXTRA_SERVICES = [
  { id: 'stain_removal', name: 'Desmanchado', price: 3.00 },
  { id: 'premium_softener', name: 'Suavizante Premium', price: 2.00 },
  { id: 'express', name: 'Express (24h)', price: 10.00 },
  { id: 'fragrance', name: 'Fragancia Especial', price: 1.50 },
];

interface NewOrderModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreateOrder: (order: Order) => void;
}

interface OrderItemDraft {
  id: string;
  categoryId: string;
  name: string;
  type: ItemType;
  quantity: number;
  unitPrice: number;
  extras: string[];
}

export function NewOrderModal({ isOpen, onClose, onCreateOrder }: NewOrderModalProps) {
  // Customer info
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerAddress, setCustomerAddress] = useState('');
  
  // Delivery options
  const [isDelivery, setIsDelivery] = useState(false);
  const [deliverySlot, setDeliverySlot] = useState<'morning' | 'afternoon'>('morning');
  
  // Items
  const [items, setItems] = useState<OrderItemDraft[]>([]);
  const [selectedExtras, setSelectedExtras] = useState<string[]>([]);
  
  // Notes
  const [notes, setNotes] = useState('');
  
  // Quick add state
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [selectedType, setSelectedType] = useState<ItemType>('piece');
  const [quantity, setQuantity] = useState<number>(1);

  // Calculate totals
  const itemsTotal = useMemo(() => {
    return items.reduce((sum, item) => sum + (item.quantity * item.unitPrice), 0);
  }, [items]);

  const extrasTotal = useMemo(() => {
    return selectedExtras.reduce((sum, extraId) => {
      const extra = EXTRA_SERVICES.find(e => e.id === extraId);
      return sum + (extra?.price || 0);
    }, 0);
  }, [selectedExtras]);

  const totalAmount = itemsTotal + extrasTotal;

  // Generate ticket code
  const generateTicketCode = () => {
    const date = new Date();
    const prefix = 'LC';
    const dateStr = `${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, '0')}${String(date.getDate()).padStart(2, '0')}`;
    const random = Math.random().toString(36).substring(2, 6).toUpperCase();
    return `${prefix}-${dateStr}-${random}`;
  };

  // Add item
  const handleAddItem = () => {
    if (!selectedCategory || quantity <= 0) return;
    
    const category = GARMENT_CATEGORIES.find(c => c.id === selectedCategory);
    if (!category) return;

    const unitPrice = selectedType === 'piece' ? category.pricePerPiece : category.pricePerKg;

    const newItem: OrderItemDraft = {
      id: crypto.randomUUID(),
      categoryId: category.id,
      name: category.name,
      type: selectedType,
      quantity,
      unitPrice,
      extras: [],
    };

    setItems(prev => [...prev, newItem]);
    setSelectedCategory('');
    setQuantity(1);
  };

  // Remove item
  const handleRemoveItem = (itemId: string) => {
    setItems(prev => prev.filter(item => item.id !== itemId));
  };

  // Update item quantity
  const handleUpdateQuantity = (itemId: string, delta: number) => {
    setItems(prev => prev.map(item => {
      if (item.id === itemId) {
        const newQty = Math.max(0.5, item.quantity + delta);
        return { ...item, quantity: newQty };
      }
      return item;
    }));
  };

  // Toggle extra service
  const toggleExtra = (extraId: string) => {
    setSelectedExtras(prev => 
      prev.includes(extraId) 
        ? prev.filter(id => id !== extraId)
        : [...prev, extraId]
    );
  };

  // Reset form
  const resetForm = () => {
    setCustomerName('');
    setCustomerPhone('');
    setCustomerAddress('');
    setIsDelivery(false);
    setDeliverySlot('morning');
    setItems([]);
    setSelectedExtras([]);
    setNotes('');
    setSelectedCategory('');
    setQuantity(1);
  };

  // Create order
  const handleCreateOrder = () => {
    if (!customerName || !customerPhone || items.length === 0) return;

    const ticketCode = generateTicketCode();
    
    const order: Order = {
      id: crypto.randomUUID(),
      ticketCode,
      qrCode: ticketCode, // QR data is the ticket code
      customerId: crypto.randomUUID(),
      customerName,
      customerPhone,
      customerAddress: isDelivery ? customerAddress : undefined,
      items: items.map(item => ({
        id: item.id,
        name: item.name,
        type: item.type,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        extras: selectedExtras.map(id => EXTRA_SERVICES.find(e => e.id === id)?.name || ''),
      })),
      status: isDelivery ? 'pending_pickup' : 'in_store',
      totalAmount,
      paidAmount: 0,
      isPaid: false,
      isDelivery,
      deliverySlot: isDelivery ? deliverySlot : undefined,
      createdAt: new Date(),
      updatedAt: new Date(),
      estimatedReadyAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // +24h
      notes: notes || undefined,
    };

    onCreateOrder(order);
    resetForm();
    onClose();
  };

  const canCreate = customerName && customerPhone && items.length > 0;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open) { onClose(); } }}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <ShoppingBag className="w-6 h-6 text-primary" />
            Nuevo Pedido
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Customer Info */}
          <div className="space-y-4">
            <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">
              Datos del Cliente
            </h3>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="customerName">Nombre *</Label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    id="customerName"
                    placeholder="Nombre del cliente"
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="customerPhone">Teléfono *</Label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    id="customerPhone"
                    placeholder="Teléfono"
                    value={customerPhone}
                    onChange={(e) => setCustomerPhone(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Delivery Toggle */}
          <div className="flex items-center justify-between p-4 bg-muted/50 rounded-xl">
            <div className="flex items-center gap-3">
              <Truck className="w-5 h-5 text-primary" />
              <div>
                <p className="font-medium">Servicio a Domicilio</p>
                <p className="text-sm text-muted-foreground">Recogida y entrega en casa</p>
              </div>
            </div>
            <Switch checked={isDelivery} onCheckedChange={setIsDelivery} />
          </div>

          {/* Delivery Options (if enabled) */}
          {isDelivery && (
            <div className="space-y-4 p-4 border rounded-xl border-primary/20 bg-primary/5">
              <div className="space-y-2">
                <Label htmlFor="customerAddress">Dirección de Entrega *</Label>
                <div className="relative">
                  <MapPin className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
                  <Textarea
                    id="customerAddress"
                    placeholder="Calle, número, colonia, referencias..."
                    value={customerAddress}
                    onChange={(e) => setCustomerAddress(e.target.value)}
                    className="pl-10 min-h-[80px]"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Franja Horaria de Entrega</Label>
                <div className="flex gap-3">
                  <Button
                    type="button"
                    variant={deliverySlot === 'morning' ? 'default' : 'outline'}
                    className="flex-1"
                    onClick={() => setDeliverySlot('morning')}
                  >
                    🌅 Mañana (9-13h)
                  </Button>
                  <Button
                    type="button"
                    variant={deliverySlot === 'afternoon' ? 'default' : 'outline'}
                    className="flex-1"
                    onClick={() => setDeliverySlot('afternoon')}
                  >
                    🌆 Tarde (14-19h)
                  </Button>
                </div>
              </div>
            </div>
          )}

          <Separator />

          {/* Add Items Section */}
          <div className="space-y-4">
            <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">
              Agregar Prendas
            </h3>
            
            {/* Type Selection */}
            <div className="flex gap-3">
              <Button
                type="button"
                variant={selectedType === 'piece' ? 'default' : 'outline'}
                className="flex-1 gap-2"
                onClick={() => setSelectedType('piece')}
              >
                <Shirt className="w-4 h-4" />
                Por Pieza
              </Button>
              <Button
                type="button"
                variant={selectedType === 'weight' ? 'default' : 'outline'}
                className="flex-1 gap-2"
                onClick={() => setSelectedType('weight')}
              >
                <Scale className="w-4 h-4" />
                Por Peso (kg)
              </Button>
            </div>

            {/* Category and Quantity */}
            <div className="flex gap-3">
              <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                <SelectTrigger className="flex-1">
                  <SelectValue placeholder="Seleccionar prenda..." />
                </SelectTrigger>
                <SelectContent>
                  {GARMENT_CATEGORIES.map((cat) => (
                    <SelectItem key={cat.id} value={cat.id}>
                      {cat.name} - ${selectedType === 'piece' ? cat.pricePerPiece : cat.pricePerKg}/{selectedType === 'piece' ? 'pieza' : 'kg'}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <div className="flex items-center gap-2 bg-muted rounded-lg px-2">
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => setQuantity(Math.max(0.5, quantity - (selectedType === 'weight' ? 0.5 : 1)))}
                >
                  <Minus className="w-4 h-4" />
                </Button>
                <span className="w-12 text-center font-medium">{quantity}</span>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => setQuantity(quantity + (selectedType === 'weight' ? 0.5 : 1))}
                >
                  <Plus className="w-4 h-4" />
                </Button>
              </div>

              <Button type="button" onClick={handleAddItem} disabled={!selectedCategory}>
                <Plus className="w-4 h-4 mr-2" />
                Agregar
              </Button>
            </div>
          </div>

          {/* Items List */}
          {items.length > 0 && (
            <div className="space-y-2">
              <h4 className="font-medium text-sm">Artículos ({items.length})</h4>
              <div className="space-y-2 max-h-[200px] overflow-y-auto">
                {items.map((item) => (
                  <div 
                    key={item.id} 
                    className="flex items-center justify-between p-3 bg-muted/50 rounded-lg"
                  >
                    <div className="flex items-center gap-3">
                      <Package className="w-5 h-5 text-primary" />
                      <div>
                        <p className="font-medium">{item.name}</p>
                        <p className="text-sm text-muted-foreground">
                          ${item.unitPrice.toFixed(2)} / {item.type === 'piece' ? 'pieza' : 'kg'}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="flex items-center gap-1 bg-background rounded-lg px-2">
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7"
                          onClick={() => handleUpdateQuantity(item.id, item.type === 'weight' ? -0.5 : -1)}
                        >
                          <Minus className="w-3 h-3" />
                        </Button>
                        <span className="w-10 text-center text-sm font-medium">
                          {item.quantity} {item.type === 'weight' ? 'kg' : 'pz'}
                        </span>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7"
                          onClick={() => handleUpdateQuantity(item.id, item.type === 'weight' ? 0.5 : 1)}
                        >
                          <Plus className="w-3 h-3" />
                        </Button>
                      </div>
                      <span className="font-semibold w-16 text-right">
                        ${(item.quantity * item.unitPrice).toFixed(2)}
                      </span>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-destructive hover:text-destructive"
                        onClick={() => handleRemoveItem(item.id)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <Separator />

          {/* Extra Services */}
          <div className="space-y-3">
            <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">
              Servicios Extra
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {EXTRA_SERVICES.map((extra) => (
                <button
                  key={extra.id}
                  type="button"
                  onClick={() => toggleExtra(extra.id)}
                  className={`p-3 rounded-xl border text-left transition-all ${
                    selectedExtras.includes(extra.id)
                      ? 'border-primary bg-primary/10 ring-2 ring-primary/20'
                      : 'border-border hover:border-primary/30 hover:bg-muted/50'
                  }`}
                >
                  <p className="font-medium text-sm">{extra.name}</p>
                  <p className="text-primary font-semibold">+${extra.price.toFixed(2)}</p>
                </button>
              ))}
            </div>
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label htmlFor="notes">Notas del Pedido</Label>
            <Textarea
              id="notes"
              placeholder="Instrucciones especiales, manchas específicas, etc."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>

          <Separator />

          {/* Total and Actions */}
          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 bg-primary/5 rounded-xl">
              <div>
                <p className="text-sm text-muted-foreground">Subtotal artículos</p>
                <p className="font-medium">${itemsTotal.toFixed(2)}</p>
              </div>
              {extrasTotal > 0 && (
                <div>
                  <p className="text-sm text-muted-foreground">Extras</p>
                  <p className="font-medium">+${extrasTotal.toFixed(2)}</p>
                </div>
              )}
              <div className="text-right">
                <p className="text-sm text-muted-foreground">Total</p>
                <p className="text-3xl font-bold text-primary">${totalAmount.toFixed(2)}</p>
              </div>
            </div>

            <div className="flex gap-3">
              <Button variant="outline" className="flex-1" onClick={onClose}>
                Cancelar
              </Button>
              <Button 
                className="flex-1" 
                onClick={handleCreateOrder}
                disabled={!canCreate}
              >
                <Plus className="w-4 h-4 mr-2" />
                Crear Pedido
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
