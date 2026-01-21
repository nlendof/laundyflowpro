import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { User, Phone, Mail, MapPin, FileText, Loader2, UserCircle } from 'lucide-react';
import { toast } from 'sonner';
import { z } from 'zod';
import { useBranchFilter } from '@/contexts/LaundryContext';

// Country codes for phone
const COUNTRY_CODES = [
  { code: '+1', country: 'RD/US', flag: '🇩🇴' },
  { code: '+52', country: 'México', flag: '🇲🇽' },
  { code: '+34', country: 'España', flag: '🇪🇸' },
  { code: '+57', country: 'Colombia', flag: '🇨🇴' },
  { code: '+58', country: 'Venezuela', flag: '🇻🇪' },
  { code: '+54', country: 'Argentina', flag: '🇦🇷' },
  { code: '+56', country: 'Chile', flag: '🇨🇱' },
  { code: '+51', country: 'Perú', flag: '🇵🇪' },
  { code: '+593', country: 'Ecuador', flag: '🇪🇨' },
  { code: '+502', country: 'Guatemala', flag: '🇬🇹' },
  { code: '+503', country: 'El Salvador', flag: '🇸🇻' },
  { code: '+504', country: 'Honduras', flag: '🇭🇳' },
  { code: '+505', country: 'Nicaragua', flag: '🇳🇮' },
  { code: '+506', country: 'Costa Rica', flag: '🇨🇷' },
  { code: '+507', country: 'Panamá', flag: '🇵🇦' },
  { code: '+55', country: 'Brasil', flag: '🇧🇷' },
];

export interface CustomerFormData {
  id?: string;
  name: string;
  nickname: string;
  phone: string;
  countryCode: string;
  email: string;
  address: string;
  notes: string;
}

interface CustomerFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (customer: { id: string; name: string; nickname: string | null; phone: string | null; email: string | null; address: string | null }) => void;
  initialData?: Partial<CustomerFormData>;
  mode?: 'create' | 'edit';
  title?: string;
}

const customerSchema = z.object({
  name: z.string().min(2, 'El nombre debe tener al menos 2 caracteres'),
  nickname: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().email('Correo inválido').optional().or(z.literal('')),
  address: z.string().optional(),
  notes: z.string().optional(),
});

// Helper to parse phone with country code
const parsePhone = (fullPhone: string | null): { countryCode: string; phone: string } => {
  if (!fullPhone) return { countryCode: '+1', phone: '' };
  
  // Try to match country code
  for (const cc of COUNTRY_CODES) {
    if (fullPhone.startsWith(cc.code)) {
      return { countryCode: cc.code, phone: fullPhone.slice(cc.code.length).trim() };
    }
  }
  
  return { countryCode: '+1', phone: fullPhone };
};

// Helper to format phone with country code
const formatPhoneWithCode = (countryCode: string, phone: string): string | null => {
  if (!phone.trim()) return null;
  return `${countryCode} ${phone.trim()}`;
};

