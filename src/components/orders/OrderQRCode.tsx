import { QRCodeSVG } from 'qrcode.react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Printer, Download } from 'lucide-react';

interface OrderQRCodeProps {
  ticketCode: string;
  customerName: string;
  isOpen: boolean;
  onClose: () => void;
}

export function OrderQRCode({ ticketCode, customerName, isOpen, onClose }: OrderQRCodeProps) {
  const handlePrint = () => {
    window.print();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-sm text-center">
        <DialogHeader>
          <DialogTitle>Ticket QR</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          <div className="flex justify-center">
            <div className="p-4 bg-white rounded-xl shadow-inner">
              <QRCodeSVG 
                value={ticketCode} 
                size={180}
                level="H"
                includeMargin
              />
            </div>
          </div>
          
          <div>
            <p className="font-mono text-2xl font-bold">{ticketCode}</p>
            <p className="text-muted-foreground">{customerName}</p>
          </div>

          <div className="flex gap-3 pt-4">
            <Button variant="outline" className="flex-1 gap-2" onClick={handlePrint}>
              <Printer className="w-4 h-4" />
              Imprimir
            </Button>
            <Button className="flex-1 gap-2" onClick={onClose}>
              Cerrar
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
