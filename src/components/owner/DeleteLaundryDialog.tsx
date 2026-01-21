import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Separator } from '@/components/ui/separator';
import { AlertTriangle, Download, Loader2, Mail, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';

interface Laundry {
  id: string;
  name: string;
}

interface DeleteLaundryDialogProps {
  laundry: Laundry | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onDeleted: () => void;
}

// Helper to convert array of objects to CSV
function arrayToCSV(data: Record<string, unknown>[], filename: string): string {
  if (!data || data.length === 0) return '';
  
  const headers = Object.keys(data[0]);
  const csvRows: string[] = [];
  
  // Add headers
  csvRows.push(headers.join(','));
  
  // Add data rows
  for (const row of data) {
    const values = headers.map(header => {
      const value = row[header];
      if (value === null || value === undefined) return '';
      if (typeof value === 'object') return `"${JSON.stringify(value).replace(/"/g, '""')}"`;
      if (typeof value === 'string') return `"${value.replace(/"/g, '""')}"`;
      return String(value);
    });
    csvRows.push(values.join(','));
  }
  
  return csvRows.join('\n');
}

export function DeleteLaundryDialog({ 
  laundry, 
  open, 
  onOpenChange, 
  onDeleted 
}: DeleteLaundryDialogProps) {
  const [step, setStep] = useState<'confirm' | 'code'>('confirm');
  const [confirmText, setConfirmText] = useState('');
  const [confirmationCode, setConfirmationCode] = useState('');
  const [maskedEmail, setMaskedEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState(false);

  const handleExportData = async () => {
    if (!laundry) return;

    setExporting(true);
    try {
      toast.info('Exportando datos... Esto puede tomar unos segundos.');

      // Fetch all data for this laundry
      const [
        { data: branches },
        { data: customers },
        { data: orders },
        { data: orderItems },
        { data: catalogServices },
        { data: catalogArticles },
        { data: catalogExtras },
        { data: inventory },
        { data: cashRegister },
        { data: cashClosings },
        { data: expenses },
      ] = await Promise.all([
        supabase.from('branches').select('*').eq('laundry_id', laundry.id),
        supabase.from('customers').select('*').eq('laundry_id', laundry.id),
        supabase.from('orders').select('*').eq('laundry_id', laundry.id),
        supabase.from('order_items').select('*, orders!inner(laundry_id)').eq('orders.laundry_id', laundry.id),
        supabase.from('catalog_services').select('*').eq('laundry_id', laundry.id),
        supabase.from('catalog_articles').select('*').eq('laundry_id', laundry.id),
        supabase.from('catalog_extras').select('*').eq('laundry_id', laundry.id),
        supabase.from('inventory').select('*').eq('laundry_id', laundry.id),
        supabase.from('cash_register').select('*').eq('laundry_id', laundry.id),
        supabase.from('cash_closings').select('*').eq('laundry_id', laundry.id),
        supabase.from('expenses').select('*').eq('laundry_id', laundry.id),
      ]);

      // Clean order_items data (remove join artifacts)
      const cleanOrderItems = orderItems?.map(item => {
        const { orders, ...rest } = item as { orders?: unknown } & Record<string, unknown>;
        return rest;
      }) || [];

      // Create export package
      const exportData = {
        metadata: {
          laundry_name: laundry.name,
          laundry_id: laundry.id,
          export_date: new Date().toISOString(),
          export_format_version: '1.0',
          tables_included: [
            'branches', 'customers', 'orders', 'order_items',
            'catalog_services', 'catalog_articles', 'catalog_extras',
            'inventory', 'cash_register', 'cash_closings', 'expenses'
          ],
        },
        data: {
          branches: branches || [],
          customers: customers || [],
          orders: orders || [],
          order_items: cleanOrderItems,
          catalog_services: catalogServices || [],
          catalog_articles: catalogArticles || [],
          catalog_extras: catalogExtras || [],
          inventory: inventory || [],
          cash_register: cashRegister || [],
          cash_closings: cashClosings || [],
          expenses: expenses || [],
        },
      };

      // Generate safe filename
      const safeName = laundry.name.replace(/[^a-zA-Z0-9]/g, '_').toLowerCase();
      const dateStr = format(new Date(), 'yyyy-MM-dd_HHmm');

      // Create ZIP-like package with multiple CSV files and a JSON
      const files: { name: string; content: string }[] = [];

      // Add JSON file with all data (for complete restore)
      files.push({
        name: `${safeName}_complete_${dateStr}.json`,
        content: JSON.stringify(exportData, null, 2),
      });

      // Add individual CSV files for each table (for Excel/spreadsheet import)
      const tables: { key: keyof typeof exportData.data; name: string }[] = [
        { key: 'branches', name: 'sucursales' },
        { key: 'customers', name: 'clientes' },
        { key: 'orders', name: 'pedidos' },
        { key: 'order_items', name: 'items_pedidos' },
        { key: 'catalog_services', name: 'servicios' },
        { key: 'catalog_articles', name: 'articulos' },
        { key: 'catalog_extras', name: 'extras' },
        { key: 'inventory', name: 'inventario' },
        { key: 'cash_register', name: 'caja' },
        { key: 'cash_closings', name: 'cierres_caja' },
        { key: 'expenses', name: 'gastos' },
      ];

      for (const table of tables) {
        const data = exportData.data[table.key];
        if (data && data.length > 0) {
          files.push({
            name: `${safeName}_${table.name}_${dateStr}.csv`,
            content: arrayToCSV(data as Record<string, unknown>[], table.name),
          });
        }
      }

      // Create a summary README
      const readme = `# Exportación de Datos - ${laundry.name}

Fecha de exportación: ${format(new Date(), 'dd/MM/yyyy HH:mm:ss')}

## Contenido del paquete:

### Archivo JSON (respaldo completo)
- ${safeName}_complete_${dateStr}.json - Contiene todos los datos en formato JSON para restauración completa

### Archivos CSV (para importar en Excel u otros sistemas)
${tables.map(t => {
  const count = (exportData.data[t.key] || []).length;
  return `- ${t.name}: ${count} registros`;
}).join('\n')}

## Estadísticas:
- Sucursales: ${(branches || []).length}
- Clientes: ${(customers || []).length}
- Pedidos: ${(orders || []).length}
- Items de pedidos: ${cleanOrderItems.length}
- Servicios en catálogo: ${(catalogServices || []).length}
- Artículos en catálogo: ${(catalogArticles || []).length}
- Extras en catálogo: ${(catalogExtras || []).length}
- Items de inventario: ${(inventory || []).length}
- Registros de caja: ${(cashRegister || []).length}
- Cierres de caja: ${(cashClosings || []).length}
- Gastos: ${(expenses || []).length}

## Notas de importación:
- Los archivos CSV usan comas como separador y comillas para campos de texto
- El archivo JSON contiene referencias de ID para mantener relaciones
- Las fechas están en formato ISO 8601 (YYYY-MM-DDTHH:mm:ss.sssZ)
- Los campos JSONB se exportan como texto JSON escapado en CSV
`;

      files.push({
        name: `README_${safeName}_${dateStr}.txt`,
        content: readme,
      });

      // Download all files (we'll zip them if possible, or download individually)
      // For simplicity, download the complete JSON file
      const jsonBlob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
      const jsonUrl = URL.createObjectURL(jsonBlob);
      const jsonLink = document.createElement('a');
      jsonLink.href = jsonUrl;
      jsonLink.download = `${safeName}_complete_${dateStr}.json`;
      jsonLink.click();
      URL.revokeObjectURL(jsonUrl);

      // Also download a combined CSV for the most important tables
      const combinedCsvParts: string[] = [];
      combinedCsvParts.push('=== EXPORTACIÓN DE DATOS ===');
      combinedCsvParts.push(`Lavandería: ${laundry.name}`);
      combinedCsvParts.push(`Fecha: ${format(new Date(), 'dd/MM/yyyy HH:mm:ss')}`);
      combinedCsvParts.push('');
      
      for (const table of tables) {
        const data = exportData.data[table.key];
        if (data && data.length > 0) {
          combinedCsvParts.push(`=== ${table.name.toUpperCase()} (${data.length} registros) ===`);
          combinedCsvParts.push(arrayToCSV(data as Record<string, unknown>[], table.name));
          combinedCsvParts.push('');
        }
      }

      const csvBlob = new Blob([combinedCsvParts.join('\n')], { type: 'text/csv;charset=utf-8' });
      const csvUrl = URL.createObjectURL(csvBlob);
      const csvLink = document.createElement('a');
      csvLink.href = csvUrl;
      csvLink.download = `${safeName}_datos_${dateStr}.csv`;
      csvLink.click();
      URL.revokeObjectURL(csvUrl);

      toast.success(`Datos exportados: ${(orders || []).length} pedidos, ${(customers || []).length} clientes`);
    } catch (error) {
      console.error('Error exporting data:', error);
      toast.error('Error al exportar los datos');
    } finally {
      setExporting(false);
    }
  };

  const handleRequestCode = async () => {
    if (confirmText !== 'ELIMINAR') {
      toast.error('Escribe ELIMINAR para continuar');
      return;
    }

    if (!laundry) return;

    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('delete-laundry', {
        body: {
          laundry_id: laundry.id,
          action: 'request_code',
        },
      });

      if (error) throw error;
      if (data.error) throw new Error(data.error);

      setMaskedEmail(data.email || '');
      setStep('code');
      toast.success('Código enviado a tu correo');
    } catch (error) {
      console.error('Error requesting code:', error);
      toast.error(error instanceof Error ? error.message : 'Error al solicitar código');
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!confirmationCode.trim() || confirmationCode.length !== 6) {
      toast.error('Ingresa el código de 6 dígitos');
      return;
    }

    if (!laundry) return;

    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('delete-laundry', {
        body: {
          laundry_id: laundry.id,
          action: 'confirm_delete',
          confirmation_code: confirmationCode,
        },
      });

      if (error) throw error;
      if (data.error) throw new Error(data.error);

      toast.success(data.message || 'Lavandería eliminada');
      handleClose();
      onDeleted();
    } catch (error) {
      console.error('Error deleting laundry:', error);
      toast.error(error instanceof Error ? error.message : 'Error al eliminar');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setStep('confirm');
    setConfirmText('');
    setConfirmationCode('');
    setMaskedEmail('');
    onOpenChange(false);
  };

  if (!laundry) return null;

  return (
    <AlertDialog open={open} onOpenChange={handleClose}>
      <AlertDialogContent className="max-w-md">
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2 text-destructive">
            <AlertTriangle className="w-5 h-5" />
            {step === 'confirm' ? 'Eliminar Lavandería' : 'Confirmar Eliminación'}
          </AlertDialogTitle>
          <AlertDialogDescription className="space-y-3" asChild>
            <div>
              {step === 'confirm' ? (
                <>
                  <p>
                    Estás a punto de eliminar <strong className="text-foreground">{laundry.name}</strong> permanentemente.
                  </p>

                  {/* Export section */}
                  <div className="bg-primary/5 border border-primary/20 rounded-lg p-3">
                    <p className="text-sm font-medium text-foreground mb-2 flex items-center gap-2">
                      <Download className="w-4 h-4 text-primary" />
                      ¿Deseas guardar tus datos primero?
                    </p>
                    <p className="text-xs text-muted-foreground mb-3">
                      Exporta todos los registros en formato CSV y JSON para importar en otro sistema.
                    </p>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleExportData}
                      disabled={exporting}
                      className="w-full gap-2"
                    >
                      {exporting ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Download className="w-4 h-4" />
                      )}
                      {exporting ? 'Exportando...' : 'Exportar Todos los Datos'}
                    </Button>
                  </div>

                  <Separator />

                  <div className="bg-destructive/10 border border-destructive/30 rounded-lg p-3 text-sm">
                    <p className="font-semibold text-destructive mb-2">⚠️ Esta acción es IRREVERSIBLE</p>
                    <p className="text-muted-foreground">Se eliminarán:</p>
                    <ul className="text-muted-foreground list-disc list-inside mt-1 space-y-1">
                      <li>Todas las sucursales</li>
                      <li>Todos los pedidos e historial</li>
                      <li>Todos los clientes</li>
                      <li>Todo el inventario y catálogo</li>
                      <li>Todos los registros de caja</li>
                    </ul>
                  </div>
                  <div className="space-y-2 pt-2">
                    <Label htmlFor="confirm-text">
                      Escribe <span className="font-mono font-bold text-destructive">ELIMINAR</span> para continuar:
                    </Label>
                    <Input
                      id="confirm-text"
                      value={confirmText}
                      onChange={(e) => setConfirmText(e.target.value.toUpperCase())}
                      placeholder="ELIMINAR"
                      className="font-mono"
                    />
                  </div>
                </>
              ) : (
                <>
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Mail className="w-4 h-4" />
                    <span>Código enviado a: <strong>{maskedEmail}</strong></span>
                  </div>
                  <p className="text-sm">
                    Ingresa el código de 6 dígitos que recibiste en tu correo para confirmar la eliminación.
                  </p>
                  <div className="space-y-2 pt-2">
                    <Label htmlFor="confirmation-code">Código de confirmación:</Label>
                    <Input
                      id="confirmation-code"
                      value={confirmationCode}
                      onChange={(e) => setConfirmationCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                      placeholder="000000"
                      className="font-mono text-center text-2xl tracking-widest"
                      maxLength={6}
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    El código expira en 10 minutos.
                  </p>
                </>
              )}
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={loading || exporting}>
            Cancelar
          </Button>
          {step === 'confirm' ? (
            <Button
              variant="destructive"
              onClick={handleRequestCode}
              disabled={loading || confirmText !== 'ELIMINAR'}
              className="gap-2"
            >
              {loading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Mail className="w-4 h-4" />
              )}
              Enviar Código
            </Button>
          ) : (
            <Button
              variant="destructive"
              onClick={handleConfirmDelete}
              disabled={loading || confirmationCode.length !== 6}
              className="gap-2"
            >
              {loading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Trash2 className="w-4 h-4" />
              )}
              Eliminar Permanentemente
            </Button>
          )}
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
