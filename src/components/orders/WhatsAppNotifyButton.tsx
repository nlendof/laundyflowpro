import { Button } from '@/components/ui/button';
import { MessageCircle } from 'lucide-react';
import { toast } from 'sonner';
import { useConfig } from '@/contexts/ConfigContext';
import { Order } from '@/types';
import { formatCurrency } from '@/lib/currency';

interface WhatsAppNotifyButtonProps {
  order: Order;
  notificationType: 'ready' | 'in_transit' | 'delivered';
  variant?: 'default' | 'outline' | 'ghost';
  size?: 'default' | 'sm' | 'lg' | 'icon';
  className?: string;
  showLabel?: boolean;
}

export function WhatsAppNotifyButton({
  order,
  notificationType,
  variant = 'outline',
  size = 'sm',
  className = '',
  showLabel = true,
}: WhatsAppNotifyButtonProps) {
  const { business } = useConfig();

  const pendingAmount = order.totalAmount - order.paidAmount;

  const getItemsSummary = (): string => {
    return order.items
      .map((item) => `• ${item.quantity} ${item.type === 'weight' ? 'kg' : 'pz'} - ${item.name}`)
      .join('\n');
  };

  const getNotificationMessage = (): string => {
    const greeting = `¡Hola ${order.customerName}! 👋`;
    const signature = `\n\n${business.name}\n📞 ${business.phone}`;
    const itemsList = getItemsSummary();
    
    const pendingPaymentMessage = !order.isPaid && pendingAmount > 0
      ? `\n\n💳 *Monto pendiente por pagar: ${formatCurrency(pendingAmount)}*`
      : '';
    
    switch (notificationType) {
      case 'ready':
        return `${greeting}\n\n✨ *¡Tu pedido está listo!*\n\n📋 Ticket: *${order.ticketCode}*\n\n📦 *Detalle del pedido:*\n${itemsList}\n\n💰 Total: *${formatCurrency(order.totalAmount)}*${order.isPaid ? ' ✅ Pagado' : ''}${pendingPaymentMessage}\n\n${order.needsDelivery 
          ? '🚗 Pronto enviaremos tu pedido a domicilio.' 
          : '📍 Puedes pasar a recogerlo en nuestro local.'}\n\n¡Gracias por tu preferencia!${signature}`;
      
      case 'in_transit':
        return `${greeting}\n\n🚗 *¡Tu pedido va en camino!*\n\n📋 Ticket: *${order.ticketCode}*\n📍 Dirección: ${order.deliveryService?.address || order.customerAddress || 'Por confirmar'}${pendingPaymentMessage}\n\n⏰ Llegará en breve. ¡Mantente atento!\n\n¡Gracias por tu preferencia!${signature}`;
      
      case 'delivered':
        return `${greeting}\n\n✅ *¡Tu pedido ha sido entregado!*\n\n📋 Ticket: *${order.ticketCode}*\n\nEsperamos que todo esté perfecto. ¡Gracias por confiar en nosotros! 🙏\n\n¿Te gustó nuestro servicio? Tu recomendación nos ayuda a crecer. ⭐${signature}`;
      
      default:
        return '';
    }
  };

  const handleSendWhatsApp = () => {
    const phone = order.customerPhone;
    
    if (!phone) {
      toast.error('El cliente no tiene número de teléfono registrado');
      return;
    }

    // Clean phone number (remove spaces, dashes, etc.)
    const cleanPhone = phone.replace(/[\s\-\(\)]/g, '');
    
    const message = encodeURIComponent(getNotificationMessage());
    const whatsappUrl = `https://wa.me/${cleanPhone}?text=${message}`;
    
    window.open(whatsappUrl, '_blank');
    toast.success('Abriendo WhatsApp...');
  };

  const getButtonLabel = () => {
    switch (notificationType) {
      case 'ready':
        return 'Notificar Listo';
      case 'in_transit':
        return 'Notificar En Camino';
      case 'delivered':
        return 'Notificar Entregado';
      default:
        return 'Notificar';
    }
  };

  return (
    <Button
      variant={variant}
      size={size}
      onClick={handleSendWhatsApp}
      className={`gap-2 ${className}`}
    >
      <MessageCircle className="w-4 h-4" />
      {showLabel && getButtonLabel()}
    </Button>
  );
}