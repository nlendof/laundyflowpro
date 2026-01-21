import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Download, FileText, ExternalLink } from 'lucide-react';
import { SubscriptionPayment } from '@/hooks/useSubscription';
import { formatCurrency } from '@/lib/currency';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

interface PaymentHistoryTableProps {
  payments: SubscriptionPayment[];
  loading?: boolean;
}

const statusConfig: Record<string, { label: string; className: string }> = {
  pending: { label: 'Pendiente', className: 'bg-yellow-100 text-yellow-800' },
  completed: { label: 'Completado', className: 'bg-green-100 text-green-800' },
  failed: { label: 'Fallido', className: 'bg-red-100 text-red-800' },
  refunded: { label: 'Reembolsado', className: 'bg-gray-100 text-gray-800' }
};

const methodLabels: Record<string, string> = {
  card: 'Tarjeta',
  bank_transfer: 'Transferencia'
};

export function PaymentHistoryTable({ payments, loading }: PaymentHistoryTableProps) {
  if (loading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-16 w-full" />
        ))}
      </div>
    );
  }

  if (payments.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <FileText className="h-12 w-12 mx-auto mb-3 opacity-50" />
        <p>No hay pagos registrados</p>
      </div>
    );
  }

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Fecha</TableHead>
            <TableHead>Período</TableHead>
            <TableHead>Método</TableHead>
            <TableHead>Estado</TableHead>
            <TableHead className="text-right">Monto</TableHead>
            <TableHead className="text-right">Factura</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {payments.map((payment) => {
            const statusStyle = statusConfig[payment.status] || statusConfig.pending;
            
            return (
              <TableRow key={payment.id}>
                <TableCell>
                  {format(new Date(payment.created_at), "d MMM yyyy", { locale: es })}
                </TableCell>
                <TableCell className="text-muted-foreground text-sm">
                  {format(new Date(payment.period_start), "d MMM", { locale: es })} - {format(new Date(payment.period_end), "d MMM yyyy", { locale: es })}
                </TableCell>
                <TableCell>
                  {methodLabels[payment.payment_method] || payment.payment_method}
                </TableCell>
                <TableCell>
                  <Badge className={statusStyle.className}>
                    {statusStyle.label}
                  </Badge>
                </TableCell>
                <TableCell className="text-right font-medium">
                  {formatCurrency(payment.amount, payment.currency)}
                </TableCell>
                <TableCell className="text-right">
                  {payment.invoice_number ? (
                    <Button variant="ghost" size="sm">
                      <Download className="h-4 w-4" />
                    </Button>
                  ) : (
                    <span className="text-muted-foreground text-sm">-</span>
                  )}
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
