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
  Package,
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
type SaleType = 'articles_only' | 'with_services';

interface DirectSaleResult {
  success: boolean;
  saleType: SaleType;
  totalAmount: number;
  itemsSold: string[];
}

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
  
  // Pickup and Delivery options
  const [needsPickup, setNeedsPickup] = useState(false);
  const [needsDelivery, setNeedsDelivery] = useState(false);
  const [pickupAddress, setPickupAddress] = useState('');
  const [deliveryAddress, setDeliveryAddress] = useState('');
  const [pickupSlot, setPickupSlot] = useState<'morning' | 'afternoon' | ''>('');
  const [deliverySlot, setDeliverySlot] = useState<'morning' | 'afternoon' | ''>('');
  
  // Cart
  const [cart, setCart] = useState<CartItem[]>([]);
  const [selectedExtras, setSelectedExtras] = useState<string[]>([]);
  
  // Discount
  const [discountAmount, setDiscountAmount] = useState(0);
  
  // Payment
  const [paymentMethod, setPaymentMethod] = useState<string>('cash');
  const [amountReceived, setAmountReceived] = useState<string>('');
  
  // Completed order/sale
  const [completedOrder, setCompletedOrder] = useState<Order | null>(null);
  const [completedDirectSale, setCompletedDirectSale] = useState<DirectSaleResult | null>(null);
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
    setPickupAddress(customer.address || '');
    setDeliveryAddress(customer.address || '');
    setIsNewCustomer(false);
    setCustomerSearchOpen(false);
  };

  // Switch to new customer mode
  const handleNewCustomer = () => {
    setSelectedCustomer(null);
    setCustomerName('');
    setCustomerPhone('');
    setPickupAddress('');
    setDeliveryAddress('');
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
          address: deliveryAddress.trim() || pickupAddress.trim() || null,
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
      customerAddress: needsDelivery ? deliveryAddress : undefined,
      items: orderItems,
      status: needsPickup ? 'pending_pickup' : 'in_store',
      totalAmount,
      paidAmount: paymentMethod === 'cash' ? parseFloat(amountReceived || '0') : totalAmount,
      isPaid: true,
      isDelivery: needsDelivery,
      needsPickup,
      needsDelivery,
      pickupService: needsPickup ? {
        type: 'pickup',
        status: 'pending',
        address: pickupAddress,
        scheduledSlot: pickupSlot || undefined,
      } : undefined,
      deliveryService: needsDelivery ? {
        type: 'delivery',
        status: 'pending',
        address: deliveryAddress,
        scheduledSlot: deliverySlot || undefined,
      } : undefined,
      deliverySlot: needsDelivery && deliverySlot ? deliverySlot : undefined,
      createdAt: now,
      updatedAt: now,
      notes: '',
    };
  };

  // Check if cart contains only articles (no services)
  const hasOnlyArticles = useMemo(() => {
    return cart.length > 0 && cart.every(item => item.type === 'article');
  }, [cart]);

  const hasServices = useMemo(() => {
    return cart.some(item => item.type === 'service');
  }, [cart]);

  // Get items by type
  const articleItems = useMemo(() => cart.filter(item => item.type === 'article'), [cart]);
  const serviceItems = useMemo(() => cart.filter(item => item.type === 'service'), [cart]);

  // Process direct article sale (no order created)
  const processDirectArticleSale = async (customerId: string): Promise<DirectSaleResult> => {
    const itemsSold: string[] = [];
    
    // Build description for cash register
    const itemsDescription = articleItems.map(item => 
      `${item.name} x${item.quantity}`
    ).join(', ');

    // Register in cash register
    const { error: cashError } = await supabase
      .from('cash_register')
      .insert({
        entry_type: 'income',
        category: 'sales',
        amount: totalAmount,
        description: `Venta de artículos: ${itemsDescription}${customerName ? ` - Cliente: ${customerName}` : ''}`,
      });

    if (cashError) throw cashError;

    // Deduct from article inventory if they have track_inventory enabled
    for (const item of articleItems) {
      const { data: article } = await supabase
        .from('catalog_articles')
        .select('id, track_inventory, stock')
        .eq('id', item.catalogItemId)
        .single();
      
      if (article?.track_inventory) {
        const newStock = Math.max(0, (article.stock || 0) - item.quantity);
        await supabase
          .from('catalog_articles')
          .update({ stock: newStock })
          .eq('id', item.catalogItemId);
      }
      
      itemsSold.push(`${item.name} x${item.quantity}`);
    }

    // Update customer total spent if applicable
    if (customerId) {
      const { data: customer } = await supabase
        .from('customers')
        .select('total_orders, total_spent')
        .eq('id', customerId)
        .single();
      
      if (customer) {
        await supabase
          .from('customers')
          .update({
            total_orders: (customer.total_orders || 0) + 1,
            total_spent: (customer.total_spent || 0) + totalAmount,
          })
          .eq('id', customerId);
      }
    }

    return {
      success: true,
      saleType: 'articles_only',
      totalAmount,
      itemsSold,
    };
  };

  // Process sale - now handles both direct sales and orders
  const processSale = async () => {
    if (cart.length === 0) {
      toast.error('Agrega al menos un servicio o artículo');
      return;
    }
    
    // Only require customer name for services (orders)
    if (hasServices && !customerName) {
      toast.error('Ingresa el nombre del cliente para crear el pedido');
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
        const newAddress = deliveryAddress || pickupAddress;
        if (newAddress && newAddress !== selectedCustomer.address) {
          await supabase
            .from('customers')
            .update({ address: newAddress })
            .eq('id', selectedCustomer.id);
        }
      }

      // If only articles, process as direct sale (no order)
      if (hasOnlyArticles) {
        const result = await processDirectArticleSale(customerId);
        
        if (result.success) {
          setCompletedDirectSale(result);
          setCompletedOrder(null);
          setShowSuccess(true);
          toast.success('¡Venta de artículos completada!');
        }
        return;
      }

      // If has services, create order (with or without articles)
      const orderItems: OrderItem[] = cart.map((item) => ({
        id: item.id,
        name: item.name,
        type: item.pricingType === 'weight' ? 'weight' : 'piece',
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        extras: item.type === 'service' ? selectedExtras : [],
      }));

      // Create order object
      const newOrder: Order = {
        id: crypto.randomUUID(),
        ticketCode: '', // Will be generated by database
        qrCode: '',
        customerId,
        customerName,
        customerPhone,
        customerAddress: needsDelivery ? deliveryAddress : undefined,
        items: orderItems,
        status: needsPickup ? 'pending_pickup' : 'in_store',
        totalAmount,
        discountAmount,
        paidAmount: totalAmount, // Quick sale is always fully paid
        isPaid: true,
        isDelivery: needsDelivery,
        needsPickup,
        needsDelivery,
        pickupService: needsPickup ? {
          type: 'pickup',
          status: 'pending',
          address: pickupAddress,
          scheduledSlot: pickupSlot || undefined,
        } : undefined,
        deliveryService: needsDelivery ? {
          type: 'delivery',
          status: 'pending',
          address: deliveryAddress,
          scheduledSlot: deliverySlot || undefined,
        } : undefined,
        deliverySlot: needsDelivery && deliverySlot ? deliverySlot : undefined,
        createdAt: new Date(),
        updatedAt: new Date(),
        notes: '',
      };

      // Save to database
      const createdOrder = await createOrder(newOrder);

      if (createdOrder) {
        setCompletedOrder(createdOrder);
        setCompletedDirectSale(null);
        setShowSuccess(true);
        toast.success(`Pedido creado: ${createdOrder.ticketCode}`);
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
    setNeedsPickup(false);
    setNeedsDelivery(false);
    setPickupAddress('');
    setDeliveryAddress('');
    setPickupSlot('');
    setDeliverySlot('');
    setCart([]);
    setSelectedExtras([]);
    setDiscountAmount(0);
    setPaymentMethod('cash');
    setAmountReceived('');
    setShowSuccess(false);
    setCompletedOrder(null);
    setCompletedDirectSale(null);
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
    <div className="h-[calc(100vh-2rem)] flex flex-col lg:flex-row gap-4 p-4 lg:p-6 overflow-hidden">
      {/* Left Panel - Services/Articles - REDUCED SIZE */}
      <div className="lg:w-[45%] flex flex-col min-w-0 lg:max-h-full overflow-hidden">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
          <div>
            <h1 className="text-2xl lg:text-3xl font-bold flex items-center gap-3">
              <ShoppingCart className="w-8 h-8 text-primary" />
              Venta Rápida
            </h1>
            <p className="text-muted-foreground">
              {hasOnlyArticles 
                ? 'Venta directa de artículos (sin pedido)' 
                : hasServices 
                  ? 'Se creará un pedido para los servicios' 
                  : 'Artículos = venta directa | Servicios = genera pedido'}
            </p>
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
            <div className="grid grid-cols-2 lg:grid-cols-3 gap-2 lg:gap-3">
              {currentItems.map((item, index) => {
                const inCart = cart.find(c => c.catalogItemId === item.id);
                const Icon = item.pricingType === 'weight' ? Scale : Hash;
                const colorClass = currentColors[index % currentColors.length];
                
                return (
                  <button
                    key={item.id}
                    onClick={() => addToCart(item)}
                    className={cn(
                      'relative p-3 lg:p-4 rounded-xl border-2 transition-all duration-200',
                      'hover:scale-[1.02] active:scale-[0.98]',
                      'flex flex-col items-center justify-center text-center gap-1',
                      'min-h-[100px] lg:min-h-[120px]',
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
                    <div className={cn('w-10 h-10 lg:w-12 lg:h-12 rounded-lg flex items-center justify-center text-white', colorClass)}>
                      {activeTab === 'services' ? (
                        <Sparkles className="w-5 h-5 lg:w-6 lg:h-6" />
                      ) : (
                        <Shirt className="w-5 h-5 lg:w-6 lg:h-6" />
                      )}
                    </div>
                    <span className="font-semibold text-xs lg:text-sm line-clamp-2">{item.name}</span>
                    <div className="flex items-center gap-1 text-primary font-bold text-base lg:text-lg">
                      <span>${item.price.toFixed(2)}</span>
                      <span className="text-[10px] text-muted-foreground font-normal">
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

      {/* Right Panel - Cart & Checkout - INCREASED SIZE */}
      <div className="flex-1 lg:w-[55%] flex flex-col bg-card rounded-2xl border shadow-lg overflow-hidden">
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
            
            {/* Pickup Option */}
            <div className="space-y-2 p-3 bg-muted/30 rounded-lg">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Package className="w-4 h-4 text-orange-500" />
                  <span className="text-sm font-medium">Recoger a domicilio</span>
                </div>
                <Switch checked={needsPickup} onCheckedChange={setNeedsPickup} />
              </div>
              
              {needsPickup && (
                <div className="space-y-2 pl-6">
                  <div className="relative">
                    <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      placeholder="Dirección de recogida"
                      value={pickupAddress}
                      onChange={(e) => setPickupAddress(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant={pickupSlot === 'morning' ? 'default' : 'outline'}
                      size="sm"
                      className="flex-1"
                      onClick={() => setPickupSlot('morning')}
                    >
                      🌅 Mañana (9-13h)
                    </Button>
                    <Button
                      type="button"
                      variant={pickupSlot === 'afternoon' ? 'default' : 'outline'}
                      size="sm"
                      className="flex-1"
                      onClick={() => setPickupSlot('afternoon')}
                    >
                      🌆 Tarde (14-18h)
                    </Button>
                  </div>
                </div>
              )}
            </div>
            
            {/* Delivery Option */}
            <div className="space-y-2 p-3 bg-muted/30 rounded-lg">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Truck className="w-4 h-4 text-primary" />
                  <span className="text-sm font-medium">Entregar a domicilio</span>
                </div>
                <Switch checked={needsDelivery} onCheckedChange={setNeedsDelivery} />
              </div>
              
              {needsDelivery && (
                <div className="space-y-2 pl-6">
                  <div className="relative">
                    <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      placeholder="Dirección de entrega"
                      value={deliveryAddress}
                      onChange={(e) => setDeliveryAddress(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant={deliverySlot === 'morning' ? 'default' : 'outline'}
                      size="sm"
                      className="flex-1"
                      onClick={() => setDeliverySlot('morning')}
                    >
                      🌅 Mañana (9-13h)
                    </Button>
                    <Button
                      type="button"
                      variant={deliverySlot === 'afternoon' ? 'default' : 'outline'}
                      size="sm"
                      className="flex-1"
                      onClick={() => setDeliverySlot('afternoon')}
                    >
                      🌆 Tarde (14-18h)
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Cart Items */}
        <div className="flex-1 overflow-y-auto p-4">
          {/* Sale type indicator */}
          {cart.length > 0 && (
            <div className={cn(
              "mb-3 p-2 rounded-lg text-center text-sm font-medium",
              hasOnlyArticles 
                ? "bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/30" 
                : "bg-blue-500/10 text-blue-700 dark:text-blue-400 border border-blue-500/30"
            )}>
              {hasOnlyArticles ? (
                <>
                  <Shirt className="w-4 h-4 inline mr-2" />
                  Venta directa (sin pedido)
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 inline mr-2" />
                  Se creará un pedido
                </>
              )}
            </div>
          )}
          
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
              disabled={cart.length === 0 || (hasServices && !customerName) || isProcessing}
            >
              {isProcessing ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Procesando...
                </>
              ) : hasOnlyArticles ? (
                <>
                  <Receipt className="w-4 h-4" />
                  Vender
                </>
              ) : (
                <>
                  <Receipt className="w-4 h-4" />
                  Cobrar y Crear Pedido
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
              <span>
                {completedDirectSale ? '¡Venta Completada!' : '¡Pedido Creado!'}
              </span>
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            {/* Sale type indicator */}
            {completedDirectSale && (
              <Badge variant="secondary" className="text-sm">
                Venta directa de artículos
              </Badge>
            )}
            {completedOrder && (
              <Badge variant="default" className="text-sm">
                Pedido: {completedOrder.ticketCode}
              </Badge>
            )}

            <div className="text-3xl font-bold text-primary">
              ${(completedDirectSale?.totalAmount || completedOrder?.totalAmount || totalAmount).toFixed(2)}
            </div>
            
            {paymentMethod === 'cash' && change > 0 && (
              <div className="p-3 bg-green-500/10 rounded-xl">
                <span className="text-sm text-muted-foreground">Cambio:</span>
                <p className="text-2xl font-bold text-green-600">${change.toFixed(2)}</p>
              </div>
            )}

            {/* Items sold for direct sale */}
            {completedDirectSale && completedDirectSale.itemsSold.length > 0 && (
              <div className="text-left p-3 bg-muted/50 rounded-xl">
                <p className="text-sm font-medium mb-2">Artículos vendidos:</p>
                <ul className="text-sm text-muted-foreground space-y-1">
                  {completedDirectSale.itemsSold.map((item, idx) => (
                    <li key={idx}>• {item}</li>
                  ))}
                </ul>
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
              {completedOrder && (
                <Button 
                  variant="outline"
                  className="flex-1 gap-2"
                  onClick={handlePrintTicket}
                >
                  <Printer className="w-4 h-4" />
                  Imprimir
                </Button>
              )}
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
