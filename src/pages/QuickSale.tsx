import { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { OrderQRCode } from '@/components/orders/OrderQRCode';
import { TicketPrint } from '@/components/orders/TicketPrint';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import {
  User,
  Phone,
  MapPin,
  Plus,
  Minus,
  Trash2,
  Truck,
  Sparkles,
  Shirt,
  ShoppingCart,
  CreditCard,
  Banknote,
  Smartphone,
  CheckCircle,
  Receipt,
  RefreshCw,
  Scale,
  Hash,
  Layers,
  Search,
  Printer,
  Loader2,
  UserPlus,
  Check,
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { DiscountInput } from '@/components/DiscountInput';
import { useCatalog, CatalogItem, PricingType } from '@/contexts/CatalogContext';
import { useConfig } from '@/contexts/ConfigContext';
import { Order, OrderItem } from '@/types';
import { useOrders } from '@/hooks/useOrders';
import { supabase } from '@/integrations/supabase/client';

// Payment methods
const PAYMENT_METHODS = [
  { id: 'cash', name: 'Efectivo', icon: Banknote },
  { id: 'card', name: 'Tarjeta', icon: CreditCard },
  { id: 'transfer', name: 'Transferencia', icon: Smartphone },
];

interface CartItem {
  id: string;
  catalogItemId: string;
  name: string;
  quantity: number;
  unitPrice: number;
  pricingType: PricingType;
  type: 'service' | 'article';
}

type SaleTab = 'services' | 'articles';

// Colors for service buttons
const SERVICE_COLORS = [
  'bg-blue-500',
  'bg-orange-500',
  'bg-purple-500',
  'bg-cyan-500',
  'bg-indigo-500',
  'bg-teal-500',
  'bg-pink-500',
  'bg-emerald-500',
];

const ARTICLE_COLORS = [
  'bg-amber-500',
  'bg-rose-500',
  'bg-lime-500',
  'bg-sky-500',
  'bg-violet-500',
  'bg-fuchsia-500',
];

export default function QuickSale() {
  const { activeServices, activeArticles } = useCatalog();
  const { activeExtraServices, activePaymentMethods } = useConfig();
  const { createOrder } = useOrders();
  
  // Tab selection - default to articles
  const [activeTab, setActiveTab] = useState<SaleTab>('articles');
  
  // Search
  const [searchQuery, setSearchQuery] = useState('');
  
  // Customer info
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  
  // Customer search/selection
  const [customers, setCustomers] = useState<Array<{id: string; name: string; phone: string | null; address: string | null}>>([]);
  const [customerSearchOpen, setCustomerSearchOpen] = useState(false);
  const [customerSearchQuery, setCustomerSearchQuery] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState<{id: string; name: string; phone: string | null; address: string | null} | null>(null);
  const [isNewCustomer, setIsNewCustomer] = useState(true);
  
  // Delivery
  const [isDelivery, setIsDelivery] = useState(false);
  const [customerAddress, setCustomerAddress] = useState('');
  
  // Cart
  const [cart, setCart] = useState<CartItem[]>([]);
  const [selectedExtras, setSelectedExtras] = useState<string[]>([]);
  
  // Discount
  const [discountAmount, setDiscountAmount] = useState(0);
  
  // Payment
  const [paymentMethod, setPaymentMethod] = useState<string>('cash');
  const [amountReceived, setAmountReceived] = useState<string>('');
  
  // Completed order
  const [completedOrder, setCompletedOrder] = useState<Order | null>(null);
  const [showSuccess, setShowSuccess] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const ticketRef = useRef<HTMLDivElement>(null);

  // Fetch customers from database
  const fetchCustomers = useCallback(async (search?: string) => {
    try {
      let query = supabase
        .from('customers')
        .select('id, name, phone, address')
        .order('name', { ascending: true })
        .limit(20);
      
      if (search && search.trim()) {
        query = query.or(`name.ilike.%${search}%,phone.ilike.%${search}%`);
      }
      
      const { data, error } = await query;
      if (error) throw error;
      setCustomers(data || []);
    } catch (error) {
      console.error('Error fetching customers:', error);
    }
  }, []);

  // Load customers on mount and when search changes
  useEffect(() => {
    fetchCustomers(customerSearchQuery);
  }, [fetchCustomers, customerSearchQuery]);

  // Handle customer selection
  const handleSelectCustomer = (customer: typeof customers[0]) => {
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
          name: customerName.trim(),
          phone: customerPhone.trim() || null,
          address: customerAddress.trim() || null,
        })
        .select('id')
        .single();
      
      if (error) throw error;
      return data?.id || null;
    } catch (error) {
      console.error('Error creating customer:', error);
      return null;
    }
  };

  // Calculate totals
  const cartTotal = useMemo(() => {
    return cart.reduce((sum, item) => sum + (item.quantity * item.unitPrice), 0);
  }, [cart]);

  const extrasTotal = useMemo(() => {
    return selectedExtras.reduce((sum, extraId) => {
      const extra = activeExtraServices.find(e => e.id === extraId);
      return sum + (extra?.price || 0);
    }, 0);
  }, [selectedExtras, activeExtraServices]);

  const subtotal = cartTotal + extrasTotal;
  const totalAmount = Math.max(0, subtotal - discountAmount);
  const change = parseFloat(amountReceived || '0') - totalAmount;

  // Generate ticket code
  const generateTicketCode = () => {
    const date = new Date();
    const prefix = 'LC';
    const dateStr = `${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, '0')}${String(date.getDate()).padStart(2, '0')}`;
    const random = Math.random().toString(36).substring(2, 6).toUpperCase();
    return `${prefix}-${dateStr}-${random}`;
  };

  // Get pricing unit label
  const getPricingUnit = (pricingType: PricingType) => {
    switch (pricingType) {
      case 'weight': return 'kg';
      case 'piece': return 'pza';
      case 'fixed': return 'u';
    }
  };

  // Add catalog item to cart
  const addToCart = (item: CatalogItem) => {
    const existingItem = cart.find(c => c.catalogItemId === item.id);
    
    if (existingItem) {
      setCart(prev => prev.map(c => 
        c.catalogItemId === item.id 
          ? { ...c, quantity: c.quantity + 1 }
          : c
      ));
    } else {
      setCart(prev => [...prev, {
        id: crypto.randomUUID(),
        catalogItemId: item.id,
        name: item.name,
        quantity: 1,
        unitPrice: item.price,
        pricingType: item.pricingType,
        type: item.type,
      }]);
    }
  };

  // Update cart item quantity
  const updateCartQuantity = (itemId: string, delta: number) => {
    setCart(prev => prev.map(item => {
      if (item.id === itemId) {
        const increment = item.pricingType === 'weight' ? 0.5 : 1;
        const newQty = Math.max(increment, item.quantity + (delta * increment));
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

  // Build Order object from cart
  const buildOrder = (ticketCode: string): Order => {
    const orderItems: OrderItem[] = cart.map((item) => ({
      id: item.id,
      name: item.name,
      type: item.pricingType === 'weight' ? 'weight' : 'piece',
      quantity: item.quantity,
      unitPrice: item.unitPrice,
      extras: selectedExtras,
    }));

    const now = new Date();
    return {
      id: crypto.randomUUID(),
      ticketCode,
      qrCode: `qr_${ticketCode.toLowerCase().replace(/-/g, '_')}`,
      customerId: '',
      customerName,
      customerPhone,
      customerAddress: isDelivery ? customerAddress : undefined,
      items: orderItems,
      status: 'in_store',
      totalAmount,
      paidAmount: paymentMethod === 'cash' ? parseFloat(amountReceived || '0') : totalAmount,
      isPaid: true,
      isDelivery,
      needsPickup: false,
      needsDelivery: isDelivery,
      createdAt: now,
      updatedAt: now,
      notes: '',
    };
  };

  // Process sale - now persists to database
  const processSale = async () => {
    if (cart.length === 0) {
      toast.error('Agrega al menos un servicio o artículo');
      return;
    }
    if (!customerName) {
      toast.error('Ingresa el nombre del cliente');
      return;
    }

    setIsProcessing(true);

    try {
      // Get or create customer ID
      let customerId = selectedCustomer?.id || '';
      
      if (isNewCustomer && customerName.trim()) {
        const newCustomerId = await createCustomer();
        if (newCustomerId) {
          customerId = newCustomerId;
        }
      } else if (selectedCustomer) {
        // Update customer address if changed
        if (customerAddress && customerAddress !== selectedCustomer.address) {
          await supabase
            .from('customers')
            .update({ address: customerAddress })
            .eq('id', selectedCustomer.id);
        }
      }

      // Build order items for database
      const orderItems: OrderItem[] = cart.map((item) => ({
        id: item.id,
        name: item.name,
        type: item.pricingType === 'weight' ? 'weight' : 'piece',
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        extras: selectedExtras,
      }));

      // Create order object
      const newOrder: Order = {
        id: crypto.randomUUID(),
        ticketCode: '', // Will be generated by database
        qrCode: '',
        customerId,
        customerName,
        customerPhone,
        customerAddress: isDelivery ? customerAddress : undefined,
        items: orderItems,
        status: 'in_store',
        totalAmount,
        paidAmount: totalAmount, // Quick sale is always fully paid
        isPaid: true,
        isDelivery,
        needsPickup: false,
        needsDelivery: isDelivery,
        createdAt: new Date(),
        updatedAt: new Date(),
        notes: '',
      };

      // Save to database
      const createdOrder = await createOrder(newOrder);

      if (createdOrder) {
        setCompletedOrder(createdOrder);
        setShowSuccess(true);
        toast.success(`Venta completada: ${createdOrder.ticketCode}`);
      }
    } catch (error) {
      console.error('Error processing sale:', error);
      toast.error('Error al procesar la venta');
    } finally {
      setIsProcessing(false);
    }
  };

  // Print ticket
  const handlePrintTicket = () => {
    if (!ticketRef.current || !completedOrder) return;

    const printWindow = window.open('', '_blank', 'width=350,height=600');
    if (!printWindow) {
      alert('Por favor habilite las ventanas emergentes para imprimir');
      return;
    }

    const ticketHtml = ticketRef.current.innerHTML;

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Ticket ${completedOrder.ticketCode}</title>
          <style>
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body {
              font-family: monospace, 'Courier New', Courier;
              font-size: 12px;
              line-height: 1.3;
              width: 80mm;
              padding: 2mm;
              background: white;
              color: black;
            }
            @media print {
              @page { size: 80mm auto; margin: 0; }
              body { width: 80mm; padding: 2mm; }
            }
          </style>
        </head>
        <body>${ticketHtml}</body>
      </html>
    `);

    printWindow.document.close();

    printWindow.onload = () => {
      printWindow.focus();
      printWindow.print();
      setTimeout(() => printWindow.close(), 500);
    };
  };

  // Reset form
  const resetSale = () => {
    setCustomerName('');
    setCustomerPhone('');
    setSelectedCustomer(null);
    setIsNewCustomer(true);
    setCustomerSearchQuery('');
    setIsDelivery(false);
    setCustomerAddress('');
    setCart([]);
    setSelectedExtras([]);
    setDiscountAmount(0);
    setPaymentMethod('cash');
    setAmountReceived('');
    setShowSuccess(false);
    setCompletedOrder(null);
  };

  // Get items for current tab with search filter
  const currentItems = useMemo(() => {
    const items = activeTab === 'services' ? activeServices : activeArticles;
    if (!searchQuery.trim()) return items;
    
    const query = searchQuery.toLowerCase();
    return items.filter(item => 
      item.name.toLowerCase().includes(query) ||
      item.category.toLowerCase().includes(query) ||
      item.description?.toLowerCase().includes(query)
    );
  }, [activeTab, activeServices, activeArticles, searchQuery]);
  
  const currentColors = activeTab === 'services' ? SERVICE_COLORS : ARTICLE_COLORS;

  return (
    <div className="h-[calc(100vh-2rem)] flex flex-col lg:flex-row gap-4 p-4 lg:p-6">
      {/* Left Panel - Services/Articles */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
          <div>
            <h1 className="text-2xl lg:text-3xl font-bold flex items-center gap-3">
              <ShoppingCart className="w-8 h-8 text-primary" />
              Venta Rápida
            </h1>
            <p className="text-muted-foreground">Selecciona servicios o artículos para crear un pedido</p>
          </div>
          
          {/* Search */}
          <div className="relative w-full md:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Buscar..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        {/* Tab Selection */}
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as SaleTab)} className="mb-4">
          <TabsList className="grid w-full max-w-md grid-cols-2">
            <TabsTrigger value="articles" className="gap-2">
              <Shirt className="w-4 h-4" />
              Artículos ({activeArticles.length})
            </TabsTrigger>
            <TabsTrigger value="services" className="gap-2">
              <Sparkles className="w-4 h-4" />
              Servicios ({activeServices.length})
            </TabsTrigger>
          </TabsList>
        </Tabs>

        {/* Items Grid */}
        <div className="flex-1 overflow-y-auto">
          {currentItems.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 text-center text-muted-foreground">
              <Layers className="w-12 h-12 mb-2 opacity-30" />
              {searchQuery ? (
                <>
                  <p>No se encontraron resultados para "{searchQuery}"</p>
                  <p className="text-sm">Intenta con otro término de búsqueda</p>
                </>
              ) : (
                <>
                  <p>No hay {activeTab === 'services' ? 'servicios' : 'artículos'} activos</p>
                  <p className="text-sm">Agrega desde el módulo de Catálogo</p>
                </>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 lg:gap-4">
              {currentItems.map((item, index) => {
                const inCart = cart.find(c => c.catalogItemId === item.id);
                const Icon = item.pricingType === 'weight' ? Scale : Hash;
                const colorClass = currentColors[index % currentColors.length];
                
                return (
                  <button
                    key={item.id}
                    onClick={() => addToCart(item)}
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
                    <div className={cn('w-12 h-12 lg:w-14 lg:h-14 rounded-xl flex items-center justify-center text-white', colorClass)}>
                      {activeTab === 'services' ? (
                        <Sparkles className="w-6 h-6 lg:w-7 lg:h-7" />
                      ) : (
                        <Shirt className="w-6 h-6 lg:w-7 lg:h-7" />
                      )}
                    </div>
                    <span className="font-semibold text-sm lg:text-base line-clamp-2">{item.name}</span>
                    <div className="flex items-center gap-1 text-primary font-bold text-lg lg:text-xl">
                      <span>${item.price.toFixed(2)}</span>
                      <span className="text-xs text-muted-foreground font-normal">
                        /{getPricingUnit(item.pricingType)}
                      </span>
                    </div>
                    {item.category && (
                      <Badge variant="secondary" className="text-xs">
                        {item.category}
                      </Badge>
                    )}
                  </button>
                );
              })}
            </div>
          )}

          {/* Extra Services */}
          {activeExtraServices.length > 0 && (
            <div className="mt-6">
              <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide mb-3">
                Servicios Extra
              </h3>
              <div className="flex flex-wrap gap-2">
                {activeExtraServices.map((extra) => {
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
                      <Sparkles className="w-4 h-4" />
                      <span className="font-medium">{extra.name}</span>
                      <Badge variant={isSelected ? 'default' : 'secondary'}>
                        +${extra.price.toFixed(2)}
                      </Badge>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Right Panel - Cart & Checkout */}
      <div className="w-full lg:w-[400px] flex flex-col bg-card rounded-2xl border shadow-lg overflow-hidden">
        {/* Customer Info */}
        <div className="p-4 border-b bg-muted/30">
          <div className="grid gap-3">
            {/* Customer Selection */}
            <div className="flex gap-2">
              <Popover open={customerSearchOpen} onOpenChange={setCustomerSearchOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={customerSearchOpen}
                    className="flex-1 justify-start gap-2 h-10"
                  >
                    <Search className="w-4 h-4 text-muted-foreground" />
                    {selectedCustomer ? (
                      <span className="truncate">{selectedCustomer.name}</span>
                    ) : (
                      <span className="text-muted-foreground">Buscar cliente...</span>
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[300px] p-0" align="start">
                  <Command shouldFilter={false}>
                    <CommandInput
                      placeholder="Buscar por nombre o teléfono..."
                      value={customerSearchQuery}
                      onValueChange={setCustomerSearchQuery}
                    />
                    <CommandList>
                      <CommandEmpty>No se encontraron clientes</CommandEmpty>
                      <CommandGroup>
                        <CommandItem
                          onSelect={handleNewCustomer}
                          className="gap-2 text-primary"
                        >
                          <UserPlus className="w-4 h-4" />
                          <span>Nuevo cliente</span>
                        </CommandItem>
                        {customers.map((customer) => (
                          <CommandItem
                            key={customer.id}
                            onSelect={() => handleSelectCustomer(customer)}
                            className="gap-2"
                          >
                            <Check
                              className={cn(
                                'w-4 h-4',
                                selectedCustomer?.id === customer.id ? 'opacity-100' : 'opacity-0'
                              )}
                            />
                            <div className="flex flex-col">
                              <span>{customer.name}</span>
                              {customer.phone && (
                                <span className="text-xs text-muted-foreground">{customer.phone}</span>
                              )}
                            </div>
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
              
              {selectedCustomer && (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handleNewCustomer}
                  className="shrink-0"
                  title="Nuevo cliente"
                >
                  <UserPlus className="w-4 h-4" />
                </Button>
              )}
            </div>

            {/* Customer Details */}
            <div className="flex gap-2">
              <div className="relative flex-1">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Nombre del cliente *"
                  value={customerName}
                  onChange={(e) => {
                    setCustomerName(e.target.value);
                    if (selectedCustomer) {
                      setSelectedCustomer(null);
                      setIsNewCustomer(true);
                    }
                  }}
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

            {/* Selected Customer Badge */}
            {selectedCustomer && (
              <div className="flex items-center gap-2 text-xs text-muted-foreground bg-muted/50 rounded-lg px-3 py-2">
                <Check className="w-3 h-3 text-green-500" />
                <span>Cliente existente seleccionado</span>
              </div>
            )}
            
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
              <p className="text-sm">Selecciona servicios o artículos para agregar</p>
            </div>
          ) : (
            <div className="space-y-3">
              {cart.map((item) => (
                <div 
                  key={item.id} 
                  className="flex items-center justify-between p-3 bg-muted/50 rounded-xl"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-medium truncate">{item.name}</p>
                      <Badge variant="outline" className="text-xs shrink-0">
                        {item.type === 'service' ? 'Servicio' : 'Artículo'}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      ${item.unitPrice.toFixed(2)} / {getPricingUnit(item.pricingType)}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="flex items-center bg-background rounded-lg">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => updateCartQuantity(item.id, -1)}
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
                        onClick={() => updateCartQuantity(item.id, 1)}
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
                    const extra = activeExtraServices.find(e => e.id === extraId);
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
          {/* Discount */}
          {cart.length > 0 && (
            <DiscountInput 
              subtotal={subtotal} 
              onDiscountChange={setDiscountAmount} 
            />
          )}

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

          {/* Totals Summary */}
          <div className="space-y-2">
            {discountAmount > 0 && (
              <>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Subtotal:</span>
                  <span>${subtotal.toFixed(2)}</span>
                </div>
                <div className="flex items-center justify-between text-sm text-green-600">
                  <span>Descuento:</span>
                  <span>-${discountAmount.toFixed(2)}</span>
                </div>
              </>
            )}
            <div className="flex items-center justify-between p-4 bg-primary/10 rounded-xl">
              <span className="text-lg font-medium">Total:</span>
              <span className="text-3xl font-bold text-primary">${totalAmount.toFixed(2)}</span>
            </div>
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
              disabled={cart.length === 0 || !customerName || isProcessing}
            >
              {isProcessing ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Procesando...
                </>
              ) : (
                <>
                  <Receipt className="w-4 h-4" />
                  Cobrar
                </>
              )}
            </Button>
          </div>
        </div>
      </div>

      {/* Success Dialog */}
      <Dialog open={showSuccess} onOpenChange={setShowSuccess}>
        <DialogContent className="max-w-md text-center">
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

            {/* Hidden ticket for printing */}
            {completedOrder && (
              <div className="hidden">
                <TicketPrint ref={ticketRef} order={completedOrder} />
              </div>
            )}

            <div className="flex gap-3">
              <Button variant="outline" className="flex-1" onClick={resetSale}>
                Nueva Venta
              </Button>
              <Button 
                variant="outline"
                className="flex-1 gap-2"
                onClick={handlePrintTicket}
                disabled={!completedOrder}
              >
                <Printer className="w-4 h-4" />
                Imprimir
              </Button>
            </div>
            
            {completedOrder && (
              <Button 
                className="w-full"
                onClick={() => {
                  setShowSuccess(false);
                }}
              >
                Ver QR del Ticket
              </Button>
            )}
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
