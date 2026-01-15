import { useRef } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Printer, QrCode } from 'lucide-react';
import { Order } from '@/types';
import { TicketPrint } from './TicketPrint';
import { WhatsAppTicketButton } from './WhatsAppTicketButton';

interface OrderQRCodeProps {
  order: Order;
  isOpen: boolean;
  onClose: () => void;
}

export function OrderQRCode({ order, isOpen, onClose }: OrderQRCodeProps) {
  const ticketRef = useRef<HTMLDivElement>(null);

  const handlePrintQR = () => {
    const printWindow = window.open('', '_blank', 'width=350,height=400');
    if (!printWindow) {
      alert('Por favor habilite las ventanas emergentes para imprimir');
      return;
    }

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>QR ${order.ticketCode}</title>
          <style>
            body {
              display: flex;
              flex-direction: column;
              align-items: center;
              justify-content: center;
              height: 100vh;
              margin: 0;
              font-family: monospace;
            }
            .code { font-size: 24px; font-weight: bold; margin-top: 16px; }
            .name { color: #666; margin-top: 8px; }
          </style>
        </head>
        <body>
          <div id="qr"></div>
          <div class="code">${order.ticketCode}</div>
          <div class="name">${order.customerName}</div>
          <script src="https://cdn.jsdelivr.net/npm/qrcode@1.5.3/build/qrcode.min.js"></script>
          <script>
            QRCode.toCanvas(document.createElement('canvas'), '${order.ticketCode}', { width: 180 }, function(error, canvas) {
              if (!error) document.getElementById('qr').appendChild(canvas);
              setTimeout(function() { window.print(); window.close(); }, 500);
            });
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  const handlePrintTicket = () => {
    if (!ticketRef.current) return;

    const printWindow = window.open('', '_blank', 'width=350,height=600');
    if (!printWindow) {
      alert('Por favor habilite las ventanas emergentes para imprimir');
      return;
    }

    const ticketHtml = ticketRef.current.innerHTML;

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

    printWindow.onload = () => {
      printWindow.focus();
      printWindow.print();
      setTimeout(() => {
        printWindow.close();
      }, 500);
    };
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-sm text-center">
        <DialogHeader>
          <DialogTitle>Pedido Creado</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          <div className="flex justify-center">
            <div className="p-4 bg-white rounded-xl shadow-inner">
              <QRCodeSVG 
                value={order.ticketCode} 
                size={180}
                level="H"
                includeMargin
              />
            </div>
          </div>
          
          <div>
            <p className="font-mono text-2xl font-bold">{order.ticketCode}</p>
            <p className="text-muted-foreground">{order.customerName}</p>
          </div>

          {/* Action Buttons */}
          <div className="grid grid-cols-2 gap-2 pt-4">
            <Button variant="outline" className="gap-2" onClick={handlePrintQR}>
              <QrCode className="w-4 h-4" />
              Imprimir QR
            </Button>
            <Button variant="outline" className="gap-2" onClick={handlePrintTicket}>
              <Printer className="w-4 h-4" />
              Imprimir Ticket
            </Button>
            <WhatsAppTicketButton 
              order={order} 
              variant="outline"
              className="col-span-2"
            />
            <Button className="col-span-2" onClick={onClose}>
              Cerrar
            </Button>
          </div>
        </div>

        {/* Hidden ticket for printing */}
        <div className="hidden">
          <TicketPrint ref={ticketRef} order={order} />
        </div>
      </DialogContent>
    </Dialog>
  );
}
