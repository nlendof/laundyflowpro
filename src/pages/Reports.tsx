import { useState } from 'react';
import { useReports, ReportPeriod } from '@/hooks/useReports';
import { useConfig } from '@/contexts/ConfigContext';
import { ReportFilters } from '@/components/reports/ReportFilters';
import { FinancialSummary } from '@/components/reports/FinancialSummary';
import { SalesChart } from '@/components/reports/SalesChart';
import { ServicesChart } from '@/components/reports/ServicesChart';
import { EmployeePerformanceTable } from '@/components/reports/EmployeePerformanceTable';
import { TopCustomersTable } from '@/components/reports/TopCustomersTable';
import { exportToCSV, exportToPDF } from '@/lib/exportReports';
import { toast } from 'sonner';
import { BarChart3 } from 'lucide-react';

const PERIOD_LABELS: Record<ReportPeriod, string> = {
  today: 'Hoy',
  week: 'Esta Semana',
  month: 'Este Mes',
  quarter: 'Este Trimestre',
  year: 'Este Año',
  custom: 'Personalizado',
};

export default function Reports() {
  const { business } = useConfig();
  const { data, loading, filters, updateFilters, refetch, employees } = useReports();

  const handlePeriodChange = (period: ReportPeriod) => {
    updateFilters({ period });
  };

  const handleDateChange = (startDate: Date, endDate: Date) => {
    updateFilters({ startDate, endDate });
  };

  const handleEmployeeChange = (employeeId: string | undefined) => {
    updateFilters({ employeeId });
  };

  const handleExport = (format: 'pdf' | 'excel') => {
    try {
      const options = {
        businessName: business.name,
        period: PERIOD_LABELS[filters.period],
        currency: business.currency,
        startDate: filters.startDate,
        endDate: filters.endDate,
      };

      if (format === 'pdf') {
        exportToPDF(data, options);
        toast.success('Reporte PDF generado');
      } else {
        exportToCSV(data, options);
        toast.success('Reporte Excel (CSV) descargado');
      }
    } catch (error) {
      console.error('Error exporting report:', error);
      toast.error('Error al exportar el reporte');
    }
  };

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <BarChart3 className="h-7 w-7 text-primary" />
            Reportes y Análisis
          </h1>
          <p className="text-muted-foreground">
            Visualiza el rendimiento de tu negocio con datos en tiempo real
          </p>
        </div>
      </div>

      {/* Filters */}
      <ReportFilters
        period={filters.period}
        onPeriodChange={handlePeriodChange}
        startDate={filters.startDate}
        endDate={filters.endDate}
        onDateChange={handleDateChange}
        employeeId={filters.employeeId}
        onEmployeeChange={handleEmployeeChange}
        employees={employees}
        onExport={handleExport}
        onRefresh={refetch}
        loading={loading}
      />

      {/* Financial Summary */}
      <FinancialSummary
        data={data.financialSummary}
        comparison={data.periodComparison}
        loading={loading}
      />

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <SalesChart data={data.salesData} loading={loading} />
        <ServicesChart data={data.serviceData} loading={loading} />
      </div>

      {/* Tables Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <EmployeePerformanceTable data={data.employeePerformance} loading={loading} />
        <TopCustomersTable data={data.customerStats} loading={loading} />
      </div>
    </div>
  );
}
