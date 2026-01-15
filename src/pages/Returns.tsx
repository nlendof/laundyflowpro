import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useConfig } from '@/contexts/ConfigContext';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  RotateCcw,
  Plus,
  Loader2,
  Search,
  DollarSign,
  CheckCircle,
  XCircle,
  Clock,
  Eye,
  RefreshCw,
  Package,
} from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

interface OrderReturn {
  id: string;
  order_id: string;
  reason: string;
  refund_amount: number;
  refund_method: string | null;
  status: 'pending' | 'approved' | 'rejected';
  notes: string | null;
  processed_by: string | null;
  processed_at: string | null;
  created_at: string;
  order?: {
    ticket_code: string;
    customer_name: string;
    total_amount: number;
  };
}

interface Order {
  id: string;
  ticket_code: string;
  customer_name: string;
  total_amount: number;
  is_paid: boolean;
  status: string;
}

const STATUS_CONFIG = {
  pending: { label: 'Pendiente', color: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400', icon: Clock },
  approved: { label: 'Aprobada', color: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400', icon: CheckCircle },
  rejected: { label: 'Rechazada', color: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400', icon: XCircle },
};

const REFUND_METHODS = [
  { value: 'cash', label: 'Efectivo' },
  { value: 'card', label: 'Tarjeta' },
  { value: 'transfer', label: 'Transferencia' },
  { value: 'credit', label: 'Crédito en cuenta' },
];

const RETURN_REASONS = [
  'Servicio insatisfactorio',
  'Daño a la prenda',
  'Pérdida de prenda',
  'Error en el pedido',
  'Retraso excesivo',
  'Otro',
];

export default function Returns() {
  const { user } = useAuth();
  const { business } = useConfig();
  const [returns, setReturns] = useState<OrderReturn[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Dialog states
  const [isNewReturnOpen, setIsNewReturnOpen] = useState(false);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [selectedReturn, setSelectedReturn] = useState<OrderReturn | null>(null);
  const [saving, setSaving] = useState(false);
  
  // Search order for new return
  const [orderSearch, setOrderSearch] = useState('');
  const [searchingOrder, setSearchingOrder] = useState(false);
  const [foundOrder, setFoundOrder] = useState<Order | null>(null);
  
  // Form data
  const [formData, setFormData] = useState({
    reason: '',
    refund_amount: '',
    notes: '',
  });

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-DO', {
      style: 'currency',
      currency: business.currency,
    }).format(amount);
  };

  const fetchReturns = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('order_returns')
        .select(`
          *,
          order:orders(ticket_code, customer_name, total_amount)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setReturns((data || []) as OrderReturn[]);
    } catch (error) {
      console.error('Error fetching returns:', error);
      toast.error('Error al cargar devoluciones');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReturns();
  }, []);

  const handleSearchOrder = async () => {
    if (!orderSearch.trim()) {
      toast.error('Ingresa un código de ticket');
      return;
    }

    setSearchingOrder(true);
    setFoundOrder(null);

    try {
      const { data, error } = await supabase
        .from('orders')
        .select('id, ticket_code, customer_name, total_amount, is_paid, status')
        .ilike('ticket_code', `%${orderSearch.trim()}%`)
        .limit(1)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          toast.error('Pedido no encontrado');
        } else {
          throw error;
        }
        return;
      }

      setFoundOrder(data as Order);
      setFormData(prev => ({ ...prev, refund_amount: data.total_amount.toString() }));
    } catch (error) {
      console.error('Error searching order:', error);
      toast.error('Error al buscar pedido');
    } finally {
      setSearchingOrder(false);
    }
  };

  const handleOpenNewReturn = () => {
    setOrderSearch('');
    setFoundOrder(null);
    setFormData({ reason: '', refund_amount: '', notes: '' });
    setIsNewReturnOpen(true);
  };

  const handleCreateReturn = async () => {
    if (!foundOrder) {
      toast.error('Busca y selecciona un pedido');
      return;
    }

    if (!formData.reason) {
      toast.error('Selecciona un motivo');
      return;
    }

    const refundAmount = parseFloat(formData.refund_amount);
    if (isNaN(refundAmount) || refundAmount <= 0) {
      toast.error('Ingresa un monto válido');
      return;
    }

    if (refundAmount > foundOrder.total_amount) {
      toast.error('El monto no puede exceder el total del pedido');
      return;
    }

    try {
      setSaving(true);

      const { error } = await supabase.from('order_returns').insert({
        order_id: foundOrder.id,
        reason: formData.reason,
        refund_amount: refundAmount,
        notes: formData.notes || null,
        status: 'pending',
      });

      if (error) throw error;

      toast.success('Devolución registrada correctamente');
      setIsNewReturnOpen(false);
      fetchReturns();
    } catch (error) {
      console.error('Error creating return:', error);
      toast.error('Error al crear devolución');
    } finally {
      setSaving(false);
    }
  };

  const handleViewDetail = (returnItem: OrderReturn) => {
    setSelectedReturn(returnItem);
    setIsDetailOpen(true);
  };

  const handleApprove = async (refundMethod: string) => {
    if (!selectedReturn) return;

    try {
      setSaving(true);

      const { error } = await supabase
        .from('order_returns')
        .update({
          status: 'approved',
          refund_method: refundMethod,
          processed_by: user?.id,
          processed_at: new Date().toISOString(),
        })
        .eq('id', selectedReturn.id);

      if (error) throw error;

      // Register the expense in cash register
      await supabase.from('cash_register').insert({
        amount: selectedReturn.refund_amount,
        category: 'devolucion',
        entry_type: 'expense',
        description: `Devolución - ${selectedReturn.order?.ticket_code || 'Pedido'}`,
        order_id: selectedReturn.order_id,
        created_by: user?.id,
      });

      toast.success('Devolución aprobada');
      setIsDetailOpen(false);
      fetchReturns();
    } catch (error) {
      console.error('Error approving return:', error);
      toast.error('Error al aprobar devolución');
    } finally {
      setSaving(false);
    }
  };

  const handleReject = async () => {
    if (!selectedReturn) return;

    try {
      setSaving(true);

      const { error } = await supabase
        .from('order_returns')
        .update({
          status: 'rejected',
          processed_by: user?.id,
          processed_at: new Date().toISOString(),
        })
        .eq('id', selectedReturn.id);

      if (error) throw error;

      toast.success('Devolución rechazada');
      setIsDetailOpen(false);
      fetchReturns();
    } catch (error) {
      console.error('Error rejecting return:', error);
      toast.error('Error al rechazar devolución');
    } finally {
      setSaving(false);
    }
  };

  const filteredReturns = returns.filter(r => {
    if (!searchQuery.trim()) return true;
    const query = searchQuery.toLowerCase();
    return (
      r.order?.ticket_code?.toLowerCase().includes(query) ||
      r.order?.customer_name?.toLowerCase().includes(query) ||
      r.reason?.toLowerCase().includes(query)
    );
  });

  // Stats
  const stats = {
    pending: returns.filter(r => r.status === 'pending').length,
    approved: returns.filter(r => r.status === 'approved').length,
    totalRefunded: returns
      .filter(r => r.status === 'approved')
      .reduce((sum, r) => sum + r.refund_amount, 0),
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen p-4 lg:p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold flex items-center gap-3">
            <RotateCcw className="w-8 h-8 text-primary" />
            Devoluciones
          </h1>
          <p className="text-muted-foreground">Gestiona las devoluciones y reembolsos</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={fetchReturns} className="gap-2">
            <RefreshCw className="w-4 h-4" />
            Actualizar
          </Button>
          <Button onClick={handleOpenNewReturn} className="gap-2">
            <Plus className="w-4 h-4" />
            Nueva Devolución
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-amber-100 dark:bg-amber-900/30">
                <Clock className="w-5 h-5 text-amber-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.pending}</p>
                <p className="text-sm text-muted-foreground">Pendientes</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-green-100 dark:bg-green-900/30">
                <CheckCircle className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.approved}</p>
                <p className="text-sm text-muted-foreground">Aprobadas</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-red-100 dark:bg-red-900/30">
                <DollarSign className="w-5 h-5 text-red-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{formatCurrency(stats.totalRefunded)}</p>
                <p className="text-sm text-muted-foreground">Total Reembolsado</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Table */}
      <Card>
        <CardHeader className="pb-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <CardTitle>Historial de Devoluciones</CardTitle>
              <CardDescription>
                {filteredReturns.length} de {returns.length} devoluciones
              </CardDescription>
            </div>
            <div className="relative max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por ticket, cliente..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Ticket</TableHead>
                  <TableHead>Cliente</TableHead>
                  <TableHead>Motivo</TableHead>
                  <TableHead>Monto</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead>Fecha</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredReturns.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-12">
                      <div className="flex flex-col items-center gap-2 text-muted-foreground">
                        <RotateCcw className="w-12 h-12 opacity-50" />
                        <p>No hay devoluciones registradas</p>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredReturns.map((returnItem) => {
                    const statusConfig = STATUS_CONFIG[returnItem.status];
                    const StatusIcon = statusConfig.icon;
                    return (
                      <TableRow key={returnItem.id}>
                        <TableCell>
                          <Badge variant="outline" className="font-mono">
                            {returnItem.order?.ticket_code || '-'}
                          </Badge>
                        </TableCell>
                        <TableCell className="font-medium">
                          {returnItem.order?.customer_name || '-'}
                        </TableCell>
                        <TableCell className="max-w-[150px] truncate">
                          {returnItem.reason}
                        </TableCell>
                        <TableCell className="font-semibold text-red-600">
                          -{formatCurrency(returnItem.refund_amount)}
                        </TableCell>
                        <TableCell>
                          <Badge className={statusConfig.color}>
                            <StatusIcon className="w-3 h-3 mr-1" />
                            {statusConfig.label}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {format(new Date(returnItem.created_at), 'dd MMM yyyy', { locale: es })}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleViewDetail(returnItem)}
                          >
                            <Eye className="w-4 h-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* New Return Dialog */}
      <Dialog open={isNewReturnOpen} onOpenChange={setIsNewReturnOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <RotateCcw className="w-5 h-5" />
              Nueva Devolución
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            {/* Search Order */}
            <div className="space-y-2">
              <Label>Buscar Pedido</Label>
              <div className="flex gap-2">
                <Input
                  placeholder="Código de ticket..."
                  value={orderSearch}
                  onChange={(e) => setOrderSearch(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSearchOrder()}
                />
                <Button onClick={handleSearchOrder} disabled={searchingOrder}>
                  {searchingOrder ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Search className="w-4 h-4" />
                  )}
                </Button>
              </div>
            </div>

            {/* Found Order Info */}
            {foundOrder && (
              <Card className="bg-muted/50">
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <Package className="w-8 h-8 text-primary" />
                    <div className="flex-1">
                      <p className="font-medium">{foundOrder.customer_name}</p>
                      <p className="text-sm text-muted-foreground">
                        {foundOrder.ticket_code} • {formatCurrency(foundOrder.total_amount)}
                      </p>
                    </div>
                    <Badge variant={foundOrder.is_paid ? 'default' : 'secondary'}>
                      {foundOrder.is_paid ? 'Pagado' : 'Pendiente'}
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Reason */}
            <div className="space-y-2">
              <Label>Motivo de Devolución *</Label>
              <Select
                value={formData.reason}
                onValueChange={(value) => setFormData({ ...formData, reason: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar motivo" />
                </SelectTrigger>
                <SelectContent>
                  {RETURN_REASONS.map((reason) => (
                    <SelectItem key={reason} value={reason}>
                      {reason}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Refund Amount */}
            <div className="space-y-2">
              <Label>Monto a Reembolsar *</Label>
              <div className="relative">
                <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  max={foundOrder?.total_amount}
                  placeholder="0.00"
                  className="pl-9"
                  value={formData.refund_amount}
                  onChange={(e) => setFormData({ ...formData, refund_amount: e.target.value })}
                />
              </div>
              {foundOrder && (
                <p className="text-xs text-muted-foreground">
                  Máximo: {formatCurrency(foundOrder.total_amount)}
                </p>
              )}
            </div>

            {/* Notes */}
            <div className="space-y-2">
              <Label>Notas (opcional)</Label>
              <Textarea
                placeholder="Detalles adicionales..."
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                rows={2}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsNewReturnOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleCreateReturn} disabled={saving || !foundOrder}>
              {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Crear Devolución
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Return Detail Dialog */}
      <Dialog open={isDetailOpen} onOpenChange={setIsDetailOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Detalle de Devolución</DialogTitle>
          </DialogHeader>
          
          {selectedReturn && (
            <div className="space-y-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Ticket</p>
                  <p className="font-medium">{selectedReturn.order?.ticket_code || '-'}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Cliente</p>
                  <p className="font-medium">{selectedReturn.order?.customer_name || '-'}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Monto Original</p>
                  <p className="font-medium">
                    {formatCurrency(selectedReturn.order?.total_amount || 0)}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Reembolso</p>
                  <p className="font-bold text-lg text-red-600">
                    -{formatCurrency(selectedReturn.refund_amount)}
                  </p>
                </div>
                <div className="col-span-2">
                  <p className="text-sm text-muted-foreground">Motivo</p>
                  <p>{selectedReturn.reason}</p>
                </div>
                {selectedReturn.notes && (
                  <div className="col-span-2">
                    <p className="text-sm text-muted-foreground">Notas</p>
                    <p className="text-sm">{selectedReturn.notes}</p>
                  </div>
                )}
                <div>
                  <p className="text-sm text-muted-foreground">Estado</p>
                  <Badge className={STATUS_CONFIG[selectedReturn.status].color}>
                    {STATUS_CONFIG[selectedReturn.status].label}
                  </Badge>
                </div>
                {selectedReturn.refund_method && (
                  <div>
                    <p className="text-sm text-muted-foreground">Método de Reembolso</p>
                    <p className="font-medium">
                      {REFUND_METHODS.find(m => m.value === selectedReturn.refund_method)?.label || selectedReturn.refund_method}
                    </p>
                  </div>
                )}
              </div>

              {/* Actions for pending returns */}
              {selectedReturn.status === 'pending' && (
                <Card className="bg-muted/50">
                  <CardContent className="p-4 space-y-3">
                    <p className="text-sm font-medium">Procesar Devolución</p>
                    <div className="flex flex-wrap gap-2">
                      {REFUND_METHODS.map((method) => (
                        <Button
                          key={method.value}
                          size="sm"
                          variant="outline"
                          onClick={() => handleApprove(method.value)}
                          disabled={saving}
                          className="gap-1"
                        >
                          <CheckCircle className="w-3 h-3" />
                          {method.label}
                        </Button>
                      ))}
                    </div>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={handleReject}
                      disabled={saving}
                      className="w-full gap-2"
                    >
                      <XCircle className="w-4 h-4" />
                      Rechazar Devolución
                    </Button>
                  </CardContent>
                </Card>
              )}
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDetailOpen(false)}>
              Cerrar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
