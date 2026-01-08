import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Receipt,
  Plus,
  Eye,
  CheckCircle,
  Clock,
  Banknote,
  XCircle,
  Loader2,
  Calendar,
  TrendingUp,
  TrendingDown,
} from 'lucide-react';
import { toast } from 'sonner';
import { format, startOfMonth, endOfMonth, subMonths } from 'date-fns';
import { es } from 'date-fns/locale';
import type { Employee } from './EmployeeList';

interface PayrollRecord {
  id: string;
  user_id: string;
  period_start: string;
  period_end: string;
  base_amount: number;
  bonuses: number;
  deductions: number;
  overtime_hours: number;
  overtime_amount: number;
  total_amount: number;
  status: 'pending' | 'approved' | 'paid' | 'cancelled';
  payment_date?: string;
  payment_method?: string;
  notes?: string;
  created_at: string;
}

interface PayrollManagementProps {
  employees: Employee[];
}

const STATUS_CONFIG = {
  pending: { label: 'Pendiente', color: 'bg-yellow-100 text-yellow-700', icon: Clock },
  approved: { label: 'Aprobado', color: 'bg-blue-100 text-blue-700', icon: CheckCircle },
  paid: { label: 'Pagado', color: 'bg-green-100 text-green-700', icon: Banknote },
  cancelled: { label: 'Cancelado', color: 'bg-red-100 text-red-700', icon: XCircle },
};

