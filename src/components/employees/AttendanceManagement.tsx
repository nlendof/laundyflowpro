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
  UserCheck,
  Calendar,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  Plus,
  Loader2,
  LogIn,
  LogOut,
} from 'lucide-react';
import { toast } from 'sonner';
import { format, startOfWeek, endOfWeek, addDays, isSameDay } from 'date-fns';
import { es } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import type { Employee } from './EmployeeList';

interface AttendanceRecord {
  id: string;
  user_id: string;
  date: string;
  check_in?: string;
  check_out?: string;
  status: 'present' | 'absent' | 'late' | 'half_day' | 'vacation' | 'sick_leave';
  notes?: string;
}

interface AttendanceManagementProps {
  employees: Employee[];
}

const STATUS_CONFIG = {
  present: { label: 'Presente', color: 'bg-green-100 text-green-700', icon: CheckCircle },
  absent: { label: 'Ausente', color: 'bg-red-100 text-red-700', icon: XCircle },
  late: { label: 'Retardo', color: 'bg-yellow-100 text-yellow-700', icon: AlertCircle },
  half_day: { label: 'Medio día', color: 'bg-blue-100 text-blue-700', icon: Clock },
  vacation: { label: 'Vacaciones', color: 'bg-purple-100 text-purple-700', icon: Calendar },
  sick_leave: { label: 'Incapacidad', color: 'bg-orange-100 text-orange-700', icon: AlertCircle },
};

