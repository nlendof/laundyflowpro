import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useLaundryContext } from '@/contexts/LaundryContext';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { Loader2, UserPlus, Copy, Check, Eye, EyeOff, Building2 } from 'lucide-react';
import { z } from 'zod';
import { Badge } from '@/components/ui/badge';

type AppRole = 'admin' | 'cajero' | 'operador' | 'delivery';

const ROLE_CONFIG: Record<AppRole, { label: string; description: string }> = {
  admin: { label: 'Administrador', description: 'Acceso total a todas las funciones' },
  cajero: { label: 'Cajero', description: 'Gestión de caja, ventas y cobros' },
  operador: { label: 'Operador', description: 'Operaciones de lavado y procesamiento' },
  delivery: { label: 'Repartidor', description: 'Recogidas y entregas a domicilio' },
};

const DEFAULT_PERMISSIONS: Record<AppRole, string[]> = {
  admin: ['dashboard', 'pos', 'orders', 'operations', 'deliveries', 'cash_register', 'inventory', 'catalog', 'reports', 'employees', 'settings'],
  cajero: ['dashboard', 'pos', 'orders', 'cash_register'],
  operador: ['dashboard', 'orders', 'operations'],
  delivery: ['dashboard', 'deliveries'],
};

const employeeSchema = z.object({
  name: z.string().min(2, 'El nombre debe tener al menos 2 caracteres'),
  email: z.string().email('Correo electrónico inválido'),
  phone: z.string().optional(),
  role: z.enum(['admin', 'cajero', 'operador', 'delivery']),
  password: z.string().min(6, 'La contraseña debe tener al menos 6 caracteres'),
});

interface CreateEmployeeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function CreateEmployeeModal({ isOpen, onClose, onSuccess }: CreateEmployeeModalProps) {
  const { currentLaundry, branches, laundryId } = useLaundryContext();
  
  const [selectedBranchId, setSelectedBranchId] = useState<string>('');
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    role: 'cajero' as AppRole,
    password: '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [copiedPassword, setCopiedPassword] = useState(false);
  const [createdCredentials, setCreatedCredentials] = useState<{ email: string; password: string } | null>(null);

  const generatePassword = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%';
    let password = '';
    for (let i = 0; i < 12; i++) {
      password += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setFormData(prev => ({ ...prev, password }));
  };

