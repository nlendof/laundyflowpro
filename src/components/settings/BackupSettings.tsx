import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Download, 
  Upload, 
  Database, 
  AlertTriangle, 
  CheckCircle, 
  Loader2,
  FileJson,
  Shield,
  RefreshCw
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

interface BackupData {
  version: string;
  createdAt: string;
  tables: {
    customers: any[];
    orders: any[];
    order_items: any[];
    catalog_services: any[];
    catalog_articles: any[];
    catalog_extras: any[];
    inventory: any[];
    inventory_movements: any[];
    cash_register: any[];
    cash_closings: any[];
    expenses: any[];
    system_config: any[];
  };
}

const BACKUP_TABLES = [
  { key: 'customers', label: 'Clientes', description: 'Datos de clientes registrados' },
  { key: 'orders', label: 'Pedidos', description: 'Historial de pedidos y ventas' },
  { key: 'order_items', label: 'Items de Pedidos', description: 'Detalle de servicios por pedido' },
  { key: 'catalog_services', label: 'Servicios', description: 'Catálogo de servicios' },
  { key: 'catalog_articles', label: 'Artículos', description: 'Catálogo de artículos' },
  { key: 'catalog_extras', label: 'Extras', description: 'Servicios extra' },
  { key: 'inventory', label: 'Inventario', description: 'Stock de suministros' },
  { key: 'inventory_movements', label: 'Movimientos de Inventario', description: 'Historial de movimientos' },
  { key: 'cash_register', label: 'Caja', description: 'Movimientos de caja' },
  { key: 'cash_closings', label: 'Cierres de Caja', description: 'Historial de cierres' },
  { key: 'expenses', label: 'Gastos', description: 'Registro de gastos' },
  { key: 'system_config', label: 'Configuración', description: 'Configuración del sistema' },
];

