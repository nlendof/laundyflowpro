import { format } from 'date-fns';
import { es } from 'date-fns/locale';

interface ReportData {
  salesData: { date: string; revenue: number; orders: number; avgTicket: number }[];
  serviceData: { name: string; quantity: number; revenue: number; percentage: number }[];
  employeePerformance: { id: string; name: string; ordersProcessed: number; revenue: number; avgTime: number }[];
  financialSummary: {
    totalRevenue: number;
    totalExpenses: number;
    netProfit: number;
    profitMargin: number;
    avgDailyRevenue: number;
    avgOrderValue: number;
    totalOrders: number;
    completedOrders: number;
    pendingOrders: number;
    cancelledOrders: number;
  };
  customerStats: {
    totalCustomers: number;
    newCustomers: number;
    returningCustomers: number;
    topCustomers: { name: string; orders: number; revenue: number }[];
  };
}

interface ExportOptions {
  businessName: string;
  period: string;
  currency: string;
  startDate?: Date;
  endDate?: Date;
}

function formatCurrencySimple(amount: number, currency: string): string {
  const symbols: Record<string, string> = {
    DOP: 'RD$',
    USD: '$',
    MXN: '$',
    EUR: '€',
  };
  return `${symbols[currency] || '$'}${amount.toFixed(2)}`;
}

export function exportToCSV(data: ReportData, options: ExportOptions): void {
  const { businessName, period } = options;
  const dateStr = format(new Date(), 'yyyy-MM-dd', { locale: es });

  // Create CSV content
  let csvContent = '';

  // Header
  csvContent += `REPORTE DE ${businessName.toUpperCase()}\n`;
  csvContent += `Período: ${period}\n`;
  csvContent += `Generado: ${format(new Date(), "dd 'de' MMMM 'de' yyyy", { locale: es })}\n\n`;

  // Financial Summary
  csvContent += 'RESUMEN FINANCIERO\n';
  csvContent += 'Métrica,Valor\n';
  csvContent += `Ingresos Totales,${formatCurrencySimple(data.financialSummary.totalRevenue, options.currency)}\n`;
  csvContent += `Gastos Totales,${formatCurrencySimple(data.financialSummary.totalExpenses, options.currency)}\n`;
  csvContent += `Utilidad Neta,${formatCurrencySimple(data.financialSummary.netProfit, options.currency)}\n`;
  csvContent += `Margen de Utilidad,${data.financialSummary.profitMargin.toFixed(1)}%\n`;
  csvContent += `Ingreso Diario Promedio,${formatCurrencySimple(data.financialSummary.avgDailyRevenue, options.currency)}\n`;
  csvContent += `Ticket Promedio,${formatCurrencySimple(data.financialSummary.avgOrderValue, options.currency)}\n`;
  csvContent += `Total de Órdenes,${data.financialSummary.totalOrders}\n`;
  csvContent += `Órdenes Completadas,${data.financialSummary.completedOrders}\n`;
  csvContent += `Órdenes Pendientes,${data.financialSummary.pendingOrders}\n\n`;

  // Sales Data
  csvContent += 'VENTAS POR PERÍODO\n';
  csvContent += 'Fecha,Ingresos,Órdenes,Ticket Promedio\n';
  data.salesData.forEach(row => {
    csvContent += `${row.date},${formatCurrencySimple(row.revenue, options.currency)},${row.orders},${formatCurrencySimple(row.avgTicket, options.currency)}\n`;
  });
  csvContent += '\n';

  // Services
  csvContent += 'SERVICIOS MÁS VENDIDOS\n';
  csvContent += 'Servicio,Cantidad,Ingresos,Participación\n';
  data.serviceData.forEach(row => {
    csvContent += `${row.name},${row.quantity},${formatCurrencySimple(row.revenue, options.currency)},${row.percentage.toFixed(1)}%\n`;
  });
  csvContent += '\n';

  // Employee Performance
  csvContent += 'RENDIMIENTO DE EMPLEADOS\n';
  csvContent += 'Empleado,Órdenes Procesadas,Ingresos Generados\n';
  data.employeePerformance.forEach(row => {
    csvContent += `${row.name},${row.ordersProcessed},${formatCurrencySimple(row.revenue, options.currency)}\n`;
  });
  csvContent += '\n';

  // Top Customers
  csvContent += 'MEJORES CLIENTES\n';
  csvContent += 'Cliente,Órdenes,Gasto Total\n';
  data.customerStats.topCustomers.forEach(row => {
    csvContent += `${row.name},${row.orders},${formatCurrencySimple(row.revenue, options.currency)}\n`;
  });

  // Download
  const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = `reporte_${businessName.toLowerCase().replace(/\s+/g, '_')}_${dateStr}.csv`;
  link.click();
}