export function PayrollManagement({ employees }: PayrollManagementProps) {
  const [payrolls, setPayrolls] = useState<PayrollRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState<string>('');
  const [isViewOpen, setIsViewOpen] = useState(false);
  const [viewingPayroll, setViewingPayroll] = useState<PayrollRecord | null>(null);
  
  const [formData, setFormData] = useState({
    period_start: format(startOfMonth(new Date()), 'yyyy-MM-dd'),
    period_end: format(endOfMonth(new Date()), 'yyyy-MM-dd'),
    base_amount: '',
    bonuses: '0',
    deductions: '0',
    overtime_hours: '0',
    overtime_amount: '0',
    notes: '',
  });
  const [isSaving, setIsSaving] = useState(false);
  const [filterMonth, setFilterMonth] = useState(format(new Date(), 'yyyy-MM'));

  const fetchPayrolls = async () => {
    try {
      setIsLoading(true);
      const startDate = startOfMonth(new Date(filterMonth + '-01'));
      const endDate = endOfMonth(startDate);
      
      const { data, error } = await supabase
        .from('payroll_records')
        .select('*')
        .gte('period_start', format(startDate, 'yyyy-MM-dd'))
        .lte('period_end', format(endDate, 'yyyy-MM-dd'))
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      setPayrolls((data || []) as PayrollRecord[]);
    } catch (error) {
      console.error('Error fetching payrolls:', error);
      toast.error('Error al cargar nóminas');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchPayrolls();
  }, [filterMonth]);

  const handleOpenDialog = () => {
    setSelectedEmployee('');
    setFormData({
      period_start: format(startOfMonth(new Date()), 'yyyy-MM-dd'),
      period_end: format(endOfMonth(new Date()), 'yyyy-MM-dd'),
      base_amount: '',
      bonuses: '0',
      deductions: '0',
      overtime_hours: '0',
      overtime_amount: '0',
      notes: '',
    });
    setIsDialogOpen(true);
  };

  const calculateTotal = () => {
    const base = parseFloat(formData.base_amount) || 0;
    const bonuses = parseFloat(formData.bonuses) || 0;
    const deductions = parseFloat(formData.deductions) || 0;
    const overtime = parseFloat(formData.overtime_amount) || 0;
    return base + bonuses + overtime - deductions;
  };

  const handleSave = async () => {
    if (!selectedEmployee || !formData.base_amount) {
      toast.error('Selecciona un empleado y configura el monto base');
      return;
    }
    
    setIsSaving(true);
    
    try {
      const { error } = await supabase
        .from('payroll_records')
        .insert({
          user_id: selectedEmployee,
          period_start: formData.period_start,
          period_end: formData.period_end,
          base_amount: parseFloat(formData.base_amount),
          bonuses: parseFloat(formData.bonuses) || 0,
          deductions: parseFloat(formData.deductions) || 0,
          overtime_hours: parseFloat(formData.overtime_hours) || 0,
          overtime_amount: parseFloat(formData.overtime_amount) || 0,
          total_amount: calculateTotal(),
          notes: formData.notes || null,
        });
      
      if (error) throw error;
      
      toast.success('Nómina creada correctamente');
      setIsDialogOpen(false);
      fetchPayrolls();
    } catch (error) {
      console.error('Error saving payroll:', error);
      toast.error('Error al guardar nómina');
    } finally {
      setIsSaving(false);
    }
  };

  const handleUpdateStatus = async (payrollId: string, newStatus: PayrollRecord['status']) => {
    try {
      const updateData: Record<string, unknown> = { status: newStatus };
      
      if (newStatus === 'approved') {
        updateData.approved_at = new Date().toISOString();
      } else if (newStatus === 'paid') {
        updateData.payment_date = format(new Date(), 'yyyy-MM-dd');
      }
      
      const { error } = await supabase
        .from('payroll_records')
        .update(updateData)
        .eq('id', payrollId);
      
      if (error) throw error;
      
      toast.success(`Nómina ${STATUS_CONFIG[newStatus].label.toLowerCase()}`);
      fetchPayrolls();
      setIsViewOpen(false);
    } catch (error) {
      console.error('Error updating payroll:', error);
      toast.error('Error al actualizar nómina');
    }
  };

  const handleViewPayroll = (payroll: PayrollRecord) => {
    setViewingPayroll(payroll);
    setIsViewOpen(true);
  };

  const getEmployeeName = (userId: string) => {
    const emp = employees.find(e => e.id === userId);
    return emp?.name || 'Desconocido';
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency: 'MXN',
    }).format(amount);
  };

  const totalPending = payrolls.filter(p => p.status === 'pending').reduce((sum, p) => sum + p.total_amount, 0);
  const totalPaid = payrolls.filter(p => p.status === 'paid').reduce((sum, p) => sum + p.total_amount, 0);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Receipt className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total nóminas</p>
                <p className="text-2xl font-bold">{payrolls.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-yellow-100 rounded-lg">
                <Clock className="w-5 h-5 text-yellow-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Pendiente por pagar</p>
                <p className="text-2xl font-bold">{formatCurrency(totalPending)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 rounded-lg">
                <Banknote className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Pagado este mes</p>
                <p className="text-2xl font-bold">{formatCurrency(totalPaid)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Input
            type="month"
            value={filterMonth}
            onChange={(e) => setFilterMonth(e.target.value)}
            className="w-[180px]"
          />
        </div>
        <Button onClick={handleOpenDialog}>
          <Plus className="w-4 h-4 mr-2" />
          Nueva Nómina
        </Button>
      </div>

      {/* Payrolls Table */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Empleado</TableHead>
                  <TableHead>Período</TableHead>
                  <TableHead>Base</TableHead>
                  <TableHead>Bonos</TableHead>
                  <TableHead>Deducciones</TableHead>
                  <TableHead>Total</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {payrolls.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                      No hay nóminas para este período
                    </TableCell>
                  </TableRow>
                ) : (
                  payrolls.map((payroll) => {
                    const statusConfig = STATUS_CONFIG[payroll.status];
                    const StatusIcon = statusConfig.icon;
                    
                    return (
                      <TableRow key={payroll.id}>
                        <TableCell className="font-medium">
                          {getEmployeeName(payroll.user_id)}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1 text-sm">
                            <Calendar className="w-3 h-3" />
                            {format(new Date(payroll.period_start), 'dd MMM', { locale: es })} - {format(new Date(payroll.period_end), 'dd MMM', { locale: es })}
                          </div>
                        </TableCell>
                        <TableCell>{formatCurrency(payroll.base_amount)}</TableCell>
                        <TableCell>
                          {payroll.bonuses > 0 && (
                            <span className="text-green-600 flex items-center gap-1">
                              <TrendingUp className="w-3 h-3" />
                              +{formatCurrency(payroll.bonuses)}
                            </span>
                          )}
                        </TableCell>
                        <TableCell>
                          {payroll.deductions > 0 && (
                            <span className="text-red-600 flex items-center gap-1">
                              <TrendingDown className="w-3 h-3" />
                              -{formatCurrency(payroll.deductions)}
                            </span>
                          )}
                        </TableCell>
                        <TableCell className="font-bold">
                          {formatCurrency(payroll.total_amount)}
                        </TableCell>
                        <TableCell>
                          <Badge className={statusConfig.color}>
                            <StatusIcon className="w-3 h-3 mr-1" />
                            {statusConfig.label}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleViewPayroll(payroll)}
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

      {/* Create Payroll Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Nueva Nómina</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Empleado *</Label>
              <Select value={selectedEmployee} onValueChange={setSelectedEmployee}>
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar empleado" />
                </SelectTrigger>
                <SelectContent>
                  {employees.filter(e => e.is_active).map((emp) => (
                    <SelectItem key={emp.id} value={emp.id}>
                      {emp.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Inicio período</Label>
                <Input
                  type="date"
                  value={formData.period_start}
                  onChange={(e) => setFormData(prev => ({ ...prev, period_start: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label>Fin período</Label>
                <Input
                  type="date"
                  value={formData.period_end}
                  onChange={(e) => setFormData(prev => ({ ...prev, period_end: e.target.value }))}
                />
              </div>
            </div>
            
            <div className="space-y-2">
              <Label>Monto base *</Label>
              <Input
                type="number"
                value={formData.base_amount}
                onChange={(e) => setFormData(prev => ({ ...prev, base_amount: e.target.value }))}
                placeholder="0.00"
              />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Bonificaciones</Label>
                <Input
                  type="number"
                  value={formData.bonuses}
                  onChange={(e) => setFormData(prev => ({ ...prev, bonuses: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label>Deducciones</Label>
                <Input
                  type="number"
                  value={formData.deductions}
                  onChange={(e) => setFormData(prev => ({ ...prev, deductions: e.target.value }))}
                />
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Horas extra</Label>
                <Input
                  type="number"
                  value={formData.overtime_hours}
                  onChange={(e) => setFormData(prev => ({ ...prev, overtime_hours: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label>Monto horas extra</Label>
                <Input
                  type="number"
                  value={formData.overtime_amount}
                  onChange={(e) => setFormData(prev => ({ ...prev, overtime_amount: e.target.value }))}
                />
              </div>
            </div>
            
            <div className="space-y-2">
              <Label>Notas</Label>
              <Textarea
                value={formData.notes}
                onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                rows={2}
              />
            </div>
            
            <div className="p-4 bg-muted rounded-lg">
              <div className="flex items-center justify-between">
                <span className="font-medium">Total a pagar:</span>
                <span className="text-2xl font-bold text-green-600">
                  {formatCurrency(calculateTotal())}
                </span>
              </div>
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSave} disabled={isSaving}>
              {isSaving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Crear Nómina
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* View Payroll Dialog */}
      <Dialog open={isViewOpen} onOpenChange={setIsViewOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Detalle de Nómina</DialogTitle>
          </DialogHeader>
          
          {viewingPayroll && (
            <div className="space-y-4 py-4">
              <div className="p-3 bg-muted rounded-lg">
                <p className="font-medium">{getEmployeeName(viewingPayroll.user_id)}</p>
                <p className="text-sm text-muted-foreground">
                  {format(new Date(viewingPayroll.period_start), 'dd MMM yyyy', { locale: es })} - {format(new Date(viewingPayroll.period_end), 'dd MMM yyyy', { locale: es })}
                </p>
              </div>
              
              <div className="space-y-2">
                <div className="flex justify-between py-2 border-b">
                  <span>Salario base</span>
                  <span>{formatCurrency(viewingPayroll.base_amount)}</span>
                </div>
                {viewingPayroll.bonuses > 0 && (
                  <div className="flex justify-between py-2 border-b text-green-600">
                    <span>+ Bonificaciones</span>
                    <span>{formatCurrency(viewingPayroll.bonuses)}</span>
                  </div>
                )}
                {viewingPayroll.overtime_amount > 0 && (
                  <div className="flex justify-between py-2 border-b text-blue-600">
                    <span>+ Horas extra ({viewingPayroll.overtime_hours}h)</span>
                    <span>{formatCurrency(viewingPayroll.overtime_amount)}</span>
                  </div>
                )}
                {viewingPayroll.deductions > 0 && (
                  <div className="flex justify-between py-2 border-b text-red-600">
                    <span>- Deducciones</span>
                    <span>{formatCurrency(viewingPayroll.deductions)}</span>
                  </div>
                )}
                <div className="flex justify-between py-3 font-bold text-lg">
                  <span>Total</span>
                  <span className="text-green-600">{formatCurrency(viewingPayroll.total_amount)}</span>
                </div>
              </div>
              
              {viewingPayroll.notes && (
                <div className="p-3 bg-muted rounded-lg">
                  <p className="text-sm text-muted-foreground">{viewingPayroll.notes}</p>
                </div>
              )}
              
              <div className="flex gap-2 pt-4">
                {viewingPayroll.status === 'pending' && (
                  <>
                    <Button
                      className="flex-1"
                      onClick={() => handleUpdateStatus(viewingPayroll.id, 'approved')}
                    >
                      <CheckCircle className="w-4 h-4 mr-2" />
                      Aprobar
                    </Button>
                    <Button
                      variant="destructive"
                      onClick={() => handleUpdateStatus(viewingPayroll.id, 'cancelled')}
                    >
                      <XCircle className="w-4 h-4" />
                    </Button>
                  </>
                )}
                {viewingPayroll.status === 'approved' && (
                  <Button
                    className="flex-1"
                    onClick={() => handleUpdateStatus(viewingPayroll.id, 'paid')}
                  >
                    <Banknote className="w-4 h-4 mr-2" />
                    Marcar como Pagado
                  </Button>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
