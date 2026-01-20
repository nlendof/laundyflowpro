import { useState, useRef } from 'react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import {
  DollarSign,
  Loader2,
  CheckCircle,
  AlertTriangle,
  Lock,
  TrendingUp,
  TrendingDown,
  Calculator,
  Printer,
  FileDown,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatCurrency } from '@/lib/currency';
import { CashClosingData } from '@/hooks/useCashRegister';
import { CashRegisterEntry } from '@/types';
import { CashClosingTicket } from './CashClosingTicket';

interface CashClosingDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedDate: Date;
  openingBalance: number;
  totalIncome: number;
  totalExpense: number;
  expectedBalance: number;
  currency: string;
  onClose: (data: {
    actualBalance: number;
    notes: string;
  }) => Promise<void>;
  existingClosing?: CashClosingData | null;
  entries?: CashRegisterEntry[];
}

export function CashClosingDialog({
  open,
  onOpenChange,
  selectedDate,
  openingBalance,
  totalIncome,
  totalExpense,
  expectedBalance,
  currency,
  onClose,
  existingClosing,
  entries = [],
}: CashClosingDialogProps) {
  const [actualBalance, setActualBalance] = useState('');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const ticketRef = useRef<HTMLDivElement>(null);

  const parsedActualBalance = parseFloat(actualBalance) || 0;
  const difference = parsedActualBalance - expectedBalance;

  const handleSubmit = () => {
    if (!actualBalance || parsedActualBalance < 0) {
      return;
    }
    setShowConfirm(true);
  };

  const handleConfirmClose = async () => {
    setIsSubmitting(true);
    try {
      await onClose({
        actualBalance: parsedActualBalance,
        notes,
      });
      setActualBalance('');
      setNotes('');
      setShowConfirm(false);
      onOpenChange(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handlePrint = () => {
    if (!ticketRef.current) return;

    const printWindow = window.open('', '_blank', 'width=400,height=600');
    if (!printWindow) return;

    const ticketHtml = ticketRef.current.innerHTML;

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Cierre de Caja - ${format(selectedDate, 'dd/MM/yyyy')}</title>
          <style>
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body { 
              font-family: monospace, 'Courier New', Courier; 
              font-size: 12px;
              line-height: 1.3;
              padding: 8px;
              width: 302px;
              margin: 0 auto;
            }
            @media print {
              body { width: 80mm; }
              @page { 
                size: 80mm auto; 
                margin: 0;
              }
            }
          </style>
        </head>
        <body>
          ${ticketHtml}
        </body>
      </html>
    `);

    printWindow.document.close();
    printWindow.focus();
    
    setTimeout(() => {
      printWindow.print();
      printWindow.close();
    }, 250);
  };

  const handleExportPDF = () => {
    const closingData = isClosed ? existingClosing : {
      opening_balance: openingBalance,
      total_income: totalIncome,
      total_expense: totalExpense,
      expected_balance: expectedBalance,
      actual_balance: existingClosing?.actual_balance || null,
      difference: existingClosing?.difference || null,
      notes: existingClosing?.notes || null,
    };

    const dateStr = format(selectedDate, "dd 'de' MMMM 'de' yyyy", { locale: es });
    const dateFileName = format(selectedDate, 'yyyy-MM-dd');
    
    // Group entries by type
    const incomeEntries = entries.filter(e => e.type === 'income');
    const expenseEntries = entries.filter(e => e.type === 'expense');

    const printContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Cierre de Caja - ${dateFileName}</title>
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { font-family: system-ui, -apple-system, sans-serif; padding: 40px; color: #1a1a1a; max-width: 800px; margin: 0 auto; }
          .header { text-align: center; margin-bottom: 30px; border-bottom: 2px solid #3b82f6; padding-bottom: 20px; }
          .header h1 { font-size: 24px; color: #3b82f6; margin-bottom: 5px; }
          .header p { color: #666; font-size: 14px; }
          .section { margin-bottom: 25px; }
          .section h2 { font-size: 16px; color: #1a1a1a; margin-bottom: 15px; border-left: 4px solid #3b82f6; padding-left: 10px; }
          .summary-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 15px; margin-bottom: 20px; }
          .summary-card { background: #f8fafc; border-radius: 8px; padding: 15px; }
          .summary-card .label { font-size: 12px; color: #666; margin-bottom: 5px; }
          .summary-card .value { font-size: 20px; font-weight: bold; color: #1a1a1a; }
          .summary-card.income .value { color: #16a34a; }
          .summary-card.expense .value { color: #dc2626; }
          .summary-card.primary .value { color: #3b82f6; }
          .summary-card.highlight { background: #3b82f6; }
          .summary-card.highlight .label, .summary-card.highlight .value { color: white; }
          table { width: 100%; border-collapse: collapse; font-size: 13px; margin-bottom: 15px; }
          th, td { padding: 10px; text-align: left; border-bottom: 1px solid #e5e7eb; }
          th { background: #f8fafc; font-weight: 600; color: #374151; }
          .text-right { text-align: right; }
          .text-center { text-align: center; }
          .income-text { color: #16a34a; }
          .expense-text { color: #dc2626; }
          .difference-box { padding: 15px; border-radius: 8px; margin-top: 15px; }
          .difference-positive { background: #dcfce7; color: #16a34a; }
          .difference-negative { background: #fee2e2; color: #dc2626; }
          .difference-zero { background: #dbeafe; color: #3b82f6; }
          .notes-box { background: #f8fafc; padding: 15px; border-radius: 8px; margin-top: 15px; }
          .footer { margin-top: 40px; text-align: center; font-size: 11px; color: #999; border-top: 1px solid #e5e7eb; padding-top: 20px; }
          .signature-area { margin-top: 60px; display: flex; justify-content: space-between; }
          .signature-line { width: 200px; border-top: 1px solid #333; padding-top: 5px; text-align: center; font-size: 12px; }
          @media print { 
            body { padding: 20px; } 
            .no-print { display: none; }
          }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>Cierre de Caja</h1>
          <p>${dateStr}</p>
        </div>

        <div class="section">
          <h2>Resumen del Día</h2>
          <div class="summary-grid">
            <div class="summary-card">
              <div class="label">Saldo Inicial</div>
              <div class="value">${formatCurrency(closingData?.opening_balance || openingBalance, currency)}</div>
            </div>
            <div class="summary-card income">
              <div class="label">Total Ingresos</div>
              <div class="value">+${formatCurrency(closingData?.total_income || totalIncome, currency)}</div>
            </div>
            <div class="summary-card expense">
              <div class="label">Total Egresos</div>
              <div class="value">-${formatCurrency(closingData?.total_expense || totalExpense, currency)}</div>
            </div>
            <div class="summary-card primary">
              <div class="label">Saldo Esperado</div>
              <div class="value">${formatCurrency(closingData?.expected_balance || expectedBalance, currency)}</div>
            </div>
          </div>
          
          ${isClosed && closingData?.actual_balance !== null ? `
            <div class="summary-grid">
              <div class="summary-card highlight">
                <div class="label">Saldo Real</div>
                <div class="value">${formatCurrency(closingData.actual_balance || 0, currency)}</div>
              </div>
              <div class="summary-card ${(closingData?.difference || 0) === 0 ? 'difference-zero' : (closingData?.difference || 0) > 0 ? 'difference-positive' : 'difference-negative'}">
                <div class="label">Diferencia</div>
                <div class="value">${(closingData?.difference || 0) > 0 ? '+' : ''}${formatCurrency(closingData?.difference || 0, currency)}</div>
              </div>
            </div>
          ` : ''}
        </div>

        ${incomeEntries.length > 0 ? `
        <div class="section">
          <h2>Detalle de Ingresos (${incomeEntries.length})</h2>
          <table>
            <thead>
              <tr>
                <th>Hora</th>
                <th>Descripción</th>
                <th>Categoría</th>
                <th class="text-right">Monto</th>
              </tr>
            </thead>
            <tbody>
              ${incomeEntries.map(e => `
                <tr>
                  <td>${format(new Date(e.createdAt), 'HH:mm')}</td>
                  <td>${e.description || '-'}</td>
                  <td>${e.category || '-'}</td>
                  <td class="text-right income-text">+${formatCurrency(e.amount, currency)}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
        ` : ''}

        ${expenseEntries.length > 0 ? `
        <div class="section">
          <h2>Detalle de Egresos (${expenseEntries.length})</h2>
          <table>
            <thead>
              <tr>
                <th>Hora</th>
                <th>Descripción</th>
                <th>Categoría</th>
                <th class="text-right">Monto</th>
              </tr>
            </thead>
            <tbody>
              ${expenseEntries.map(e => `
                <tr>
                  <td>${format(new Date(e.createdAt), 'HH:mm')}</td>
                  <td>${e.description || '-'}</td>
                  <td>${e.category || '-'}</td>
                  <td class="text-right expense-text">-${formatCurrency(e.amount, currency)}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
        ` : ''}

        ${closingData?.notes ? `
        <div class="section">
          <h2>Notas</h2>
          <div class="notes-box">${closingData.notes}</div>
        </div>
        ` : ''}

        <div class="signature-area">
          <div class="signature-line">Responsable</div>
          <div class="signature-line">Supervisor</div>
        </div>

        <div class="footer">
          <p>Reporte generado el ${format(new Date(), "dd/MM/yyyy 'a las' HH:mm", { locale: es })}</p>
        </div>
      </body>
      </html>
    `;

    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(printContent);
      printWindow.document.close();
      printWindow.focus();
      setTimeout(() => {
        printWindow.print();
      }, 250);
    }
  };

  const isClosed = existingClosing !== null && existingClosing !== undefined && existingClosing.actual_balance !== null;

  // Build closing data for ticket
  const closingForTicket: CashClosingData = existingClosing || {
    id: '',
    closing_date: format(selectedDate, 'yyyy-MM-dd'),
    opening_balance: openingBalance,
    total_income: totalIncome,
    total_expense: totalExpense,
    expected_balance: expectedBalance,
    actual_balance: null,
    difference: null,
    notes: null,
    created_at: new Date().toISOString(),
    closed_by: null,
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Lock className="w-5 h-5 text-primary" />
              Cierre de Caja
            </DialogTitle>
            <DialogDescription>
              {format(selectedDate, "EEEE, d 'de' MMMM 'de' yyyy", { locale: es })}
            </DialogDescription>
          </DialogHeader>

          {isClosed ? (
            <div className="space-y-4 py-4">
              <div className="bg-primary/10 border border-primary/20 rounded-lg p-4">
                <div className="flex items-center gap-2 text-primary font-medium mb-2">
                  <CheckCircle className="w-5 h-5" />
                  Caja cerrada
                </div>
                <p className="text-sm text-muted-foreground">
                  Cerrado el {format(new Date(existingClosing?.created_at || new Date()), "dd/MM/yyyy 'a las' HH:mm", { locale: es })}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">Saldo esperado</p>
                  <p className="text-lg font-medium">{formatCurrency(expectedBalance, currency)}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">Saldo real</p>
                  <p className="text-lg font-medium">{formatCurrency(existingClosing?.actual_balance || 0, currency)}</p>
                </div>
              </div>

              {existingClosing?.difference !== null && existingClosing?.difference !== 0 && (
                <div className={cn(
                  "p-3 rounded-lg",
                  existingClosing.difference > 0 
                    ? "bg-primary/10 text-primary"
                    : "bg-destructive/10 text-destructive"
                )}>
                  <div className="flex items-center justify-between">
                    <span>Diferencia:</span>
                    <span className="font-bold">
                      {existingClosing.difference > 0 ? '+' : ''}
                      {formatCurrency(existingClosing.difference, currency)}
                    </span>
                  </div>
                </div>
              )}

              {existingClosing?.notes && (
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">Notas</p>
                  <p className="text-sm bg-muted p-2 rounded">{existingClosing.notes}</p>
                </div>
              )}

              {/* Print and Export Buttons for closed cash register */}
              <div className="flex gap-2">
                <Button onClick={handlePrint} className="flex-1 gap-2" variant="outline">
                  <Printer className="w-4 h-4" />
                  Ticket
                </Button>
                <Button onClick={handleExportPDF} className="flex-1 gap-2" variant="default">
                  <FileDown className="w-4 h-4" />
                  Exportar PDF
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-4 py-4">
              {/* Summary */}
              <div className="bg-muted/50 rounded-lg p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Saldo inicial</span>
                  <span className="font-medium">{formatCurrency(openingBalance, currency)}</span>
                </div>
                <div className="flex items-center justify-between text-primary">
                  <span className="flex items-center gap-1">
                    <TrendingUp className="w-4 h-4" />
                    Ingresos
                  </span>
                  <span className="font-medium">+{formatCurrency(totalIncome, currency)}</span>
                </div>
                <div className="flex items-center justify-between text-destructive">
                  <span className="flex items-center gap-1">
                    <TrendingDown className="w-4 h-4" />
                    Egresos
                  </span>
                  <span className="font-medium">-{formatCurrency(totalExpense, currency)}</span>
                </div>
                <Separator />
                <div className="flex items-center justify-between font-bold text-lg">
                  <span className="flex items-center gap-1">
                    <Calculator className="w-4 h-4" />
                    Saldo esperado
                  </span>
                  <span className="text-primary">{formatCurrency(expectedBalance, currency)}</span>
                </div>
              </div>

              {/* Actual balance input */}
              <div className="space-y-2">
                <Label htmlFor="actual-balance">Saldo real en caja</Label>
                <div className="relative">
                  <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    id="actual-balance"
                    type="number"
                    placeholder="0.00"
                    value={actualBalance}
                    onChange={(e) => setActualBalance(e.target.value)}
                    className="pl-9 text-lg"
                  />
                </div>
              </div>

              {/* Difference preview */}
              {actualBalance && (
                <div className={cn(
                  "p-3 rounded-lg flex items-center justify-between",
                  difference === 0
                    ? "bg-primary/10 text-primary"
                    : difference > 0
                    ? "bg-secondary text-secondary-foreground"
                    : "bg-destructive/10 text-destructive"
                )}>
                  <span className="flex items-center gap-2">
                    {difference === 0 ? (
                      <CheckCircle className="w-4 h-4" />
                    ) : (
                      <AlertTriangle className="w-4 h-4" />
                    )}
                    {difference === 0 ? 'Cuadrado' : 'Diferencia'}
                  </span>
                  <span className="font-bold">
                    {difference > 0 ? '+' : ''}
                    {formatCurrency(difference, currency)}
                  </span>
                </div>
              )}

              {/* Notes */}
              <div className="space-y-2">
                <Label htmlFor="notes">Notas (opcional)</Label>
                <Textarea
                  id="notes"
                  placeholder="Observaciones sobre el cierre..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={2}
                />
              </div>
            </div>
          )}

          {!isClosed && (
            <DialogFooter>
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                Cancelar
              </Button>
              <Button
                onClick={handleSubmit}
                disabled={!actualBalance || parsedActualBalance < 0}
                className="gap-2"
              >
                <Lock className="w-4 h-4" />
                Cerrar Caja
              </Button>
            </DialogFooter>
          )}
        </DialogContent>
      </Dialog>

      <AlertDialog open={showConfirm} onOpenChange={setShowConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Confirmar cierre de caja?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción cerrará la caja del día con un saldo de{' '}
              <span className="font-bold">{formatCurrency(parsedActualBalance, currency)}</span>.
              {difference !== 0 && (
                <span className={cn(
                  "block mt-2 font-medium",
                  difference > 0 ? "text-primary" : "text-destructive"
                )}>
                  Existe una diferencia de {difference > 0 ? '+' : ''}
                  {formatCurrency(difference, currency)}
                </span>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isSubmitting}>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmClose} disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Confirmar Cierre
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Hidden ticket for printing */}
      <div className="hidden">
        <CashClosingTicket
          ref={ticketRef}
          closing={closingForTicket}
          entries={entries}
          selectedDate={selectedDate}
        />
      </div>
    </>
  );
}
