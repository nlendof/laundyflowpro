import { useState, useEffect } from 'react';
import { Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { 
  Shirt, Package, MapPin, User, LogOut, Plus, 
  Clock, CheckCircle, Truck, Home
} from 'lucide-react';
import { toast } from 'sonner';
import CustomerProfile from './CustomerProfile';
import CustomerOrders from './CustomerOrders';
import NewPickupRequest from './NewPickupRequest';

interface CustomerDashboardProps {
  session: Session;
}

interface CustomerData {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
  address: string | null;
}

export default function CustomerDashboard({ session }: CustomerDashboardProps) {
  const [activeTab, setActiveTab] = useState('orders');
  const [customerData, setCustomerData] = useState<CustomerData | null>(null);
  const [showNewPickup, setShowNewPickup] = useState(false);
  const [pendingOrders, setPendingOrders] = useState(0);
  const [inProgressOrders, setInProgressOrders] = useState(0);

  useEffect(() => {
    fetchCustomerData();
    fetchOrderCounts();
  }, [session]);

  const fetchCustomerData = async () => {
    const { data } = await supabase
      .from('customers')
      .select('*')
      .eq('user_id', session.user.id)
      .maybeSingle();
    
    if (data) {
      setCustomerData(data);
    }
  };

  const fetchOrderCounts = async () => {
    const { data: customer } = await supabase
      .from('customers')
      .select('id')
      .eq('user_id', session.user.id)
      .maybeSingle();

    if (customer) {
      const { count: pending } = await supabase
        .from('orders')
        .select('*', { count: 'exact', head: true })
        .eq('customer_id', customer.id)
        .in('status', ['pending_pickup', 'in_store']);

      const { count: inProgress } = await supabase
        .from('orders')
        .select('*', { count: 'exact', head: true })
        .eq('customer_id', customer.id)
        .in('status', ['washing', 'drying', 'ironing', 'ready_delivery', 'in_transit']);

      setPendingOrders(pending || 0);
      setInProgressOrders(inProgress || 0);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    toast.success('Sesión cerrada');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-secondary/5">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-background/95 backdrop-blur border-b">
        <div className="flex items-center justify-between p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
              <Shirt className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h1 className="font-bold text-lg">LaundryFlow</h1>
              <p className="text-xs text-muted-foreground">
                {customerData?.name || 'Cliente'}
              </p>
            </div>
          </div>
          <Button variant="ghost" size="icon" onClick={handleLogout}>
            <LogOut className="w-5 h-5" />
          </Button>
        </div>
      </header>

      {/* Quick Stats */}
      <div className="p-4 grid grid-cols-2 gap-3">
        <Card className="bg-gradient-to-br from-orange-500/10 to-orange-600/5 border-orange-200/50">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 bg-orange-500/20 rounded-full flex items-center justify-center">
              <Clock className="w-5 h-5 text-orange-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">{pendingOrders}</p>
              <p className="text-xs text-muted-foreground">Pendientes</p>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-blue-500/10 to-blue-600/5 border-blue-200/50">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-500/20 rounded-full flex items-center justify-center">
              <Truck className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">{inProgressOrders}</p>
              <p className="text-xs text-muted-foreground">En Proceso</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* New Pickup Button */}
      <div className="px-4 pb-4">
        <Button 
          className="w-full h-14 text-lg gap-2" 
          onClick={() => setShowNewPickup(true)}
        >
          <Plus className="w-5 h-5" />
          Solicitar Recogida
        </Button>
      </div>

      {/* Main Content */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1">
        <div className="px-4">
          <TabsList className="w-full grid grid-cols-3">
            <TabsTrigger value="orders" className="gap-2">
              <Package className="w-4 h-4" />
              <span className="hidden sm:inline">Pedidos</span>
            </TabsTrigger>
            <TabsTrigger value="addresses" className="gap-2">
              <MapPin className="w-4 h-4" />
              <span className="hidden sm:inline">Direcciones</span>
            </TabsTrigger>
            <TabsTrigger value="profile" className="gap-2">
              <User className="w-4 h-4" />
              <span className="hidden sm:inline">Perfil</span>
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="orders" className="p-4 space-y-4">
          <CustomerOrders customerId={customerData?.id} />
        </TabsContent>

        <TabsContent value="addresses" className="p-4">
          <CustomerAddresses userId={session.user.id} />
        </TabsContent>

        <TabsContent value="profile" className="p-4">
          <CustomerProfile 
            session={session} 
            customerData={customerData}
            onUpdate={fetchCustomerData}
          />
        </TabsContent>
      </Tabs>

      {/* New Pickup Modal */}
      {showNewPickup && (
        <NewPickupRequest 
          customerId={customerData?.id}
          userId={session.user.id}
          onClose={() => {
            setShowNewPickup(false);
            fetchOrderCounts();
          }}
        />
      )}
    </div>
  );
}

// Customer Addresses Component
function CustomerAddresses({ userId }: { userId: string }) {
  const [addresses, setAddresses] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newAddress, setNewAddress] = useState({
    label: 'Casa',
    address: '',
    delivery_instructions: '',
  });

  useEffect(() => {
    fetchAddresses();
  }, [userId]);

  const fetchAddresses = async () => {
    const { data } = await supabase
      .from('customer_addresses')
      .select('*')
      .eq('customer_id', userId)
      .order('is_default', { ascending: false });
    
    setAddresses(data || []);
    setIsLoading(false);
  };

  const handleAddAddress = async () => {
    if (!newAddress.address.trim()) {
      toast.error('Ingresa una dirección');
      return;
    }

    const { error } = await supabase
      .from('customer_addresses')
      .insert({
        customer_id: userId,
        label: newAddress.label,
        address: newAddress.address,
        delivery_instructions: newAddress.delivery_instructions,
        is_default: addresses.length === 0,
      });

    if (error) {
      toast.error('Error al guardar dirección');
      return;
    }

    toast.success('Dirección guardada');
    setShowAddForm(false);
    setNewAddress({ label: 'Casa', address: '', delivery_instructions: '' });
    fetchAddresses();
  };

  const handleSetDefault = async (id: string) => {
    // Remove default from all
    await supabase
      .from('customer_addresses')
      .update({ is_default: false })
      .eq('customer_id', userId);
    
    // Set new default
    await supabase
      .from('customer_addresses')
      .update({ is_default: true })
      .eq('id', id);

    toast.success('Dirección predeterminada actualizada');
    fetchAddresses();
  };

  const handleDelete = async (id: string) => {
    await supabase
      .from('customer_addresses')
      .delete()
      .eq('id', id);

    toast.success('Dirección eliminada');
    fetchAddresses();
  };

  if (isLoading) {
    return <div className="flex justify-center p-8"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div></div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Mis Direcciones</h2>
        <Button size="sm" onClick={() => setShowAddForm(!showAddForm)}>
          <Plus className="w-4 h-4 mr-1" />
          Agregar
        </Button>
      </div>

      {showAddForm && (
        <Card>
          <CardContent className="p-4 space-y-4">
            <div className="grid grid-cols-2 gap-2">
              {['Casa', 'Trabajo', 'Otro'].map(label => (
                <Button
                  key={label}
                  variant={newAddress.label === label ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setNewAddress({ ...newAddress, label })}
                >
                  {label}
                </Button>
              ))}
            </div>
            <input
              type="text"
              placeholder="Dirección completa"
              value={newAddress.address}
              onChange={(e) => setNewAddress({ ...newAddress, address: e.target.value })}
              className="w-full p-3 border rounded-lg"
            />
            <input
              type="text"
              placeholder="Instrucciones de entrega (opcional)"
              value={newAddress.delivery_instructions}
              onChange={(e) => setNewAddress({ ...newAddress, delivery_instructions: e.target.value })}
              className="w-full p-3 border rounded-lg"
            />
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setShowAddForm(false)} className="flex-1">
                Cancelar
              </Button>
              <Button onClick={handleAddAddress} className="flex-1">
                Guardar
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {addresses.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center text-muted-foreground">
            <MapPin className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p>No tienes direcciones guardadas</p>
            <p className="text-sm">Agrega una dirección para solicitar recogidas</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {addresses.map(addr => (
            <Card key={addr.id} className={addr.is_default ? 'border-primary' : ''}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <Home className="w-4 h-4 text-muted-foreground" />
                      <span className="font-medium">{addr.label}</span>
                      {addr.is_default && (
                        <Badge variant="secondary" className="text-xs">Predeterminada</Badge>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground">{addr.address}</p>
                    {addr.delivery_instructions && (
                      <p className="text-xs text-muted-foreground mt-1">
                        📝 {addr.delivery_instructions}
                      </p>
                    )}
                  </div>
                </div>
                <div className="flex gap-2 mt-3">
                  {!addr.is_default && (
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => handleSetDefault(addr.id)}
                    >
                      Predeterminada
                    </Button>
                  )}
                  <Button 
                    variant="ghost" 
                    size="sm"
                    className="text-destructive"
                    onClick={() => handleDelete(addr.id)}
                  >
                    Eliminar
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
