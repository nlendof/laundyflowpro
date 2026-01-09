import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { formatCurrency } from '@/lib/currency';
import { useConfig } from '@/contexts/ConfigContext';
import { Users, Trophy, TrendingUp } from 'lucide-react';
import { Progress } from '@/components/ui/progress';

interface EmployeePerformance {
  id: string;
  name: string;
  ordersProcessed: number;
  revenue: number;
  avgTime: number;
}

interface EmployeePerformanceTableProps {
  data: EmployeePerformance[];
  loading?: boolean;
}

export function EmployeePerformanceTable({ data, loading }: EmployeePerformanceTableProps) {
  const { business } = useConfig();

  const maxRevenue = Math.max(...data.map(e => e.revenue), 1);
  const maxOrders = Math.max(...data.map(e => e.ordersProcessed), 1);

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const getRankBadge = (index: number) => {
    if (index === 0) return <Trophy className="h-5 w-5 text-yellow-500" />;
    if (index === 1) return <Trophy className="h-5 w-5 text-gray-400" />;
    if (index === 2) return <Trophy className="h-5 w-5 text-amber-600" />;
    return <span className="text-muted-foreground font-medium">{index + 1}</span>;
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Rendimiento de Empleados</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="animate-pulse flex items-center gap-4">
                <div className="h-10 w-10 bg-muted rounded-full"></div>
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-muted rounded w-1/3"></div>
                  <div className="h-3 bg-muted rounded w-1/2"></div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!data.length) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5 text-primary" />
            Rendimiento de Empleados
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[200px] flex items-center justify-center text-muted-foreground">
            No hay datos de rendimiento para mostrar
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Users className="h-5 w-5 text-primary" />
          Rendimiento de Empleados
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-12">#</TableHead>
              <TableHead>Empleado</TableHead>
              <TableHead className="text-center">Órdenes</TableHead>
              <TableHead className="text-right">Ingresos Generados</TableHead>
              <TableHead className="w-[180px]">Contribución</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.map((employee, index) => (
              <TableRow key={employee.id}>
                <TableCell className="text-center">
                  {getRankBadge(index)}
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-3">
                    <Avatar className="h-9 w-9">
                      <AvatarFallback className="bg-primary/10 text-primary text-sm">
                        {getInitials(employee.name)}
                      </AvatarFallback>
                    </Avatar>
                    <span className="font-medium">{employee.name}</span>
                  </div>
                </TableCell>
                <TableCell className="text-center">
                  <div className="flex items-center justify-center gap-2">
                    <span className="font-medium">{employee.ordersProcessed}</span>
                    <span className="text-xs text-muted-foreground">
                      ({((employee.ordersProcessed / maxOrders) * 100).toFixed(0)}%)
                    </span>
                  </div>
                </TableCell>
                <TableCell className="text-right font-medium">
                  {formatCurrency(employee.revenue, business.currency)}
                </TableCell>
                <TableCell>
                  <div className="space-y-1">
                    <Progress 
                      value={(employee.revenue / maxRevenue) * 100} 
                      className="h-2"
                    />
                    <span className="text-xs text-muted-foreground">
                      {((employee.revenue / maxRevenue) * 100).toFixed(0)}% del total
                    </span>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
