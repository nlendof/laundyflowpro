import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { User, Phone, Mail, Camera, Lock, Eye, EyeOff, Loader2, Save } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

interface UserProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function UserProfileModal({ isOpen, onClose }: UserProfileModalProps) {
  const { user, refreshUser } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  
  // Profile fields
  const [name, setName] = useState('');
  const [nickname, setNickname] = useState('');
  const [phone, setPhone] = useState('');
  const [countryCode, setCountryCode] = useState('+52');
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  
  // Password change
  const [showPasswordSection, setShowPasswordSection] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPasswords, setShowPasswords] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);

  useEffect(() => {
    if (isOpen && user) {
      loadProfile();
    }
  }, [isOpen, user]);

  const loadProfile = async () => {
    if (!user) return;
    
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();
      
      if (error) throw error;
      
      if (data) {
        setName(data.name || '');
        // Extract nickname if name contains it (format: "Name (nickname)")
        const nicknameMatch = data.name?.match(/\((.+)\)$/);
        if (nicknameMatch) {
          setNickname(nicknameMatch[1]);
          setName(data.name.replace(/\s*\(.+\)$/, ''));
        }
        // Handle phone with country code
        if (data.phone) {
          if (data.phone.startsWith('+')) {
            const codeMatch = data.phone.match(/^(\+\d{1,3})/);
            if (codeMatch) {
              setCountryCode(codeMatch[1]);
              setPhone(data.phone.replace(codeMatch[1], '').trim());
            } else {
              setPhone(data.phone);
            }
          } else {
            setPhone(data.phone);
          }
        }
        setAvatarUrl(data.avatar_url);
      }
    } catch (error) {
      console.error('Error loading profile:', error);
      toast.error('Error al cargar el perfil');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveProfile = async () => {
    if (!user) return;
    
    setIsSaving(true);
    try {
      // Combine name with nickname if provided
      const fullName = nickname ? `${name} (${nickname})` : name;
      const fullPhone = phone ? `${countryCode}${phone}` : null;
      
      const { error } = await supabase
        .from('profiles')
        .update({
          name: fullName,
          phone: fullPhone,
          avatar_url: avatarUrl,
          updated_at: new Date().toISOString(),
        })
        .eq('id', user.id);
      
      if (error) throw error;
      
      toast.success('Perfil actualizado correctamente');
      if (refreshUser) {
        await refreshUser();
      }
      onClose();
    } catch (error) {
      console.error('Error saving profile:', error);
      toast.error('Error al guardar el perfil');
    } finally {
      setIsSaving(false);
    }
  };

  const handleChangePassword = async () => {
    if (newPassword !== confirmPassword) {
      toast.error('Las contraseñas no coinciden');
      return;
    }
    
    if (newPassword.length < 6) {
      toast.error('La contraseña debe tener al menos 6 caracteres');
      return;
    }
    
    setIsChangingPassword(true);
    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword,
      });
      
      if (error) throw error;
      
      toast.success('Contraseña actualizada correctamente');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setShowPasswordSection(false);
    } catch (error: any) {
      console.error('Error changing password:', error);
      toast.error(error.message || 'Error al cambiar la contraseña');
    } finally {
      setIsChangingPassword(false);
    }
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    
    try {
      const fileExt = file.name.split('.').pop();
      const filePath = `${user.id}/avatar.${fileExt}`;
      
      const { error: uploadError } = await supabase.storage
        .from('business-logos')
        .upload(filePath, file, { upsert: true });
      
      if (uploadError) throw uploadError;
      
      const { data } = supabase.storage
        .from('business-logos')
        .getPublicUrl(filePath);
      
      setAvatarUrl(data.publicUrl);
      toast.success('Foto actualizada');
    } catch (error) {
      console.error('Error uploading avatar:', error);
      toast.error('Error al subir la foto');
    }
  };

  if (!user) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <User className="w-5 h-5" />
            Mi Perfil
          </DialogTitle>
        </DialogHeader>
        
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : (
          <div className="space-y-6">
            {/* Avatar */}
            <div className="flex flex-col items-center gap-3">
              <div className="relative">
                <Avatar className="w-24 h-24">
                  <AvatarImage src={avatarUrl || undefined} />
                  <AvatarFallback className="text-2xl bg-primary text-primary-foreground">
                    {name.charAt(0)}
                  </AvatarFallback>
                </Avatar>
                <label className="absolute bottom-0 right-0 p-2 bg-primary rounded-full cursor-pointer hover:bg-primary/90 transition-colors">
                  <Camera className="w-4 h-4 text-primary-foreground" />
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleAvatarUpload}
                    className="hidden"
                  />
                </label>
              </div>
              <p className="text-sm text-muted-foreground">{user.email}</p>
            </div>
            
            {/* Profile Fields */}
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Nombre completo</Label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      id="name"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Tu nombre"
                      className="pl-10"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="nickname">Apodo (opcional)</Label>
                  <Input
                    id="nickname"
                    value={nickname}
                    onChange={(e) => setNickname(e.target.value)}
                    placeholder="Ej: Juanito"
                  />
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="phone">Teléfono</Label>
                <div className="flex gap-2">
                  <select
                    value={countryCode}
                    onChange={(e) => setCountryCode(e.target.value)}
                    className="flex h-10 w-24 rounded-md border border-input bg-background px-3 py-2 text-sm"
                  >
                    <option value="+52">+52 MX</option>
                    <option value="+1">+1 US</option>
                    <option value="+34">+34 ES</option>
                    <option value="+57">+57 CO</option>
                    <option value="+54">+54 AR</option>
                  </select>
                  <div className="relative flex-1">
                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      id="phone"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value.replace(/\D/g, ''))}
                      placeholder="10 dígitos"
                      className="pl-10"
                      maxLength={10}
                    />
                  </div>
                </div>
              </div>
            </div>
            
            {/* Password Section */}
            <div className="border-t pt-4">
              <Button
                variant="outline"
                className="w-full gap-2"
                onClick={() => setShowPasswordSection(!showPasswordSection)}
              >
                <Lock className="w-4 h-4" />
                Cambiar Contraseña
              </Button>
              
              {showPasswordSection && (
                <div className="mt-4 space-y-4 p-4 bg-muted/50 rounded-lg">
                  <div className="space-y-2">
                    <Label>Nueva Contraseña</Label>
                    <div className="relative">
                      <Input
                        type={showPasswords ? 'text' : 'password'}
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        placeholder="Mínimo 6 caracteres"
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="absolute right-0 top-0 h-full"
                        onClick={() => setShowPasswords(!showPasswords)}
                      >
                        {showPasswords ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </Button>
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <Label>Confirmar Contraseña</Label>
                    <Input
                      type={showPasswords ? 'text' : 'password'}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Repite la contraseña"
                    />
                  </div>
                  
                  <Button
                    className="w-full"
                    onClick={handleChangePassword}
                    disabled={!newPassword || !confirmPassword || isChangingPassword}
                  >
                    {isChangingPassword ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin mr-2" />
                        Cambiando...
                      </>
                    ) : (
                      'Actualizar Contraseña'
                    )}
                  </Button>
                </div>
              )}
            </div>
            
            {/* Save Button */}
            <div className="flex gap-3">
              <Button variant="outline" className="flex-1" onClick={onClose}>
                Cancelar
              </Button>
              <Button className="flex-1 gap-2" onClick={handleSaveProfile} disabled={isSaving}>
                {isSaving ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Guardando...
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4" />
                    Guardar
                  </>
                )}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
