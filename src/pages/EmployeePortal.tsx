import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
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
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
  User,
  CalendarDays,
  Receipt,
  Clock,
  FileText,
  Calendar as CalendarIcon,
  Loader2,
  Plus,
  Download,
  CheckCircle,
  XCircle,
  Clock4,
  Phone,
  Mail,
  Briefcase,
  Lock,
  Eye,
  EyeOff,
} from 'lucide-react';
import { toast } from 'sonner';
import { format, differenceInDays } from 'date-fns';
import { es } from 'date-fns/locale';
import { cn } from '@/lib/utils';

interface TimeOffRequest {
  id: string;
  request_type: string;
  start_date: string;
  end_date: string;
  reason: string | null;
  status: string;
  response_notes: string | null;
  created_at: string;
}

interface PayrollRecord {
  id: string;
  period_start: string;
  period_end: string;
  base_amount: number;
  bonuses: number;
  deductions: number;
  overtime_amount: number;
  total_amount: number;
  status: string;
  payment_date: string | null;
}

interface AttendanceRecord {
  id: string;
  date: string;
  check_in: string | null;
  check_out: string | null;
  status: string;
  notes: string | null;
}

const REQUEST_TYPE_CONFIG: Record<string, { label: string; icon: React.ElementType }> = {
  vacation: { label: 'Vacaciones', icon: CalendarDays },
  sick: { label: 'Enfermedad', icon: FileText },
  personal: { label: 'Personal', icon: User },
  other: { label: 'Otro', icon: FileText },
};

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: React.ElementType }> = {
  pending: { label: 'Pendiente', color: 'bg-yellow-100 text-yellow-700', icon: Clock4 },
  approved: { label: 'Aprobado', color: 'bg-green-100 text-green-700', icon: CheckCircle },
  rejected: { label: 'Rechazado', color: 'bg-red-100 text-red-700', icon: XCircle },
};

