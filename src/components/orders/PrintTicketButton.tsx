import { useRef, useState } from 'react';
import { Order } from '@/types';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { TicketPrint } from './TicketPrint';
import { WhatsAppTicketButton } from './WhatsAppTicketButton';
import { Printer, Eye } from 'lucide-react';

interface PrintTicketButtonProps {
  order: Order;
  variant?: 'default' | 'outline' | 'ghost' | 'secondary';
  size?: 'default' | 'sm' | 'lg' | 'icon';
  showLabel?: boolean;
  className?: string;
}

export function PrintTicketButton({
  order,
  variant = 'outline',
  size = 'default',
  showLabel = true,
  className,
}: PrintTicketButtonProps) {
  const [showPreview, setShowPreview] = useState(false);
  const ticketRef = useRef<HTMLDivElement>(null);

  const handlePrint = () => {
    if (!ticketRef.current) return;

    // Create a new window for printing
    const printWindow = window.open('', '_blank', 'width=350,height=600');
    if (!printWindow) {
      alert('Por favor habilite las ventanas emergentes para imprimir');
      return;
    }

    // Get the ticket HTML
    const ticketHtml = ticketRef.current.innerHTML;

    // Write the print document
    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Ticket ${order.ticketCode}</title>
          <style>
            * {
              margin: 0;
              padding: 0;
              box-sizing: border-box;
            }
            body {
              font-family: monospace, 'Courier New', Courier;
              font-size: 12px;
              line-height: 1.3;
              width: 80mm;
              padding: 2mm;
              background: white;
              color: black;
            }
            @media print {
              @page {
                size: 80mm auto;
                margin: 0;
              }
              body {
                width: 80mm;
                padding: 2mm;
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

    // Wait for content to load, then print
    printWindow.onload = () => {
      printWindow.focus();
      printWindow.print();
      // Close after a small delay to ensure print dialog appears
      setTimeout(() => {
        printWindow.close();
      }, 500);
    };
  };

  const handleDirectPrint = () => {
    setShowPreview(true);
  };

  return (
    <>
      <Button
        variant={variant}
        size={size}
        onClick={handleDirectPrint}
        className={className}
      >
        <Printer className="w-4 h-4" />
        {showLabel && size !== 'icon' && <span className="ml-2">Imprimir Ticket</span>}
      </Button>

      {/* Preview Dialog */}
      <Dialog open={showPreview} onOpenChange={setShowPreview}>
        <DialogContent className="w-[95vw] max-w-[420px] max-h-[90vh] flex flex-col p-4">
          <DialogHeader className="flex-shrink-0">
            <DialogTitle className="flex items-center gap-2">
              <Eye className="w-5 h-5" />
              Vista Previa del Ticket
            </DialogTitle>
          </DialogHeader>

          {/* Ticket Preview - scrollable area */}
          <div className="flex-1 min-h-0 overflow-y-auto">
            <div className="flex justify-center bg-muted/50 p-3 rounded-lg">
              <TicketPrint ref={ticketRef} order={order} />
            </div>
          </div>

          {/* Actions - always visible at bottom */}
          <div className="grid grid-cols-1 gap-2 pt-3 flex-shrink-0 border-t mt-2 sm:grid-cols-3">
            <Button
              variant="outline"
              size="sm"
              className="w-full min-w-0 whitespace-normal"
              onClick={() => setShowPreview(false)}
            >
              Cerrar
            </Button>
            <WhatsAppTicketButton
              order={order}
              variant="outline"
              size="sm"
              className="w-full min-w-0 whitespace-normal"
            />
            <Button
              size="sm"
              className="w-full min-w-0 whitespace-normal gap-1"
              onClick={handlePrint}
            >
              <Printer className="w-4 h-4" />
              Imprimir
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