export function exportToPDF(data: ReportData, options: ExportOptions): void {
  const { businessName, period, currency } = options;
  const dateStr = format(new Date(), "dd 'de' MMMM 'de' yyyy", { locale: es });

  // Create printable HTML
  const printContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>Reporte - ${businessName}</title>
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: system-ui, -apple-system, sans-serif; padding: 40px; color: #1a1a1a; }
        .header { text-align: center; margin-bottom: 30px; border-bottom: 2px solid #3b82f6; padding-bottom: 20px; }
        .header h1 { font-size: 24px; color: #3b82f6; margin-bottom: 5px; }
        .header p { color: #666; font-size: 14px; }
        .section { margin-bottom: 30px; }
        .section h2 { font-size: 16px; color: #1a1a1a; margin-bottom: 15px; border-left: 4px solid #3b82f6; padding-left: 10px; }
        .stats-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 15px; margin-bottom: 20px; }
        .stat-card { background: #f8fafc; border-radius: 8px; padding: 15px; text-align: center; }
        .stat-card .value { font-size: 20px; font-weight: bold; color: #1a1a1a; }
        .stat-card .label { font-size: 12px; color: #666; margin-top: 5px; }
        table { width: 100%; border-collapse: collapse; font-size: 12px; }
        th, td { padding: 10px; text-align: left; border-bottom: 1px solid #e5e7eb; }
        th { background: #f8fafc; font-weight: 600; color: #374151; }
        tr:nth-child(even) { background: #fafafa; }
        .text-right { text-align: right; }
        .text-center { text-align: center; }
        .footer { margin-top: 30px; text-align: center; font-size: 11px; color: #999; }
        @media print { body { padding: 20px; } }
      </style>
    </head>
    <body>
      <div class="header">
        <h1>${businessName}</h1>
        <p>Reporte de ${period} • Generado el ${dateStr}</p>
      </div>

      <div class="section">
        <h2>Resumen Financiero</h2>
        <div class="stats-grid">
          <div class="stat-card">
            <div class="value">${formatCurrencySimple(data.financialSummary.totalRevenue, currency)}</div>
            <div class="label">Ingresos Totales</div>
          </div>
          <div class="stat-card">
            <div class="value">${formatCurrencySimple(data.financialSummary.totalExpenses, currency)}</div>
            <div class="label">Gastos Totales</div>
          </div>
          <div class="stat-card">
            <div class="value">${formatCurrencySimple(data.financialSummary.netProfit, currency)}</div>
            <div class="label">Utilidad Neta</div>
          </div>
          <div class="stat-card">
            <div class="value">${data.financialSummary.profitMargin.toFixed(1)}%</div>
            <div class="label">Margen</div>
          </div>
        </div>
        <div class="stats-grid">
          <div class="stat-card">
            <div class="value">${data.financialSummary.totalOrders}</div>
            <div class="label">Total Órdenes</div>
          </div>
          <div class="stat-card">
            <div class="value">${data.financialSummary.completedOrders}</div>
            <div class="label">Completadas</div>
          </div>
          <div class="stat-card">
            <div class="value">${data.financialSummary.pendingOrders}</div>
            <div class="label">Pendientes</div>
          </div>
          <div class="stat-card">
            <div class="value">${formatCurrencySimple(data.financialSummary.avgOrderValue, currency)}</div>
            <div class="label">Ticket Promedio</div>
          </div>
        </div>
      </div>

      <div class="section">
        <h2>Servicios Más Vendidos</h2>
        <table>
          <thead>
            <tr>
              <th>Servicio</th>
              <th class="text-center">Cantidad</th>
              <th class="text-right">Ingresos</th>
              <th class="text-center">Participación</th>
            </tr>
          </thead>
          <tbody>
            ${data.serviceData.map(s => `
              <tr>
                <td>${s.name}</td>
                <td class="text-center">${s.quantity}</td>
                <td class="text-right">${formatCurrencySimple(s.revenue, currency)}</td>
                <td class="text-center">${s.percentage.toFixed(1)}%</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>

      <div class="section">
        <h2>Rendimiento de Empleados</h2>
        <table>
          <thead>
            <tr>
              <th>Empleado</th>
              <th class="text-center">Órdenes</th>
              <th class="text-right">Ingresos Generados</th>
            </tr>
          </thead>
          <tbody>
            ${data.employeePerformance.map(e => `
              <tr>
                <td>${e.name}</td>
                <td class="text-center">${e.ordersProcessed}</td>
                <td class="text-right">${formatCurrencySimple(e.revenue, currency)}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>

      <div class="section">
        <h2>Mejores Clientes</h2>
        <table>
          <thead>
            <tr>
              <th>Cliente</th>
              <th class="text-center">Órdenes</th>
              <th class="text-right">Gasto Total</th>
            </tr>
          </thead>
          <tbody>
            ${data.customerStats.topCustomers.map(c => `
              <tr>
                <td>${c.name}</td>
                <td class="text-center">${c.orders}</td>
                <td class="text-right">${formatCurrencySimple(c.revenue, currency)}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>

      <div class="footer">
        <p>Reporte generado automáticamente por ${businessName}</p>
      </div>
    </body>
    </html>
  `;

  // Open print dialog
  const printWindow = window.open('', '_blank');
  if (printWindow) {
    printWindow.document.write(printContent);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
      printWindow.print();
    }, 250);
  }
}
