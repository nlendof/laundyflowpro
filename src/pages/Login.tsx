import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { UserRole } from '@/types';
import { ROLE_CONFIG } from '@/lib/constants';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  WashingMachine,
  Shield,
  Calculator,
  Settings,
  Truck,
  Loader2,
  Eye,
  EyeOff,
} from 'lucide-react';
import { cn } from '@/lib/utils';

const roleIcons: Record<UserRole, React.ElementType> = {
  admin: Shield,
  cajero: Calculator,
  operador: Settings,
  delivery: Truck,
};

export default function Login() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [selectedRole, setSelectedRole] = useState<UserRole | null>(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleRoleSelect = (role: UserRole) => {
    setSelectedRole(role);
    setEmail(`${role}@lavanderiaenpro.com`);
    setError('');
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRole) return;

    setIsLoading(true);
    setError('');

    try {
      const success = await login(email, password, selectedRole);
      if (success) {
        navigate('/dashboard');
      } else {
        setError('Credenciales incorrectas. Usa "demo123" como contraseña.');
      }
    } catch {
      setError('Error al iniciar sesión. Intenta de nuevo.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex">
      {/* Left Panel - Branding */}
      <div className="hidden lg:flex lg:w-1/2 gradient-primary relative overflow-hidden">
        <div className="absolute inset-0 opacity-30" style={{ backgroundImage: "url(\"data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.05'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E\")" }} />
        <div className="relative z-10 flex flex-col justify-center px-12 text-primary-foreground">
          <div className="flex items-center gap-4 mb-8">
            <div className="w-16 h-16 rounded-2xl bg-primary-foreground/10 backdrop-blur flex items-center justify-center">
              <WashingMachine className="w-10 h-10" />
            </div>
            <div>
              <h1 className="text-4xl font-bold">Lavandería Pro</h1>
              <p className="text-primary-foreground/80 text-lg">Sistema ERP</p>
            </div>
          </div>
          <p className="text-xl text-primary-foreground/90 max-w-md leading-relaxed">
            Gestión integral de tu lavandería. Control total de pedidos, entregas, finanzas e inventario.
          </p>
          <div className="mt-12 grid grid-cols-2 gap-4">
            {[
              { label: 'Pedidos Hoy', value: '47' },
              { label: 'Entregas Pendientes', value: '12' },
              { label: 'Ingresos del Día', value: '$1,250' },
              { label: 'Clientes Activos', value: '234' },
            ].map((stat) => (
              <div
                key={stat.label}
                className="bg-primary-foreground/10 backdrop-blur rounded-xl p-4"
              >
                <p className="text-3xl font-bold">{stat.value}</p>
                <p className="text-sm text-primary-foreground/70">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right Panel - Login Form */}
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="w-full max-w-md space-y-8">
          {/* Mobile Logo */}
          <div className="lg:hidden flex items-center justify-center gap-3 mb-8">
            <div className="w-12 h-12 rounded-xl gradient-primary flex items-center justify-center">
              <WashingMachine className="w-7 h-7 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">Lavandería Pro</h1>
              <p className="text-sm text-muted-foreground">Sistema ERP</p>
            </div>
          </div>

          <div className="text-center">
            <h2 className="text-2xl font-bold">Bienvenido de nuevo</h2>
            <p className="text-muted-foreground mt-2">
              Selecciona tu perfil para continuar
            </p>
          </div>

          {/* Role Selection */}
          <div className="grid grid-cols-2 gap-4">
            {(Object.keys(ROLE_CONFIG) as UserRole[]).map((role) => {
              const config = ROLE_CONFIG[role];
              const Icon = roleIcons[role];
              const isSelected = selectedRole === role;

              return (
                <Button
                  key={role}
                  variant="roleSelect"
                  onClick={() => handleRoleSelect(role)}
                  className={cn(
                    isSelected && 'border-primary bg-primary/5 shadow-glow'
                  )}
                >
                  <div
                    className={cn(
                      'w-12 h-12 rounded-xl flex items-center justify-center transition-colors',
                      isSelected ? config.color : 'bg-muted',
                      isSelected ? 'text-primary-foreground' : 'text-muted-foreground'
                    )}
                  >
                    <Icon className="w-6 h-6" />
                  </div>
                  <span className="font-semibold">{config.labelEs}</span>
                </Button>
              );
            })}
          </div>

          {/* Login Form */}
          {selectedRole && (
            <form onSubmit={handleLogin} className="space-y-4 animate-fade-in">
              <div className="space-y-2">
                <Label htmlFor="email">Correo electrónico</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="correo@ejemplo.com"
                  className="h-12"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Contraseña</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="h-12 pr-12"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="absolute right-1 top-1 h-10 w-10"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4 text-muted-foreground" />
                    ) : (
                      <Eye className="h-4 w-4 text-muted-foreground" />
                    )}
                  </Button>
                </div>
              </div>

              {error && (
                <p className="text-sm text-destructive bg-destructive/10 p-3 rounded-lg">
                  {error}
                </p>
              )}

              <Button
                type="submit"
                variant="hero"
                size="xl"
                className="w-full"
                disabled={isLoading}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Iniciando sesión...
                  </>
                ) : (
                  'Iniciar Sesión'
                )}
              </Button>

              <p className="text-center text-sm text-muted-foreground">
                Demo: usa <code className="bg-muted px-1.5 py-0.5 rounded">demo123</code> como contraseña
              </p>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
