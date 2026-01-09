import { useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Receipt, Image, QrCode, FileText, Eye } from 'lucide-react';
import { useConfig, TicketSettings } from '@/contexts/ConfigContext';
import { TicketPrint } from '@/components/orders/TicketPrint';
import { Order } from '@/types';

// Sample order for preview
const SAMPLE_ORDER: Order = {
  id: 'preview-001',
  ticketCode: 'LC-2024-0001',
  customerId: 'c1',
  customerName: 'Juan Pérez',
  customerPhone: '+1 809 555 1234',
  customerAddress: 'Calle Principal #45',
  status: 'ready_delivery',
  items: [
    {
      id: '1',
      name: 'Camisas',
      quantity: 5,
      unitPrice: 3.00,
      type: 'piece',
      extras: [],
    },
    {
      id: '2',
      name: 'Pantalones',
      quantity: 3,
      unitPrice: 4.00,
      type: 'piece',
      extras: ['1'],
    },
  ],
  totalAmount: 30.00,
  paidAmount: 15.00,
  isPaid: false,
  createdAt: new Date(),
  updatedAt: new Date(),
  notes: 'Cliente preferente',
  needsPickup: false,
  needsDelivery: true,
  isDelivery: true,
  qrCode: 'LC-2024-0001',
};

export function TicketSettingsTab() {
  const { ticketSettings, setTicketSettings } = useConfig();
  const ticketRef = useRef<HTMLDivElement>(null);
  const [previewKey, setPreviewKey] = useState(0);

  const updateSetting = <K extends keyof TicketSettings>(
    key: K,
    value: TicketSettings[K]
  ) => {
    setTicketSettings(prev => ({ ...prev, [key]: value }));
    // Force preview refresh
    setPreviewKey(prev => prev + 1);
  };

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      {/* Settings Column */}
      <div className="space-y-6">
        {/* Logo Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Image className="w-5 h-5" />
              Logo del Ticket
            </CardTitle>
            <CardDescription>
              Agrega tu logo para que aparezca en el encabezado del ticket
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <Label htmlFor="showLogo">Mostrar Logo</Label>
              <Switch
                id="showLogo"
                checked={ticketSettings.showLogo}
                onCheckedChange={(checked) => updateSetting('showLogo', checked)}
              />
            </div>
            {ticketSettings.showLogo && (
              <div className="space-y-2">
                <Label htmlFor="logoUrl">URL del Logo</Label>
                <Input
                  id="logoUrl"
                  placeholder="https://ejemplo.com/logo.png"
                  value={ticketSettings.logoUrl}
                  onChange={(e) => updateSetting('logoUrl', e.target.value)}
                />
                <p className="text-xs text-muted-foreground">
                  Recomendado: imagen cuadrada, máximo 120x60px
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Prices Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Receipt className="w-5 h-5" />
              Información de Precios
            </CardTitle>
            <CardDescription>
              Controla qué información de precios se muestra en el ticket
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="showPrices">Mostrar Precios</Label>
                <p className="text-xs text-muted-foreground">
                  Incluir precios unitarios y totales en el ticket
                </p>
              </div>
              <Switch
                id="showPrices"
                checked={ticketSettings.showPrices}
                onCheckedChange={(checked) => updateSetting('showPrices', checked)}
              />
            </div>
          </CardContent>
        </Card>

        {/* QR Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <QrCode className="w-5 h-5" />
              Código QR
            </CardTitle>
            <CardDescription>
              Configura el código QR que aparece en el ticket
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <Label htmlFor="showQR">Mostrar Código QR</Label>
              <Switch
                id="showQR"
                checked={ticketSettings.showQR}
                onCheckedChange={(checked) => updateSetting('showQR', checked)}
              />
            </div>
            {ticketSettings.showQR && (
              <>
                <div className="space-y-2">
                  <Label>Contenido del QR</Label>
                  <Select
                    value={ticketSettings.qrContent}
                    onValueChange={(value: 'ticket_code' | 'payment_link' | 'custom') =>
                      updateSetting('qrContent', value)
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ticket_code">Código del Ticket</SelectItem>
                      <SelectItem value="payment_link">Enlace de Pago</SelectItem>
                      <SelectItem value="custom">URL Personalizada</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                {(ticketSettings.qrContent === 'payment_link' ||
                  ticketSettings.qrContent === 'custom') && (
                  <div className="space-y-2">
                    <Label htmlFor="customQrUrl">
                      {ticketSettings.qrContent === 'payment_link'
                        ? 'URL Base de Pago'
                        : 'URL Personalizada'}
                    </Label>
                    <Input
                      id="customQrUrl"
                      placeholder="https://..."
                      value={ticketSettings.customQrUrl}
                      onChange={(e) => updateSetting('customQrUrl', e.target.value)}
                    />
                    <p className="text-xs text-muted-foreground">
                      {ticketSettings.qrContent === 'payment_link'
                        ? 'El código del ticket se añadirá al final de esta URL'
                        : 'Esta URL aparecerá en el código QR'}
                    </p>
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>

        {/* Footer Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5" />
              Pie de Página
            </CardTitle>
            <CardDescription>
              Personaliza los mensajes que aparecen al final del ticket
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="thankYouMessage">Mensaje de Agradecimiento</Label>
              <Input
                id="thankYouMessage"
                placeholder="¡Gracias por su preferencia!"
                value={ticketSettings.thankYouMessage}
                onChange={(e) => updateSetting('thankYouMessage', e.target.value)}
              />
            </div>
            <div className="flex items-center justify-between">
              <Label htmlFor="showFooter">Mostrar Texto Adicional</Label>
              <Switch
                id="showFooter"
                checked={ticketSettings.showFooter}
                onCheckedChange={(checked) => updateSetting('showFooter', checked)}
              />
            </div>
            {ticketSettings.showFooter && (
              <div className="space-y-2">
                <Label htmlFor="footerText">Texto del Pie de Página</Label>
                <Textarea
                  id="footerText"
                  placeholder="Conserve este ticket para recoger su pedido"
                  value={ticketSettings.footerText}
                  onChange={(e) => updateSetting('footerText', e.target.value)}
                  rows={2}
                />
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Preview Column */}
      <div className="lg:sticky lg:top-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Eye className="w-5 h-5" />
              Vista Previa
            </CardTitle>
            <CardDescription>
              Así se verá tu ticket impreso
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div 
              className="flex justify-center p-4 bg-muted rounded-lg overflow-auto"
              style={{ maxHeight: '70vh' }}
            >
              <div className="shadow-lg">
                <TicketPrint 
                  key={previewKey}
                  ref={ticketRef} 
                  order={SAMPLE_ORDER}
                />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