export function CustomerFormModal({
  isOpen,
  onClose,
  onSave,
  initialData,
  mode = 'create',
  title,
}: CustomerFormModalProps) {
  const { laundryId } = useBranchFilter();
  const [formData, setFormData] = useState<CustomerFormData>({
    name: '',
    nickname: '',
    phone: '',
    countryCode: '+1', // Default to RD/US
    email: '',
    address: '',
    notes: '',
  });
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [isSaving, setIsSaving] = useState(false);

  // Reset form when modal opens or initialData changes
  useEffect(() => {
    if (isOpen) {
      if (initialData) {
        const { countryCode, phone } = parsePhone(initialData.phone || null);
        setFormData({
          id: initialData.id,
          name: initialData.name || '',
          nickname: initialData.nickname || '',
          phone,
          countryCode,
          email: initialData.email || '',
          address: initialData.address || '',
          notes: initialData.notes || '',
        });
      } else {
        setFormData({
          name: '',
          nickname: '',
          phone: '',
          countryCode: '+1',
          email: '',
          address: '',
          notes: '',
        });
      }
      setFormErrors({});
    }
  }, [isOpen, initialData]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormErrors({});

    const result = customerSchema.safeParse(formData);
    if (!result.success) {
      const errors: Record<string, string> = {};
      result.error.errors.forEach((err) => {
        if (err.path[0]) {
          errors[err.path[0] as string] = err.message;
        }
      });
      setFormErrors(errors);
      return;
    }

    setIsSaving(true);

    try {
      const fullPhone = formatPhoneWithCode(formData.countryCode, formData.phone);
      
      const customerData = {
        name: formData.name.trim(),
        nickname: formData.nickname.trim() || null,
        phone: fullPhone,
        email: formData.email.trim() || null,
        address: formData.address.trim() || null,
        notes: formData.notes.trim() || null,
      };

      if (mode === 'edit' && formData.id) {
        const { error } = await supabase
          .from('customers')
          .update(customerData)
          .eq('id', formData.id);

        if (error) throw error;
        
        onSave({
          id: formData.id,
          name: customerData.name,
          nickname: customerData.nickname,
          phone: fullPhone,
          email: customerData.email,
          address: customerData.address,
        });
        toast.success('Cliente actualizado');
      } else {
        const { data, error } = await supabase
          .from('customers')
          .insert({
            ...customerData,
            laundry_id: laundryId,
          })
          .select('id')
          .single();

        if (error) throw error;
        
        onSave({
          id: data.id,
          name: customerData.name,
          nickname: customerData.nickname,
          phone: fullPhone,
          email: customerData.email,
          address: customerData.address,
        });
        toast.success('Cliente creado');
      }

      onClose();
    } catch (error) {
      console.error('Error saving customer:', error);
      toast.error('Error al guardar cliente');
    } finally {
      setIsSaving(false);
    }
  };

  const modalTitle = title || (mode === 'edit' ? 'Editar Cliente' : 'Nuevo Cliente');

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <User className="w-5 h-5 text-primary" />
            {modalTitle}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSave} className="space-y-4 py-4">
          {/* Name */}
          <div className="space-y-2">
            <Label htmlFor="customer-name" className="flex items-center gap-2">
              <User className="w-4 h-4" />
              Nombre Completo *
            </Label>
            <Input
              id="customer-name"
              value={formData.name}
              onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
              placeholder="Nombre del cliente"
              disabled={isSaving}
            />
            {formErrors.name && <p className="text-sm text-destructive">{formErrors.name}</p>}
          </div>

          {/* Nickname */}
          <div className="space-y-2">
            <Label htmlFor="customer-nickname" className="flex items-center gap-2">
              <UserCircle className="w-4 h-4" />
              Apodo (opcional)
            </Label>
            <Input
              id="customer-nickname"
              value={formData.nickname}
              onChange={(e) => setFormData(prev => ({ ...prev, nickname: e.target.value }))}
              placeholder="Ej: Juanito, La Flaca, etc."
              disabled={isSaving}
            />
          </div>

          {/* Phone with country code */}
          <div className="space-y-2">
            <Label htmlFor="customer-phone" className="flex items-center gap-2">
              <Phone className="w-4 h-4" />
              Teléfono
            </Label>
            <div className="flex gap-2">
              <Select
                value={formData.countryCode}
                onValueChange={(value) => setFormData(prev => ({ ...prev, countryCode: value }))}
                disabled={isSaving}
              >
                <SelectTrigger className="w-[130px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {COUNTRY_CODES.map((cc) => (
                    <SelectItem key={cc.code} value={cc.code}>
                      <span className="flex items-center gap-2">
                        <span>{cc.flag}</span>
                        <span>{cc.code}</span>
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Input
                id="customer-phone"
                type="tel"
                value={formData.phone}
                onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                placeholder="809-555-1234"
                className="flex-1"
                disabled={isSaving}
              />
            </div>
          </div>

          {/* Email */}
          <div className="space-y-2">
            <Label htmlFor="customer-email" className="flex items-center gap-2">
              <Mail className="w-4 h-4" />
              Email (opcional)
            </Label>
            <Input
              id="customer-email"
              type="email"
              value={formData.email}
              onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
              placeholder="correo@ejemplo.com"
              disabled={isSaving}
            />
            {formErrors.email && <p className="text-sm text-destructive">{formErrors.email}</p>}
          </div>

          {/* Address */}
          <div className="space-y-2">
            <Label htmlFor="customer-address" className="flex items-center gap-2">
              <MapPin className="w-4 h-4" />
              Dirección (opcional)
            </Label>
            <Input
              id="customer-address"
              value={formData.address}
              onChange={(e) => setFormData(prev => ({ ...prev, address: e.target.value }))}
              placeholder="Calle, número, sector..."
              disabled={isSaving}
            />
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label htmlFor="customer-notes" className="flex items-center gap-2">
              <FileText className="w-4 h-4" />
              Notas (opcional)
            </Label>
            <Textarea
              id="customer-notes"
              value={formData.notes}
              onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
              placeholder="Notas sobre el cliente..."
              rows={2}
              disabled={isSaving}
            />
          </div>

          <DialogFooter className="pt-4">
            <Button type="button" variant="outline" onClick={onClose} disabled={isSaving}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isSaving}>
              {isSaving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {mode === 'edit' ? 'Guardar Cambios' : 'Crear Cliente'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// Export helper functions for use elsewhere
export { COUNTRY_CODES, parsePhone, formatPhoneWithCode };
