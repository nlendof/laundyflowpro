import { forwardRef } from 'react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { useConfig } from '@/contexts/ConfigContext';
import { formatCurrency } from '@/lib/currency';
import { CashClosingData } from '@/hooks/useCashRegister';
import { CashRegisterEntry } from '@/types';

interface CashClosingTicketProps {
  closing: CashClosingData;
  entries: CashRegisterEntry[];
  selectedDate: Date;
}

/**
 * Thermal ticket component for cash closing report.
 * Optimized for 80mm printers (~302px width).
 */
export const CashClosingTicket = forwardRef<HTMLDivElement, CashClosingTicketProps>(
  ({ closing, entries, selectedDate }, ref) => {
    const { business } = useConfig();

    const incomeEntries = entries.filter(e => e.type === 'income');
    const expenseEntries = entries.filter(e => e.type === 'expense');
    
    const totalIncome = incomeEntries.reduce((sum, e) => sum + e.amount, 0);
    const totalExpense = expenseEntries.reduce((sum, e) => sum + e.amount, 0);

    return (
      <div
        ref={ref}
        className="cash-closing-ticket bg-white text-black"
        style={{
          width: '302px',
          fontFamily: 'monospace, Courier New, Courier',
          fontSize: '12px',
          lineHeight: '1.3',
          padding: '8px',
        }}
      >
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: '8px' }}>
          <div style={{ fontSize: '16px', fontWeight: 'bold' }}>
            {business.name}
          </div>
          {business.address && (
            <div style={{ fontSize: '10px', marginTop: '4px' }}>
              {business.address}
            </div>
          )}
          <div style={{ fontSize: '10px' }}>Tel: {business.phone}</div>
        </div>

        {/* Separator */}
        <div style={{ borderTop: '2px solid #000', margin: '8px 0' }} />

        {/* Title */}
        <div style={{ textAlign: 'center', marginBottom: '8px' }}>
          <div style={{ fontSize: '14px', fontWeight: 'bold', letterSpacing: '2px' }}>
            CIERRE DE CAJA
          </div>
          <div style={{ fontSize: '12px', marginTop: '4px' }}>
            {format(selectedDate, "EEEE, d 'de' MMMM 'de' yyyy", { locale: es })}
          </div>
          <div style={{ fontSize: '10px', marginTop: '2px' }}>
            Impreso: {format(new Date(), "dd/MM/yyyy HH:mm", { locale: es })}
          </div>
        </div>

        {/* Separator */}
        <div style={{ borderTop: '1px dashed #000', margin: '8px 0' }} />

        {/* Opening Balance */}
        <div style={{ marginBottom: '8px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 'bold' }}>
            <span>SALDO INICIAL:</span>
            <span>{formatCurrency(closing.opening_balance, business.currency)}</span>
          </div>
        </div>

        {/* Separator */}
        <div style={{ borderTop: '1px dashed #000', margin: '8px 0' }} />

        {/* Income Section */}
        <div style={{ marginBottom: '8px' }}>
          <div style={{ fontWeight: 'bold', marginBottom: '4px', fontSize: '11px' }}>
            INGRESOS ({incomeEntries.length})
          </div>
          {incomeEntries.length === 0 ? (
            <div style={{ fontSize: '10px', color: '#666' }}>Sin ingresos</div>
          ) : (
            <>
              {incomeEntries.slice(0, 10).map((entry, idx) => (
                <div key={entry.id} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px' }}>
                  <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {entry.category || 'Ingreso'}
                  </span>
                  <span style={{ marginLeft: '8px' }}>
                    +{formatCurrency(entry.amount, business.currency)}
                  </span>
                </div>
              ))}
              {incomeEntries.length > 10 && (
                <div style={{ fontSize: '9px', color: '#666' }}>
                  ... y {incomeEntries.length - 10} más
                </div>
              )}
            </>
          )}
          <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 'bold', marginTop: '4px', borderTop: '1px dotted #000', paddingTop: '4px' }}>
            <span>TOTAL INGRESOS:</span>
            <span style={{ color: '#000' }}>+{formatCurrency(totalIncome, business.currency)}</span>
          </div>
        </div>

        {/* Separator */}
        <div style={{ borderTop: '1px dashed #000', margin: '8px 0' }} />

        {/* Expense Section */}
        <div style={{ marginBottom: '8px' }}>
          <div style={{ fontWeight: 'bold', marginBottom: '4px', fontSize: '11px' }}>
            EGRESOS ({expenseEntries.length})
          </div>
          {expenseEntries.length === 0 ? (
            <div style={{ fontSize: '10px', color: '#666' }}>Sin egresos</div>
          ) : (
            <>
              {expenseEntries.slice(0, 10).map((entry) => (
                <div key={entry.id} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px' }}>
                  <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {entry.category || 'Gasto'}
                  </span>
                  <span style={{ marginLeft: '8px' }}>
                    -{formatCurrency(entry.amount, business.currency)}
                  </span>
                </div>
              ))}
              {expenseEntries.length > 10 && (
                <div style={{ fontSize: '9px', color: '#666' }}>
                  ... y {expenseEntries.length - 10} más
                </div>
              )}
            </>
          )}
          <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 'bold', marginTop: '4px', borderTop: '1px dotted #000', paddingTop: '4px' }}>
            <span>TOTAL EGRESOS:</span>
            <span>-{formatCurrency(totalExpense, business.currency)}</span>
          </div>
        </div>

        {/* Separator */}
        <div style={{ borderTop: '2px solid #000', margin: '8px 0' }} />

        {/* Summary */}
        <div style={{ marginBottom: '8px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', marginBottom: '4px' }}>
            <span>Saldo Inicial:</span>
            <span>{formatCurrency(closing.opening_balance, business.currency)}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', marginBottom: '4px' }}>
            <span>(+) Ingresos:</span>
            <span>{formatCurrency(closing.total_income, business.currency)}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', marginBottom: '4px' }}>
            <span>(-) Egresos:</span>
            <span>{formatCurrency(closing.total_expense, business.currency)}</span>
          </div>
          <div style={{ borderTop: '1px dotted #000', marginTop: '4px', paddingTop: '4px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', fontWeight: 'bold' }}>
              <span>SALDO ESPERADO:</span>
              <span>{formatCurrency(closing.expected_balance, business.currency)}</span>
            </div>
          </div>
        </div>

        {/* Actual Balance (if closed) */}
        {closing.actual_balance !== null && (
          <>
            <div style={{ borderTop: '1px dashed #000', margin: '8px 0' }} />
            <div style={{ marginBottom: '8px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', fontWeight: 'bold' }}>
                <span>SALDO REAL:</span>
                <span>{formatCurrency(closing.actual_balance, business.currency)}</span>
              </div>
              {closing.difference !== null && closing.difference !== 0 && (
                <div style={{ 
                  display: 'flex', 
                  justifyContent: 'space-between', 
                  fontSize: '11px',
                  marginTop: '4px',
                  padding: '4px',
                  backgroundColor: closing.difference > 0 ? '#d4edda' : '#f8d7da',
                  border: `1px solid ${closing.difference > 0 ? '#28a745' : '#dc3545'}`,
                }}>
                  <span>DIFERENCIA:</span>
                  <span style={{ fontWeight: 'bold' }}>
                    {closing.difference > 0 ? '+' : ''}{formatCurrency(closing.difference, business.currency)}
                  </span>
                </div>
              )}
              {closing.difference === 0 && (
                <div style={{ 
                  textAlign: 'center',
                  marginTop: '4px',
                  padding: '4px',
                  backgroundColor: '#d4edda',
                  border: '1px solid #28a745',
                  fontSize: '11px',
                  fontWeight: 'bold',
                }}>
                  ✓ CUADRADO
                </div>
              )}
            </div>
          </>
        )}

        {/* Notes */}
        {closing.notes && (
          <>
            <div style={{ borderTop: '1px dashed #000', margin: '8px 0' }} />
            <div style={{ marginBottom: '8px', fontSize: '10px' }}>
              <div style={{ fontWeight: 'bold' }}>OBSERVACIONES:</div>
              <div>{closing.notes}</div>
            </div>
          </>
        )}

        {/* Separator */}
        <div style={{ borderTop: '2px solid #000', margin: '8px 0' }} />

        {/* Signature Area */}
        <div style={{ marginTop: '24px', marginBottom: '8px' }}>
          <div style={{ borderTop: '1px solid #000', width: '80%', margin: '0 auto' }} />
          <div style={{ textAlign: 'center', fontSize: '10px', marginTop: '4px' }}>
            Firma del Responsable
          </div>
        </div>

        {/* Footer */}
        <div style={{ textAlign: 'center', fontSize: '9px', marginTop: '16px', color: '#666' }}>
          <div>Documento generado automáticamente</div>
          <div>{business.name} - Sistema de Caja</div>
        </div>
      </div>
    );
  }
);

CashClosingTicket.displayName = 'CashClosingTicket';
