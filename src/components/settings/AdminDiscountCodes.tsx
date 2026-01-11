import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
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
import { Shield, Plus, Trash2, Loader2, Copy, RefreshCw, Key } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

interface DiscountCode {
  id: string;
  admin_id: string;
  code: string;
  is_active: boolean;
  uses_remaining: number;
  expires_at: string | null;
  created_at: string;
}

export function AdminDiscountCodes() {
  const { user } = useAuth();
  const [codes, setCodes] = useState<DiscountCode[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  
  const [formData, setFormData] = useState({
    uses: 1,
    expiresInHours: 24,
  });

  const fetchCodes = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('admin_discount_codes')
        .select('*')
        .eq('admin_id', user?.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setCodes(data || []);
    } catch (error) {
      console.error('Error fetching codes:', error);
      toast.error('Error al cargar códigos');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user?.id) {
      fetchCodes();
    }
  }, [user?.id]);

  const generateCode = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let code = '';
    for (let i = 0; i < 6; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
  };

  const handleGenerateCode = async () => {
    setGenerating(true);
    try {
      const code = generateCode();
      const expiresAt = new Date();
      expiresAt.setHours(expiresAt.getHours() + formData.expiresInHours);

      const { error } = await supabase
        .from('admin_discount_codes')
        .insert({
          admin_id: user?.id,
          code,
          uses_remaining: formData.uses,
          expires_at: expiresAt.toISOString(),
        });

      if (error) throw error;

      toast.success(`Código generado: ${code}`);
      setIsDialogOpen(false);
      fetchCodes();
    } catch (error) {
      console.error('Error generating code:', error);
      toast.error('Error al generar código');
    } finally {
      setGenerating(false);
    }
  };

  const handleCopyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    toast.success('Código copiado al portapapeles');
  };

  const handleDeleteCode = async (id: string) => {
    try {
      const { error } = await supabase
        .from('admin_discount_codes')
        .delete()
        .eq('id', id);

      if (error) throw error;
      toast.success('Código eliminado');
      fetchCodes();
    } catch (error) {
      console.error('Error deleting code:', error);
      toast.error('Error al eliminar código');
    }
  };

  const isCodeExpired = (expiresAt: string | null) => {
    if (!expiresAt) return false;
    return new Date(expiresAt) < new Date();
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
              <Shield className="w-5 h-5" />
              Códigos de Descuento
            </CardTitle>
            <CardDescription>
              Genera códigos para aprobar descuentos mayores. Los cajeros pueden usarlos para aplicar descuentos especiales.
            </CardDescription>
          </div>
          <Button onClick={() => setIsDialogOpen(true)} className="gap-2">
            <Plus className="w-4 h-4" />
            Generar Código
          </Button>
        </CardHeader>
        <CardContent>
          {codes.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Key className="w-12 h-12 mx-auto mb-2 opacity-50" />
              <p>No hay códigos activos</p>
              <p className="text-sm">Genera un código para aprobar descuentos</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Código</TableHead>
                  <TableHead>Usos Restantes</TableHead>
                  <TableHead>Expira</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {codes.map((discountCode) => {
                  const expired = isCodeExpired(discountCode.expires_at);
                  const exhausted = discountCode.uses_remaining <= 0;
                  const inactive = !discountCode.is_active;
                  
                  return (
                    <TableRow key={discountCode.id} className={expired || exhausted ? 'opacity-50' : ''}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <code className="text-lg font-mono font-bold tracking-widest">
                            {discountCode.code}
                          </code>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6"
                            onClick={() => handleCopyCode(discountCode.code)}
                          >
                            <Copy className="w-3 h-3" />
                          </Button>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={exhausted ? 'secondary' : 'default'}>
                          {discountCode.uses_remaining}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {discountCode.expires_at ? (
                          <span className={expired ? 'text-destructive' : ''}>
                            {format(new Date(discountCode.expires_at), 'dd MMM HH:mm', { locale: es })}
                          </span>
                        ) : (
                          'Sin expiración'
                        )}
                      </TableCell>
                      <TableCell>
                        {expired ? (
                          <Badge variant="destructive">Expirado</Badge>
                        ) : exhausted ? (
                          <Badge variant="secondary">Agotado</Badge>
                        ) : inactive ? (
                          <Badge variant="outline">Inactivo</Badge>
                        ) : (
                          <Badge variant="default" className="bg-green-500">Activo</Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-destructive hover:text-destructive"
                          onClick={() => handleDeleteCode(discountCode.id)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Generate Code Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <RefreshCw className="w-5 h-5" />
              Generar Código de Descuento
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Número de Usos</Label>
              <Input
                type="number"
                min={1}
                max={100}
                value={formData.uses}
                onChange={(e) => setFormData({ ...formData, uses: parseInt(e.target.value) || 1 })}
              />
              <p className="text-xs text-muted-foreground">
                Cuántas veces se puede usar este código
              </p>
            </div>
            
            <div className="space-y-2">
              <Label>Expira en (horas)</Label>
              <Input
                type="number"
                min={1}
                max={720}
                value={formData.expiresInHours}
                onChange={(e) => setFormData({ ...formData, expiresInHours: parseInt(e.target.value) || 24 })}
              />
              <p className="text-xs text-muted-foreground">
                El código expirará después de este tiempo
              </p>
            </div>

            <div className="flex gap-2">
              {[1, 4, 12, 24, 48].map((hours) => (
                <Button
                  key={hours}
                  variant={formData.expiresInHours === hours ? 'default' : 'outline'}
                  size="sm"
                  className="flex-1 text-xs"
                  onClick={() => setFormData({ ...formData, expiresInHours: hours })}
                >
                  {hours}h
                </Button>
              ))}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleGenerateCode} disabled={generating}>
              {generating ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Generando...
                </>
              ) : (
                'Generar'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}