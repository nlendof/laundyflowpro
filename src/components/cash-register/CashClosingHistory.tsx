import { useState, useEffect, useCallback } from 'react';
import { format, subDays, startOfMonth, endOfMonth } from 'date-fns';
import { es } from 'date-fns/locale';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
  History,
  CalendarIcon,
  CheckCircle,
  AlertTriangle,
  Eye,
  TrendingUp,
  TrendingDown,
  Lock,
  Loader2,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatCurrency } from '@/lib/currency';
import { supabase } from '@/integrations/supabase/client';
import { useBranchFilter } from '@/contexts/LaundryContext';

interface CashClosing {
  id: string;
  closing_date: string;
  opening_balance: number;
  total_income: number;
  total_expense: number;
  expected_balance: number;
  actual_balance: number | null;
  difference: number | null;
  notes: string | null;
  created_at: string;
  closed_by: string | null;
}

interface CashClosingHistoryProps {
  currency: string;
}

export function CashClosingHistory({ currency }: CashClosingHistoryProps) {
  const { laundryId } = useBranchFilter();
  const [closings, setClosings] = useState<CashClosing[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedClosing, setSelectedClosing] = useState<CashClosing | null>(null);
  const [dateRange, setDateRange] = useState({
    from: startOfMonth(new Date()),
    to: endOfMonth(new Date()),
  });
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);

  const fetchClosings = useCallback(async () => {
    try {
      setLoading(true);
      let query = supabase
        .from('cash_closings')
        .select('*')
        .gte('closing_date', dateRange.from.toISOString().split('T')[0])
        .lte('closing_date', dateRange.to.toISOString().split('T')[0])
        .order('closing_date', { ascending: false });

      if (laundryId) {
        query = query.eq('laundry_id', laundryId);
      }

      const { data, error } = await query;
      if (error) throw error;
      setClosings(data || []);
    } catch (error) {
      console.error('Error fetching closings:', error);
    } finally {
      setLoading(false);
    }
  }, [dateRange, laundryId]);

  useEffect(() => {
    fetchClosings();
  }, [fetchClosings]);

  // Calculate summary
  const summary = closings.reduce(
    (acc, closing) => {
      if (closing.actual_balance !== null) {
        acc.closed += 1;
        acc.totalIncome += closing.total_income;
        acc.totalExpense += closing.total_expense;
        acc.totalDifference += closing.difference || 0;
      } else {
        acc.pending += 1;
      }
      return acc;
    },
    { closed: 0, pending: 0, totalIncome: 0, totalExpense: 0, totalDifference: 0 }
  );

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <History className="w-5 h-5" />
            Historial de Cierres
          </CardTitle>
          <Popover open={isCalendarOpen} onOpenChange={setIsCalendarOpen}>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm" className="gap-2">
                <CalendarIcon className="w-4 h-4" />
                {format(dateRange.from, 'dd/MM', { locale: es })} -{' '}
                {format(dateRange.to, 'dd/MM', { locale: es })}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="end">
              <Calendar
                mode="range"
                selected={{ from: dateRange.from, to: dateRange.to }}
                onSelect={(range) => {
                  if (range?.from && range?.to) {
                    setDateRange({ from: range.from, to: range.to });
                    setIsCalendarOpen(false);
                  }
                }}
                locale={es}
                numberOfMonths={1}
              />
            </PopoverContent>
          </Popover>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Summary */}
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-green-50 dark:bg-green-950 p-3 rounded-lg">
            <p className="text-xs text-green-600 dark:text-green-400">Ingresos</p>
            <p className="text-lg font-bold text-green-700 dark:text-green-300">
              +{formatCurrency(summary.totalIncome, currency)}
            </p>
          </div>
          <div className="bg-red-50 dark:bg-red-950 p-3 rounded-lg">
            <p className="text-xs text-red-600 dark:text-red-400">Egresos</p>
            <p className="text-lg font-bold text-red-700 dark:text-red-300">
              -{formatCurrency(summary.totalExpense, currency)}
            </p>
          </div>
        </div>

        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">Días cerrados</span>
          <Badge variant="outline">{summary.closed}</Badge>
        </div>
        {summary.pending > 0 && (
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Pendientes de cierre</span>
            <Badge variant="destructive">{summary.pending}</Badge>
          </div>
        )}
        {summary.totalDifference !== 0 && (
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Diferencia acumulada</span>
            <span className={cn(
              "font-medium",
              summary.totalDifference > 0 ? "text-green-600" : "text-red-600"
            )}>
              {summary.totalDifference > 0 ? '+' : ''}
              {formatCurrency(summary.totalDifference, currency)}
            </span>
          </div>
        )}

        <Separator />

        {/* Closings List */}
        {loading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        ) : closings.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <History className="w-10 h-10 mx-auto mb-2 opacity-50" />
            <p>No hay cierres en este período</p>
          </div>
        ) : (
          <div className="space-y-2 max-h-[300px] overflow-y-auto">
            {closings.map((closing) => {
              const isClosed = closing.actual_balance !== null;
              const hasDifference = closing.difference !== null && closing.difference !== 0;
              
              return (
                <div
                  key={closing.id}
                  className={cn(
                    "flex items-center justify-between p-3 rounded-lg border transition-colors cursor-pointer hover:bg-muted/50",
                    !isClosed && "border-amber-200 bg-amber-50/50 dark:border-amber-800 dark:bg-amber-950/50"
                  )}
                  onClick={() => setSelectedClosing(closing)}
                >
                  <div className="flex items-center gap-3">
                    {isClosed ? (
                      hasDifference && closing.difference! < 0 ? (
                        <AlertTriangle className="w-5 h-5 text-amber-500" />
                      ) : (
                        <CheckCircle className="w-5 h-5 text-green-500" />
                      )
                    ) : (
                      <Lock className="w-5 h-5 text-amber-500" />
                    )}
                    <div>
                      <p className="font-medium">
                        {format(new Date(closing.closing_date + 'T12:00:00'), 'EEEE d', { locale: es })}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {format(new Date(closing.closing_date + 'T12:00:00'), 'MMMM yyyy', { locale: es })}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-medium">
                      {formatCurrency(closing.actual_balance ?? closing.expected_balance, currency)}
                    </p>
                    {hasDifference && (
                      <p className={cn(
                        "text-xs",
                        closing.difference! > 0 ? "text-green-600" : "text-red-600"
                      )}>
                        {closing.difference! > 0 ? '+' : ''}
                        {formatCurrency(closing.difference!, currency)}
                      </p>
                    )}
                    {!isClosed && (
                      <Badge variant="outline" className="text-xs">
                        Pendiente
                      </Badge>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>

      {/* Detail Dialog */}
      <Dialog open={!!selectedClosing} onOpenChange={(open) => !open && setSelectedClosing(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <History className="w-5 h-5" />
              Detalle de Cierre
            </DialogTitle>
          </DialogHeader>
          {selectedClosing && (
            <div className="space-y-4 pt-4">
              <div className="text-center">
                <p className="text-lg font-bold">
                  {format(new Date(selectedClosing.closing_date + 'T12:00:00'), "EEEE, d 'de' MMMM 'de' yyyy", { locale: es })}
                </p>
                {selectedClosing.actual_balance !== null ? (
                  <Badge className="mt-2 bg-green-500">
                    <CheckCircle className="w-3 h-3 mr-1" />
                    Cerrado
                  </Badge>
                ) : (
                  <Badge variant="outline" className="mt-2 border-amber-500 text-amber-600">
                    <Lock className="w-3 h-3 mr-1" />
                    Pendiente
                  </Badge>
                )}
              </div>

              <div className="bg-muted/50 rounded-lg p-4 space-y-3">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Saldo inicial</span>
                  <span className="font-medium">{formatCurrency(selectedClosing.opening_balance, currency)}</span>
                </div>
                <div className="flex justify-between text-green-600">
                  <span className="flex items-center gap-1">
                    <TrendingUp className="w-4 h-4" />
                    Ingresos
                  </span>
                  <span className="font-medium">+{formatCurrency(selectedClosing.total_income, currency)}</span>
                </div>
                <div className="flex justify-between text-red-600">
                  <span className="flex items-center gap-1">
                    <TrendingDown className="w-4 h-4" />
                    Egresos
                  </span>
                  <span className="font-medium">-{formatCurrency(selectedClosing.total_expense, currency)}</span>
                </div>
                <Separator />
                <div className="flex justify-between">
                  <span>Saldo esperado</span>
                  <span className="font-bold">{formatCurrency(selectedClosing.expected_balance, currency)}</span>
                </div>
                {selectedClosing.actual_balance !== null && (
                  <>
                    <div className="flex justify-between">
                      <span>Saldo real</span>
                      <span className="font-bold">{formatCurrency(selectedClosing.actual_balance, currency)}</span>
                    </div>
                    {selectedClosing.difference !== null && selectedClosing.difference !== 0 && (
                      <div className={cn(
                        "p-2 rounded text-center",
                        selectedClosing.difference > 0 ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"
                      )}>
                        <span className="font-bold">
                          Diferencia: {selectedClosing.difference > 0 ? '+' : ''}
                          {formatCurrency(selectedClosing.difference, currency)}
                        </span>
                      </div>
                    )}
                  </>
                )}
              </div>

              {selectedClosing.notes && (
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">Notas</p>
                  <p className="bg-muted p-2 rounded text-sm">{selectedClosing.notes}</p>
                </div>
              )}

              {selectedClosing.created_at && selectedClosing.actual_balance !== null && (
                <p className="text-xs text-center text-muted-foreground">
                  Cerrado el {format(new Date(selectedClosing.created_at), "dd/MM/yyyy 'a las' HH:mm", { locale: es })}
                </p>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </Card>
  );
}
