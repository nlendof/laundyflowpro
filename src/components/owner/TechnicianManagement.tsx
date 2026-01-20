import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Wrench,
  UserPlus,
  Trash2,
  Edit,
  Copy,
  Eye,
  EyeOff,
  Loader2,
  RefreshCw,
  ShieldCheck,
  CheckCircle2,
  XCircle,
} from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

interface Technician {
  id: string;
  name: string;
  email: string;
  phone?: string;
  is_active: boolean;
  created_at: string;
  last_login?: string;
}

export function TechnicianManagement() {
  const [technicians, setTechnicians] = useState<Technician[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [selectedTechnician, setSelectedTechnician] = useState<Technician | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [createdCredentials, setCreatedCredentials] = useState<{ email: string; password: string } | null>(null);
  
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    password: '',
  });

  const fetchTechnicians = async () => {
    try {
      setIsLoading(true);
      
      // Get all users with technician role
      const { data: technicianRoles, error: rolesError } = await supabase
        .from('user_roles')
        .select('user_id')
        .eq('role', 'technician');
      
      if (rolesError) throw rolesError;
      
      if (!technicianRoles || technicianRoles.length === 0) {
        setTechnicians([]);
        return;
      }
      
      const technicianIds = technicianRoles.map(r => r.user_id);
      
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('*')
        .in('id', technicianIds);
      
      if (profilesError) throw profilesError;
      
      setTechnicians((profiles || []).map(p => ({
        id: p.id,
        name: p.name,
        email: p.email,
        phone: p.phone || undefined,
        is_active: p.is_active ?? true,
        created_at: p.created_at,
        last_login: p.last_login || undefined,
      })));
    } catch (error) {
      console.error('Error fetching technicians:', error);
      toast.error('Error al cargar técnicos');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchTechnicians();
  }, []);

  const generatePassword = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789!@#$%';
    let password = '';
    for (let i = 0; i < 12; i++) {
      password += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setFormData(prev => ({ ...prev, password }));
  };

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast.success('Copiado al portapapeles');
    } catch {
      toast.error('Error al copiar');
    }
  };

  const handleCreateTechnician = async () => {
    if (!formData.name || !formData.email || !formData.password) {
      toast.error('Nombre, email y contraseña son requeridos');
      return;
    }

    try {
      setIsCreating(true);

      const { data: sessionData } = await supabase.auth.getSession();
      
      const response = await supabase.functions.invoke('create-employee', {
        body: {
          email: formData.email,
          password: formData.password,
          name: formData.name,
          phone: formData.phone || null,
          role: 'technician',
          permissions: ['dashboard', 'pos', 'orders', 'operations', 'deliveries', 'cash_register', 'inventory', 'catalog', 'reports', 'employees', 'settings', 'purchases', 'audit_logs', 'returns'],
        },
        headers: {
          Authorization: `Bearer ${sessionData.session?.access_token}`,
        },
      });

      if (response.error) {
        throw new Error(response.error.message || 'Error al crear técnico');
      }

      setCreatedCredentials({
        email: formData.email,
        password: formData.password,
      });
      
      toast.success('Técnico creado exitosamente');
      fetchTechnicians();
    } catch (error: any) {
      console.error('Error creating technician:', error);
      toast.error(error.message || 'Error al crear técnico');
    } finally {
      setIsCreating(false);
    }
  };

  const handleToggleActive = async (technician: Technician) => {
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ is_active: !technician.is_active })
        .eq('id', technician.id);
      
      if (error) throw error;
      
      toast.success(technician.is_active ? 'Técnico desactivado' : 'Técnico activado');
      fetchTechnicians();
    } catch (error) {
      console.error('Error toggling technician:', error);
      toast.error('Error al cambiar estado');
    }
  };

  const handleDeleteTechnician = async () => {
    if (!selectedTechnician) return;

    try {
      const { data: sessionData } = await supabase.auth.getSession();
      
      const response = await supabase.functions.invoke('delete-employee', {
        body: { user_id: selectedTechnician.id },
        headers: {
          Authorization: `Bearer ${sessionData.session?.access_token}`,
        },
      });

      if (response.error) {
        throw new Error(response.error.message || 'Error al eliminar técnico');
      }

      toast.success('Técnico eliminado');
      setShowDeleteDialog(false);
      setSelectedTechnician(null);
      fetchTechnicians();
    } catch (error: any) {
      console.error('Error deleting technician:', error);
      toast.error(error.message || 'Error al eliminar técnico');
    }
  };

  const resetForm = () => {
    setFormData({ name: '', email: '', phone: '', password: '' });
    setCreatedCredentials(null);
    setShowPassword(false);
  };

  const closeCreateDialog = () => {
    setShowCreateDialog(false);
    resetForm();
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Wrench className="w-5 h-5 text-primary" />
              Gestión de Técnicos
            </CardTitle>
            <CardDescription>
              Crea y administra perfiles de soporte técnico con acceso completo al sistema
            </CardDescription>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={fetchTechnicians}>
              <RefreshCw className="w-4 h-4 mr-2" />
              Actualizar
            </Button>
            <Button onClick={() => setShowCreateDialog(true)}>
              <UserPlus className="w-4 h-4 mr-2" />
              Nuevo Técnico
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        ) : technicians.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Wrench className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p>No hay técnicos registrados</p>
            <p className="text-sm">Crea un perfil de técnico para dar soporte al sistema</p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nombre</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Teléfono</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead>Último acceso</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {technicians.map((tech) => (
                <TableRow key={tech.id}>
                  <TableCell className="font-medium">
                    <div className="flex items-center gap-2">
                      <ShieldCheck className="w-4 h-4 text-amber-600" />
                      {tech.name}
                    </div>
                  </TableCell>
                  <TableCell>{tech.email}</TableCell>
                  <TableCell>{tech.phone || '-'}</TableCell>
                  <TableCell>
                    <Badge variant={tech.is_active ? 'default' : 'secondary'}>
                      {tech.is_active ? 'Activo' : 'Inactivo'}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {tech.last_login 
                      ? format(new Date(tech.last_login), 'dd/MM/yyyy HH:mm', { locale: es })
                      : 'Nunca'
                    }
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleToggleActive(tech)}
                        title={tech.is_active ? 'Desactivar' : 'Activar'}
                      >
                        {tech.is_active ? (
                          <XCircle className="w-4 h-4 text-destructive" />
                        ) : (
                          <CheckCircle2 className="w-4 h-4 text-green-600" />
                        )}
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => {
                          setSelectedTechnician(tech);
                          setShowDeleteDialog(true);
                        }}
                        title="Eliminar"
                      >
                        <Trash2 className="w-4 h-4 text-destructive" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>

      {/* Create Technician Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={(open) => !open && closeCreateDialog()}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {createdCredentials ? 'Técnico Creado' : 'Nuevo Técnico'}
            </DialogTitle>
            <DialogDescription>
              {createdCredentials 
                ? 'Guarda estas credenciales de forma segura'
                : 'Crea un perfil de técnico con acceso completo al sistema'
              }
            </DialogDescription>
          </DialogHeader>

          {createdCredentials ? (
            <div className="space-y-4">
              <div className="p-4 bg-green-50 dark:bg-green-950/30 rounded-lg border border-green-200 dark:border-green-800">
                <div className="flex items-center gap-2 text-green-700 dark:text-green-400 mb-3">
                  <CheckCircle2 className="w-5 h-5" />
                  <span className="font-medium">Técnico creado exitosamente</span>
                </div>
                
                <div className="space-y-3">
                  <div>
                    <Label className="text-xs text-muted-foreground">Email</Label>
                    <div className="flex items-center gap-2">
                      <Input value={createdCredentials.email} readOnly className="font-mono" />
                      <Button 
                        variant="outline" 
                        size="icon"
                        onClick={() => copyToClipboard(createdCredentials.email)}
                      >
                        <Copy className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">Contraseña</Label>
                    <div className="flex items-center gap-2">
                      <Input 
                        value={createdCredentials.password} 
                        readOnly 
                        type={showPassword ? 'text' : 'password'}
                        className="font-mono"
                      />
                      <Button 
                        variant="outline" 
                        size="icon"
                        onClick={() => setShowPassword(!showPassword)}
                      >
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </Button>
                      <Button 
                        variant="outline" 
                        size="icon"
                        onClick={() => copyToClipboard(createdCredentials.password)}
                      >
                        <Copy className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
              
              <DialogFooter>
                <Button onClick={closeCreateDialog} className="w-full">
                  Cerrar
                </Button>
              </DialogFooter>
            </div>
          ) : (
            <>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Nombre completo *</Label>
                  <Input
                    placeholder="Juan Pérez"
                    value={formData.name}
                    onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label>Email *</Label>
                  <Input
                    type="email"
                    placeholder="tecnico@empresa.com"
                    value={formData.email}
                    onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label>Teléfono</Label>
                  <Input
                    placeholder="+52 123 456 7890"
                    value={formData.phone}
                    onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                  />
                </div>
                
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label>Contraseña *</Label>
                    <Button 
                      type="button" 
                      variant="link" 
                      size="sm" 
                      className="h-auto p-0"
                      onClick={generatePassword}
                    >
                      Generar automáticamente
                    </Button>
                  </div>
                  <div className="flex gap-2">
                    <Input
                      type={showPassword ? 'text' : 'password'}
                      placeholder="••••••••"
                      value={formData.password}
                      onChange={(e) => setFormData(prev => ({ ...prev, password: e.target.value }))}
                    />
                    <Button 
                      variant="outline" 
                      size="icon"
                      onClick={() => setShowPassword(!showPassword)}
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </Button>
                  </div>
                </div>

                <div className="p-3 bg-amber-50 dark:bg-amber-950/30 rounded-lg border border-amber-200 dark:border-amber-800">
                  <div className="flex items-start gap-2">
                    <ShieldCheck className="w-4 h-4 text-amber-600 mt-0.5" />
                    <div className="text-sm text-amber-700 dark:text-amber-400">
                      <p className="font-medium">Rol de Técnico</p>
                      <p className="text-xs opacity-80">
                        Tendrá acceso completo al sistema igual que el propietario, incluyendo todas las lavanderías y sucursales.
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              <DialogFooter>
                <Button variant="outline" onClick={closeCreateDialog}>
                  Cancelar
                </Button>
                <Button onClick={handleCreateTechnician} disabled={isCreating}>
                  {isCreating && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                  Crear Técnico
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar técnico?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción eliminará permanentemente el perfil de{' '}
              <strong>{selectedTechnician?.name}</strong> y no se puede deshacer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteTechnician}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}
