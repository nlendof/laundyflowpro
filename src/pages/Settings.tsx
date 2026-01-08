import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Settings,
  Building2,
  Shirt,
  Truck,
  CreditCard,
  Bell,
  Palette,
  Plus,
  Trash2,
  Edit,
  Save,
  Clock,
  MapPin,
  Phone,
  Mail,
  Globe,
  DollarSign,
  Percent,
  Package,
  Zap,
  Workflow,
  GripVertical,
  ArrowUp,
  ArrowDown,
  Waves,
  Wind,
  Flame,
  CheckCircle,
  Store,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

// Types
interface BusinessSettings {
  name: string;
  slogan: string;
  phone: string;
  email: string;
  address: string;
  website: string;
  openTime: string;
  closeTime: string;
  workDays: string[];
  taxRate: number;
  currency: string;
}

interface ServiceItem {
  id: string;
  name: string;
  pricePerPiece: number;
  pricePerKg: number;
  isActive: boolean;
  category: string;
}

interface ExtraService {
  id: string;
  name: string;
  price: number;
  isActive: boolean;
}

interface DeliveryZone {
  id: string;
  name: string;
  price: number;
  isActive: boolean;
}

interface PaymentMethod {
  id: string;
  name: string;
  isActive: boolean;
  commission: number;
}

interface OperationStep {
  id: string;
  key: string;
  name: string;
  icon: string;
  color: string;
  isActive: boolean;
  isRequired: boolean;
  order: number;
}

// Initial mock data
const INITIAL_BUSINESS: BusinessSettings = {
  name: 'Luis Cap',
  slogan: 'Lavandería Profesional',
  phone: '+52 55 1234 5678',
  email: 'contacto@luiscap.com',
  address: 'Av. Principal #123, Col. Centro',
  website: 'www.luiscap.com',
  openTime: '08:00',
  closeTime: '20:00',
  workDays: ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'],
  taxRate: 16,
  currency: 'MXN',
};

const INITIAL_SERVICES: ServiceItem[] = [
  { id: '1', name: 'Camisas', pricePerPiece: 3.00, pricePerKg: 8.00, isActive: true, category: 'ropa' },
  { id: '2', name: 'Pantalones', pricePerPiece: 4.00, pricePerKg: 9.00, isActive: true, category: 'ropa' },
  { id: '3', name: 'Vestidos', pricePerPiece: 6.00, pricePerKg: 12.00, isActive: true, category: 'ropa' },
  { id: '4', name: 'Chaquetas', pricePerPiece: 8.00, pricePerKg: 15.00, isActive: true, category: 'ropa' },
  { id: '5', name: 'Cobijas', pricePerPiece: 15.00, pricePerKg: 10.00, isActive: true, category: 'hogar' },
  { id: '6', name: 'Ropa Mixta', pricePerPiece: 2.50, pricePerKg: 6.00, isActive: true, category: 'general' },
  { id: '7', name: 'Lavado en Seco', pricePerPiece: 12.00, pricePerKg: 20.00, isActive: true, category: 'especial' },
];

const INITIAL_EXTRAS: ExtraService[] = [
  { id: '1', name: 'Desmanchado', price: 3.00, isActive: true },
  { id: '2', name: 'Suavizante Premium', price: 2.00, isActive: true },
  { id: '3', name: 'Express (24h)', price: 10.00, isActive: true },
  { id: '4', name: 'Fragancia Especial', price: 1.50, isActive: true },
  { id: '5', name: 'Planchado Premium', price: 5.00, isActive: true },
];

const INITIAL_ZONES: DeliveryZone[] = [
  { id: '1', name: 'Centro', price: 0, isActive: true },
  { id: '2', name: 'Zona Norte', price: 25, isActive: true },
  { id: '3', name: 'Zona Sur', price: 30, isActive: true },
  { id: '4', name: 'Zona Oriente', price: 35, isActive: true },
  { id: '5', name: 'Zona Poniente', price: 40, isActive: false },
];

const INITIAL_PAYMENTS: PaymentMethod[] = [
  { id: '1', name: 'Efectivo', isActive: true, commission: 0 },
  { id: '2', name: 'Tarjeta de Crédito', isActive: true, commission: 3.5 },
  { id: '3', name: 'Tarjeta de Débito', isActive: true, commission: 2.5 },
  { id: '4', name: 'Transferencia', isActive: true, commission: 0 },
  { id: '5', name: 'PayPal', isActive: false, commission: 4.0 },
];

