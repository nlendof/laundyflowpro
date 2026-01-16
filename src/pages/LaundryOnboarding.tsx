import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useLaundryContext } from '@/contexts/LaundryContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Progress } from '@/components/ui/progress';
import { toast } from 'sonner';
import { 
  Loader2, 
  Building2, 
  Phone, 
  Mail, 
  MapPin, 
  CheckCircle, 
  WashingMachine,
  Sparkles,
  ArrowRight,
  ArrowLeft
} from 'lucide-react';
import { z } from 'zod';

const laundrySchema = z.object({
  name: z.string().min(2, 'El nombre debe tener al menos 2 caracteres'),
  phone: z.string().optional(),
  email: z.string().email('Email inválido').optional().or(z.literal('')),
  address: z.string().optional(),
});

type LaundryFormData = z.infer<typeof laundrySchema>;

export default function LaundryOnboarding() {
  const navigate = useNavigate();
  const { user, session } = useAuth();
  const { refetch } = useLaundryContext();
  const [step, setStep] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  
  const [formData, setFormData] = useState<LaundryFormData>({
    name: '',
    phone: '',
    email: '',
    address: '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleInputChange = (field: keyof LaundryFormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const validateStep1 = () => {
    const result = laundrySchema.pick({ name: true }).safeParse({ name: formData.name });
    if (!result.success) {
      const newErrors: Record<string, string> = {};
      result.error.errors.forEach((err) => {
        if (err.path[0]) {
          newErrors[err.path[0] as string] = err.message;
        }
      });
      setErrors(newErrors);
      return false;
    }
    return true;
  };

  const handleNextStep = () => {
    if (step === 1 && !validateStep1()) return;
    setStep(prev => prev + 1);
  };

  const handlePrevStep = () => {
    setStep(prev => prev - 1);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});

    const result = laundrySchema.safeParse(formData);
    if (!result.success) {
      const newErrors: Record<string, string> = {};
      result.error.errors.forEach((err) => {
        if (err.path[0]) {
          newErrors[err.path[0] as string] = err.message;
        }
      });
      setErrors(newErrors);
      return;
    }

    setIsLoading(true);

    try {
      const { data: { session: currentSession } } = await supabase.auth.getSession();
      
      if (!currentSession) {
        toast.error('Sesión expirada. Por favor inicia sesión nuevamente.');
        navigate('/login');
        return;
      }

      const { data, error } = await supabase.functions.invoke('create-laundry', {
        body: {
          name: formData.name,
          phone: formData.phone || undefined,
          email: formData.email || undefined,
          address: formData.address || undefined,
        },
      });

      if (error) {
        console.error('Error creating laundry:', error);
        toast.error(error.message || 'Error al crear la lavandería');
        return;
      }

      if (data?.error) {
        toast.error(data.error);
        return;
      }

      toast.success('¡Lavandería creada exitosamente!');
      await refetch();
      navigate('/dashboard');
    } catch (error) {
      console.error('Error:', error);
      toast.error('Error al crear la lavandería');
    } finally {
      setIsLoading(false);
    }
  };

  if (!session) {
    navigate('/login');
    return null;
  }

  const totalSteps = 3;
  const progressValue = (step / totalSteps) * 100;

  return (
    <div className="min-h-screen flex bg-gradient-to-br from-primary/5 via-background to-secondary/5">
      {/* Left Panel - Branding */}
      <div className="hidden lg:flex lg:w-1/2 gradient-primary relative overflow-hidden">
        <div className="absolute inset-0 opacity-30" style={{ backgroundImage: "url(\"data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.05'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E\")" }} />
        <div className="relative z-10 flex flex-col justify-center px-12 text-primary-foreground">
          <div className="flex items-center gap-4 mb-8">
            <div className="w-16 h-16 rounded-2xl bg-primary-foreground/10 backdrop-blur flex items-center justify-center">
              <WashingMachine className="w-10 h-10" />
            </div>
            <div>
              <h1 className="text-4xl font-bold">LaundryFlow</h1>
              <p className="text-primary-foreground/80 text-lg">Pro</p>
            </div>
          </div>
          
          <div className="space-y-6 max-w-md">
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-lg bg-primary-foreground/10 flex items-center justify-center flex-shrink-0">
                <Sparkles className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-semibold text-lg">Gestión Completa</h3>
                <p className="text-primary-foreground/80">Controla pedidos, inventario, empleados y finanzas en un solo lugar.</p>
              </div>
            </div>
            
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-lg bg-primary-foreground/10 flex items-center justify-center flex-shrink-0">
                <Building2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-semibold text-lg">Multi-Sucursal</h3>
                <p className="text-primary-foreground/80">Administra múltiples ubicaciones desde una sola cuenta.</p>
              </div>
            </div>
            
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-lg bg-primary-foreground/10 flex items-center justify-center flex-shrink-0">
                <CheckCircle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-semibold text-lg">Fácil de Usar</h3>
                <p className="text-primary-foreground/80">Interfaz intuitiva diseñada para el día a día de tu negocio.</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Right Panel - Form */}
      <div className="flex-1 flex items-center justify-center p-4 lg:p-8">
        <div className="w-full max-w-md">
          {/* Mobile Logo */}
          <div className="lg:hidden flex items-center justify-center gap-3 mb-8">
            <div className="w-12 h-12 rounded-xl gradient-primary flex items-center justify-center">
              <WashingMachine className="w-7 h-7 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">LaundryFlow</h1>
              <p className="text-sm text-muted-foreground">Pro</p>
            </div>
          </div>

          {/* Progress */}
          <div className="mb-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-muted-foreground">Paso {step} de {totalSteps}</span>
              <span className="text-sm font-medium">
                {step === 1 && 'Nombre del Negocio'}
                {step === 2 && 'Datos de Contacto'}
                {step === 3 && 'Ubicación'}
              </span>
            </div>
            <Progress value={progressValue} className="h-2" />
          </div>

          <Card className="border-0 shadow-xl">
            {step === 1 && (
              <>
                <CardHeader className="space-y-1 pb-4">
                  <CardTitle className="text-xl flex items-center gap-2">
                    <Building2 className="w-5 h-5" />
                    Nombre de tu Lavandería
                  </CardTitle>
                  <CardDescription>
                    Ingresa el nombre comercial de tu negocio.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="name">Nombre del negocio *</Label>
                      <div className="relative">
                        <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <Input
                          id="name"
                          type="text"
                          placeholder="Ej: Lavandería Express"
                          value={formData.name}
                          onChange={(e) => handleInputChange('name', e.target.value)}
                          className="pl-10"
                          autoFocus
                        />
                      </div>
                      {errors.name && (
                        <p className="text-sm text-destructive">{errors.name}</p>
                      )}
                    </div>

                    <Button 
                      type="button" 
                      className="w-full" 
                      size="lg" 
                      onClick={handleNextStep}
                    >
                      Continuar
                      <ArrowRight className="w-4 h-4 ml-2" />
                    </Button>
                  </div>
                </CardContent>
              </>
            )}

            {step === 2 && (
              <>
                <CardHeader className="space-y-1 pb-4">
                  <CardTitle className="text-xl flex items-center gap-2">
                    <Phone className="w-5 h-5" />
                    Datos de Contacto
                  </CardTitle>
                  <CardDescription>
                    Información para que tus clientes puedan contactarte.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="phone">Teléfono</Label>
                      <div className="relative">
                        <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <Input
                          id="phone"
                          type="tel"
                          placeholder="Ej: +52 555 123 4567"
                          value={formData.phone}
                          onChange={(e) => handleInputChange('phone', e.target.value)}
                          className="pl-10"
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="email">Email</Label>
                      <div className="relative">
                        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <Input
                          id="email"
                          type="email"
                          placeholder="Ej: contacto@milavanderia.com"
                          value={formData.email}
                          onChange={(e) => handleInputChange('email', e.target.value)}
                          className="pl-10"
                        />
                      </div>
                      {errors.email && (
                        <p className="text-sm text-destructive">{errors.email}</p>
                      )}
                    </div>

                    <div className="flex gap-3">
                      <Button 
                        type="button" 
                        variant="outline"
                        className="flex-1" 
                        size="lg" 
                        onClick={handlePrevStep}
                      >
                        <ArrowLeft className="w-4 h-4 mr-2" />
                        Atrás
                      </Button>
                      <Button 
                        type="button" 
                        className="flex-1" 
                        size="lg" 
                        onClick={handleNextStep}
                      >
                        Continuar
                        <ArrowRight className="w-4 h-4 ml-2" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </>
            )}

            {step === 3 && (
              <>
                <CardHeader className="space-y-1 pb-4">
                  <CardTitle className="text-xl flex items-center gap-2">
                    <MapPin className="w-5 h-5" />
                    Ubicación
                  </CardTitle>
                  <CardDescription>
                    Dirección de tu sucursal principal.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="address">Dirección</Label>
                      <div className="relative">
                        <MapPin className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
                        <Textarea
                          id="address"
                          placeholder="Ej: Av. Principal #123, Col. Centro, Ciudad"
                          value={formData.address}
                          onChange={(e) => handleInputChange('address', e.target.value)}
                          className="pl-10 min-h-[100px] resize-none"
                        />
                      </div>
                    </div>

                    {/* Summary */}
                    <div className="rounded-lg bg-muted/50 p-4 space-y-2">
                      <h4 className="font-medium text-sm">Resumen</h4>
                      <div className="text-sm space-y-1 text-muted-foreground">
                        <p><span className="font-medium text-foreground">Nombre:</span> {formData.name}</p>
                        {formData.phone && <p><span className="font-medium text-foreground">Teléfono:</span> {formData.phone}</p>}
                        {formData.email && <p><span className="font-medium text-foreground">Email:</span> {formData.email}</p>}
                        {formData.address && <p><span className="font-medium text-foreground">Dirección:</span> {formData.address}</p>}
                      </div>
                    </div>

                    <div className="flex gap-3">
                      <Button 
                        type="button" 
                        variant="outline"
                        className="flex-1" 
                        size="lg" 
                        onClick={handlePrevStep}
                        disabled={isLoading}
                      >
                        <ArrowLeft className="w-4 h-4 mr-2" />
                        Atrás
                      </Button>
                      <Button 
                        type="submit" 
                        className="flex-1" 
                        size="lg" 
                        disabled={isLoading}
                      >
                        {isLoading ? (
                          <>
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            Creando...
                          </>
                        ) : (
                          <>
                            <CheckCircle className="w-4 h-4 mr-2" />
                            Crear Lavandería
                          </>
                        )}
                      </Button>
                    </div>
                  </form>
                </CardContent>
              </>
            )}
          </Card>

          <p className="text-center text-sm text-muted-foreground mt-6">
            ¿Ya tienes una cuenta con lavandería?{' '}
            <Button variant="link" className="p-0 h-auto" onClick={() => navigate('/dashboard')}>
              Ir al Dashboard
            </Button>
          </p>
        </div>
      </div>
    </div>
  );
}
