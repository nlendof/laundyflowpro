import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Clock,
  Calendar,
  Pencil,
  Loader2,
  Sun,
  Moon,
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import type { Employee } from './EmployeeList';

interface WorkSchedule {
  id: string;
  user_id: string;
  day_of_week: number;
  start_time: string;
  end_time: string;
  is_active: boolean;
}

interface ScheduleManagementProps {
  employees: Employee[];
}

const DAYS_OF_WEEK = [
  { value: 0, label: 'Domingo', short: 'Dom' },
  { value: 1, label: 'Lunes', short: 'Lun' },
  { value: 2, label: 'Martes', short: 'Mar' },
  { value: 3, label: 'Miércoles', short: 'Mié' },
  { value: 4, label: 'Jueves', short: 'Jue' },
  { value: 5, label: 'Viernes', short: 'Vie' },
  { value: 6, label: 'Sábado', short: 'Sáb' },
];

export function ScheduleManagement({ employees }: ScheduleManagementProps) {
  const [schedules, setSchedules] = useState<Record<string, WorkSchedule[]>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [selectedEmployee, setSelectedEmployee] = useState<string>('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingSchedule, setEditingSchedule] = useState<WorkSchedule | null>(null);
  const [formData, setFormData] = useState({
    day_of_week: 1,
    start_time: '09:00',
    end_time: '18:00',
    is_active: true,
  });
  const [isSaving, setIsSaving] = useState(false);

  const fetchSchedules = async () => {
    try {
      setIsLoading(true);
      const { data, error } = await supabase
        .from('work_schedules')
        .select('*')
        .order('day_of_week', { ascending: true });
      
      if (error) throw error;
      
      const grouped: Record<string, WorkSchedule[]> = {};
      (data || []).forEach(schedule => {
        if (!grouped[schedule.user_id]) {
          grouped[schedule.user_id] = [];
        }
        grouped[schedule.user_id].push(schedule as WorkSchedule);
      });
      
      setSchedules(grouped);
    } catch (error) {
      console.error('Error fetching schedules:', error);
      toast.error('Error al cargar horarios');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchSchedules();
  }, []);

  useEffect(() => {
    if (employees.length > 0 && !selectedEmployee) {
      setSelectedEmployee(employees.find(e => e.is_active)?.id || employees[0].id);
    }
  }, [employees, selectedEmployee]);

  const handleOpenDialog = (schedule?: WorkSchedule) => {
    if (schedule) {
      setEditingSchedule(schedule);
      setFormData({
        day_of_week: schedule.day_of_week,
        start_time: schedule.start_time.slice(0, 5),
        end_time: schedule.end_time.slice(0, 5),
        is_active: schedule.is_active,
      });
    } else {
      setEditingSchedule(null);
      const existingDays = schedules[selectedEmployee]?.map(s => s.day_of_week) || [];
      const nextDay = DAYS_OF_WEEK.find(d => !existingDays.includes(d.value))?.value || 1;
      setFormData({
        day_of_week: nextDay,
        start_time: '09:00',
        end_time: '18:00',
        is_active: true,
      });
    }
    setIsDialogOpen(true);
  };

  const handleSave = async () => {
    setIsSaving(true);
    
    try {
      if (editingSchedule) {
        const { error } = await supabase
          .from('work_schedules')
          .update({
            start_time: formData.start_time,
            end_time: formData.end_time,
            is_active: formData.is_active,
          })
          .eq('id', editingSchedule.id);
        
        if (error) throw error;
        toast.success('Horario actualizado');
      } else {
        const { error } = await supabase
          .from('work_schedules')
          .insert({
            user_id: selectedEmployee,
            day_of_week: formData.day_of_week,
            start_time: formData.start_time,
            end_time: formData.end_time,
            is_active: formData.is_active,
          });
        
        if (error) throw error;
        toast.success('Horario agregado');
      }
      
      setIsDialogOpen(false);
      fetchSchedules();
    } catch (error) {
      console.error('Error saving schedule:', error);
      toast.error('Error al guardar horario');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (scheduleId: string) => {
    try {
      const { error } = await supabase
        .from('work_schedules')
        .delete()
        .eq('id', scheduleId);
      
      if (error) throw error;
      toast.success('Horario eliminado');
      fetchSchedules();
    } catch (error) {
      console.error('Error deleting schedule:', error);
      toast.error('Error al eliminar horario');
    }
  };

  const calculateHours = (start: string, end: string) => {
    const [startH, startM] = start.split(':').map(Number);
    const [endH, endM] = end.split(':').map(Number);
    const startMinutes = startH * 60 + startM;
    const endMinutes = endH * 60 + endM;
    const diff = endMinutes - startMinutes;
    return diff > 0 ? (diff / 60).toFixed(1) : '0';
  };

  const selectedEmployeeData = employees.find(e => e.id === selectedEmployee);
  const employeeSchedule = schedules[selectedEmployee] || [];
  const totalHours = employeeSchedule
    .filter(s => s.is_active)
    .reduce((sum, s) => sum + parseFloat(calculateHours(s.start_time, s.end_time)), 0);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4">
        <Select value={selectedEmployee} onValueChange={setSelectedEmployee}>
          <SelectTrigger className="w-[250px]">
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
        
        <Button onClick={() => handleOpenDialog()}>
          <Clock className="w-4 h-4 mr-2" />
          Agregar Día
        </Button>
      </div>

      {selectedEmployeeData && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Calendar className="w-5 h-5" />
                Horario de {selectedEmployeeData.name}
              </div>
              <Badge variant="outline">
                {totalHours.toFixed(1)} hrs/semana
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3">
              {DAYS_OF_WEEK.map((day) => {
                const schedule = employeeSchedule.find(s => s.day_of_week === day.value);
                
                return (
                  <div
                    key={day.value}
                    className={cn(
                      'flex items-center justify-between p-4 rounded-lg border transition-colors',
                      schedule?.is_active
                        ? 'bg-primary/5 border-primary/20'
                        : schedule
                        ? 'bg-muted/50 border-dashed'
                        : 'bg-muted/30 border-dashed'
                    )}
                  >
                    <div className="flex items-center gap-3">
                      <div className={cn(
                        'w-10 h-10 rounded-full flex items-center justify-center font-medium',
                        schedule?.is_active ? 'bg-primary text-primary-foreground' : 'bg-muted'
                      )}>
                        {day.short}
                      </div>
                      <div>
                        <p className="font-medium">{day.label}</p>
                        {schedule ? (
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <Sun className="w-3 h-3" />
                            {schedule.start_time.slice(0, 5)}
                            <span>→</span>
                            <Moon className="w-3 h-3" />
                            {schedule.end_time.slice(0, 5)}
                            <Badge variant="outline" className="ml-2">
                              {calculateHours(schedule.start_time, schedule.end_time)}h
                            </Badge>
                          </div>
                        ) : (
                          <p className="text-sm text-muted-foreground">Descanso</p>
                        )}
                      </div>
                    </div>
                    
                    {schedule ? (
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleOpenDialog(schedule)}
                      >
                        <Pencil className="w-4 h-4" />
                      </Button>
                    ) : (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setFormData(prev => ({ ...prev, day_of_week: day.value }));
                          handleOpenDialog();
                        }}
                      >
                        Agregar
                      </Button>
                    )}
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Schedule Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingSchedule ? 'Editar Horario' : 'Agregar Horario'}
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            {!editingSchedule && (
              <div className="space-y-2">
                <Label>Día de la semana</Label>
                <Select
                  value={formData.day_of_week.toString()}
                  onValueChange={(v) => setFormData(prev => ({ ...prev, day_of_week: parseInt(v) }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {DAYS_OF_WEEK.map((day) => (
                      <SelectItem
                        key={day.value}
                        value={day.value.toString()}
                        disabled={employeeSchedule.some(s => s.day_of_week === day.value)}
                      >
                        {day.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Hora de entrada</Label>
                <Input
                  type="time"
                  value={formData.start_time}
                  onChange={(e) => setFormData(prev => ({ ...prev, start_time: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label>Hora de salida</Label>
                <Input
                  type="time"
                  value={formData.end_time}
                  onChange={(e) => setFormData(prev => ({ ...prev, end_time: e.target.value }))}
                />
              </div>
            </div>
            
            <div className="flex items-center justify-between">
              <Label>Día laboral activo</Label>
              <Switch
                checked={formData.is_active}
                onCheckedChange={(checked) => setFormData(prev => ({ ...prev, is_active: checked }))}
              />
            </div>
            
            {editingSchedule && (
              <Button
                variant="destructive"
                className="w-full"
                onClick={() => {
                  handleDelete(editingSchedule.id);
                  setIsDialogOpen(false);
                }}
              >
                Eliminar día
              </Button>
            )}
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
