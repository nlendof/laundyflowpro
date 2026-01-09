import { forwardRef } from 'react';
import { Order, OrderItem } from '@/types';
import { useConfig, TicketSettings } from '@/contexts/ConfigContext';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { QRCodeSVG } from 'qrcode.react';

interface TicketPrintProps {
  order: Order;
  overrideSettings?: Partial<TicketSettings>;
}

/**
 * Thermal ticket component optimized for 80mm printers (~302px width).
 * Use with window.print() or a print library.
 */
export const TicketPrint = forwardRef<HTMLDivElement, TicketPrintProps>(
  ({ order, overrideSettings }, ref) => {
    const { business, activeExtraServices, ticketSettings } = useConfig();

    // Merge config settings with any overrides
    const settings = { ...ticketSettings, ...overrideSettings };

    const getItemTypeLabel = (type: 'weight' | 'piece') =>
      type === 'weight' ? 'kg' : 'pza';

    // Calculate extras total if any extras are in items
    const getExtraNames = (extras: string[]) => {
      return extras
        .map((extraId) => {
          const extra = activeExtraServices.find((e) => e.id === extraId);
          return extra?.name || extraId;
        })
        .join(', ');
    };

    // Determine QR content
    const getQrValue = () => {
      switch (settings.qrContent) {
        case 'payment_link':
          return settings.customQrUrl || `https://pay.example.com/${order.ticketCode}`;
        case 'custom':
          return settings.customQrUrl || order.ticketCode;
        case 'ticket_code':
        default:
          return order.qrCode || order.ticketCode;
      }
    };

    return (
      <div
        ref={ref}
        className="ticket-print bg-white text-black"
        style={{
          width: '302px', // 80mm ≈ 302px at 96dpi
          fontFamily: 'monospace, Courier New, Courier',
          fontSize: '12px',
          lineHeight: '1.3',
          padding: '8px',
        }}
      >
        {/* Header - Business Info with optional Logo */}
        <div style={{ textAlign: 'center', marginBottom: '8px' }}>
          {settings.showLogo && settings.logoUrl && (
            <div style={{ marginBottom: '4px' }}>
              <img 
                src={settings.logoUrl} 
                alt={business.name}
                style={{ 
                  maxWidth: '120px', 
                  maxHeight: '60px', 
                  margin: '0 auto',
                  display: 'block'
                }} 
              />
            </div>
          )}
          <div style={{ fontSize: '16px', fontWeight: 'bold' }}>
            {business.name}
          </div>
          {business.slogan && (
            <div style={{ fontSize: '10px' }}>{business.slogan}</div>
          )}
          <div style={{ fontSize: '10px', marginTop: '4px' }}>
            {business.address}
          </div>
          <div style={{ fontSize: '10px' }}>Tel: {business.phone}</div>
        </div>

        {/* Separator */}
        <div
          style={{
            borderTop: '1px dashed #000',
            margin: '8px 0',
          }}
        />

        {/* Ticket Code & Date */}
        <div style={{ textAlign: 'center', marginBottom: '8px' }}>
          <div style={{ fontSize: '18px', fontWeight: 'bold', letterSpacing: '1px' }}>
            {order.ticketCode}
          </div>
          <div style={{ fontSize: '10px' }}>
            {format(order.createdAt, "dd/MM/yyyy HH:mm", { locale: es })}
          </div>
        </div>

        {/* Separator */}
        <div
          style={{
            borderTop: '1px dashed #000',
            margin: '8px 0',
          }}
        />

        {/* Customer Info */}
        <div style={{ marginBottom: '8px' }}>
          <div style={{ fontWeight: 'bold' }}>CLIENTE:</div>
          <div>{order.customerName}</div>
          {order.customerPhone && <div>Tel: {order.customerPhone}</div>}
          {order.customerAddress && (
            <div style={{ fontSize: '10px' }}>Dir: {order.customerAddress}</div>
          )}
        </div>

        {/* Delivery Info */}
        {(order.needsPickup || order.needsDelivery || order.isDelivery) && (
          <div
            style={{
              marginBottom: '8px',
              padding: '4px',
              border: '1px solid #000',
              fontSize: '10px',
            }}
          >
            {order.needsPickup && <div>✓ Recogida a domicilio</div>}
            {(order.needsDelivery || order.isDelivery) && (
              <div>✓ Entrega a domicilio</div>
            )}
            {order.deliverySlot && (
              <div>
                Horario:{' '}
                {order.deliverySlot === 'morning'
                  ? 'Mañana (9-13h)'
                  : 'Tarde (14-19h)'}
              </div>
            )}
            {order.estimatedReadyAt && (
              <div>
                Listo aprox:{' '}
                {format(order.estimatedReadyAt, 'dd/MM HH:mm', { locale: es })}
              </div>
            )}
          </div>
        )}

        {/* Separator */}
        <div
          style={{
            borderTop: '1px dashed #000',
            margin: '8px 0',
          }}
        />

        {/* Items Header */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            fontWeight: 'bold',
            fontSize: '10px',
            marginBottom: '4px',
          }}
        >
          <span style={{ flex: 2 }}>ARTICULO</span>
          <span style={{ flex: 1, textAlign: 'center' }}>CANT</span>
          {settings.showPrices && (
            <>
              <span style={{ flex: 1, textAlign: 'right' }}>P.U.</span>
              <span style={{ flex: 1, textAlign: 'right' }}>TOTAL</span>
            </>
          )}
        </div>

        {/* Items List */}
        {order.items.map((item: OrderItem) => (
          <div key={item.id} style={{ marginBottom: '4px' }}>
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                fontSize: '11px',
              }}
            >
              <span
                style={{
                  flex: 2,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}
              >
                {item.name}
              </span>
              <span style={{ flex: 1, textAlign: 'center' }}>
                {item.quantity} {getItemTypeLabel(item.type)}
              </span>
              {settings.showPrices && (
                <>
                  <span style={{ flex: 1, textAlign: 'right' }}>
                    ${item.unitPrice.toFixed(2)}
                  </span>
                  <span style={{ flex: 1, textAlign: 'right' }}>
                    ${(item.quantity * item.unitPrice).toFixed(2)}
                  </span>
                </>
              )}
            </div>
            {item.extras.length > 0 && (
              <div style={{ fontSize: '9px', paddingLeft: '8px', color: '#555' }}>
                + {getExtraNames(item.extras)}
              </div>
            )}
          </div>
        ))}

        {/* Separator */}
        <div
          style={{
            borderTop: '1px dashed #000',
            margin: '8px 0',
          }}
        />

        {/* Totals */}
        {settings.showPrices && (
          <div style={{ marginBottom: '8px' }}>
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                fontSize: '14px',
                fontWeight: 'bold',
              }}
            >
              <span>TOTAL:</span>
              <span>${order.totalAmount.toFixed(2)}</span>
            </div>
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                fontSize: '11px',
              }}
            >
              <span>Pagado:</span>
              <span>${order.paidAmount.toFixed(2)}</span>
            </div>
            {!order.isPaid && (
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  fontSize: '11px',
                  fontWeight: 'bold',
                }}
              >
                <span>SALDO:</span>
                <span>${(order.totalAmount - order.paidAmount).toFixed(2)}</span>
              </div>
            )}
          </div>
        )}

        {/* Payment Status */}
        <div
          style={{
            textAlign: 'center',
            padding: '4px',
            backgroundColor: order.isPaid ? '#d4edda' : '#fff3cd',
            border: `1px solid ${order.isPaid ? '#28a745' : '#ffc107'}`,
            fontSize: '12px',
            fontWeight: 'bold',
            marginBottom: '8px',
          }}
        >
          {order.isPaid ? '✓ PAGADO' : '⚠ PENDIENTE DE PAGO'}
        </div>

        {/* Notes */}
        {order.notes && (
          <div
            style={{
              marginBottom: '8px',
              padding: '4px',
              border: '1px solid #ccc',
              fontSize: '10px',
            }}
          >
            <strong>Notas:</strong> {order.notes}
          </div>
        )}

        {/* Footer */}
        <div
          style={{
            textAlign: 'center',
            fontSize: '10px',
            marginTop: '8px',
            paddingTop: '8px',
            borderTop: '1px dashed #000',
          }}
        >
          {settings.thankYouMessage && <div>{settings.thankYouMessage}</div>}
          {business.website && <div>{business.website}</div>}
          {settings.showFooter && settings.footerText && (
            <div style={{ marginTop: '8px', fontSize: '9px', color: '#666' }}>
              {settings.footerText}
            </div>
          )}
        </div>

        {/* QR Code */}
        {settings.showQR && (
          <div
            style={{
              textAlign: 'center',
              marginTop: '8px',
            }}
          >
            <QRCodeSVG 
              value={getQrValue()} 
              size={80} 
              level="M"
              style={{ margin: '0 auto' }}
            />
            <div style={{ fontSize: '8px', marginTop: '4px', color: '#666' }}>
              {settings.qrContent === 'payment_link' ? 'Escanea para pagar' : order.ticketCode}
            </div>
          </div>
        )}
      </div>
    );
  }
);

TicketPrint.displayName = 'TicketPrint';
