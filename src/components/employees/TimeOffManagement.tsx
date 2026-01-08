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
  CalendarDays,
  Plus,
  CheckCircle,
  XCircle,
  Clock,
  Loader2,
  Palmtree,
  Stethoscope,
  User,
  HelpCircle,
} from 'lucide-react';
import { toast } from 'sonner';
import { format, differenceInDays } from 'date-fns';
import { es } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import type { Employee } from './EmployeeList';

interface TimeOffRequest {
  id: string;
  user_id: string;
  request_type: 'vacation' | 'sick_leave' | 'personal' | 'other';
  start_date: string;
  end_date: string;
  status: 'pending' | 'approved' | 'rejected' | 'cancelled';
  reason?: string;
  response_notes?: string;
  created_at: string;
  approved_by?: string;
  approved_at?: string;
}

interface TimeOffManagementProps {
  employees: Employee[];
}

const TYPE_CONFIG = {
  vacation: { label: 'Vacaciones', color: 'bg-purple-100 text-purple-700', icon: Palmtree },
  sick_leave: { label: 'Incapacidad', color: 'bg-orange-100 text-orange-700', icon: Stethoscope },
  personal: { label: 'Personal', color: 'bg-blue-100 text-blue-700', icon: User },
  other: { label: 'Otro', color: 'bg-gray-100 text-gray-700', icon: HelpCircle },
};

const STATUS_CONFIG = {
  pending: { label: 'Pendiente', color: 'bg-yellow-100 text-yellow-700', icon: Clock },
  approved: { label: 'Aprobada', color: 'bg-green-100 text-green-700', icon: CheckCircle },
  rejected: { label: 'Rechazada', color: 'bg-red-100 text-red-700', icon: XCircle },
  cancelled: { label: 'Cancelada', color: 'bg-gray-100 text-gray-700', icon: XCircle },
};

