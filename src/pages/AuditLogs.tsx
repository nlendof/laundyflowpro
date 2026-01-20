import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { Search, Filter, Eye, FileText, RefreshCw } from 'lucide-react';

interface AuditLog {
  id: string;
  user_id: string | null;
  action: string;
  table_name: string | null;
  record_id: string | null;
  old_data: any;
  new_data: any;
  ip_address: string | null;
  user_agent: string | null;
  created_at: string;
  userName?: string;
  userEmail?: string;
}
const AuditLogs = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [actionFilter, setActionFilter] = useState<string>('all');
  const [tableFilter, setTableFilter] = useState<string>('all');
  const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null);

  const { data: logs, isLoading, refetch } = useQuery({
    queryKey: ['audit-logs', actionFilter, tableFilter],
    queryFn: async () => {
      let query = supabase
        .from('audit_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(500);

      if (actionFilter !== 'all') {
        query = query.eq('action', actionFilter);
      }
      if (tableFilter !== 'all') {
        query = query.eq('table_name', tableFilter);
      }

      const { data, error } = await query;
      if (error) throw error;
      
      // Fetch user names for logs
      const userIds = [...new Set(data.filter(d => d.user_id).map(d => d.user_id))];
      let profiles: Record<string, { name: string; email: string }> = {};
      
      if (userIds.length > 0) {
        const { data: profilesData } = await supabase
          .from('profiles')
          .select('id, name, email')
          .in('id', userIds);
        
        if (profilesData) {
          profiles = profilesData.reduce((acc, p) => {
            acc[p.id] = { name: p.name, email: p.email };
            return acc;
          }, {} as Record<string, { name: string; email: string }>);
        }
      }
      
      return data.map(log => ({
        ...log,
        userName: log.user_id && profiles[log.user_id] ? profiles[log.user_id].name : undefined,
        userEmail: log.user_id && profiles[log.user_id] ? profiles[log.user_id].email : undefined,
      })) as AuditLog[];
    }
  });

  // Real-time subscription for audit logs
  useEffect(() => {
    const channel = supabase
      .channel('audit-logs-realtime')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'audit_logs' },
        () => refetch()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [refetch]);

  const { data: tables } = useQuery({
    queryKey: ['audit-tables'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('audit_logs')
        .select('table_name')
        .not('table_name', 'is', null);
      
      if (error) throw error;
      const uniqueTables = [...new Set(data.map(d => d.table_name))];
      return uniqueTables.filter(Boolean) as string[];
    }
  });

  const filteredLogs = logs?.filter(log => {
    if (!searchTerm) return true;
    const searchLower = searchTerm.toLowerCase();
    return (
      log.table_name?.toLowerCase().includes(searchLower) ||
      log.action.toLowerCase().includes(searchLower) ||
      log.userName?.toLowerCase().includes(searchLower) ||
      log.userEmail?.toLowerCase().includes(searchLower) ||
      log.record_id?.toLowerCase().includes(searchLower)
    );
  });

  const getActionBadge = (action: string) => {
    switch (action) {
      case 'INSERT':
        return <Badge className="bg-green-500">Crear</Badge>;
      case 'UPDATE':
        return <Badge className="bg-blue-500">Actualizar</Badge>;
      case 'DELETE':
        return <Badge className="bg-red-500">Eliminar</Badge>;
      case 'BRANCH_DATA_RESET':
        return <Badge className="bg-amber-500">Reset Sucursal</Badge>;
      default:
        return <Badge>{action}</Badge>;
    }
  };

  const getTableLabel = (tableName: string) => {
    const labels: Record<string, string> = {
      orders: 'Pedidos',
      cash_register: 'Caja',
      customers: 'Clientes',
      inventory: 'Inventario',
      catalog_services: 'Servicios',
      catalog_articles: 'Artículos',
      user_roles: 'Roles',
      purchases: 'Compras',
      branches: 'Sucursales',
    };
    return labels[tableName] || tableName;
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <FileText className="h-8 w-8" />
            Registro de Auditoría
          </h1>
          <p className="text-muted-foreground mt-1">
            Historial de todas las acciones realizadas en el sistema
          </p>
        </div>
        <Button onClick={() => refetch()} variant="outline">
          <RefreshCw className="h-4 w-4 mr-2" />
          Actualizar
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filtros
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-4">
            <div className="flex-1 min-w-[200px]">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <Select value={actionFilter} onValueChange={setActionFilter}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Acción" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas</SelectItem>
                <SelectItem value="INSERT">Crear</SelectItem>
                <SelectItem value="UPDATE">Actualizar</SelectItem>
                <SelectItem value="DELETE">Eliminar</SelectItem>
              </SelectContent>
            </Select>
            <Select value={tableFilter} onValueChange={setTableFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Tabla" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas las tablas</SelectItem>
                {tables?.map(table => (
                  <SelectItem key={table} value={table}>
                    {getTableLabel(table)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Fecha/Hora</TableHead>
                <TableHead>Usuario</TableHead>
                <TableHead>Acción</TableHead>
                <TableHead>Módulo</TableHead>
                <TableHead>ID Registro</TableHead>
                <TableHead className="text-right">Detalles</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8">
                    Cargando registros...
                  </TableCell>
                </TableRow>
              ) : filteredLogs?.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                    No se encontraron registros
                  </TableCell>
                </TableRow>
              ) : (
                filteredLogs?.map((log) => (
                  <TableRow key={log.id}>
                    <TableCell className="font-mono text-sm">
                      {format(new Date(log.created_at), 'dd/MM/yyyy HH:mm:ss', { locale: es })}
                    </TableCell>
                    <TableCell>
                      <div>
                        <p className="font-medium">{log.userName || 'Sistema'}</p>
                        <p className="text-xs text-muted-foreground">{log.userEmail || '-'}</p>
                      </div>
                    </TableCell>
                    <TableCell>{getActionBadge(log.action)}</TableCell>
                    <TableCell>{log.table_name ? getTableLabel(log.table_name) : '-'}</TableCell>
                    <TableCell className="font-mono text-xs">
                      {log.record_id?.slice(0, 8) || '-'}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setSelectedLog(log)}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={!!selectedLog} onOpenChange={() => setSelectedLog(null)}>
        <DialogContent className="max-w-3xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle>Detalles del Registro</DialogTitle>
          </DialogHeader>
          {selectedLog && (
            <ScrollArea className="max-h-[60vh]">
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Fecha/Hora</p>
                    <p>{format(new Date(selectedLog.created_at), 'PPpp', { locale: es })}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Usuario</p>
                    <p>{selectedLog.userName || 'Sistema'}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Acción</p>
                    <p>{getActionBadge(selectedLog.action)}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Módulo</p>
                    <p>{selectedLog.table_name ? getTableLabel(selectedLog.table_name) : '-'}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">ID Registro</p>
                    <p className="font-mono text-sm">{selectedLog.record_id || '-'}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">IP</p>
                    <p className="font-mono text-sm">{selectedLog.ip_address || 'No disponible'}</p>
                  </div>
                </div>

                {selectedLog.old_data && (
                  <div>
                    <p className="text-sm font-medium text-muted-foreground mb-2">Datos Anteriores</p>
                    <pre className="bg-muted p-3 rounded-md text-xs overflow-auto">
                      {JSON.stringify(selectedLog.old_data, null, 2)}
                    </pre>
                  </div>
                )}

                {selectedLog.new_data && (
                  <div>
                    <p className="text-sm font-medium text-muted-foreground mb-2">Datos Nuevos</p>
                    <pre className="bg-muted p-3 rounded-md text-xs overflow-auto">
                      {JSON.stringify(selectedLog.new_data, null, 2)}
                    </pre>
                  </div>
                )}
              </div>
            </ScrollArea>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AuditLogs;