export default function EmployeePortal() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('profile');
  const [isLoading, setIsLoading] = useState(true);
  
  // Data
  const [timeOffRequests, setTimeOffRequests] = useState<TimeOffRequest[]>([]);
  const [payrollRecords, setPayrollRecords] = useState<PayrollRecord[]>([]);
  const [attendanceRecords, setAttendanceRecords] = useState<AttendanceRecord[]>([]);
  
  // Time off request modal
  const [isRequestModalOpen, setIsRequestModalOpen] = useState(false);
  const [requestForm, setRequestForm] = useState({
    request_type: 'vacation',
    start_date: undefined as Date | undefined,
    end_date: undefined as Date | undefined,
    reason: '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Password change modal
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
  const [passwordData, setPasswordData] = useState({ newPassword: '', confirmPassword: '' });
  const [showPassword, setShowPassword] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);

  const fetchData = async () => {
    if (!user?.id) return;
    
    setIsLoading(true);
    try {
      // Fetch time off requests
      const { data: timeOff, error: timeOffError } = await supabase
        .from('time_off_requests')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });
      
      if (timeOffError) throw timeOffError;
      setTimeOffRequests(timeOff || []);

      // Fetch payroll records
      const { data: payroll, error: payrollError } = await supabase
        .from('payroll_records')
        .select('*')
        .eq('user_id', user.id)
        .order('period_end', { ascending: false });
      
      if (payrollError) throw payrollError;
      setPayrollRecords(payroll || []);

      // Fetch attendance records (last 30 days)
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      
      const { data: attendance, error: attendanceError } = await supabase
        .from('attendance_records')
        .select('*')
        .eq('user_id', user.id)
        .gte('date', thirtyDaysAgo.toISOString().split('T')[0])
        .order('date', { ascending: false });
      
      if (attendanceError) throw attendanceError;
      setAttendanceRecords(attendance || []);
    } catch (error) {
      console.error('Error fetching employee data:', error);
      toast.error('Error al cargar datos');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [user?.id]);

  const handleSubmitTimeOff = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!requestForm.start_date || !requestForm.end_date) {
      toast.error('Selecciona las fechas');
      return;
    }

    if (requestForm.start_date > requestForm.end_date) {
      toast.error('La fecha de inicio debe ser anterior a la fecha de fin');
      return;
    }

    setIsSubmitting(true);

    try {
      const { error } = await supabase
        .from('time_off_requests')
        .insert({
          user_id: user?.id,
          request_type: requestForm.request_type,
          start_date: format(requestForm.start_date, 'yyyy-MM-dd'),
          end_date: format(requestForm.end_date, 'yyyy-MM-dd'),
          reason: requestForm.reason || null,
        });

      if (error) throw error;

      toast.success('Solicitud enviada');
      setIsRequestModalOpen(false);
      setRequestForm({
        request_type: 'vacation',
        start_date: undefined,
        end_date: undefined,
        reason: '',
      });
      fetchData();
    } catch (error) {
      console.error('Error submitting time off request:', error);
      toast.error('Error al enviar solicitud');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();

    if (passwordData.newPassword.length < 6) {
      toast.error('La contraseña debe tener al menos 6 caracteres');
      return;
    }

    if (passwordData.newPassword !== passwordData.confirmPassword) {
      toast.error('Las contraseñas no coinciden');
      return;
    }

    setIsChangingPassword(true);
    try {
      const { error } = await supabase.auth.updateUser({
        password: passwordData.newPassword,
      });

      if (error) throw error;

      toast.success('Contraseña actualizada');
      setIsPasswordModalOpen(false);
      setPasswordData({ newPassword: '', confirmPassword: '' });
    } catch (error) {
      console.error('Error changing password:', error);
      toast.error('Error al cambiar la contraseña');
    } finally {
      setIsChangingPassword(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency: 'MXN',
    }).format(amount);
  };

  if (isLoading) {
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
            <User className="w-8 h-8 text-primary" />
            Mi Portal
          </h1>
          <p className="text-muted-foreground">Gestiona tu información personal y solicitudes</p>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid w-full grid-cols-2 lg:grid-cols-4 h-auto">
          <TabsTrigger value="profile" className="gap-2 py-2">
            <User className="w-4 h-4" />
            <span className="hidden sm:inline">Mi Perfil</span>
          </TabsTrigger>
          <TabsTrigger value="timeoff" className="gap-2 py-2">
            <CalendarDays className="w-4 h-4" />
            <span className="hidden sm:inline">Permisos</span>
          </TabsTrigger>
          <TabsTrigger value="payroll" className="gap-2 py-2">
            <Receipt className="w-4 h-4" />
            <span className="hidden sm:inline">Nómina</span>
          </TabsTrigger>
          <TabsTrigger value="attendance" className="gap-2 py-2">
            <Clock className="w-4 h-4" />
            <span className="hidden sm:inline">Asistencia</span>
          </TabsTrigger>
        </TabsList>

        {/* Profile Tab */}
        <TabsContent value="profile">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Mi Perfil</CardTitle>
                <CardDescription>Tu información personal en el sistema</CardDescription>
              </div>
              <Button variant="outline" onClick={() => setIsPasswordModalOpen(true)} className="gap-2">
                <Lock className="w-4 h-4" />
                Cambiar Contraseña
              </Button>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col md:flex-row gap-6">
                <div className="flex flex-col items-center gap-4">
                  <Avatar className="w-24 h-24">
                    <AvatarImage src={user?.avatar} />
                    <AvatarFallback className="text-2xl">
                      {user?.name?.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)}
                    </AvatarFallback>
                  </Avatar>
                  <Badge variant="secondary" className="capitalize">
                    {user?.role}
                  </Badge>
                </div>
                
                <div className="flex-1 space-y-4">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-1">
                      <Label className="text-muted-foreground text-xs">Nombre</Label>
                      <p className="font-medium flex items-center gap-2">
                        <User className="w-4 h-4 text-muted-foreground" />
                        {user?.name}
                      </p>
                    </div>
                    <div className="space-y-1">
                      <Label className="text-muted-foreground text-xs">Correo</Label>
                      <p className="font-medium flex items-center gap-2">
                        <Mail className="w-4 h-4 text-muted-foreground" />
                        {user?.email}
                      </p>
                    </div>
                    <div className="space-y-1">
                      <Label className="text-muted-foreground text-xs">Teléfono</Label>
                      <p className="font-medium flex items-center gap-2">
                        <Phone className="w-4 h-4 text-muted-foreground" />
                        {user?.phone || 'No registrado'}
                      </p>
                    </div>
                    <div className="space-y-1">
                      <Label className="text-muted-foreground text-xs">Rol</Label>
                      <p className="font-medium flex items-center gap-2">
                        <Briefcase className="w-4 h-4 text-muted-foreground" />
                        {user?.role === 'owner' ? 'Propietario' :
                         user?.role === 'admin' ? 'Administrador' : 
                         user?.role === 'cajero' ? 'Cajero' :
                         user?.role === 'operador' ? 'Operador' : 
                         user?.role === 'delivery' ? 'Repartidor' : 'Cliente'}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Time Off Tab */}
        <TabsContent value="timeoff">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Solicitudes de Permisos</CardTitle>
                <CardDescription>Gestiona tus solicitudes de vacaciones y permisos</CardDescription>
              </div>
              <Button onClick={() => setIsRequestModalOpen(true)} className="gap-2">
                <Plus className="w-4 h-4" />
                Nueva Solicitud
              </Button>
            </CardHeader>
            <CardContent>
              {timeOffRequests.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <CalendarDays className="w-12 h-12 mx-auto mb-3 opacity-50" />
                  <p>No tienes solicitudes de permisos</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Tipo</TableHead>
                        <TableHead>Fechas</TableHead>
                        <TableHead>Días</TableHead>
                        <TableHead>Estado</TableHead>
                        <TableHead>Motivo</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {timeOffRequests.map((request) => {
                        const typeConfig = REQUEST_TYPE_CONFIG[request.request_type] || REQUEST_TYPE_CONFIG.other;
                        const statusConfig = STATUS_CONFIG[request.status] || STATUS_CONFIG.pending;
                        const TypeIcon = typeConfig.icon;
                        const StatusIcon = statusConfig.icon;
                        const days = differenceInDays(new Date(request.end_date), new Date(request.start_date)) + 1;
                        
                        return (
                          <TableRow key={request.id}>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <TypeIcon className="w-4 h-4 text-muted-foreground" />
                                {typeConfig.label}
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="text-sm">
                                {format(new Date(request.start_date), 'dd MMM', { locale: es })} - {format(new Date(request.end_date), 'dd MMM yyyy', { locale: es })}
                              </div>
                            </TableCell>
                            <TableCell>{days} día{days > 1 ? 's' : ''}</TableCell>
                            <TableCell>
                              <Badge className={cn('gap-1', statusConfig.color)}>
                                <StatusIcon className="w-3 h-3" />
                                {statusConfig.label}
                              </Badge>
                            </TableCell>
                            <TableCell className="max-w-[200px] truncate">
                              {request.reason || '—'}
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
        </TabsContent>

        {/* Payroll Tab */}
        <TabsContent value="payroll">
          <Card>
            <CardHeader>
              <CardTitle>Historial de Nómina</CardTitle>
              <CardDescription>Revisa tus recibos de pago</CardDescription>
            </CardHeader>
            <CardContent>
              {payrollRecords.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Receipt className="w-12 h-12 mx-auto mb-3 opacity-50" />
                  <p>No hay registros de nómina</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Período</TableHead>
                        <TableHead>Base</TableHead>
                        <TableHead>Bonos</TableHead>
                        <TableHead>Deducciones</TableHead>
                        <TableHead>Total</TableHead>
                        <TableHead>Estado</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {payrollRecords.map((record) => {
                        const statusConfig = {
                          pending: { label: 'Pendiente', color: 'bg-yellow-100 text-yellow-700' },
                          approved: { label: 'Aprobado', color: 'bg-blue-100 text-blue-700' },
                          paid: { label: 'Pagado', color: 'bg-green-100 text-green-700' },
                        }[record.status] || { label: record.status, color: 'bg-gray-100 text-gray-700' };
                        
                        return (
                          <TableRow key={record.id}>
                            <TableCell>
                              <div className="text-sm">
                                {format(new Date(record.period_start), 'dd MMM', { locale: es })} - {format(new Date(record.period_end), 'dd MMM yyyy', { locale: es })}
                              </div>
                            </TableCell>
                            <TableCell>{formatCurrency(record.base_amount)}</TableCell>
                            <TableCell className="text-green-600">+{formatCurrency(record.bonuses + record.overtime_amount)}</TableCell>
                            <TableCell className="text-red-600">-{formatCurrency(record.deductions)}</TableCell>
                            <TableCell className="font-bold">{formatCurrency(record.total_amount)}</TableCell>
                            <TableCell>
                              <Badge className={statusConfig.color}>
                                {statusConfig.label}
                              </Badge>
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
        </TabsContent>

        {/* Attendance Tab */}
        <TabsContent value="attendance">
          <Card>
            <CardHeader>
              <CardTitle>Mi Asistencia</CardTitle>
              <CardDescription>Últimos 30 días</CardDescription>
            </CardHeader>
            <CardContent>
              {attendanceRecords.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Clock className="w-12 h-12 mx-auto mb-3 opacity-50" />
                  <p>No hay registros de asistencia</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Fecha</TableHead>
                        <TableHead>Entrada</TableHead>
                        <TableHead>Salida</TableHead>
                        <TableHead>Estado</TableHead>
                        <TableHead>Notas</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {attendanceRecords.map((record) => {
                        const statusColors: Record<string, string> = {
                          present: 'bg-green-100 text-green-700',
                          absent: 'bg-red-100 text-red-700',
                          late: 'bg-yellow-100 text-yellow-700',
                          excused: 'bg-blue-100 text-blue-700',
                        };
                        const statusLabels: Record<string, string> = {
                          present: 'Presente',
                          absent: 'Ausente',
                          late: 'Tardanza',
                          excused: 'Justificado',
                        };
                        
                        return (
                          <TableRow key={record.id}>
                            <TableCell>
                              {format(new Date(record.date), 'EEEE dd MMM', { locale: es })}
                            </TableCell>
                            <TableCell>
                              {record.check_in ? format(new Date(record.check_in), 'HH:mm') : '—'}
                            </TableCell>
                            <TableCell>
                              {record.check_out ? format(new Date(record.check_out), 'HH:mm') : '—'}
                            </TableCell>
                            <TableCell>
                              <Badge className={statusColors[record.status] || 'bg-gray-100 text-gray-700'}>
                                {statusLabels[record.status] || record.status}
                              </Badge>
                            </TableCell>
                            <TableCell className="max-w-[200px] truncate">
                              {record.notes || '—'}
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
        </TabsContent>
      </Tabs>

      {/* New Time Off Request Modal */}
      <Dialog open={isRequestModalOpen} onOpenChange={setIsRequestModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CalendarDays className="w-5 h-5" />
              Nueva Solicitud de Permiso
            </DialogTitle>
          </DialogHeader>
          
          <form onSubmit={handleSubmitTimeOff} className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Tipo de permiso</Label>
              <Select
                value={requestForm.request_type}
                onValueChange={(v) => setRequestForm(prev => ({ ...prev, request_type: v }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(REQUEST_TYPE_CONFIG).map(([key, config]) => (
                    <SelectItem key={key} value={key}>
                      {config.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Fecha inicio</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        'w-full justify-start text-left font-normal',
                        !requestForm.start_date && 'text-muted-foreground'
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {requestForm.start_date ? format(requestForm.start_date, 'dd/MM/yyyy') : 'Seleccionar'}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={requestForm.start_date}
                      onSelect={(date) => setRequestForm(prev => ({ ...prev, start_date: date }))}
                      disabled={(date) => date < new Date()}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>

              <div className="space-y-2">
                <Label>Fecha fin</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        'w-full justify-start text-left font-normal',
                        !requestForm.end_date && 'text-muted-foreground'
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {requestForm.end_date ? format(requestForm.end_date, 'dd/MM/yyyy') : 'Seleccionar'}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={requestForm.end_date}
                      onSelect={(date) => setRequestForm(prev => ({ ...prev, end_date: date }))}
                      disabled={(date) => date < (requestForm.start_date || new Date())}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Motivo (opcional)</Label>
              <Textarea
                value={requestForm.reason}
                onChange={(e) => setRequestForm(prev => ({ ...prev, reason: e.target.value }))}
                placeholder="Describe el motivo de tu solicitud..."
                rows={3}
              />
            </div>

            <DialogFooter className="gap-2 pt-4">
              <Button type="button" variant="outline" onClick={() => setIsRequestModalOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Enviando...
                  </>
                ) : (
                  'Enviar Solicitud'
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Password Change Modal */}
      <Dialog open={isPasswordModalOpen} onOpenChange={setIsPasswordModalOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Lock className="w-5 h-5" />
              Cambiar Contraseña
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleChangePassword} className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="new-password">Nueva contraseña</Label>
              <div className="relative">
                <Input
                  id="new-password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Mínimo 6 caracteres"
                  value={passwordData.newPassword}
                  onChange={(e) => setPasswordData(prev => ({ ...prev, newPassword: e.target.value }))}
                  disabled={isChangingPassword}
                  className="pr-10"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="absolute right-1 top-1/2 -translate-y-1/2 h-8 w-8"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </Button>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirm-password">Confirmar contraseña</Label>
              <Input
                id="confirm-password"
                type={showPassword ? 'text' : 'password'}
                placeholder="Repite la contraseña"
                value={passwordData.confirmPassword}
                onChange={(e) => setPasswordData(prev => ({ ...prev, confirmPassword: e.target.value }))}
                disabled={isChangingPassword}
              />
            </div>
            <DialogFooter className="gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => setIsPasswordModalOpen(false)} disabled={isChangingPassword}>
                Cancelar
              </Button>
              <Button type="submit" disabled={isChangingPassword}>
                {isChangingPassword ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Guardando...
                  </>
                ) : (
                  'Guardar'
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
