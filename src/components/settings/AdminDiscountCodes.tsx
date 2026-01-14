import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
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
import { Shield, Plus, Trash2, Loader2, Copy, RefreshCw, Key, Percent, DollarSign } from 'lucide-react';
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
  discount_type: 'percentage' | 'fixed';
  discount_value: number;
  admin_name?: string;
}

export function AdminDiscountCodes() {
  const { user } = useAuth();
  const [codes, setCodes] = useState<DiscountCode[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  
  const [formData, setFormData] = useState({
    discountType: 'percentage' as 'percentage' | 'fixed',
    discountValue: 10,
    uses: 1,
    expiresInHours: 24,
  });

  const fetchCodes = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('admin_discount_codes')
        .select(`
          *,
          profiles:admin_id (name)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setCodes((data || []).map(code => ({
        ...code,
        discount_type: code.discount_type || 'percentage',
        discount_value: code.discount_value || 0,
        admin_name: (code.profiles as any)?.name || 'Desconocido',
      })) as DiscountCode[]);
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
    if (formData.discountValue <= 0) {
      toast.error('El valor del descuento debe ser mayor a 0');
      return;
    }
    
    if (formData.discountType === 'percentage' && formData.discountValue > 100) {
      toast.error('El porcentaje no puede ser mayor a 100%');
      return;
    }

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
          discount_type: formData.discountType,
          discount_value: formData.discountValue,
        });

      if (error) throw error;

      const discountLabel = formData.discountType === 'percentage' 
        ? `${formData.discountValue}%` 
        : `RD$ ${formData.discountValue}`;
      
      toast.success(`Código generado: ${code}`, {
        description: `Descuento: ${discountLabel}`,
      });
      
      // Copy to clipboard
      navigator.clipboard.writeText(code);
      
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
              Genera códigos con descuentos específicos. Los cajeros los usarán para aplicar descuentos.
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
              <p className="text-sm">Genera un código cuando un cajero solicite un descuento</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Código</TableHead>
                  <TableHead>Descuento</TableHead>
                  <TableHead>Creado por</TableHead>
                  <TableHead>Usos</TableHead>
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
                        <Badge variant="secondary" className="gap-1">
                          {discountCode.discount_type === 'percentage' ? (
                            <>
                              <Percent className="w-3 h-3" />
                              {discountCode.discount_value}%
                            </>
                          ) : (
                            <>
                              <DollarSign className="w-3 h-3" />
                              RD$ {discountCode.discount_value}
                            </>
                          )}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm font-medium">{discountCode.admin_name}</span>
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
                          <Badge variant="secondary">Usado</Badge>
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
            {/* Discount Type */}
            <div className="space-y-2">
              <Label>Tipo de Descuento</Label>
              <RadioGroup
                value={formData.discountType}
                onValueChange={(value: 'percentage' | 'fixed') => 
                  setFormData({ ...formData, discountType: value })
                }
                className="flex gap-4"
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="percentage" id="percentage" />
                  <Label htmlFor="percentage" className="flex items-center gap-1 cursor-pointer">
                    <Percent className="w-4 h-4" />
                    Porcentaje
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="fixed" id="fixed" />
                  <Label htmlFor="fixed" className="flex items-center gap-1 cursor-pointer">
                    <DollarSign className="w-4 h-4" />
                    Monto Fijo
                  </Label>
                </div>
              </RadioGroup>
            </div>

            {/* Discount Value */}
            <div className="space-y-2">
              <Label>
                {formData.discountType === 'percentage' ? 'Porcentaje (%)' : 'Monto (RD$)'}
              </Label>
              <Input
                type="number"
                min={1}
                max={formData.discountType === 'percentage' ? 100 : undefined}
                value={formData.discountValue}
                onChange={(e) => setFormData({ ...formData, discountValue: parseFloat(e.target.value) || 0 })}
              />
            </div>
            
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