const INITIAL_OPERATIONS: OperationStep[] = [
  { id: '1', key: 'pending_pickup', name: 'Pendiente de Recogida', icon: 'Clock', color: 'bg-amber-500', isActive: true, isRequired: true, order: 0 },
  { id: '2', key: 'in_store', name: 'En Local', icon: 'Store', color: 'bg-blue-500', isActive: true, isRequired: true, order: 1 },
  { id: '3', key: 'washing', name: 'Lavando', icon: 'Waves', color: 'bg-cyan-500', isActive: true, isRequired: false, order: 2 },
  { id: '4', key: 'drying', name: 'Secando', icon: 'Wind', color: 'bg-purple-500', isActive: true, isRequired: false, order: 3 },
  { id: '5', key: 'ironing', name: 'Planchado', icon: 'Flame', color: 'bg-orange-500', isActive: true, isRequired: false, order: 4 },
  { id: '6', key: 'ready_delivery', name: 'Listo para Entrega', icon: 'Package', color: 'bg-emerald-500', isActive: true, isRequired: true, order: 5 },
  { id: '7', key: 'in_transit', name: 'En Camino', icon: 'Truck', color: 'bg-indigo-500', isActive: true, isRequired: false, order: 6 },
  { id: '8', key: 'delivered', name: 'Entregado', icon: 'CheckCircle', color: 'bg-green-600', isActive: true, isRequired: true, order: 7 },
];

const AVAILABLE_ICONS = [
  { name: 'Clock', icon: Clock },
  { name: 'Store', icon: Store },
  { name: 'Waves', icon: Waves },
  { name: 'Wind', icon: Wind },
  { name: 'Flame', icon: Flame },
  { name: 'Package', icon: Package },
  { name: 'Truck', icon: Truck },
  { name: 'CheckCircle', icon: CheckCircle },
  { name: 'Zap', icon: Zap },
];

const AVAILABLE_COLORS = [
  { name: 'Ámbar', value: 'bg-amber-500' },
  { name: 'Azul', value: 'bg-blue-500' },
  { name: 'Cyan', value: 'bg-cyan-500' },
  { name: 'Púrpura', value: 'bg-purple-500' },
  { name: 'Naranja', value: 'bg-orange-500' },
  { name: 'Esmeralda', value: 'bg-emerald-500' },
  { name: 'Índigo', value: 'bg-indigo-500' },
  { name: 'Verde', value: 'bg-green-600' },
  { name: 'Rosa', value: 'bg-pink-500' },
  { name: 'Rojo', value: 'bg-red-500' },
];

