import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useCurrentLaundryId } from '@/contexts/LaundryContext';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Building2, Plus, Edit, Trash2, Loader2, MapPin, Phone, Star, AlertTriangle, RotateCcw } from 'lucide-react';
import { toast } from 'sonner';

interface Branch {
  id: string;
  code: string;
  name: string;
  address: string | null;
  phone: string | null;
  is_active: boolean;
  is_main: boolean;
}

export function BranchSettings() {
  const { user } = useAuth();
  const isOwner = user?.role === 'owner';
  const laundryId = useCurrentLaundryId();
  const [branches, setBranches] = useState<Branch[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingBranch, setEditingBranch] = useState<Branch | null>(null);
  const [resetDialogOpen, setResetDialogOpen] = useState(false);
  const [branchToReset, setBranchToReset] = useState<Branch | null>(null);
  const [resetting, setResetting] = useState(false);
  const [confirmText, setConfirmText] = useState('');
  
  const [formData, setFormData] = useState({
    code: '',
    name: '',
    address: '',
    phone: '',
    is_active: true,
    is_main: false,
  });

  const fetchBranches = async () => {
    if (!laundryId) {
      setBranches([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('branches')
        .select('*')
        .eq('laundry_id', laundryId)
        .order('is_main', { ascending: false })
        .order('name', { ascending: true });

      if (error) throw error;
      setBranches(data || []);
    } catch (error) {
      console.error('Error fetching branches:', error);
      toast.error('Error al cargar sucursales');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBranches();
  }, [laundryId]);

  const handleOpenDialog = (branch?: Branch) => {
    if (branch) {
      setEditingBranch(branch);
      setFormData({
        code: branch.code,
        name: branch.name,
        address: branch.address || '',
        phone: branch.phone || '',
        is_active: branch.is_active,
        is_main: branch.is_main,
      });
    } else {
      setEditingBranch(null);
      setFormData({
        code: '',
        name: '',
        address: '',
        phone: '',
        is_active: true,
        is_main: false,
      });
    }
    setIsDialogOpen(true);
  };

  const handleSave = async () => {
    if (!formData.code.trim() || !formData.name.trim()) {
      toast.error('El código y nombre son requeridos');
      return;
    }

    // Validate code format (alphanumeric, max 10 chars)
    if (!/^[A-Za-z0-9]+$/.test(formData.code) || formData.code.length > 10) {
      toast.error('El código debe ser alfanumérico (máx. 10 caracteres)');
      return;
    }

    if (!laundryId) {
      toast.error('No se ha seleccionado una lavandería');
      return;
    }

    setSaving(true);
    try {
      // If setting as main, unset other main branches
      if (formData.is_main && (!editingBranch || !editingBranch.is_main)) {
        await supabase
          .from('branches')
          .update({ is_main: false })
          .eq('laundry_id', laundryId)
          .neq('id', editingBranch?.id || '');
      }

      if (editingBranch) {
        const { error } = await supabase
          .from('branches')
          .update({
            code: formData.code.toUpperCase(),
            name: formData.name,
            address: formData.address || null,
            phone: formData.phone || null,
            is_active: formData.is_active,
            is_main: formData.is_main,
            updated_at: new Date().toISOString(),
          })
          .eq('id', editingBranch.id);

        if (error) throw error;
        toast.success('Sucursal actualizada');
      } else {
        const { error } = await supabase
          .from('branches')
          .insert({
            code: formData.code.toUpperCase(),
            name: formData.name,
            address: formData.address || null,
            phone: formData.phone || null,
            is_active: formData.is_active,
            is_main: formData.is_main,
            laundry_id: laundryId,
          });

        if (error) throw error;
        toast.success('Sucursal creada');
      }

      setIsDialogOpen(false);
      fetchBranches();
    } catch (error: unknown) {
      console.error('Error saving branch:', error);
      if (error && typeof error === 'object' && 'code' in error && error.code === '23505') {
        toast.error('El código de sucursal ya existe');
      } else {
        toast.error('Error al guardar sucursal');
      }
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (branch: Branch) => {
    if (branch.is_main) {
      toast.error('No se puede eliminar la sucursal principal');
      return;
    }

    if (!confirm(`¿Eliminar la sucursal "${branch.name}"?`)) return;

    try {
      const { error } = await supabase
        .from('branches')
        .delete()
        .eq('id', branch.id);

      if (error) throw error;
      toast.success('Sucursal eliminada');
      fetchBranches();
    } catch (error) {
      console.error('Error deleting branch:', error);
      toast.error('Error al eliminar sucursal');
    }
  };

  const openResetDialog = (branch: Branch) => {
    setBranchToReset(branch);
    setConfirmText('');
    setResetDialogOpen(true);
  };

  const handleResetBranchData = async () => {
    if (!branchToReset) return;
    
    if (confirmText !== 'BORRAR') {
      toast.error('Escribe BORRAR para confirmar');
      return;
    }

    setResetting(true);
    try {
      const branchId = branchToReset.id;

      // Delete order_items for orders from this branch
      const { data: branchOrders } = await supabase
        .from('orders')
        .select('id')
        .eq('branch_id', branchId);

      if (branchOrders && branchOrders.length > 0) {
        const orderIds = branchOrders.map(o => o.id);
        
        // Delete order items
        await supabase
          .from('order_items')
          .delete()
          .in('order_id', orderIds);

        // Delete order returns
        await supabase
          .from('order_returns')
          .delete()
          .in('order_id', orderIds);
      }

      // Delete orders from this branch
      await supabase
        .from('orders')
        .delete()
        .eq('branch_id', branchId);

      // Delete cash register entries related to deleted orders (cascades handled) 
      // Also delete any cash_register entries not linked to orders for this branch
      // Note: We need laundry_id for cash_register, not branch_id directly
      // We'll delete based on the orders we deleted (via order_id foreign key cascade if set)
      // For safety, let's also clear cash register for the laundry if needed

      toast.success(`Datos de la sucursal "${branchToReset.name}" eliminados correctamente`);
      setResetDialogOpen(false);
      setBranchToReset(null);
      setConfirmText('');
    } catch (error) {
      console.error('Error resetting branch data:', error);
      toast.error('Error al borrar los datos de la sucursal');
    } finally {
      setResetting(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="w-5 h-5" />
              Sucursales
            </CardTitle>
            <CardDescription>
              Configura las sucursales de tu negocio. El código se usará en los tickets (ej: LC1-2026-001)
            </CardDescription>
          </div>
          {isOwner && (
            <Button onClick={() => handleOpenDialog()} className="gap-2">
              <Plus className="w-4 h-4" />
              Nueva Sucursal
            </Button>
          )}
        </CardHeader>
        <CardContent>
          {branches.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Building2 className="w-12 h-12 mx-auto mb-2 opacity-50" />
              <p>No hay sucursales configuradas</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Código</TableHead>
                  <TableHead>Nombre</TableHead>
                  <TableHead>Dirección</TableHead>
                  <TableHead>Teléfono</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {branches.map((branch) => (
                  <TableRow key={branch.id}>
                    <TableCell className="font-mono font-bold">
                      {branch.code}
                      {branch.is_main && (
                        <Star className="w-3 h-3 inline ml-1 text-amber-500 fill-amber-500" />
                      )}
                    </TableCell>
                    <TableCell className="font-medium">{branch.name}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {branch.address || '-'}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {branch.phone || '-'}
                    </TableCell>
                    <TableCell>
                      <Badge variant={branch.is_active ? 'default' : 'secondary'}>
                        {branch.is_active ? 'Activa' : 'Inactiva'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      {isOwner && (
                        <div className="flex justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleOpenDialog(branch)}
                            title="Editar sucursal"
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="text-amber-600 hover:text-amber-700 hover:bg-amber-100"
                            onClick={() => openResetDialog(branch)}
                            title="Borrar datos de sucursal"
                          >
                            <RotateCcw className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="text-destructive hover:text-destructive"
                            onClick={() => handleDelete(branch)}
                            disabled={branch.is_main}
                            title="Eliminar sucursal"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Edit/Create Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingBranch ? 'Editar Sucursal' : 'Nueva Sucursal'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Código *</Label>
                <Input
                  placeholder="Ej: LC1, LC2"
                  value={formData.code}
                  onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                  maxLength={10}
                  className="font-mono"
                />
                <p className="text-xs text-muted-foreground">
                  Se usará en el código de pedidos
                </p>
              </div>
              <div className="space-y-2">
                <Label>Nombre *</Label>
                <Input
                  placeholder="Sucursal Centro"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                />
              </div>
            </div>
            
            <div className="space-y-2">
              <Label>Dirección</Label>
              <div className="relative">
                <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Av. Principal #123"
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  className="pl-10"
                />
              </div>
            </div>
            
            <div className="space-y-2">
              <Label>Teléfono</Label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="+1 809 123 4567"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  className="pl-10"
                />
              </div>
            </div>
            
            <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
              <div>
                <Label>Sucursal Activa</Label>
                <p className="text-xs text-muted-foreground">
                  Las sucursales inactivas no pueden crear pedidos
                </p>
              </div>
              <Switch
                checked={formData.is_active}
                onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
              />
            </div>
            
            <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
              <div>
                <Label className="flex items-center gap-2">
                  <Star className="w-4 h-4 text-amber-500" />
                  Sucursal Principal
                </Label>
                <p className="text-xs text-muted-foreground">
                  Se usará como predeterminada para nuevos pedidos
                </p>
              </div>
              <Switch
                checked={formData.is_main}
                onCheckedChange={(checked) => setFormData({ ...formData, is_main: checked })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Guardando...
                </>
              ) : (
                'Guardar'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reset Branch Data Alert Dialog */}
      <AlertDialog open={resetDialogOpen} onOpenChange={setResetDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="w-5 h-5" />
              Restablecer datos de sucursal
            </AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-4">
                <p>
                  Estás a punto de <strong className="text-destructive">eliminar todos los datos</strong> de la sucursal <strong>"{branchToReset?.name}"</strong>.
                </p>
                <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-lg text-sm">
                  <p className="font-medium text-destructive mb-2">Se eliminarán permanentemente:</p>
                  <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                    <li>Todos los pedidos de esta sucursal</li>
                    <li>Artículos de los pedidos</li>
                    <li>Devoluciones registradas</li>
                  </ul>
                </div>
                <div className="p-3 bg-muted rounded-lg text-sm">
                  <p className="font-medium mb-2">Se mantendrán intactos:</p>
                  <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                    <li>Configuración de la sucursal</li>
                    <li>Catálogo de servicios y artículos</li>
                    <li>Empleados y usuarios</li>
                    <li>Inventario</li>
                  </ul>
                </div>
                <div className="space-y-2">
                  <Label>Escribe <strong>BORRAR</strong> para confirmar:</Label>
                  <Input
                    value={confirmText}
                    onChange={(e) => setConfirmText(e.target.value)}
                    placeholder="BORRAR"
                    className="font-mono"
                  />
                </div>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => {
              setBranchToReset(null);
              setConfirmText('');
            }}>
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleResetBranchData}
              disabled={confirmText !== 'BORRAR' || resetting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {resetting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Eliminando...
                </>
              ) : (
                <>
                  <RotateCcw className="w-4 h-4 mr-2" />
                  Restablecer
                </>
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}