export function AttendanceManagement({ employees }: AttendanceManagementProps) {
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [formData, setFormData] = useState({
    user_id: '',
    date: format(new Date(), 'yyyy-MM-dd'),
    status: 'present' as AttendanceRecord['status'],
    check_in: '',
    check_out: '',
    notes: '',
  });
  const [isSaving, setIsSaving] = useState(false);
  const [weekStart, setWeekStart] = useState(startOfWeek(new Date(), { weekStartsOn: 1 }));

  const fetchRecords = async () => {
    try {
      setIsLoading(true);
      const weekEnd = endOfWeek(weekStart, { weekStartsOn: 1 });
      
      const { data, error } = await supabase
        .from('attendance_records')
        .select('*')
        .gte('date', format(weekStart, 'yyyy-MM-dd'))
        .lte('date', format(weekEnd, 'yyyy-MM-dd'))
        .order('date', { ascending: true });
      
      if (error) throw error;
      setRecords((data || []) as AttendanceRecord[]);
    } catch (error) {
      console.error('Error fetching attendance:', error);
      toast.error('Error al cargar asistencias');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchRecords();
  }, [weekStart]);

  const handleOpenDialog = (userId?: string) => {
    setFormData({
      user_id: userId || '',
      date: selectedDate,
      status: 'present',
      check_in: '09:00',
      check_out: '',
      notes: '',
    });
    setIsDialogOpen(true);
  };

  const handleSave = async () => {
    if (!formData.user_id) {
      toast.error('Selecciona un empleado');
      return;
    }
    
    setIsSaving(true);
    
    try {
      const { error } = await supabase
        .from('attendance_records')
        .upsert({
          user_id: formData.user_id,
          date: formData.date,
          status: formData.status,
          check_in: formData.check_in ? `${formData.date}T${formData.check_in}:00` : null,
          check_out: formData.check_out ? `${formData.date}T${formData.check_out}:00` : null,
          notes: formData.notes || null,
        }, {
          onConflict: 'user_id,date',
        });
      
      if (error) throw error;
      
      toast.success('Asistencia registrada');
      setIsDialogOpen(false);
      fetchRecords();
    } catch (error) {
      console.error('Error saving attendance:', error);
      toast.error('Error al guardar asistencia');
    } finally {
      setIsSaving(false);
    }
  };

  const getRecordForDate = (userId: string, date: Date) => {
    return records.find(r => r.user_id === userId && isSameDay(new Date(r.date), date));
  };

  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
  const activeEmployees = employees.filter(e => e.is_active);

  // Stats for selected date
  const todayRecords = records.filter(r => r.date === selectedDate);
  const stats = {
    present: todayRecords.filter(r => r.status === 'present').length,
    absent: todayRecords.filter(r => r.status === 'absent').length,
    late: todayRecords.filter(r => r.status === 'late').length,
  };

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
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <UserCheck className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Empleados</p>
                <p className="text-2xl font-bold">{activeEmployees.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-green-50 border-green-200">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <CheckCircle className="w-8 h-8 text-green-600" />
              <div>
                <p className="text-sm text-green-600">Presentes</p>
                <p className="text-2xl font-bold text-green-600">{stats.present}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-red-50 border-red-200">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <XCircle className="w-8 h-8 text-red-600" />
              <div>
                <p className="text-sm text-red-600">Ausentes</p>
                <p className="text-2xl font-bold text-red-600">{stats.absent}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-yellow-50 border-yellow-200">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <AlertCircle className="w-8 h-8 text-yellow-600" />
              <div>
                <p className="text-sm text-yellow-600">Retardos</p>
                <p className="text-2xl font-bold text-yellow-600">{stats.late}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Week Navigation */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setWeekStart(addDays(weekStart, -7))}
          >
            ← Semana anterior
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setWeekStart(startOfWeek(new Date(), { weekStartsOn: 1 }))}
          >
            Hoy
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setWeekStart(addDays(weekStart, 7))}
          >
            Semana siguiente →
          </Button>
        </div>
        <Button onClick={() => handleOpenDialog()}>
          <Plus className="w-4 h-4 mr-2" />
          Registrar Asistencia
        </Button>
      </div>

      {/* Week View */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="w-5 h-5" />
            Semana del {format(weekStart, 'dd MMM', { locale: es })} al {format(addDays(weekStart, 6), 'dd MMM yyyy', { locale: es })}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[200px]">Empleado</TableHead>
                  {weekDays.map((day) => (
                    <TableHead
                      key={day.toString()}
                      className={cn(
                        'text-center min-w-[100px]',
                        isSameDay(day, new Date()) && 'bg-primary/10'
                      )}
                    >
                      <div className="text-xs">{format(day, 'EEE', { locale: es })}</div>
                      <div className="font-bold">{format(day, 'd')}</div>
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {activeEmployees.map((employee) => (
                  <TableRow key={employee.id}>
                    <TableCell className="font-medium">{employee.name}</TableCell>
                    {weekDays.map((day) => {
                      const record = getRecordForDate(employee.id, day);
                      const isToday = isSameDay(day, new Date());
                      
                      return (
                        <TableCell
                          key={day.toString()}
                          className={cn(
                            'text-center p-1',
                            isToday && 'bg-primary/5'
                          )}
                        >
                          {record ? (
                            <button
                              onClick={() => {
                                setSelectedDate(format(day, 'yyyy-MM-dd'));
                                setFormData({
                                  user_id: employee.id,
                                  date: format(day, 'yyyy-MM-dd'),
                                  status: record.status,
                                  check_in: record.check_in ? format(new Date(record.check_in), 'HH:mm') : '',
                                  check_out: record.check_out ? format(new Date(record.check_out), 'HH:mm') : '',
                                  notes: record.notes || '',
                                });
                                setIsDialogOpen(true);
                              }}
                              className="w-full"
                            >
                              <Badge className={cn('text-xs', STATUS_CONFIG[record.status].color)}>
                                {STATUS_CONFIG[record.status].label.slice(0, 3)}
                              </Badge>
                            </button>
                          ) : (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-6 w-6 p-0 opacity-30 hover:opacity-100"
                              onClick={() => {
                                setSelectedDate(format(day, 'yyyy-MM-dd'));
                                handleOpenDialog(employee.id);
                              }}
                            >
                              <Plus className="w-3 h-3" />
                            </Button>
                          )}
                        </TableCell>
                      );
                    })}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Attendance Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Registrar Asistencia</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Empleado</Label>
              <Select
                value={formData.user_id}
                onValueChange={(v) => setFormData(prev => ({ ...prev, user_id: v }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar empleado" />
                </SelectTrigger>
                <SelectContent>
                  {activeEmployees.map((emp) => (
                    <SelectItem key={emp.id} value={emp.id}>
                      {emp.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label>Fecha</Label>
              <Input
                type="date"
                value={formData.date}
                onChange={(e) => setFormData(prev => ({ ...prev, date: e.target.value }))}
              />
            </div>
            
            <div className="space-y-2">
              <Label>Estado</Label>
              <Select
                value={formData.status}
                onValueChange={(v) => setFormData(prev => ({ ...prev, status: v as AttendanceRecord['status'] }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(STATUS_CONFIG).map(([key, config]) => (
                    <SelectItem key={key} value={key}>
                      <div className="flex items-center gap-2">
                        <config.icon className="w-4 h-4" />
                        {config.label}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            {['present', 'late', 'half_day'].includes(formData.status) && (
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="flex items-center gap-1">
                    <LogIn className="w-3 h-3" /> Entrada
                  </Label>
                  <Input
                    type="time"
                    value={formData.check_in}
                    onChange={(e) => setFormData(prev => ({ ...prev, check_in: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label className="flex items-center gap-1">
                    <LogOut className="w-3 h-3" /> Salida
                  </Label>
                  <Input
                    type="time"
                    value={formData.check_out}
                    onChange={(e) => setFormData(prev => ({ ...prev, check_out: e.target.value }))}
                  />
                </div>
              </div>
            )}
            
            <div className="space-y-2">
              <Label>Notas</Label>
              <Textarea
                value={formData.notes}
                onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                rows={2}
                placeholder="Observaciones..."
              />
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSave} disabled={isSaving}>
              {isSaving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Guardar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