export function TimeOffManagement({ employees }: TimeOffManagementProps) {
  const [requests, setRequests] = useState<TimeOffRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isResponseOpen, setIsResponseOpen] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<TimeOffRequest | null>(null);
  const [responseNotes, setResponseNotes] = useState('');
  
  const [formData, setFormData] = useState({
    user_id: '',
    request_type: 'vacation' as TimeOffRequest['request_type'],
    start_date: format(new Date(), 'yyyy-MM-dd'),
    end_date: format(new Date(), 'yyyy-MM-dd'),
    reason: '',
  });
  const [isSaving, setIsSaving] = useState(false);
  const [filterStatus, setFilterStatus] = useState<TimeOffRequest['status'] | 'all'>('all');

  const fetchRequests = async () => {
    try {
      setIsLoading(true);
      const { data, error } = await supabase
        .from('time_off_requests')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      setRequests((data || []) as TimeOffRequest[]);
    } catch (error) {
      console.error('Error fetching time off requests:', error);
      toast.error('Error al cargar solicitudes');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchRequests();
  }, []);

  const handleOpenDialog = () => {
    setFormData({
      user_id: '',
      request_type: 'vacation',
      start_date: format(new Date(), 'yyyy-MM-dd'),
      end_date: format(new Date(), 'yyyy-MM-dd'),
      reason: '',
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
        .from('time_off_requests')
        .insert({
          user_id: formData.user_id,
          request_type: formData.request_type,
          start_date: formData.start_date,
          end_date: formData.end_date,
          reason: formData.reason || null,
        });
      
      if (error) throw error;
      
      toast.success('Solicitud creada');
      setIsDialogOpen(false);
      fetchRequests();
    } catch (error) {
      console.error('Error saving request:', error);
      toast.error('Error al guardar solicitud');
    } finally {
      setIsSaving(false);
    }
  };

  const handleRespond = async (approved: boolean) => {
    if (!selectedRequest) return;
    
    try {
      const { error } = await supabase
        .from('time_off_requests')
        .update({
          status: approved ? 'approved' : 'rejected',
          response_notes: responseNotes || null,
          approved_at: new Date().toISOString(),
        })
        .eq('id', selectedRequest.id);
      
      if (error) throw error;
      
      toast.success(`Solicitud ${approved ? 'aprobada' : 'rechazada'}`);
      setIsResponseOpen(false);
      setSelectedRequest(null);
      setResponseNotes('');
      fetchRequests();
    } catch (error) {
      console.error('Error updating request:', error);
      toast.error('Error al actualizar solicitud');
    }
  };

  const handleOpenResponse = (request: TimeOffRequest) => {
    setSelectedRequest(request);
    setResponseNotes('');
    setIsResponseOpen(true);
  };

  const getEmployeeName = (userId: string) => {
    const emp = employees.find(e => e.id === userId);
    return emp?.name || 'Desconocido';
  };

  const getDays = (start: string, end: string) => {
    return differenceInDays(new Date(end), new Date(start)) + 1;
  };

  const filteredRequests = filterStatus === 'all'
    ? requests
    : requests.filter(r => r.status === filterStatus);

  const pendingCount = requests.filter(r => r.status === 'pending').length;

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
                <CalendarDays className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total solicitudes</p>
                <p className="text-2xl font-bold">{requests.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className={pendingCount > 0 ? 'bg-yellow-50 border-yellow-200' : ''}>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <Clock className={cn('w-8 h-8', pendingCount > 0 ? 'text-yellow-600' : 'text-muted-foreground')} />
              <div>
                <p className={cn('text-sm', pendingCount > 0 ? 'text-yellow-600' : 'text-muted-foreground')}>Pendientes</p>
                <p className={cn('text-2xl font-bold', pendingCount > 0 ? 'text-yellow-600' : '')}>{pendingCount}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <CheckCircle className="w-8 h-8 text-green-600" />
              <div>
                <p className="text-sm text-muted-foreground">Aprobadas</p>
                <p className="text-2xl font-bold">{requests.filter(r => r.status === 'approved').length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <XCircle className="w-8 h-8 text-red-600" />
              <div>
                <p className="text-sm text-muted-foreground">Rechazadas</p>
                <p className="text-2xl font-bold">{requests.filter(r => r.status === 'rejected').length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Header */}
      <div className="flex items-center justify-between">
        <Select value={filterStatus} onValueChange={(v) => setFilterStatus(v as TimeOffRequest['status'] | 'all')}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Filtrar por estado" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas</SelectItem>
            {Object.entries(STATUS_CONFIG).map(([key, config]) => (
              <SelectItem key={key} value={key}>{config.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button onClick={handleOpenDialog}>
          <Plus className="w-4 h-4 mr-2" />
          Nueva Solicitud
        </Button>
      </div>

      {/* Requests Table */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Empleado</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Período</TableHead>
                  <TableHead>Días</TableHead>
                  <TableHead>Motivo</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredRequests.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                      No hay solicitudes
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredRequests.map((request) => {
                    const typeConfig = TYPE_CONFIG[request.request_type];
                    const statusConfig = STATUS_CONFIG[request.status];
                    const TypeIcon = typeConfig.icon;
                    const StatusIcon = statusConfig.icon;
                    
                    return (
                      <TableRow key={request.id}>
                        <TableCell className="font-medium">
                          {getEmployeeName(request.user_id)}
                        </TableCell>
                        <TableCell>
                          <Badge className={cn('gap-1', typeConfig.color)}>
                            <TypeIcon className="w-3 h-3" />
                            {typeConfig.label}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="text-sm">
                            <p>{format(new Date(request.start_date), 'dd MMM', { locale: es })}</p>
                            <p className="text-muted-foreground">
                              al {format(new Date(request.end_date), 'dd MMM yyyy', { locale: es })}
                            </p>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">
                            {getDays(request.start_date, request.end_date)} días
                          </Badge>
                        </TableCell>
                        <TableCell className="max-w-[200px] truncate">
                          {request.reason || '—'}
                        </TableCell>
                        <TableCell>
                          <Badge className={cn('gap-1', statusConfig.color)}>
                            <StatusIcon className="w-3 h-3" />
                            {statusConfig.label}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          {request.status === 'pending' && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleOpenResponse(request)}
                            >
                              Responder
                            </Button>
                          )}
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

      {/* Create Request Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nueva Solicitud de Permiso</DialogTitle>
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
                  {employees.filter(e => e.is_active).map((emp) => (
                    <SelectItem key={emp.id} value={emp.id}>
                      {emp.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label>Tipo de solicitud</Label>
              <Select
                value={formData.request_type}
                onValueChange={(v) => setFormData(prev => ({ ...prev, request_type: v as TimeOffRequest['request_type'] }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(TYPE_CONFIG).map(([key, config]) => (
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
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Fecha inicio</Label>
                <Input
                  type="date"
                  value={formData.start_date}
                  onChange={(e) => setFormData(prev => ({ ...prev, start_date: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label>Fecha fin</Label>
                <Input
                  type="date"
                  value={formData.end_date}
                  onChange={(e) => setFormData(prev => ({ ...prev, end_date: e.target.value }))}
                />
              </div>
            </div>
            
            {formData.start_date && formData.end_date && (
              <div className="p-3 bg-muted rounded-lg text-center">
                <span className="font-medium">
                  {getDays(formData.start_date, formData.end_date)} días
                </span>
              </div>
            )}
            
            <div className="space-y-2">
              <Label>Motivo (opcional)</Label>
              <Textarea
                value={formData.reason}
                onChange={(e) => setFormData(prev => ({ ...prev, reason: e.target.value }))}
                rows={2}
                placeholder="Describe el motivo de la solicitud..."
              />
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSave} disabled={isSaving}>
              {isSaving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Crear Solicitud
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Response Dialog */}
      <Dialog open={isResponseOpen} onOpenChange={setIsResponseOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Responder Solicitud</DialogTitle>
          </DialogHeader>
          
          {selectedRequest && (
            <div className="space-y-4 py-4">
              <div className="p-4 bg-muted rounded-lg space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-medium">{getEmployeeName(selectedRequest.user_id)}</span>
                  <Badge className={TYPE_CONFIG[selectedRequest.request_type].color}>
                    {TYPE_CONFIG[selectedRequest.request_type].label}
                  </Badge>
                </div>
                <p className="text-sm">
                  {format(new Date(selectedRequest.start_date), 'dd MMM yyyy', { locale: es })} - {format(new Date(selectedRequest.end_date), 'dd MMM yyyy', { locale: es })}
                </p>
                <p className="text-sm text-muted-foreground">
                  ({getDays(selectedRequest.start_date, selectedRequest.end_date)} días)
                </p>
                {selectedRequest.reason && (
                  <p className="text-sm border-t pt-2 mt-2">{selectedRequest.reason}</p>
                )}
              </div>
              
              <div className="space-y-2">
                <Label>Notas de respuesta (opcional)</Label>
                <Textarea
                  value={responseNotes}
                  onChange={(e) => setResponseNotes(e.target.value)}
                  rows={2}
                  placeholder="Comentarios adicionales..."
                />
              </div>
              
              <div className="flex gap-3">
                <Button
                  variant="destructive"
                  className="flex-1"
                  onClick={() => handleRespond(false)}
                >
                  <XCircle className="w-4 h-4 mr-2" />
                  Rechazar
                </Button>
                <Button
                  className="flex-1"
                  onClick={() => handleRespond(true)}
                >
                  <CheckCircle className="w-4 h-4 mr-2" />
                  Aprobar
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
