import { useState, useEffect } from 'react';
import { Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { toast } from 'sonner';
import { Camera, Save, User } from 'lucide-react';

interface CustomerProfileProps {
  session: Session;
  customerData: any;
  onUpdate: () => void;
}

export default function CustomerProfile({ session, customerData, onUpdate }: CustomerProfileProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [profile, setProfile] = useState({
    name: customerData?.name || '',
    phone: customerData?.phone || '',
    email: customerData?.email || session.user.email || '',
    delivery_notes: '',
    preferred_pickup_time: '',
    preferred_delivery_time: '',
    avatar_url: '',
  });

  useEffect(() => {
    fetchProfile();
  }, [session]);

  const fetchProfile = async () => {
    const { data } = await supabase
      .from('customer_profiles')
      .select('*')
      .eq('id', session.user.id)
      .maybeSingle();

    if (data) {
      setProfile(prev => ({
        ...prev,
        phone: data.phone || prev.phone,
        delivery_notes: data.delivery_notes || '',
        preferred_pickup_time: data.preferred_pickup_time || '',
        preferred_delivery_time: data.preferred_delivery_time || '',
        avatar_url: data.avatar_url || '',
      }));
    }
  };

  const handleSave = async () => {
    setIsLoading(true);

    try {
      // Update customer record
      if (customerData?.id) {
        await supabase
          .from('customers')
          .update({
            name: profile.name,
            phone: profile.phone,
          })
          .eq('id', customerData.id);
      }

      // Update or insert customer profile
      await supabase
        .from('customer_profiles')
        .upsert({
          id: session.user.id,
          phone: profile.phone,
          delivery_notes: profile.delivery_notes,
          preferred_pickup_time: profile.preferred_pickup_time,
          preferred_delivery_time: profile.preferred_delivery_time,
          avatar_url: profile.avatar_url,
        });

      toast.success('Perfil actualizado');
      onUpdate();
    } catch (error) {
      toast.error('Error al guardar');
    } finally {
      setIsLoading(false);
    }
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const fileExt = file.name.split('.').pop();
    const fileName = `${session.user.id}/avatar.${fileExt}`;

    setIsLoading(true);

    try {
      const { error: uploadError } = await supabase.storage
        .from('business-logos')
        .upload(fileName, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from('business-logos')
        .getPublicUrl(fileName);

      setProfile(prev => ({ ...prev, avatar_url: urlData.publicUrl }));
      toast.success('Foto actualizada');
    } catch (error) {
      toast.error('Error al subir la foto');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <h2 className="text-lg font-semibold">Mi Perfil</h2>

      {/* Avatar Section */}
      <Card>
        <CardContent className="p-6 flex flex-col items-center">
          <div className="relative">
            <Avatar className="w-24 h-24">
              <AvatarImage src={profile.avatar_url} />
              <AvatarFallback className="text-2xl bg-primary/10">
                <User className="w-10 h-10 text-primary" />
              </AvatarFallback>
            </Avatar>
            <label className="absolute bottom-0 right-0 p-2 bg-primary text-primary-foreground rounded-full cursor-pointer hover:bg-primary/90 transition-colors">
              <Camera className="w-4 h-4" />
              <input 
                type="file" 
                accept="image/*" 
                className="hidden" 
                onChange={handleAvatarUpload}
              />
            </label>
          </div>
          <p className="mt-4 font-semibold text-lg">{profile.name || 'Cliente'}</p>
          <p className="text-sm text-muted-foreground">{profile.email}</p>
        </CardContent>
      </Card>

      {/* Profile Form */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Información Personal</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Nombre completo</Label>
            <Input
              value={profile.name}
              onChange={(e) => setProfile({ ...profile, name: e.target.value })}
              placeholder="Tu nombre"
            />
          </div>
          <div className="space-y-2">
            <Label>Teléfono</Label>
            <Input
              value={profile.phone}
              onChange={(e) => setProfile({ ...profile, phone: e.target.value })}
              placeholder="+52 123 456 7890"
            />
          </div>
          <div className="space-y-2">
            <Label>Correo electrónico</Label>
            <Input
              value={profile.email}
              disabled
              className="bg-muted"
            />
          </div>
        </CardContent>
      </Card>

      {/* Preferences */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Preferencias de Entrega</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Horario preferido para recogida</Label>
            <Input
              value={profile.preferred_pickup_time}
              onChange={(e) => setProfile({ ...profile, preferred_pickup_time: e.target.value })}
              placeholder="Ej: 9:00 AM - 12:00 PM"
            />
          </div>
          <div className="space-y-2">
            <Label>Horario preferido para entrega</Label>
            <Input
              value={profile.preferred_delivery_time}
              onChange={(e) => setProfile({ ...profile, preferred_delivery_time: e.target.value })}
              placeholder="Ej: 3:00 PM - 6:00 PM"
            />
          </div>
          <div className="space-y-2">
            <Label>Notas de entrega</Label>
            <textarea
              value={profile.delivery_notes}
              onChange={(e) => setProfile({ ...profile, delivery_notes: e.target.value })}
              placeholder="Instrucciones especiales para entregas..."
              className="w-full p-3 border rounded-lg min-h-[100px] resize-none"
            />
          </div>
        </CardContent>
      </Card>

      <Button 
        className="w-full" 
        onClick={handleSave}
        disabled={isLoading}
      >
        {isLoading ? (
          'Guardando...'
        ) : (
          <>
            <Save className="w-4 h-4 mr-2" />
            Guardar Cambios
          </>
        )}
      </Button>
    </div>
  );
}