export function BackupSettings() {
  const [isExporting, setIsExporting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [selectedTables, setSelectedTables] = useState<string[]>(BACKUP_TABLES.map(t => t.key));
  const [showRestoreDialog, setShowRestoreDialog] = useState(false);
  const [pendingBackupData, setPendingBackupData] = useState<BackupData | null>(null);
  const [restoreProgress, setRestoreProgress] = useState<string>('');

  const toggleTable = (key: string) => {
    setSelectedTables(prev => 
      prev.includes(key) 
        ? prev.filter(t => t !== key)
        : [...prev, key]
    );
  };

  const selectAll = () => {
    setSelectedTables(BACKUP_TABLES.map(t => t.key));
  };

  const deselectAll = () => {
    setSelectedTables([]);
  };

  const handleExport = async () => {
    if (selectedTables.length === 0) {
      toast.error('Selecciona al menos una tabla para exportar');
      return;
    }

    setIsExporting(true);
    try {
      const backupData: BackupData = {
        version: '1.0',
        createdAt: new Date().toISOString(),
        tables: {
          customers: [],
          orders: [],
          order_items: [],
          catalog_services: [],
          catalog_articles: [],
          catalog_extras: [],
          inventory: [],
          inventory_movements: [],
          cash_register: [],
          cash_closings: [],
          expenses: [],
          system_config: [],
        }
      };

      // Fetch data from each selected table
      for (const tableKey of selectedTables) {
        const { data, error } = await supabase
          .from(tableKey as any)
          .select('*');

        if (error) {
          console.error(`Error fetching ${tableKey}:`, error);
          toast.error(`Error al exportar ${tableKey}: ${error.message}`);
          continue;
        }

        (backupData.tables as any)[tableKey] = data || [];
      }

      // Create and download the backup file
      const blob = new Blob([JSON.stringify(backupData, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `lavanderia_backup_${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      toast.success('Backup exportado exitosamente');
    } catch (error: any) {
      console.error('Export error:', error);
      toast.error('Error al crear el backup: ' + error.message);
    } finally {
      setIsExporting(false);
    }
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const content = e.target?.result as string;
        const data = JSON.parse(content) as BackupData;

        // Validate backup structure
        if (!data.version || !data.tables) {
          toast.error('Archivo de backup inválido');
          return;
        }

        setPendingBackupData(data);
        setShowRestoreDialog(true);
      } catch (error) {
        toast.error('Error al leer el archivo de backup');
      }
    };
    reader.readAsText(file);
    
    // Reset input
    event.target.value = '';
  };

  const handleRestore = async () => {
    if (!pendingBackupData) return;

    setIsImporting(true);
    setRestoreProgress('Iniciando restauración...');

    try {
      const tables = pendingBackupData.tables;
      const tableOrder = [
        'system_config',
        'catalog_services',
        'catalog_articles', 
        'catalog_extras',
        'inventory',
        'customers',
        'orders',
        'order_items',
        'inventory_movements',
        'cash_register',
        'cash_closings',
        'expenses',
      ];

      for (const tableKey of tableOrder) {
        const tableData = (tables as any)[tableKey];
        if (!tableData || tableData.length === 0) continue;

        if (!selectedTables.includes(tableKey)) continue;

        setRestoreProgress(`Restaurando ${tableKey}...`);

        // Delete existing data first (optional - could add a checkbox for this)
        const { error: deleteError } = await supabase
          .from(tableKey as any)
          .delete()
          .neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all

        if (deleteError) {
          console.error(`Error deleting ${tableKey}:`, deleteError);
        }

        // Insert backup data in batches
        const batchSize = 100;
        for (let i = 0; i < tableData.length; i += batchSize) {
          const batch = tableData.slice(i, i + batchSize);
          const { error: insertError } = await supabase
            .from(tableKey as any)
            .insert(batch as any);

          if (insertError) {
            console.error(`Error inserting into ${tableKey}:`, insertError);
            toast.error(`Error al restaurar ${tableKey}: ${insertError.message}`);
          }
        }
      }

      setRestoreProgress('');
      setShowRestoreDialog(false);
      setPendingBackupData(null);
      toast.success('Backup restaurado exitosamente');
      
      // Reload page to refresh all data
      setTimeout(() => {
        window.location.reload();
      }, 1500);
    } catch (error: any) {
      console.error('Restore error:', error);
      toast.error('Error al restaurar el backup: ' + error.message);
    } finally {
      setIsImporting(false);
      setRestoreProgress('');
    }
  };

  return (
    <div className="space-y-6">
      {/* Export Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Download className="w-5 h-5" />
            Crear Backup
          </CardTitle>
          <CardDescription>
            Exporta los datos de tu lavandería a un archivo JSON que podrás guardar de forma segura
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-2 mb-4">
            <Button variant="outline" size="sm" onClick={selectAll}>
              Seleccionar Todo
            </Button>
            <Button variant="outline" size="sm" onClick={deselectAll}>
              Deseleccionar Todo
            </Button>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {BACKUP_TABLES.map((table) => (
              <div
                key={table.key}
                className="flex items-start space-x-3 p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
              >
                <Checkbox
                  id={`export-${table.key}`}
                  checked={selectedTables.includes(table.key)}
                  onCheckedChange={() => toggleTable(table.key)}
                />
                <div className="space-y-1">
                  <Label
                    htmlFor={`export-${table.key}`}
                    className="text-sm font-medium cursor-pointer"
                  >
                    {table.label}
                  </Label>
                  <p className="text-xs text-muted-foreground">{table.description}</p>
                </div>
              </div>
            ))}
          </div>

          <Button 
            onClick={handleExport} 
            disabled={isExporting || selectedTables.length === 0}
            className="w-full sm:w-auto gap-2"
          >
            {isExporting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Exportando...
              </>
            ) : (
              <>
                <Download className="w-4 h-4" />
                Descargar Backup
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {/* Import Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Upload className="w-5 h-5" />
            Restaurar Backup
          </CardTitle>
          <CardDescription>
            Carga un archivo de backup previamente exportado para restaurar tus datos
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert className="border-amber-500/50 bg-amber-500/10">
            <AlertTriangle className="h-4 w-4 text-amber-500" />
            <AlertDescription className="text-amber-700 dark:text-amber-400">
              <strong>Advertencia:</strong> La restauración reemplazará los datos actuales con los del backup. 
              Se recomienda crear un backup de los datos actuales antes de restaurar.
            </AlertDescription>
          </Alert>

          <div className="flex flex-col items-center justify-center p-8 border-2 border-dashed rounded-lg bg-muted/50">
            <FileJson className="w-12 h-12 text-muted-foreground mb-4" />
            <p className="text-sm text-muted-foreground mb-4">
              Selecciona un archivo .json de backup
            </p>
            <Label htmlFor="backup-file" className="cursor-pointer">
              <Input
                id="backup-file"
                type="file"
                accept=".json"
                onChange={handleFileSelect}
                className="hidden"
              />
              <Button variant="outline" className="gap-2" asChild>
                <span>
                  <Upload className="w-4 h-4" />
                  Seleccionar Archivo
                </span>
              </Button>
            </Label>
          </div>
        </CardContent>
      </Card>

      {/* Tips Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="w-5 h-5" />
            Recomendaciones de Seguridad
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li className="flex items-start gap-2">
              <CheckCircle className="w-4 h-4 text-green-500 mt-0.5 shrink-0" />
              <span>Crea backups regularmente (recomendado: diario o semanal)</span>
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle className="w-4 h-4 text-green-500 mt-0.5 shrink-0" />
              <span>Guarda los backups en múltiples ubicaciones (nube, disco externo)</span>
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle className="w-4 h-4 text-green-500 mt-0.5 shrink-0" />
              <span>Verifica que el archivo de backup se descargó correctamente antes de eliminar datos</span>
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle className="w-4 h-4 text-green-500 mt-0.5 shrink-0" />
              <span>Antes de restaurar, crea un backup de los datos actuales por seguridad</span>
            </li>
          </ul>
        </CardContent>
      </Card>

      {/* Restore Confirmation Dialog */}
      <Dialog open={showRestoreDialog} onOpenChange={setShowRestoreDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <RefreshCw className="w-5 h-5" />
              Confirmar Restauración
            </DialogTitle>
            <DialogDescription>
              Estás a punto de restaurar un backup creado el{' '}
              <strong>
                {pendingBackupData?.createdAt 
                  ? new Date(pendingBackupData.createdAt).toLocaleDateString('es-MX', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    })
                  : 'fecha desconocida'}
              </strong>
            </DialogDescription>
          </DialogHeader>

          {pendingBackupData && (
            <div className="space-y-4">
              <div className="p-3 bg-muted rounded-lg">
                <p className="text-sm font-medium mb-2">Datos a restaurar:</p>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  {Object.entries(pendingBackupData.tables).map(([key, data]) => {
                    const tableInfo = BACKUP_TABLES.find(t => t.key === key);
                    const count = (data as any[]).length;
                    if (count === 0) return null;
                    return (
                      <div key={key} className="flex justify-between">
                        <span className="text-muted-foreground">{tableInfo?.label || key}:</span>
                        <span className="font-medium">{count} registros</span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {restoreProgress && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  {restoreProgress}
                </div>
              )}

              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  Esta acción eliminará los datos actuales y los reemplazará con los del backup.
                  Esta acción no se puede deshacer.
                </AlertDescription>
              </Alert>
            </div>
          )}

          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => setShowRestoreDialog(false)}
              disabled={isImporting}
            >
              Cancelar
            </Button>
            <Button 
              variant="destructive" 
              onClick={handleRestore}
              disabled={isImporting}
              className="gap-2"
            >
              {isImporting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Restaurando...
                </>
              ) : (
                <>
                  <RefreshCw className="w-4 h-4" />
                  Restaurar Backup
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