  const copyPassword = async () => {
    const passwordToCopy = createdCredentials?.password || formData.password;
    await navigator.clipboard.writeText(passwordToCopy);
    setCopiedPassword(true);
    setTimeout(() => setCopiedPassword(false), 2000);
    toast.success('Contraseña copiada al portapapeles');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});

    const result = employeeSchema.safeParse(formData);
    if (!result.success) {
      const newErrors: Record<string, string> = {};
      result.error.errors.forEach((err) => {
        if (err.path[0]) {
          newErrors[err.path[0] as string] = err.message;
        }
      });
      setErrors(newErrors);
      return;
    }

    setIsLoading(true);

    try {
      // Call edge function to create employee without changing current session
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        throw new Error('No hay sesión activa');
      }

      const response = await supabase.functions.invoke('create-employee', {
        body: {
          appUrl: window.location.origin,
          email: formData.email,
          password: formData.password,
          name: formData.name,
          phone: formData.phone || undefined,
          role: formData.role,
          permissions: DEFAULT_PERMISSIONS[formData.role],
          laundry_id: laundryId,
          branch_id: selectedBranchId || undefined,
        },
      });

      if (response.error) {
        throw new Error(response.error.message || 'Error al crear empleado');
      }

      if (response.data?.error) {
        if (response.data.error.includes('registrado') || response.data.error.includes('already')) {
          setErrors({ email: 'Este correo ya está registrado' });
        } else {
          throw new Error(response.data.error);
        }
        return;
      }

      // Store credentials to show to admin
      setCreatedCredentials({
        email: formData.email,
        password: formData.password,
      });

      toast.success('Empleado creado exitosamente');
      if (response.data?.emailSent === false) {
        toast.message(`No se pudo enviar el correo: ${response.data?.emailError ?? 'Error desconocido'}`);
      }
      onSuccess();
    } catch (error) {
      console.error('Error creating employee:', error);
      toast.error(error instanceof Error ? error.message : 'Error al crear empleado');
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    setFormData({
      name: '',
      email: '',
      phone: '',
      role: 'cajero',
      password: '',
    });
    setSelectedBranchId('');
    setErrors({});
    setCreatedCredentials(null);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserPlus className="w-5 h-5" />
            {createdCredentials ? 'Empleado Creado' : 'Nuevo Empleado'}
          </DialogTitle>
        </DialogHeader>

        {createdCredentials ? (
          <div className="space-y-4 py-4">
            <div className="bg-success/10 border border-success/30 rounded-lg p-4">
              <p className="text-sm text-success-foreground mb-4">
                El empleado ha sido creado exitosamente. Comparte estas credenciales con el empleado:
              </p>
              
              <div className="space-y-3">
                <div>
                  <Label className="text-xs text-muted-foreground">Correo electrónico</Label>
                  <p className="font-medium">{createdCredentials.email}</p>
                </div>
                
                <div>
                  <Label className="text-xs text-muted-foreground">Contraseña</Label>
                  <div className="flex items-center gap-2">
                    <code className="flex-1 bg-muted px-3 py-2 rounded text-sm font-mono">
                      {showPassword ? createdCredentials.password : '••••••••••••'}
                    </code>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => setShowPassword(!showPassword)}
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={copyPassword}
                    >
                      {copiedPassword ? <Check className="w-4 h-4 text-success" /> : <Copy className="w-4 h-4" />}
                    </Button>
                  </div>
                </div>
              </div>
              
               <p className="text-xs text-muted-foreground mt-4">
                 El empleado puede cambiar su contraseña desde su perfil en "Mi Portal" → "Cambiar Contraseña".
               </p>
             </div>

            <DialogFooter>
              <Button onClick={handleClose}>Cerrar</Button>
            </DialogFooter>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="name">Nombre completo *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                placeholder="Juan Pérez"
                disabled={isLoading}
              />
              {errors.name && <p className="text-sm text-destructive">{errors.name}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Correo electrónico *</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                placeholder="empleado@ejemplo.com"
                disabled={isLoading}
              />
              {errors.email && <p className="text-sm text-destructive">{errors.email}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone">Teléfono</Label>
              <Input
                id="phone"
                type="tel"
                value={formData.phone}
                onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                placeholder="Opcional"
                disabled={isLoading}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="role">Rol *</Label>
              <Select
                value={formData.role}
                onValueChange={(v) => setFormData(prev => ({ ...prev, role: v as AppRole }))}
                disabled={isLoading}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(ROLE_CONFIG).map(([key, config]) => (
                    <SelectItem key={key} value={key}>
                      <div>
                        <span className="font-medium">{config.label}</span>
                        <span className="text-xs text-muted-foreground ml-2">- {config.description}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Branch selector */}
            {branches.length > 0 && (
              <div className="space-y-2">
                <Label htmlFor="branch">Sucursal asignada</Label>
                <Select
                  value={selectedBranchId}
                  onValueChange={setSelectedBranchId}
                  disabled={isLoading}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar sucursal (opcional)" />
                  </SelectTrigger>
                  <SelectContent>
                    {branches.map((branch) => (
                      <SelectItem key={branch.id} value={branch.id}>
                        <div className="flex items-center gap-2">
                          <Building2 className="w-3.5 h-3.5 text-muted-foreground" />
                          <span className="font-mono text-xs">[{branch.code}]</span>
                          <span>{branch.name}</span>
                          {branch.is_main && <span className="text-primary">★</span>}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  Si no seleccionas sucursal, el empleado tendrá acceso a todas las sucursales de la lavandería.
                </p>
              </div>
            )}

            {/* Laundry info badge */}
            {currentLaundry && (
              <div className="flex items-center gap-2 p-2 bg-muted/50 rounded-lg">
                <Badge variant="outline" className="gap-1">
                  <Building2 className="w-3 h-3" />
                  {currentLaundry.name}
                </Badge>
                <span className="text-xs text-muted-foreground">
                  El empleado será asignado a esta lavandería
                </span>
              </div>
            )}

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="password">Contraseña *</Label>
                <Button
                  type="button"
                  variant="link"
                  size="sm"
                  onClick={generatePassword}
                  className="h-auto p-0 text-xs"
                >
                  Generar contraseña
                </Button>
              </div>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    value={formData.password}
                    onChange={(e) => setFormData(prev => ({ ...prev, password: e.target.value }))}
                    placeholder="Mínimo 6 caracteres"
                    disabled={isLoading}
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
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={copyPassword}
                  disabled={!formData.password}
                >
                  {copiedPassword ? <Check className="w-4 h-4 text-success" /> : <Copy className="w-4 h-4" />}
                </Button>
              </div>
              {errors.password && <p className="text-sm text-destructive">{errors.password}</p>}
            </div>

            <DialogFooter className="gap-2 pt-4">
              <Button type="button" variant="outline" onClick={handleClose} disabled={isLoading}>
                Cancelar
              </Button>
              <Button type="submit" disabled={isLoading}>
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Creando...
                  </>
                ) : (
                  <>
                    <UserPlus className="w-4 h-4 mr-2" />
                    Crear Empleado
                  </>
                )}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
