import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useConfig } from '@/contexts/ConfigContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
  HandCoins,
  Plus,
  Loader2,
  DollarSign,
  CheckCircle,
  XCircle,
  Clock,
  Eye,
} from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import type { Employee } from './EmployeeList';

interface Loan {
  id: string;
  employee_id: string;
  amount: number;
  remaining_amount: number;
  reason: string | null;
  status: 'active' | 'paid' | 'cancelled';
  deduction_frequency: 'monthly' | 'weekly' | null;
  monthly_deduction: number | null;
  weekly_deduction: number | null;
  created_at: string;
  created_by: string | null;
}

interface LoanPayment {
  id: string;
  loan_id: string;
  payroll_id: string | null;
  amount: number;
  payment_date: string;
  notes: string | null;
  created_at: string;
}

interface LoanManagementProps {
  employees: Employee[];
}

const STATUS_CONFIG = {
  active: { label: 'Activo', color: 'bg-blue-100 text-blue-700', icon: Clock },
  paid: { label: 'Pagado', color: 'bg-green-100 text-green-700', icon: CheckCircle },
  cancelled: { label: 'Cancelado', color: 'bg-red-100 text-red-700', icon: XCircle },
};

export function LoanManagement({ employees }: LoanManagementProps) {
  const { user } = useAuth();
  const { business } = useConfig();
  const [loans, setLoans] = useState<Loan[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isDetailDialogOpen, setIsDetailDialogOpen] = useState(false);
  const [selectedLoan, setSelectedLoan] = useState<Loan | null>(null);
  const [loanPayments, setLoanPayments] = useState<LoanPayment[]>([]);
  const [loadingPayments, setLoadingPayments] = useState(false);
  const [saving, setSaving] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentNotes, setPaymentNotes] = useState('');

  const [formData, setFormData] = useState({
    employee_id: '',
    amount: '',
    reason: '',
    monthly_deduction: '',
    weekly_deduction: '',
    deduction_frequency: 'monthly' as 'monthly' | 'weekly',
  });

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-DO', {
      style: 'currency',
      currency: business.currency,
    }).format(amount);
  };

  const fetchLoans = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('employee_loans')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setLoans((data || []) as Loan[]);
    } catch (error) {
      console.error('Error fetching loans:', error);
      toast.error('Error al cargar préstamos');
    } finally {
      setLoading(false);
    }
  };

  const fetchLoanPayments = async (loanId: string) => {
    try {
      setLoadingPayments(true);
      const { data, error } = await supabase
        .from('loan_payments')
        .select('*')
        .eq('loan_id', loanId)
        .order('payment_date', { ascending: false });

      if (error) throw error;
      setLoanPayments((data || []) as LoanPayment[]);
    } catch (error) {
      console.error('Error fetching loan payments:', error);
      toast.error('Error al cargar pagos');
    } finally {
      setLoadingPayments(false);
    }
  };

  useEffect(() => {
    fetchLoans();
  }, []);

  const handleOpenDialog = () => {
    setFormData({
      employee_id: '',
      amount: '',
      reason: '',
      monthly_deduction: '',
      weekly_deduction: '',
      deduction_frequency: 'monthly',
    });
    setIsDialogOpen(true);
  };

  const handleSave = async () => {
    if (!formData.employee_id || !formData.amount) {
      toast.error('Selecciona un empleado y monto');
      return;
    }

    const amount = parseFloat(formData.amount);
    if (isNaN(amount) || amount <= 0) {
      toast.error('El monto debe ser mayor a 0');
      return;
    }

    try {
      setSaving(true);

      const { error } = await supabase.from('employee_loans').insert({
        employee_id: formData.employee_id,
        amount,
        remaining_amount: amount,
        reason: formData.reason || null,
        deduction_frequency: formData.deduction_frequency,
        monthly_deduction: formData.deduction_frequency === 'monthly' && formData.monthly_deduction 
          ? parseFloat(formData.monthly_deduction) 
          : null,
        weekly_deduction: formData.deduction_frequency === 'weekly' && formData.weekly_deduction 
          ? parseFloat(formData.weekly_deduction) 
          : null,
        created_by: user?.id,
      });

      if (error) throw error;

      toast.success('Préstamo registrado correctamente');
      setIsDialogOpen(false);
      fetchLoans();
    } catch (error) {
      console.error('Error saving loan:', error);
      toast.error('Error al guardar préstamo');
    } finally {
      setSaving(false);
    }
  };

  const handleViewDetails = (loan: Loan) => {
    setSelectedLoan(loan);
    setPaymentAmount('');
    setPaymentNotes('');
    fetchLoanPayments(loan.id);
    setIsDetailDialogOpen(true);
  };

  const handleAddPayment = async () => {
    if (!selectedLoan || !paymentAmount) {
      toast.error('Ingresa un monto');
      return;
    }

    const amount = parseFloat(paymentAmount);
    if (isNaN(amount) || amount <= 0) {
      toast.error('El monto debe ser mayor a 0');
      return;
    }

    if (amount > selectedLoan.remaining_amount) {
      toast.error('El pago excede el saldo pendiente');
      return;
    }

    try {
      setSaving(true);

      // Add payment record
      const { error: paymentError } = await supabase.from('loan_payments').insert({
        loan_id: selectedLoan.id,
        amount,
        notes: paymentNotes || null,
      });

      if (paymentError) throw paymentError;

      // Update loan remaining amount
      const newRemaining = selectedLoan.remaining_amount - amount;
      const newStatus = newRemaining <= 0 ? 'paid' : 'active';

      const { error: loanError } = await supabase
        .from('employee_loans')
        .update({
          remaining_amount: newRemaining,
          status: newStatus,
        })
        .eq('id', selectedLoan.id);

      if (loanError) throw loanError;

      toast.success('Pago registrado correctamente');
      setPaymentAmount('');
      setPaymentNotes('');
      fetchLoans();
      fetchLoanPayments(selectedLoan.id);
      
      // Update selected loan state
      setSelectedLoan({
        ...selectedLoan,
        remaining_amount: newRemaining,
        status: newStatus as 'active' | 'paid' | 'cancelled',
      });
    } catch (error) {
      console.error('Error adding payment:', error);
      toast.error('Error al registrar pago');
    } finally {
      setSaving(false);
    }
  };

  const handleCancelLoan = async () => {
    if (!selectedLoan) return;

    try {
      setSaving(true);

      const { error } = await supabase
        .from('employee_loans')
        .update({ status: 'cancelled' })
        .eq('id', selectedLoan.id);

      if (error) throw error;

      toast.success('Préstamo cancelado');
      setIsDetailDialogOpen(false);
      fetchLoans();
    } catch (error) {
      console.error('Error cancelling loan:', error);
      toast.error('Error al cancelar préstamo');
    } finally {
      setSaving(false);
    }
  };

  const getEmployeeName = (employeeId: string) => {
    return employees.find(e => e.id === employeeId)?.name || 'Desconocido';
  };

  // Stats
  const stats = {
    total: loans.filter(l => l.status === 'active').reduce((sum, l) => sum + l.remaining_amount, 0),
    activeCount: loans.filter(l => l.status === 'active').length,
    paidCount: loans.filter(l => l.status === 'paid').length,
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900/30">
                <HandCoins className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Pendiente</p>
                <p className="text-xl font-bold">{formatCurrency(stats.total)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-amber-100 dark:bg-amber-900/30">
                <Clock className="w-5 h-5 text-amber-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Préstamos Activos</p>
                <p className="text-xl font-bold">{stats.activeCount}</p>
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
                <p className="text-sm text-muted-foreground">Préstamos Pagados</p>
                <p className="text-xl font-bold">{stats.paidCount}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Card */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <HandCoins className="w-5 h-5" />
            Préstamos y Adelantos
          </CardTitle>
          <Button onClick={handleOpenDialog} className="gap-2">
            <Plus className="w-4 h-4" />
            Nuevo Préstamo
          </Button>
        </CardHeader>
        <CardContent>
          {loans.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <HandCoins className="w-12 h-12 mx-auto mb-2 opacity-50" />
              <p>No hay préstamos registrados</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Empleado</TableHead>
                    <TableHead>Monto Original</TableHead>
                    <TableHead>Saldo Pendiente</TableHead>
                    <TableHead>Motivo</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead>Fecha</TableHead>
                    <TableHead className="text-right">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loans.map((loan) => {
                    const statusConfig = STATUS_CONFIG[loan.status];
                    const StatusIcon = statusConfig.icon;
                    return (
                      <TableRow key={loan.id}>
                        <TableCell className="font-medium">
                          {getEmployeeName(loan.employee_id)}
                        </TableCell>
                        <TableCell>{formatCurrency(loan.amount)}</TableCell>
                        <TableCell className="font-semibold">
                          {formatCurrency(loan.remaining_amount)}
                        </TableCell>
                        <TableCell className="max-w-[200px] truncate">
                          {loan.reason || '-'}
                        </TableCell>
                        <TableCell>
                          <Badge className={statusConfig.color}>
                            <StatusIcon className="w-3 h-3 mr-1" />
                            {statusConfig.label}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {format(new Date(loan.created_at), 'dd MMM yyyy', { locale: es })}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleViewDetails(loan)}
                          >
                            <Eye className="w-4 h-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* New Loan Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nuevo Préstamo / Adelanto</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Empleado *</Label>
              <Select
                value={formData.employee_id}
                onValueChange={(value) => setFormData({ ...formData, employee_id: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar empleado" />
                </SelectTrigger>
                <SelectContent>
                  {employees.map((emp) => (
                    <SelectItem key={emp.id} value={emp.id}>
                      {emp.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Monto *</Label>
              <div className="relative">
                <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="0.00"
                  className="pl-9"
                  value={formData.amount}
                  onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Frecuencia de Descuento</Label>
              <Select
                value={formData.deduction_frequency}
                onValueChange={(value: 'monthly' | 'weekly') => setFormData({ ...formData, deduction_frequency: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="monthly">Mensual (por nómina)</SelectItem>
                  <SelectItem value="weekly">Semanal</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {formData.deduction_frequency === 'monthly' ? (
              <div className="space-y-2">
                <Label>Descuento Mensual</Label>
                <div className="relative">
                  <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="Monto a descontar por nómina"
                    className="pl-9"
                    value={formData.monthly_deduction}
                    onChange={(e) => setFormData({ ...formData, monthly_deduction: e.target.value })}
                  />
                </div>
              </div>
            ) : (
              <div className="space-y-2">
                <Label>Descuento Semanal</Label>
                <div className="relative">
                  <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="Monto a descontar semanalmente"
                    className="pl-9"
                    value={formData.weekly_deduction}
                    onChange={(e) => setFormData({ ...formData, weekly_deduction: e.target.value })}
                  />
                </div>
              </div>
            )}

            <div className="space-y-2">
              <Label>Motivo</Label>
              <Textarea
                placeholder="Razón del préstamo..."
                value={formData.reason}
                onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Guardar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Loan Detail Dialog */}
      <Dialog open={isDetailDialogOpen} onOpenChange={setIsDetailDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Detalle del Préstamo</DialogTitle>
          </DialogHeader>
          {selectedLoan && (
            <div className="space-y-6 py-4">
              {/* Loan Info */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Empleado</p>
                  <p className="font-medium">{getEmployeeName(selectedLoan.employee_id)}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Estado</p>
                  <Badge className={STATUS_CONFIG[selectedLoan.status].color}>
                    {STATUS_CONFIG[selectedLoan.status].label}
                  </Badge>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Monto Original</p>
                  <p className="font-medium">{formatCurrency(selectedLoan.amount)}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Saldo Pendiente</p>
                  <p className="font-bold text-lg">{formatCurrency(selectedLoan.remaining_amount)}</p>
                </div>
                {(selectedLoan.monthly_deduction || selectedLoan.weekly_deduction) && (
                  <div>
                    <p className="text-sm text-muted-foreground">
                      Descuento {selectedLoan.weekly_deduction ? 'Semanal' : 'Mensual'}
                    </p>
                    <p className="font-medium">
                      {formatCurrency(selectedLoan.weekly_deduction || selectedLoan.monthly_deduction || 0)}
                    </p>
                  </div>
                )}
                {selectedLoan.reason && (
                  <div className="col-span-2">
                    <p className="text-sm text-muted-foreground">Motivo</p>
                    <p>{selectedLoan.reason}</p>
                  </div>
                )}
              </div>

              {/* Add Payment (only for active loans) */}
              {selectedLoan.status === 'active' && (
                <Card>
                  <CardContent className="p-4">
                    <h4 className="font-medium mb-3">Registrar Pago</h4>
                    <div className="flex gap-3">
                      <div className="flex-1">
                        <Input
                          type="number"
                          step="0.01"
                          min="0"
                          placeholder="Monto"
                          value={paymentAmount}
                          onChange={(e) => setPaymentAmount(e.target.value)}
                        />
                      </div>
                      <div className="flex-1">
                        <Input
                          placeholder="Notas (opcional)"
                          value={paymentNotes}
                          onChange={(e) => setPaymentNotes(e.target.value)}
                        />
                      </div>
                      <Button onClick={handleAddPayment} disabled={saving}>
                        {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                        Registrar
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Payment History */}
              <div>
                <h4 className="font-medium mb-3">Historial de Pagos</h4>
                {loadingPayments ? (
                  <div className="flex justify-center py-4">
                    <Loader2 className="w-6 h-6 animate-spin" />
                  </div>
                ) : loanPayments.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    No hay pagos registrados
                  </p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Fecha</TableHead>
                        <TableHead>Monto</TableHead>
                        <TableHead>Notas</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {loanPayments.map((payment) => (
                        <TableRow key={payment.id}>
                          <TableCell>
                            {format(new Date(payment.payment_date), 'dd MMM yyyy', { locale: es })}
                          </TableCell>
                          <TableCell className="font-medium">
                            {formatCurrency(payment.amount)}
                          </TableCell>
                          <TableCell>{payment.notes || '-'}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </div>
            </div>
          )}
          <DialogFooter>
            {selectedLoan?.status === 'active' && (
              <Button variant="destructive" onClick={handleCancelLoan} disabled={saving}>
                Cancelar Préstamo
              </Button>
            )}
            <Button variant="outline" onClick={() => setIsDetailDialogOpen(false)}>
              Cerrar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
