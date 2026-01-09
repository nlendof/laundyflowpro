import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Calendar as CalendarIcon, Download, Filter, RefreshCw } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { ReportPeriod } from '@/hooks/useReports';

interface ReportFiltersProps {
  period: ReportPeriod;
  onPeriodChange: (period: ReportPeriod) => void;
  startDate?: Date;
  endDate?: Date;
  onDateChange: (start: Date, end: Date) => void;
  employeeId?: string;
  onEmployeeChange: (id: string | undefined) => void;
  employees: { id: string; name: string }[];
  onExport: (format: 'pdf' | 'excel') => void;
  onRefresh: () => void;
  loading?: boolean;
}

const PERIODS: { value: ReportPeriod; label: string }[] = [
  { value: 'today', label: 'Hoy' },
  { value: 'week', label: 'Esta Semana' },
  { value: 'month', label: 'Este Mes' },
  { value: 'quarter', label: 'Este Trimestre' },
  { value: 'year', label: 'Este Año' },
  { value: 'custom', label: 'Personalizado' },
];

export function ReportFilters({
  period,
  onPeriodChange,
  startDate,
  endDate,
  onDateChange,
  employeeId,
  onEmployeeChange,
  employees,
  onExport,
  onRefresh,
  loading,
}: ReportFiltersProps) {
  const [dateRange, setDateRange] = useState<{ from: Date | undefined; to: Date | undefined }>({
    from: startDate,
    to: endDate,
  });

  const handlePeriodChange = (value: string) => {
    onPeriodChange(value as ReportPeriod);
  };

  const handleDateSelect = (range: { from?: Date; to?: Date } | undefined) => {
    if (range?.from && range?.to) {
      setDateRange({ from: range.from, to: range.to });
      onDateChange(range.from, range.to);
    } else if (range?.from) {
      setDateRange({ from: range.from, to: undefined });
    }
  };

  return (
    <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between p-4 bg-card rounded-lg border">
      <div className="flex flex-wrap gap-3 items-center">
        {/* Period selector */}
        <Select value={period} onValueChange={handlePeriodChange}>
          <SelectTrigger className="w-[160px]">
            <CalendarIcon className="h-4 w-4 mr-2" />
            <SelectValue placeholder="Período" />
          </SelectTrigger>
          <SelectContent>
            {PERIODS.map((p) => (
              <SelectItem key={p.value} value={p.value}>
                {p.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Custom date range */}
        {period === 'custom' && (
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={cn(
                  'justify-start text-left font-normal w-[280px]',
                  !dateRange.from && 'text-muted-foreground'
                )}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {dateRange.from ? (
                  dateRange.to ? (
                    <>
                      {format(dateRange.from, 'dd/MM/yyyy', { locale: es })} -{' '}
                      {format(dateRange.to, 'dd/MM/yyyy', { locale: es })}
                    </>
                  ) : (
                    format(dateRange.from, 'dd/MM/yyyy', { locale: es })
                  )
                ) : (
                  <span>Seleccionar fechas</span>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                initialFocus
                mode="range"
                defaultMonth={dateRange.from}
                selected={{ from: dateRange.from, to: dateRange.to }}
                onSelect={handleDateSelect}
                numberOfMonths={2}
                locale={es}
              />
            </PopoverContent>
          </Popover>
        )}

        {/* Employee filter */}
        <Select value={employeeId || 'all'} onValueChange={(v) => onEmployeeChange(v === 'all' ? undefined : v)}>
          <SelectTrigger className="w-[180px]">
            <Filter className="h-4 w-4 mr-2" />
            <SelectValue placeholder="Empleado" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos los empleados</SelectItem>
            {employees.map((emp) => (
              <SelectItem key={emp.id} value={emp.id}>
                {emp.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="flex gap-2">
        <Button variant="outline" size="sm" onClick={onRefresh} disabled={loading}>
          <RefreshCw className={cn('h-4 w-4 mr-2', loading && 'animate-spin')} />
          Actualizar
        </Button>
        <Button variant="outline" size="sm" onClick={() => onExport('excel')}>
          <Download className="h-4 w-4 mr-2" />
          Excel
        </Button>
        <Button variant="default" size="sm" onClick={() => onExport('pdf')}>
          <Download className="h-4 w-4 mr-2" />
          PDF
        </Button>
      </div>
    </div>
  );
}
