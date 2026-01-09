import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { Download, FileJson, Loader2 } from 'lucide-react';

const EXPORTABLE_TABLES = [
  { key: 'orders', label: 'Pedidos', description: 'Todos los pedidos y su información' },
  { key: 'order_items', label: 'Items de Pedidos', description: 'Detalles de cada item en los pedidos' },
  { key: 'customers', label: 'Clientes', description: 'Base de datos de clientes' },
  { key: 'cash_register', label: 'Movimientos de Caja', description: 'Ingresos y egresos' },
  { key: 'cash_closings', label: 'Cierres de Caja', description: 'Historial de cierres' },
  { key: 'inventory', label: 'Inventario', description: 'Stock de insumos' },
  { key: 'catalog_services', label: 'Servicios', description: 'Catálogo de servicios' },
  { key: 'catalog_articles', label: 'Artículos', description: 'Catálogo de artículos' },
  { key: 'purchases', label: 'Compras', description: 'Registro de compras' },
  { key: 'purchase_items', label: 'Items de Compras', description: 'Detalles de cada compra' },
  { key: 'expenses', label: 'Gastos', description: 'Registro de gastos' },
  { key: 'profiles', label: 'Perfiles', description: 'Información de usuarios' },
];

export function DataExportSettings() {
  const [selectedTables, setSelectedTables] = useState<string[]>([]);
  const [isExporting, setIsExporting] = useState(false);

  const handleSelectAll = () => {
    if (selectedTables.length === EXPORTABLE_TABLES.length) {
      setSelectedTables([]);
    } else {
      setSelectedTables(EXPORTABLE_TABLES.map(t => t.key));
    }
  };

  const handleToggleTable = (key: string) => {
    setSelectedTables(prev =>
      prev.includes(key)
        ? prev.filter(t => t !== key)
        : [...prev, key]
    );
  };

  const handleExport = async () => {
    if (selectedTables.length === 0) {
      toast.error('Selecciona al menos una tabla para exportar');
      return;
    }

    setIsExporting(true);

    try {
      const exportData: Record<string, any> = {
        exportDate: new Date().toISOString(),
        tables: {},
      };

      for (const table of selectedTables) {
        const { data, error } = await supabase
          .from(table as any)
          .select('*')
          .limit(10000);

        if (error) {
          console.error(`Error exporting ${table}:`, error);
          exportData.tables[table] = { error: error.message };
        } else {
          exportData.tables[table] = {
            count: data?.length || 0,
            data: data || [],
          };
        }
      }

      // Create and download file
      const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `backup_${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast.success('Exportación completada');
    } catch (error) {
      console.error('Export error:', error);
      toast.error('Error al exportar los datos');
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Download className="h-5 w-5" />
          Exportar Datos
        </CardTitle>
        <CardDescription>
          Descarga un backup de tus datos en formato JSON
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between pb-2 border-b">
          <Label className="font-medium">Seleccionar tablas a exportar</Label>
          <Button variant="outline" size="sm" onClick={handleSelectAll}>
            {selectedTables.length === EXPORTABLE_TABLES.length ? 'Deseleccionar todo' : 'Seleccionar todo'}
          </Button>
        </div>

        <div className="grid gap-3 max-h-[300px] overflow-y-auto">
          {EXPORTABLE_TABLES.map(table => (
            <div key={table.key} className="flex items-start space-x-3">
              <Checkbox
                id={table.key}
                checked={selectedTables.includes(table.key)}
                onCheckedChange={() => handleToggleTable(table.key)}
              />
              <div className="flex-1">
                <Label htmlFor={table.key} className="font-medium cursor-pointer">
                  {table.label}
                </Label>
                <p className="text-xs text-muted-foreground">{table.description}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="pt-4 border-t">
          <Button
            onClick={handleExport}
            disabled={isExporting || selectedTables.length === 0}
            className="w-full"
          >
            {isExporting ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Exportando...
              </>
            ) : (
              <>
                <FileJson className="h-4 w-4 mr-2" />
                Descargar Backup ({selectedTables.length} tablas)
              </>
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