const WORK_DAYS = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState('business');
  const [business, setBusiness] = useState<BusinessSettings>(INITIAL_BUSINESS);
  const [services, setServices] = useState<ServiceItem[]>(INITIAL_SERVICES);
  const [extras, setExtras] = useState<ExtraService[]>(INITIAL_EXTRAS);
  const [zones, setZones] = useState<DeliveryZone[]>(INITIAL_ZONES);
  const [payments, setPayments] = useState<PaymentMethod[]>(INITIAL_PAYMENTS);
  const [operations, setOperations] = useState<OperationStep[]>(INITIAL_OPERATIONS);
  
  // Notification settings
  const [notifications, setNotifications] = useState({
    emailOnNewOrder: true,
    emailOnStatusChange: false,
    smsOnReady: true,
    whatsappOnReady: true,
    dailyReport: true,
  });

  // Appearance settings
  const [appearance, setAppearance] = useState({
    theme: 'system',
    primaryColor: 'teal',
    showLogo: true,
    compactMode: false,
  });

  // Edit dialogs state
  const [editingService, setEditingService] = useState<ServiceItem | null>(null);
  const [editingExtra, setEditingExtra] = useState<ExtraService | null>(null);
  const [editingZone, setEditingZone] = useState<DeliveryZone | null>(null);
  const [editingOperation, setEditingOperation] = useState<OperationStep | null>(null);

  const handleSave = () => {
    toast.success('Configuración guardada correctamente');
  };

  const toggleWorkDay = (day: string) => {
    setBusiness(prev => ({
      ...prev,
      workDays: prev.workDays.includes(day)
        ? prev.workDays.filter(d => d !== day)
        : [...prev.workDays, day]
    }));
  };

  const addService = () => {
    const newService: ServiceItem = {
      id: crypto.randomUUID(),
      name: 'Nuevo Servicio',
      pricePerPiece: 0,
      pricePerKg: 0,
      isActive: true,
      category: 'general',
    };
    setServices(prev => [...prev, newService]);
    setEditingService(newService);
  };

  const updateService = (updated: ServiceItem) => {
    setServices(prev => prev.map(s => s.id === updated.id ? updated : s));
    setEditingService(null);
    toast.success('Servicio actualizado');
  };

  const deleteService = (id: string) => {
    setServices(prev => prev.filter(s => s.id !== id));
    toast.success('Servicio eliminado');
  };

  const addExtra = () => {
    const newExtra: ExtraService = {
      id: crypto.randomUUID(),
      name: 'Nuevo Extra',
      price: 0,
      isActive: true,
    };
    setExtras(prev => [...prev, newExtra]);
    setEditingExtra(newExtra);
  };

  const updateExtra = (updated: ExtraService) => {
    setExtras(prev => prev.map(e => e.id === updated.id ? updated : e));
    setEditingExtra(null);
    toast.success('Servicio extra actualizado');
  };

  const deleteExtra = (id: string) => {
    setExtras(prev => prev.filter(e => e.id !== id));
    toast.success('Servicio extra eliminado');
  };

  const addZone = () => {
    const newZone: DeliveryZone = {
      id: crypto.randomUUID(),
      name: 'Nueva Zona',
      price: 0,
      isActive: true,
    };
    setZones(prev => [...prev, newZone]);
    setEditingZone(newZone);
  };

  const updateZone = (updated: DeliveryZone) => {
    setZones(prev => prev.map(z => z.id === updated.id ? updated : z));
    setEditingZone(null);
    toast.success('Zona actualizada');
  };

  const deleteZone = (id: string) => {
    setZones(prev => prev.filter(z => z.id !== id));
    toast.success('Zona eliminada');
  };

  const togglePayment = (id: string) => {
    setPayments(prev => prev.map(p => 
      p.id === id ? { ...p, isActive: !p.isActive } : p
    ));
  };

  // Operations functions
  const toggleOperation = (id: string) => {
    setOperations(prev => prev.map(op => {
      if (op.id === id && !op.isRequired) {
        return { ...op, isActive: !op.isActive };
      }
      return op;
    }));
  };

  const moveOperation = (id: string, direction: 'up' | 'down') => {
    setOperations(prev => {
      const sorted = [...prev].sort((a, b) => a.order - b.order);
      const index = sorted.findIndex(op => op.id === id);
      if (index === -1) return prev;
      
      const targetIndex = direction === 'up' ? index - 1 : index + 1;
      if (targetIndex < 0 || targetIndex >= sorted.length) return prev;
      
      // Swap orders
      const current = sorted[index];
      const target = sorted[targetIndex];
      
      return prev.map(op => {
        if (op.id === current.id) return { ...op, order: target.order };
        if (op.id === target.id) return { ...op, order: current.order };
        return op;
      });
    });
  };

  const addOperation = () => {
    const maxOrder = Math.max(...operations.map(op => op.order));
    const newOperation: OperationStep = {
      id: crypto.randomUUID(),
      key: `custom_${Date.now()}`,
      name: 'Nueva Operación',
      icon: 'Zap',
      color: 'bg-pink-500',
      isActive: true,
      isRequired: false,
      order: maxOrder + 1,
    };
    setOperations(prev => [...prev, newOperation]);
    setEditingOperation(newOperation);
  };

  const updateOperation = (updated: OperationStep) => {
    setOperations(prev => prev.map(op => op.id === updated.id ? updated : op));
    setEditingOperation(null);
    toast.success('Operación actualizada');
  };

  const deleteOperation = (id: string) => {
    const op = operations.find(o => o.id === id);
    if (op?.isRequired) {
      toast.error('Esta operación es requerida y no se puede eliminar');
      return;
    }
    setOperations(prev => prev.filter(op => op.id !== id));
    toast.success('Operación eliminada');
  };

  const getIconComponent = (iconName: string) => {
    const iconConfig = AVAILABLE_ICONS.find(i => i.name === iconName);
    return iconConfig?.icon || Zap;
  };

  return (
    <div className="p-4 lg:p-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold flex items-center gap-3">
            <Settings className="w-8 h-8 text-primary" />
            Configuración
          </h1>
          <p className="text-muted-foreground">Personaliza tu sistema de lavandería</p>
        </div>
        <Button onClick={handleSave} className="gap-2">
          <Save className="w-4 h-4" />
          Guardar Cambios
        </Button>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="flex flex-wrap h-auto gap-2 bg-transparent p-0">
          <TabsTrigger value="business" className="gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
            <Building2 className="w-4 h-4" />
            Negocio
          </TabsTrigger>
          <TabsTrigger value="services" className="gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
            <Shirt className="w-4 h-4" />
            Servicios
          </TabsTrigger>
          <TabsTrigger value="delivery" className="gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
            <Truck className="w-4 h-4" />
            Entregas
          </TabsTrigger>
          <TabsTrigger value="payments" className="gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
            <CreditCard className="w-4 h-4" />
            Pagos
          </TabsTrigger>
          <TabsTrigger value="notifications" className="gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
            <Bell className="w-4 h-4" />
            Notificaciones
          </TabsTrigger>
          <TabsTrigger value="operations" className="gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
            <Workflow className="w-4 h-4" />
            Operaciones
          </TabsTrigger>
          <TabsTrigger value="appearance" className="gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
            <Palette className="w-4 h-4" />
            Apariencia
          </TabsTrigger>
        </TabsList>

        {/* Business Settings */}
        <TabsContent value="business" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Información del Negocio</CardTitle>
              <CardDescription>Datos generales de tu lavandería</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="businessName">Nombre del Negocio</Label>
                  <Input
                    id="businessName"
                    value={business.name}
                    onChange={(e) => setBusiness(prev => ({ ...prev, name: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="slogan">Slogan</Label>
                  <Input
                    id="slogan"
                    value={business.slogan}
                    onChange={(e) => setBusiness(prev => ({ ...prev, slogan: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone">Teléfono</Label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      id="phone"
                      value={business.phone}
                      onChange={(e) => setBusiness(prev => ({ ...prev, phone: e.target.value }))}
                      className="pl-10"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      id="email"
                      type="email"
                      value={business.email}
                      onChange={(e) => setBusiness(prev => ({ ...prev, email: e.target.value }))}
                      className="pl-10"
                    />
                  </div>
                </div>
                <div className="space-y-2 sm:col-span-2">
                  <Label htmlFor="address">Dirección</Label>
                  <div className="relative">
                    <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      id="address"
                      value={business.address}
                      onChange={(e) => setBusiness(prev => ({ ...prev, address: e.target.value }))}
                      className="pl-10"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="website">Sitio Web</Label>
                  <div className="relative">
                    <Globe className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      id="website"
                      value={business.website}
                      onChange={(e) => setBusiness(prev => ({ ...prev, website: e.target.value }))}
                      className="pl-10"
                    />
                  </div>
                </div>
              </div>

              <Separator />

              {/* Hours */}
              <div>
                <h3 className="font-semibold mb-4 flex items-center gap-2">
                  <Clock className="w-4 h-4" />
                  Horario de Atención
                </h3>
                <div className="grid gap-4 sm:grid-cols-2 mb-4">
                  <div className="space-y-2">
                    <Label>Hora de Apertura</Label>
                    <Input
                      type="time"
                      value={business.openTime}
                      onChange={(e) => setBusiness(prev => ({ ...prev, openTime: e.target.value }))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Hora de Cierre</Label>
                    <Input
                      type="time"
                      value={business.closeTime}
                      onChange={(e) => setBusiness(prev => ({ ...prev, closeTime: e.target.value }))}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Días Laborales</Label>
                  <div className="flex flex-wrap gap-2">
                    {WORK_DAYS.map((day) => (
                      <button
                        key={day}
                        onClick={() => toggleWorkDay(day)}
                        className={cn(
                          'px-3 py-1.5 rounded-lg border text-sm font-medium transition-all',
                          business.workDays.includes(day)
                            ? 'bg-primary text-primary-foreground border-primary'
                            : 'border-border hover:border-primary/50'
                        )}
                      >
                        {day.slice(0, 3)}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <Separator />

              {/* Tax & Currency */}
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>Impuesto (IVA %)</Label>
                  <div className="relative">
                    <Percent className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      type="number"
                      value={business.taxRate}
                      onChange={(e) => setBusiness(prev => ({ ...prev, taxRate: parseFloat(e.target.value) || 0 }))}
                      className="pl-10"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Moneda</Label>
                  <Select 
                    value={business.currency} 
                    onValueChange={(v) => setBusiness(prev => ({ ...prev, currency: v }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="MXN">MXN - Peso Mexicano</SelectItem>
                      <SelectItem value="USD">USD - Dólar Americano</SelectItem>
                      <SelectItem value="EUR">EUR - Euro</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Services Settings */}
        <TabsContent value="services" className="space-y-6">
          {/* Main Services */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Servicios de Lavado</CardTitle>
                <CardDescription>Configura los precios por pieza y por kilogramo</CardDescription>
              </div>
              <Button onClick={addService} size="sm" className="gap-2">
                <Plus className="w-4 h-4" />
                Agregar
              </Button>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {services.map((service) => (
                  <div 
                    key={service.id}
                    className={cn(
                      'flex items-center justify-between p-4 rounded-xl border',
                      !service.isActive && 'opacity-50'
                    )}
                  >
                    <div className="flex items-center gap-3">
                      <Switch
                        checked={service.isActive}
                        onCheckedChange={(checked) => 
                          setServices(prev => prev.map(s => 
                            s.id === service.id ? { ...s, isActive: checked } : s
                          ))
                        }
                      />
                      <div>
                        <p className="font-medium">{service.name}</p>
                        <p className="text-sm text-muted-foreground">
                          ${service.pricePerPiece}/pieza • ${service.pricePerKg}/kg
                        </p>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button 
                        variant="ghost" 
                        size="icon"
                        onClick={() => setEditingService(service)}
                      >
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="icon"
                        className="text-destructive hover:text-destructive"
                        onClick={() => deleteService(service.id)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Extra Services */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Zap className="w-5 h-5" />
                  Servicios Extra
                </CardTitle>
                <CardDescription>Servicios adicionales que se agregan al pedido</CardDescription>
              </div>
              <Button onClick={addExtra} size="sm" className="gap-2">
                <Plus className="w-4 h-4" />
                Agregar
              </Button>
            </CardHeader>
            <CardContent>
              <div className="grid gap-3 sm:grid-cols-2">
                {extras.map((extra) => (
                  <div 
                    key={extra.id}
                    className={cn(
                      'flex items-center justify-between p-3 rounded-xl border',
                      !extra.isActive && 'opacity-50'
                    )}
                  >
                    <div className="flex items-center gap-3">
                      <Switch
                        checked={extra.isActive}
                        onCheckedChange={(checked) => 
                          setExtras(prev => prev.map(e => 
                            e.id === extra.id ? { ...e, isActive: checked } : e
                          ))
                        }
                      />
                      <div>
                        <p className="font-medium">{extra.name}</p>
                        <p className="text-sm text-primary font-semibold">+${extra.price.toFixed(2)}</p>
                      </div>
                    </div>
                    <div className="flex gap-1">
                      <Button 
                        variant="ghost" 
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => setEditingExtra(extra)}
                      >
                        <Edit className="w-3.5 h-3.5" />
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="icon"
                        className="h-8 w-8 text-destructive hover:text-destructive"
                        onClick={() => deleteExtra(extra.id)}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Delivery Settings */}
        <TabsContent value="delivery" className="space-y-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Zonas de Entrega</CardTitle>
                <CardDescription>Configura las zonas y costos de delivery</CardDescription>
              </div>
              <Button onClick={addZone} size="sm" className="gap-2">
                <Plus className="w-4 h-4" />
                Nueva Zona
              </Button>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {zones.map((zone) => (
                  <div 
                    key={zone.id}
                    className={cn(
                      'flex items-center justify-between p-4 rounded-xl border',
                      !zone.isActive && 'opacity-50'
                    )}
                  >
                    <div className="flex items-center gap-3">
                      <Switch
                        checked={zone.isActive}
                        onCheckedChange={(checked) => 
                          setZones(prev => prev.map(z => 
                            z.id === zone.id ? { ...z, isActive: checked } : z
                          ))
                        }
                      />
                      <div className="flex items-center gap-2">
                        <MapPin className="w-4 h-4 text-primary" />
                        <span className="font-medium">{zone.name}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <Badge variant={zone.price === 0 ? 'default' : 'secondary'}>
                        {zone.price === 0 ? 'Gratis' : `$${zone.price.toFixed(2)}`}
                      </Badge>
                      <Button 
                        variant="ghost" 
                        size="icon"
                        onClick={() => setEditingZone(zone)}
                      >
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="icon"
                        className="text-destructive hover:text-destructive"
                        onClick={() => deleteZone(zone.id)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Delivery Hours */}
          <Card>
            <CardHeader>
              <CardTitle>Franjas Horarias</CardTitle>
              <CardDescription>Horarios disponibles para recolección y entrega</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between p-4 bg-muted/50 rounded-xl">
                <div className="flex items-center gap-3">
                  <div className="text-2xl">🌅</div>
                  <div>
                    <p className="font-medium">Mañana</p>
                    <p className="text-sm text-muted-foreground">9:00 - 13:00</p>
                  </div>
                </div>
                <Switch defaultChecked />
              </div>
              <div className="flex items-center justify-between p-4 bg-muted/50 rounded-xl">
                <div className="flex items-center gap-3">
                  <div className="text-2xl">🌆</div>
                  <div>
                    <p className="font-medium">Tarde</p>
                    <p className="text-sm text-muted-foreground">14:00 - 19:00</p>
                  </div>
                </div>
                <Switch defaultChecked />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Payment Settings */}
        <TabsContent value="payments" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Métodos de Pago</CardTitle>
              <CardDescription>Habilita o deshabilita métodos de pago</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {payments.map((payment) => (
                  <div 
                    key={payment.id}
                    className={cn(
                      'flex items-center justify-between p-4 rounded-xl border',
                      !payment.isActive && 'opacity-50'
                    )}
                  >
                    <div className="flex items-center gap-3">
                      <Switch
                        checked={payment.isActive}
                        onCheckedChange={() => togglePayment(payment.id)}
                      />
                      <CreditCard className="w-5 h-5 text-primary" />
                      <span className="font-medium">{payment.name}</span>
                    </div>
                    {payment.commission > 0 && (
                      <Badge variant="secondary">
                        {payment.commission}% comisión
                      </Badge>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Notifications Settings */}
        <TabsContent value="notifications" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Notificaciones al Cliente</CardTitle>
              <CardDescription>Configura cómo se notifica a los clientes</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between p-4 bg-muted/50 rounded-xl">
                <div>
                  <p className="font-medium">SMS cuando el pedido está listo</p>
                  <p className="text-sm text-muted-foreground">Enviar SMS al cliente</p>
                </div>
                <Switch
                  checked={notifications.smsOnReady}
                  onCheckedChange={(checked) => setNotifications(prev => ({ ...prev, smsOnReady: checked }))}
                />
              </div>
              <div className="flex items-center justify-between p-4 bg-muted/50 rounded-xl">
                <div>
                  <p className="font-medium">WhatsApp cuando el pedido está listo</p>
                  <p className="text-sm text-muted-foreground">Enviar mensaje de WhatsApp</p>
                </div>
                <Switch
                  checked={notifications.whatsappOnReady}
                  onCheckedChange={(checked) => setNotifications(prev => ({ ...prev, whatsappOnReady: checked }))}
                />
              </div>
              <div className="flex items-center justify-between p-4 bg-muted/50 rounded-xl">
                <div>
                  <p className="font-medium">Email en cada cambio de estado</p>
                  <p className="text-sm text-muted-foreground">Notificar por email al avanzar estado</p>
                </div>
                <Switch
                  checked={notifications.emailOnStatusChange}
                  onCheckedChange={(checked) => setNotifications(prev => ({ ...prev, emailOnStatusChange: checked }))}
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Notificaciones del Sistema</CardTitle>
              <CardDescription>Notificaciones para administradores</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between p-4 bg-muted/50 rounded-xl">
                <div>
                  <p className="font-medium">Email al recibir nuevo pedido</p>
                  <p className="text-sm text-muted-foreground">Notificar cuando llega un pedido nuevo</p>
                </div>
                <Switch
                  checked={notifications.emailOnNewOrder}
                  onCheckedChange={(checked) => setNotifications(prev => ({ ...prev, emailOnNewOrder: checked }))}
                />
              </div>
              <div className="flex items-center justify-between p-4 bg-muted/50 rounded-xl">
                <div>
                  <p className="font-medium">Reporte diario por email</p>
                  <p className="text-sm text-muted-foreground">Resumen de ventas del día</p>
                </div>
                <Switch
                  checked={notifications.dailyReport}
                  onCheckedChange={(checked) => setNotifications(prev => ({ ...prev, dailyReport: checked }))}
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Operations Settings */}
        <TabsContent value="operations" className="space-y-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Workflow className="w-5 h-5" />
                  Flujo de Operaciones
                </CardTitle>
                <CardDescription>
                  Configura los pasos del proceso de lavandería. Activa, desactiva y reordena según tu flujo de trabajo.
                </CardDescription>
              </div>
              <Button onClick={addOperation} size="sm" className="gap-2">
                <Plus className="w-4 h-4" />
                Agregar Paso
              </Button>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {operations
                  .sort((a, b) => a.order - b.order)
                  .map((operation, index, arr) => {
                    const IconComponent = getIconComponent(operation.icon);
                    return (
                      <div 
                        key={operation.id}
                        className={cn(
                          'flex items-center justify-between p-4 rounded-xl border transition-all',
                          !operation.isActive && 'opacity-50 bg-muted/30',
                          operation.isActive && 'bg-card'
                        )}
                      >
                        <div className="flex items-center gap-3">
                          <div className="flex flex-col gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6"
                              disabled={index === 0}
                              onClick={() => moveOperation(operation.id, 'up')}
                            >
                              <ArrowUp className="w-3 h-3" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6"
                              disabled={index === arr.length - 1}
                              onClick={() => moveOperation(operation.id, 'down')}
                            >
                              <ArrowDown className="w-3 h-3" />
                            </Button>
                          </div>
                          
                          <Switch
                            checked={operation.isActive}
                            disabled={operation.isRequired}
                            onCheckedChange={() => toggleOperation(operation.id)}
                          />
                          
                          <div className={cn('p-2 rounded-lg text-white', operation.color)}>
                            <IconComponent className="w-5 h-5" />
                          </div>
                          
                          <div>
                            <div className="flex items-center gap-2">
                              <p className="font-medium">{operation.name}</p>
                              {operation.isRequired && (
                                <Badge variant="secondary" className="text-xs">
                                  Requerido
                                </Badge>
                              )}
                            </div>
                            <p className="text-xs text-muted-foreground">
                              Paso {index + 1} • {operation.key}
                            </p>
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-2">
                          <Button 
                            variant="ghost" 
                            size="icon"
                            onClick={() => setEditingOperation(operation)}
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                          {!operation.isRequired && (
                            <Button 
                              variant="ghost" 
                              size="icon"
                              className="text-destructive hover:text-destructive"
                              onClick={() => deleteOperation(operation.id)}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          )}
                        </div>
                      </div>
                    );
                  })}
              </div>
              
              {/* Flow Preview */}
              <div className="mt-6 pt-6 border-t">
                <Label className="mb-3 block">Vista Previa del Flujo</Label>
                <div className="flex flex-wrap items-center gap-2">
                  {operations
                    .filter(op => op.isActive)
                    .sort((a, b) => a.order - b.order)
                    .map((operation, index, arr) => {
                      const IconComponent = getIconComponent(operation.icon);
                      return (
                        <div key={operation.id} className="flex items-center gap-2">
                          <div className={cn(
                            'flex items-center gap-2 px-3 py-1.5 rounded-full text-white text-sm',
                            operation.color
                          )}>
                            <IconComponent className="w-4 h-4" />
                            <span>{operation.name}</span>
                          </div>
                          {index < arr.length - 1 && (
                            <span className="text-muted-foreground">→</span>
                          )}
                        </div>
                      );
                    })}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Tips Card */}
          <Card className="bg-muted/50 border-dashed">
            <CardContent className="pt-6">
              <div className="flex items-start gap-3">
                <div className="p-2 bg-primary/10 rounded-lg">
                  <Workflow className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <p className="font-medium mb-1">Consejos para configurar el flujo</p>
                  <ul className="text-sm text-muted-foreground space-y-1">
                    <li>• Los pasos marcados como "Requerido" no se pueden desactivar ni eliminar.</li>
                    <li>• Usa las flechas para reordenar los pasos según tu proceso.</li>
                    <li>• Los pasos desactivados no aparecerán en el tablero de operaciones.</li>
                    <li>• Puedes crear pasos personalizados para procesos especiales.</li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Appearance Settings */}
        <TabsContent value="appearance" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Tema y Apariencia</CardTitle>
              <CardDescription>Personaliza la apariencia del sistema</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label>Tema</Label>
                <Select 
                  value={appearance.theme} 
                  onValueChange={(v) => setAppearance(prev => ({ ...prev, theme: v }))}
                >
                  <SelectTrigger className="w-full sm:w-[200px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="light">☀️ Claro</SelectItem>
                    <SelectItem value="dark">🌙 Oscuro</SelectItem>
                    <SelectItem value="system">💻 Sistema</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Color Principal</Label>
                <div className="flex gap-3">
                  {['teal', 'blue', 'purple', 'green', 'orange'].map((color) => (
                    <button
                      key={color}
                      onClick={() => setAppearance(prev => ({ ...prev, primaryColor: color }))}
                      className={cn(
                        'w-10 h-10 rounded-full transition-all',
                        color === 'teal' && 'bg-teal-500',
                        color === 'blue' && 'bg-blue-500',
                        color === 'purple' && 'bg-purple-500',
                        color === 'green' && 'bg-green-500',
                        color === 'orange' && 'bg-orange-500',
                        appearance.primaryColor === color && 'ring-2 ring-offset-2 ring-primary'
                      )}
                    />
                  ))}
                </div>
              </div>

              <Separator />

              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Mostrar logo en tickets</p>
                  <p className="text-sm text-muted-foreground">Incluir logo en tickets impresos</p>
                </div>
                <Switch
                  checked={appearance.showLogo}
                  onCheckedChange={(checked) => setAppearance(prev => ({ ...prev, showLogo: checked }))}
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Modo compacto</p>
                  <p className="text-sm text-muted-foreground">Reduce el espaciado para ver más contenido</p>
                </div>
                <Switch
                  checked={appearance.compactMode}
                  onCheckedChange={(checked) => setAppearance(prev => ({ ...prev, compactMode: checked }))}
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Edit Service Dialog */}
      <Dialog open={!!editingService} onOpenChange={() => setEditingService(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar Servicio</DialogTitle>
          </DialogHeader>
          {editingService && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Nombre</Label>
                <Input
                  value={editingService.name}
                  onChange={(e) => setEditingService({ ...editingService, name: e.target.value })}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Precio por Pieza</Label>
                  <Input
                    type="number"
                    step="0.50"
                    value={editingService.pricePerPiece}
                    onChange={(e) => setEditingService({ ...editingService, pricePerPiece: parseFloat(e.target.value) || 0 })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Precio por Kg</Label>
                  <Input
                    type="number"
                    step="0.50"
                    value={editingService.pricePerKg}
                    onChange={(e) => setEditingService({ ...editingService, pricePerKg: parseFloat(e.target.value) || 0 })}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Categoría</Label>
                <Select 
                  value={editingService.category}
                  onValueChange={(v) => setEditingService({ ...editingService, category: v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ropa">Ropa</SelectItem>
                    <SelectItem value="hogar">Hogar</SelectItem>
                    <SelectItem value="especial">Especial</SelectItem>
                    <SelectItem value="general">General</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button className="w-full" onClick={() => updateService(editingService)}>
                Guardar Cambios
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Edit Extra Dialog */}
      <Dialog open={!!editingExtra} onOpenChange={() => setEditingExtra(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar Servicio Extra</DialogTitle>
          </DialogHeader>
          {editingExtra && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Nombre</Label>
                <Input
                  value={editingExtra.name}
                  onChange={(e) => setEditingExtra({ ...editingExtra, name: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Precio</Label>
                <Input
                  type="number"
                  step="0.50"
                  value={editingExtra.price}
                  onChange={(e) => setEditingExtra({ ...editingExtra, price: parseFloat(e.target.value) || 0 })}
                />
              </div>
              <Button className="w-full" onClick={() => updateExtra(editingExtra)}>
                Guardar Cambios
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Edit Zone Dialog */}
      <Dialog open={!!editingZone} onOpenChange={() => setEditingZone(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar Zona de Entrega</DialogTitle>
          </DialogHeader>
          {editingZone && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Nombre de la Zona</Label>
                <Input
                  value={editingZone.name}
                  onChange={(e) => setEditingZone({ ...editingZone, name: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Costo de Envío</Label>
                <Input
                  type="number"
                  step="5"
                  value={editingZone.price}
                  onChange={(e) => setEditingZone({ ...editingZone, price: parseFloat(e.target.value) || 0 })}
                />
                <p className="text-xs text-muted-foreground">Ingresa 0 para envío gratis</p>
              </div>
              <Button className="w-full" onClick={() => updateZone(editingZone)}>
                Guardar Cambios
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Edit Operation Dialog */}
      <Dialog open={!!editingOperation} onOpenChange={() => setEditingOperation(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Editar Operación</DialogTitle>
          </DialogHeader>
          {editingOperation && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Nombre de la Operación</Label>
                <Input
                  value={editingOperation.name}
                  onChange={(e) => setEditingOperation({ ...editingOperation, name: e.target.value })}
                  disabled={editingOperation.isRequired}
                />
                {editingOperation.isRequired && (
                  <p className="text-xs text-muted-foreground">
                    El nombre de operaciones requeridas no puede modificarse.
                  </p>
                )}
              </div>
              
              <div className="space-y-2">
                <Label>Ícono</Label>
                <div className="grid grid-cols-5 gap-2">
                  {AVAILABLE_ICONS.map(({ name, icon: Icon }) => (
                    <button
                      key={name}
                      type="button"
                      onClick={() => setEditingOperation({ ...editingOperation, icon: name })}
                      className={cn(
                        'p-3 rounded-lg border-2 flex items-center justify-center transition-all',
                        editingOperation.icon === name
                          ? 'border-primary bg-primary/10'
                          : 'border-border hover:border-primary/50'
                      )}
                    >
                      <Icon className="w-5 h-5" />
                    </button>
                  ))}
                </div>
              </div>
              
              <div className="space-y-2">
                <Label>Color</Label>
                <div className="grid grid-cols-5 gap-2">
                  {AVAILABLE_COLORS.map(({ name, value }) => (
                    <button
                      key={value}
                      type="button"
                      onClick={() => setEditingOperation({ ...editingOperation, color: value })}
                      className={cn(
                        'w-10 h-10 rounded-lg transition-all',
                        value,
                        editingOperation.color === value
                          ? 'ring-2 ring-offset-2 ring-primary'
                          : ''
                      )}
                      title={name}
                    />
                  ))}
                </div>
              </div>

              {/* Preview */}
              <div className="space-y-2">
                <Label>Vista Previa</Label>
                <div className={cn(
                  'inline-flex items-center gap-2 px-4 py-2 rounded-full text-white',
                  editingOperation.color
                )}>
                  {(() => {
                    const IconComponent = getIconComponent(editingOperation.icon);
                    return <IconComponent className="w-5 h-5" />;
                  })()}
                  <span className="font-medium">{editingOperation.name}</span>
                </div>
              </div>
              
              <Button className="w-full" onClick={() => updateOperation(editingOperation)}>
                Guardar Cambios
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
