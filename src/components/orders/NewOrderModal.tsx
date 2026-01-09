import { useState, useMemo, useEffect, useCallback } from 'react';
import { Order, OrderItem, ItemType, OrderStatus } from '@/types';
import { useConfig } from '@/contexts/ConfigContext';
import { QUICK_SERVICES } from '@/lib/constants';
import { supabase } from '@/integrations/supabase/client';
import { DiscountInput } from '@/components/DiscountInput';
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
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
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
  Home,
  Store,
  AlertTriangle,
  Search,
  UserPlus,
  Check,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface Customer {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
  address: string | null;
}

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

// Verificación de artículos
const ITEM_CHECKS = [
  { id: 'has_laces', label: 'Tiene cordones', defaultChecked: true },
  { id: 'has_insoles', label: 'Tiene plantilla', defaultChecked: true },
  { id: 'is_torn', label: 'Está roto', defaultChecked: false },
  { id: 'is_detached', label: 'Está despegado', defaultChecked: false },
  { id: 'has_stains', label: 'Tiene manchas', defaultChecked: false },
  { id: 'missing_buttons', label: 'Faltan botones', defaultChecked: false },
];

// Tipo de recepción/entrega
type ReceptionType = 'in_store' | 'pickup';
type DeliveryType = 'in_store' | 'delivery';

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
  const { activeDeliveryZones, activeExtraServices } = useConfig();
  
  // Customer search and selection
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [customerSearchOpen, setCustomerSearchOpen] = useState(false);
  const [isNewCustomer, setIsNewCustomer] = useState(false);
  
  // Customer info
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerAddress, setCustomerAddress] = useState('');
  
  // Reception and Delivery options
  const [receptionType, setReceptionType] = useState<ReceptionType>('in_store');
  const [deliveryType, setDeliveryType] = useState<DeliveryType>('in_store');
  const [selectedZone, setSelectedZone] = useState<string>('');
  const [deliverySlot, setDeliverySlot] = useState<'morning' | 'afternoon'>('morning');
  const [pickupCost, setPickupCost] = useState<number>(100);
  const [deliveryCostValue, setDeliveryCostValue] = useState<number>(100);
  
  // Items
  const [items, setItems] = useState<OrderItemDraft[]>([]);
  const [selectedExtras, setSelectedExtras] = useState<string[]>([]);
  
  // Discount
  const [discountAmount, setDiscountAmount] = useState(0);
  
  // Item checks
  const [itemChecks, setItemChecks] = useState<Record<string, boolean>>(
    Object.fromEntries(ITEM_CHECKS.map(c => [c.id, c.defaultChecked]))
  );
  
  // Notes
  const [notes, setNotes] = useState('');
  
  // Quick add state
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [selectedType, setSelectedType] = useState<ItemType>('piece');
  const [quantity, setQuantity] = useState<number>(1);

  // Fetch customers from database
  const fetchCustomers = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('customers')
        .select('id, name, phone, email, address')
        .order('name');
      
      if (error) throw error;
      setCustomers(data || []);
    } catch (error) {
      console.error('Error fetching customers:', error);
    }
  }, []);

  useEffect(() => {
    if (isOpen) {
      fetchCustomers();
    }
  }, [isOpen, fetchCustomers]);

  // Select existing customer
  const handleSelectCustomer = (customer: Customer) => {
    setSelectedCustomer(customer);
    setCustomerName(customer.name);
    setCustomerPhone(customer.phone || '');
    setCustomerAddress(customer.address || '');
    setIsNewCustomer(false);
    setCustomerSearchOpen(false);
  };

  // Switch to new customer mode
  const handleNewCustomer = () => {
    setSelectedCustomer(null);
    setCustomerName('');
    setCustomerPhone('');
    setCustomerAddress('');
    setIsNewCustomer(true);
    setCustomerSearchOpen(false);
  };

  // Create new customer in database
  const createCustomer = async (): Promise<string | null> => {
    try {
      const { data, error } = await supabase
        .from('customers')
        .insert({
          name: customerName,
          phone: customerPhone || null,
          address: customerAddress || null,
        })
        .select('id')
        .single();

      if (error) throw error;
      return data.id;
    } catch (error) {
      console.error('Error creating customer:', error);
      return null;
    }
  };

  // Calculate totals
  const itemsTotal = useMemo(() => {
    return items.reduce((sum, item) => sum + (item.quantity * item.unitPrice), 0);
  }, [items]);

  const extrasTotal = useMemo(() => {
    return selectedExtras.reduce((sum, extraId) => {
      const extra = activeExtraServices.find(e => e.id === extraId);
      return sum + (extra?.price || 0);
    }, 0);
  }, [selectedExtras, activeExtraServices]);

  // Calculate delivery costs
  const totalDeliveryCost = useMemo(() => {
    let cost = 0;
    if (receptionType === 'pickup') {
      cost += pickupCost;
    }
    if (deliveryType === 'delivery') {
      cost += deliveryCostValue;
    }
    return cost;
  }, [receptionType, deliveryType, pickupCost, deliveryCostValue]);

  const subtotal = itemsTotal + extrasTotal + totalDeliveryCost;
  const totalAmount = Math.max(0, subtotal - discountAmount);

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

  // Toggle item check
  const toggleItemCheck = (checkId: string) => {
    setItemChecks(prev => ({ ...prev, [checkId]: !prev[checkId] }));
  };

  // Build notes with checks
  const buildOrderNotes = () => {
    const checkNotes = ITEM_CHECKS
      .map(c => `${c.label}: ${itemChecks[c.id] ? 'Sí' : 'No'}`)
      .join(' | ');
    
    return notes.trim() 
      ? `[Verificación: ${checkNotes}]\n\n${notes.trim()}`
      : `[Verificación: ${checkNotes}]`;
  };

  // Reset form
  const resetForm = () => {
    setSelectedCustomer(null);
    setIsNewCustomer(false);
    setCustomerName('');
    setCustomerPhone('');
    setCustomerAddress('');
    setReceptionType('in_store');
    setDeliveryType('in_store');
    setSelectedZone('');
    setDeliverySlot('morning');
    setPickupCost(100);
    setDeliveryCostValue(100);
    setItems([]);
    setSelectedExtras([]);
    setDiscountAmount(0);
    setItemChecks(Object.fromEntries(ITEM_CHECKS.map(c => [c.id, c.defaultChecked])));
    setNotes('');
    setSelectedCategory('');
    setQuantity(1);
  };

  // Create order
  const handleCreateOrder = async () => {
    if (!customerName || !customerPhone || items.length === 0) return;
    
    const needsPickup = receptionType === 'pickup';
    const needsDelivery = deliveryType === 'delivery';
    const requiresAddress = needsPickup || needsDelivery;
    
    if (requiresAddress && !customerAddress) return;

    // Get or create customer ID
    let customerId: string;
    if (selectedCustomer) {
      customerId = selectedCustomer.id;
      // Update customer address if changed
      if (customerAddress && customerAddress !== selectedCustomer.address) {
        await supabase
          .from('customers')
          .update({ address: customerAddress })
          .eq('id', customerId);
      }
    } else {
      // Create new customer
      const newId = await createCustomer();
      if (!newId) {
        console.error('Failed to create customer');
        return;
      }
      customerId = newId;
    }

    const ticketCode = generateTicketCode();
    const zone = activeDeliveryZones.find(z => z.id === selectedZone);
    
    const order: Order = {
      id: crypto.randomUUID(),
      ticketCode,
      qrCode: ticketCode,
      customerId,
      customerName,
      customerPhone,
      customerAddress: requiresAddress ? customerAddress : undefined,
      items: items.map(item => ({
        id: item.id,
        name: item.name,
        type: item.type,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        extras: selectedExtras.map(id => activeExtraServices.find(e => e.id === id)?.name || ''),
      })),
      status: needsPickup ? 'pending_pickup' : 'in_store',
      totalAmount,
      paidAmount: 0,
      isPaid: false,
      isDelivery: needsDelivery,
      deliverySlot: needsDelivery ? deliverySlot : undefined,
      needsPickup,
      needsDelivery,
      pickupService: needsPickup ? {
        type: 'pickup',
        status: 'pending',
        scheduledSlot: deliverySlot,
        address: customerAddress,
        notes: zone?.name,
      } : undefined,
      deliveryService: needsDelivery ? {
        type: 'delivery',
        status: 'pending',
        scheduledSlot: deliverySlot,
        address: customerAddress,
        notes: zone?.name,
      } : undefined,
      createdAt: new Date(),
      updatedAt: new Date(),
      estimatedReadyAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
      notes: buildOrderNotes(),
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
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">
                Datos del Cliente
              </h3>
              {selectedCustomer && (
                <Badge variant="secondary" className="gap-1">
                  <Check className="w-3 h-3" />
                  Cliente existente
                </Badge>
              )}
              {isNewCustomer && (
                <Badge variant="outline" className="gap-1">
                  <UserPlus className="w-3 h-3" />
                  Cliente nuevo
                </Badge>
              )}
            </div>

            {/* Customer Search */}
            <div className="space-y-2">
              <Label>Buscar Cliente Existente</Label>
              <Popover open={customerSearchOpen} onOpenChange={setCustomerSearchOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={customerSearchOpen}
                    className="w-full justify-between"
                  >
                    {selectedCustomer ? (
                      <span className="flex items-center gap-2">
                        <User className="w-4 h-4" />
                        {selectedCustomer.name}
                        {selectedCustomer.phone && (
                          <span className="text-muted-foreground">• {selectedCustomer.phone}</span>
                        )}
                      </span>
                    ) : (
                      <span className="text-muted-foreground flex items-center gap-2">
                        <Search className="w-4 h-4" />
                        Buscar o crear cliente...
                      </span>
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[400px] p-0" align="start">
                  <Command>
                    <CommandInput placeholder="Buscar por nombre o teléfono..." />
                    <CommandList>
                      <CommandEmpty>
                        <div className="p-4 text-center">
                          <p className="text-sm text-muted-foreground mb-2">No se encontró el cliente</p>
                          <Button size="sm" onClick={handleNewCustomer} className="gap-2">
                            <UserPlus className="w-4 h-4" />
                            Crear Cliente Nuevo
                          </Button>
                        </div>
                      </CommandEmpty>
                      <CommandGroup heading="Clientes">
                        {customers.map((customer) => (
                          <CommandItem
                            key={customer.id}
                            value={`${customer.name} ${customer.phone || ''}`}
                            onSelect={() => handleSelectCustomer(customer)}
                            className="cursor-pointer"
                          >
                            <div className="flex items-center gap-3 w-full">
                              <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                                <User className="w-4 h-4 text-primary" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="font-medium truncate">{customer.name}</p>
                                <p className="text-xs text-muted-foreground truncate">
                                  {customer.phone || 'Sin teléfono'}
                                  {customer.address && ` • ${customer.address}`}
                                </p>
                              </div>
                              {selectedCustomer?.id === customer.id && (
                                <Check className="w-4 h-4 text-primary" />
                              )}
                            </div>
                          </CommandItem>
                        ))}
                      </CommandGroup>
                      <CommandGroup>
                        <CommandItem
                          onSelect={handleNewCustomer}
                          className="cursor-pointer border-t"
                        >
                          <div className="flex items-center gap-2 text-primary">
                            <UserPlus className="w-4 h-4" />
                            <span>Crear Cliente Nuevo</span>
                          </div>
                        </CommandItem>
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
            </div>

            {/* Customer Form Fields */}
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="customerName">Nombre *</Label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    id="customerName"
                    placeholder="Nombre del cliente"
                    value={customerName}
                    onChange={(e) => {
                      setCustomerName(e.target.value);
                      if (selectedCustomer) setSelectedCustomer(null);
                      setIsNewCustomer(true);
                    }}
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
                    onChange={(e) => {
                      setCustomerPhone(e.target.value);
                      if (selectedCustomer) setSelectedCustomer(null);
                      setIsNewCustomer(true);
                    }}
                    className="pl-10"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Reception Type - Where garments come from */}
          <div className="space-y-3">
            <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">
              Recepción de Prendas
            </h3>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setReceptionType('in_store')}
                className={`p-4 rounded-xl border text-left transition-all flex items-center gap-3 ${
                  receptionType === 'in_store'
                    ? 'border-primary bg-primary/10 ring-2 ring-primary/20'
                    : 'border-border hover:border-primary/30 hover:bg-muted/50'
                }`}
              >
                <Store className="w-6 h-6 text-primary" />
                <div>
                  <p className="font-medium">En Local</p>
                  <p className="text-sm text-muted-foreground">Cliente trae las prendas</p>
                </div>
              </button>
              <button
                type="button"
                onClick={() => setReceptionType('pickup')}
                className={`p-4 rounded-xl border text-left transition-all flex items-center gap-3 ${
                  receptionType === 'pickup'
                    ? 'border-primary bg-primary/10 ring-2 ring-primary/20'
                    : 'border-border hover:border-primary/30 hover:bg-muted/50'
                }`}
              >
                <Truck className="w-6 h-6 text-amber-500" />
                <div>
                  <p className="font-medium">Recoger a Domicilio</p>
                  <p className="text-sm text-muted-foreground">Vamos por las prendas</p>
                </div>
              </button>
            </div>
          </div>

          {/* Delivery Type - Where garments go */}
          <div className="space-y-3">
            <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">
              Entrega de Prendas
            </h3>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setDeliveryType('in_store')}
                className={`p-4 rounded-xl border text-left transition-all flex items-center gap-3 ${
                  deliveryType === 'in_store'
                    ? 'border-primary bg-primary/10 ring-2 ring-primary/20'
                    : 'border-border hover:border-primary/30 hover:bg-muted/50'
                }`}
              >
                <Store className="w-6 h-6 text-primary" />
                <div>
                  <p className="font-medium">En Local</p>
                  <p className="text-sm text-muted-foreground">Cliente recoge en tienda</p>
                </div>
              </button>
              <button
                type="button"
                onClick={() => setDeliveryType('delivery')}
                className={`p-4 rounded-xl border text-left transition-all flex items-center gap-3 ${
                  deliveryType === 'delivery'
                    ? 'border-primary bg-primary/10 ring-2 ring-primary/20'
                    : 'border-border hover:border-primary/30 hover:bg-muted/50'
                }`}
              >
                <Home className="w-6 h-6 text-emerald-500" />
                <div>
                  <p className="font-medium">Entregar a Domicilio</p>
                  <p className="text-sm text-muted-foreground">Llevamos las prendas</p>
                </div>
              </button>
            </div>
          </div>

          {/* Address and Delivery Options (if pickup or delivery needed) */}
          {(receptionType === 'pickup' || deliveryType === 'delivery') && (
            <div className="space-y-4 p-4 border rounded-xl border-primary/20 bg-primary/5">
              <div className="space-y-2">
                <Label htmlFor="customerAddress">Dirección *</Label>
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
              
              {/* Delivery Zone */}
              <div className="space-y-2">
                <Label>Zona de Entrega</Label>
                <Select value={selectedZone} onValueChange={setSelectedZone}>
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar zona..." />
                  </SelectTrigger>
                  <SelectContent>
                    {activeDeliveryZones.map((zone) => (
                      <SelectItem key={zone.id} value={zone.id}>
                        {zone.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Pickup and Delivery Costs */}
              <div className="grid gap-4 sm:grid-cols-2">
                {receptionType === 'pickup' && (
                  <div className="space-y-2">
                    <Label htmlFor="pickupCost">Costo de Recogida</Label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
                      <Input
                        id="pickupCost"
                        type="number"
                        min="0"
                        step="10"
                        value={pickupCost}
                        onChange={(e) => setPickupCost(Number(e.target.value) || 0)}
                        className="pl-8"
                      />
                    </div>
                  </div>
                )}
                {deliveryType === 'delivery' && (
                  <div className="space-y-2">
                    <Label htmlFor="deliveryCostValue">Costo de Entrega</Label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
                      <Input
                        id="deliveryCostValue"
                        type="number"
                        min="0"
                        step="10"
                        value={deliveryCostValue}
                        onChange={(e) => setDeliveryCostValue(Number(e.target.value) || 0)}
                        className="pl-8"
                      />
                    </div>
                  </div>
                )}
              </div>

              {totalDeliveryCost > 0 && (
                <p className="text-sm text-amber-600 flex items-center gap-1">
                  <Truck className="w-4 h-4" />
                  Costo total de servicio: ${totalDeliveryCost.toFixed(2)}
                  {receptionType === 'pickup' && deliveryType === 'delivery' && ' (recogida + entrega)'}
                </p>
              )}

              <div className="space-y-2">
                <Label>Franja Horaria</Label>
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
              {activeExtraServices.map((extra) => (
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

          <Separator />

          {/* Item Checks */}
          <div className="space-y-3">
            <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide flex items-center gap-2">
              <AlertTriangle className="w-4 h-4" />
              Verificación del Pedido
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 p-4 bg-muted/50 rounded-xl">
              {ITEM_CHECKS.map((check) => (
                <div key={check.id} className="flex items-center space-x-2">
                  <Checkbox
                    id={check.id}
                    checked={itemChecks[check.id]}
                    onCheckedChange={() => toggleItemCheck(check.id)}
                  />
                  <Label
                    htmlFor={check.id}
                    className="text-sm font-normal cursor-pointer"
                  >
                    {check.label}
                  </Label>
                </div>
              ))}
            </div>
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label htmlFor="notes">Notas Generales</Label>
            <Textarea
              id="notes"
              placeholder="Instrucciones especiales, observaciones adicionales..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="min-h-[80px]"
            />
          </div>

          <Separator />

          {/* Discount */}
          {items.length > 0 && (
            <DiscountInput 
              subtotal={subtotal} 
              onDiscountChange={setDiscountAmount} 
            />
          )}

          {/* Total and Actions */}
          <div className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3 p-4 bg-primary/5 rounded-xl">
              <div>
                <p className="text-sm text-muted-foreground">Artículos</p>
                <p className="font-medium">${itemsTotal.toFixed(2)}</p>
              </div>
              {extrasTotal > 0 && (
                <div>
                  <p className="text-sm text-muted-foreground">Extras</p>
                  <p className="font-medium">+${extrasTotal.toFixed(2)}</p>
                </div>
              )}
              {totalDeliveryCost > 0 && (
                <div>
                  <p className="text-sm text-muted-foreground">Envío</p>
                  <p className="font-medium">+${totalDeliveryCost.toFixed(2)}</p>
                </div>
              )}
              {discountAmount > 0 && (
                <div>
                  <p className="text-sm text-green-600">Descuento</p>
                  <p className="font-medium text-green-600">-${discountAmount.toFixed(2)}</p>
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
