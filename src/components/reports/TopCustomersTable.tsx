import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { formatCurrency } from '@/lib/currency';
import { useConfig } from '@/contexts/ConfigContext';
import { UserCheck, Star } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface TopCustomer {
  name: string;
  orders: number;
  revenue: number;
}

interface CustomerStats {
  totalCustomers: number;
  newCustomers: number;
  returningCustomers: number;
  topCustomers: TopCustomer[];
}

interface TopCustomersTableProps {
  data: CustomerStats;
  loading?: boolean;
}

export function TopCustomersTable({ data, loading }: TopCustomersTableProps) {
  const { business } = useConfig();

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const getCustomerTier = (revenue: number) => {
    if (revenue >= 5000) return { label: 'VIP', variant: 'default' as const };
    if (revenue >= 2000) return { label: 'Premium', variant: 'secondary' as const };
    return { label: 'Regular', variant: 'outline' as const };
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Mejores Clientes</CardTitle>
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

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2">
          <UserCheck className="h-5 w-5 text-primary" />
          Mejores Clientes
        </CardTitle>
        <div className="flex gap-4 text-sm">
          <div className="text-center">
            <p className="font-bold text-lg">{data.totalCustomers}</p>
            <p className="text-xs text-muted-foreground">Total</p>
          </div>
          <div className="text-center">
            <p className="font-bold text-lg text-emerald-500">{data.newCustomers}</p>
            <p className="text-xs text-muted-foreground">Nuevos</p>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {!data.topCustomers.length ? (
          <div className="h-[200px] flex items-center justify-center text-muted-foreground">
            No hay datos de clientes para mostrar
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Cliente</TableHead>
                <TableHead className="text-center">Órdenes</TableHead>
                <TableHead className="text-right">Gasto Total</TableHead>
                <TableHead className="text-center">Nivel</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.topCustomers.map((customer, index) => {
                const tier = getCustomerTier(customer.revenue);
                return (
                  <TableRow key={index}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Avatar className="h-9 w-9">
                          <AvatarFallback className="bg-secondary text-secondary-foreground text-sm">
                            {getInitials(customer.name)}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{customer.name}</span>
                          {index === 0 && <Star className="h-4 w-4 text-yellow-500 fill-yellow-500" />}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="text-center font-medium">
                      {customer.orders}
                    </TableCell>
                    <TableCell className="text-right font-bold">
                      {formatCurrency(customer.revenue, business.currency)}
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge variant={tier.variant}>{tier.label}</Badge>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
