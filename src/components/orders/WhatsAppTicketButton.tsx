import { Order, OrderItem } from '@/types';
import { Button } from '@/components/ui/button';
import { useConfig } from '@/contexts/ConfigContext';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { MessageCircle } from 'lucide-react';
import { toast } from 'sonner';

interface WhatsAppTicketButtonProps {
  order: Order;
  variant?: 'default' | 'outline' | 'ghost' | 'secondary';
  size?: 'default' | 'sm' | 'lg' | 'icon';
  showLabel?: boolean;
  className?: string;
}

export function WhatsAppTicketButton({
  order,
  variant = 'outline',
  size = 'default',
  showLabel = true,
  className,
}: WhatsAppTicketButtonProps) {
  const { business, activeExtraServices, ticketSettings } = useConfig();

  const getItemTypeLabel = (type: 'weight' | 'piece') =>
    type === 'weight' ? 'kg' : 'pza';

  const getExtraNames = (extras: string[]) => {
    return extras
      .map((extraId) => {
        const extra = activeExtraServices.find((e) => e.id === extraId);
        return extra?.name || extraId;
      })
      .join(', ');
  };

  const generateTicketMessage = (): string => {
    const lines: string[] = [];

    // Header
    lines.push(`🧺 *${business.name}*`);
    if (business.slogan) lines.push(`_${business.slogan}_`);
    lines.push('');

    // Ticket info
    lines.push(`📋 *Ticket: ${order.ticketCode}*`);
    lines.push(`📅 ${format(order.createdAt, "dd/MM/yyyy HH:mm", { locale: es })}`);
    lines.push('');

    // Customer
    lines.push('👤 *Cliente:*');
    lines.push(`• ${order.customerName}`);
    if (order.customerPhone) lines.push(`• Tel: ${order.customerPhone}`);
    if (order.customerAddress) lines.push(`• Dir: ${order.customerAddress}`);
    lines.push('');

    // Delivery info
    if (order.needsPickup || order.needsDelivery || order.isDelivery) {
      lines.push('🚚 *Servicio:*');
      if (order.needsPickup) lines.push('• ✓ Recogida a domicilio');
      if (order.needsDelivery || order.isDelivery) lines.push('• ✓ Entrega a domicilio');
      if (order.deliverySlot) {
        lines.push(`• Horario: ${order.deliverySlot === 'morning' ? 'Mañana (9-13h)' : 'Tarde (14-19h)'}`);
      }
      if (order.estimatedReadyAt) {
        lines.push(`• Listo aprox: ${format(order.estimatedReadyAt, 'dd/MM HH:mm', { locale: es })}`);
      }
      lines.push('');
    }

    // Items
    lines.push('📦 *Artículos:*');
    order.items.forEach((item: OrderItem) => {
      let itemLine = `• ${item.name} - ${item.quantity} ${getItemTypeLabel(item.type)}`;
      if (ticketSettings.showPrices) {
        itemLine += ` = $${(item.quantity * item.unitPrice).toFixed(2)}`;
      }
      lines.push(itemLine);
      if (item.extras.length > 0) {
        lines.push(`  _+ ${getExtraNames(item.extras)}_`);
      }
    });
    lines.push('');

    // Totals
    if (ticketSettings.showPrices) {
      lines.push('💰 *Resumen:*');
      lines.push(`• Total: *$${order.totalAmount.toFixed(2)}*`);
      lines.push(`• Pagado: $${order.paidAmount.toFixed(2)}`);
      if (!order.isPaid) {
        lines.push(`• *Saldo pendiente: $${(order.totalAmount - order.paidAmount).toFixed(2)}*`);
      }
      lines.push('');
    }

    // Payment status
    lines.push(order.isPaid ? '✅ *PAGADO*' : '⚠️ *PENDIENTE DE PAGO*');
    lines.push('');

    // Notes
    if (order.notes) {
      lines.push(`📝 *Notas:* ${order.notes}`);
      lines.push('');
    }

    // Footer
    if (ticketSettings.thankYouMessage) {
      lines.push(`_${ticketSettings.thankYouMessage}_`);
    }
    if (business.phone) {
      lines.push(`📞 ${business.phone}`);
    }
    if (business.website) {
      lines.push(`🌐 ${business.website}`);
    }

    return lines.join('\n');
  };

  const handleSendWhatsApp = () => {
    // Clean phone number - remove spaces, dashes, etc.
    let phone = order.customerPhone?.replace(/[\s\-\(\)]/g, '') || '';
    
    // If phone doesn't start with +, assume it's a local number
    // You might want to add a country code from business config
    if (phone && !phone.startsWith('+')) {
      // Remove leading 0 if present
      if (phone.startsWith('0')) {
        phone = phone.substring(1);
      }
      // Default to Mexico country code, adjust as needed
      phone = `+52${phone}`;
    }

    if (!phone) {
      toast.error('El cliente no tiene número de teléfono registrado');
      return;
    }

    const message = generateTicketMessage();
    const encodedMessage = encodeURIComponent(message);
    
    // Open WhatsApp with pre-filled message
    const whatsappUrl = `https://wa.me/${phone.replace('+', '')}?text=${encodedMessage}`;
    window.open(whatsappUrl, '_blank');
    
    toast.success('Abriendo WhatsApp...');
  };

  return (
    <Button
      variant={variant}
      size={size}
      onClick={handleSendWhatsApp}
      className={className}
    >
      <MessageCircle className="w-4 h-4" />
      {showLabel && size !== 'icon' && <span className="ml-2">Enviar WhatsApp</span>}
    </Button>
  );
}
