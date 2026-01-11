import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Palette, Check, Save } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { useTheme } from 'next-themes';

interface ColorOption {
  name: string;
  value: string;
  hslLight: string;
  hslDark: string;
}

const COLOR_OPTIONS: ColorOption[] = [
  { 
    name: 'Teal', 
    value: 'teal', 
    hslLight: '173 80% 32%',
    hslDark: '173 70% 45%'
  },
  { 
    name: 'Azul', 
    value: 'blue', 
    hslLight: '217 91% 50%',
    hslDark: '217 91% 60%'
  },
  { 
    name: 'Púrpura', 
    value: 'purple', 
    hslLight: '262 83% 50%',
    hslDark: '262 83% 58%'
  },
  { 
    name: 'Verde', 
    value: 'green', 
    hslLight: '142 71% 35%',
    hslDark: '142 71% 45%'
  },
  { 
    name: 'Naranja', 
    value: 'orange', 
    hslLight: '25 95% 50%',
    hslDark: '25 95% 53%'
  },
  { 
    name: 'Rosa', 
    value: 'pink', 
    hslLight: '330 81% 50%',
    hslDark: '330 81% 60%'
  },
  { 
    name: 'Índigo', 
    value: 'indigo', 
    hslLight: '243 75% 55%',
    hslDark: '243 75% 65%'
  },
];

export function AppearanceSettings() {
  const { theme, setTheme } = useTheme();
  const [primaryColor, setPrimaryColor] = useState('teal');
  const [showLogo, setShowLogo] = useState(true);
  const [compactMode, setCompactMode] = useState(false);

  // Load saved settings from localStorage
  useEffect(() => {
    const savedColor = localStorage.getItem('primaryColor');
    const savedShowLogo = localStorage.getItem('showLogo');
    const savedCompactMode = localStorage.getItem('compactMode');
    
    if (savedColor) setPrimaryColor(savedColor);
    if (savedShowLogo) setShowLogo(savedShowLogo === 'true');
    if (savedCompactMode) setCompactMode(savedCompactMode === 'true');
    
    // Apply saved color on load
    if (savedColor) {
      applyColorTheme(savedColor);
    }
  }, []);

  const applyColorTheme = (colorValue: string) => {
    const color = COLOR_OPTIONS.find(c => c.value === colorValue);
    if (!color) return;

    const root = document.documentElement;
    
    // Set CSS variables for both light and dark modes
    root.style.setProperty('--primary', color.hslLight);
    root.style.setProperty('--ring', color.hslLight);
    root.style.setProperty('--accent', color.hslLight);
    root.style.setProperty('--sidebar-primary', color.hslDark);
    root.style.setProperty('--sidebar-ring', color.hslDark);

    // Update gradient
    const gradient = `linear-gradient(135deg, hsl(${color.hslLight}) 0%, hsl(${color.hslDark}) 100%)`;
    root.style.setProperty('--gradient-primary', gradient);

    // Update shadow glow
    const shadowGlow = `0 0 20px hsla(${color.hslLight} / 0.3)`;
    root.style.setProperty('--shadow-glow', shadowGlow);
  };

  const handleColorChange = (colorValue: string) => {
    setPrimaryColor(colorValue);
    applyColorTheme(colorValue);
  };

  const handleSave = () => {
    localStorage.setItem('primaryColor', primaryColor);
    localStorage.setItem('showLogo', showLogo.toString());
    localStorage.setItem('compactMode', compactMode.toString());
    
    toast.success('Configuración de apariencia guardada');
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle className="flex items-center gap-2">
            <Palette className="w-5 h-5" />
            Tema y Apariencia
          </CardTitle>
          <CardDescription>Personaliza la apariencia del sistema</CardDescription>
        </div>
        <Button onClick={handleSave} className="gap-2">
          <Save className="w-4 h-4" />
          Guardar
        </Button>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-2">
          <Label>Tema</Label>
          <Select value={theme} onValueChange={setTheme}>
            <SelectTrigger className="w-full sm:w-[200px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="light">☀️ Claro</SelectItem>
              <SelectItem value="dark">🌙 Oscuro</SelectItem>
              <SelectItem value="system">💻 Sistema</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-3">
          <Label>Color Principal</Label>
          <div className="grid grid-cols-7 gap-3">
            {COLOR_OPTIONS.map((color) => (
              <button
                key={color.value}
                onClick={() => handleColorChange(color.value)}
                className={cn(
                  'relative w-10 h-10 rounded-full transition-all hover:scale-110',
                  'focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary'
                )}
                style={{ 
                  backgroundColor: `hsl(${color.hslLight})` 
                }}
                title={color.name}
              >
                {primaryColor === color.value && (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <Check className="w-5 h-5 text-white" />
                  </div>
                )}
              </button>
            ))}
          </div>
          <p className="text-sm text-muted-foreground">
            El color principal se aplica a botones, enlaces y elementos destacados
          </p>
        </div>

        {/* Preview */}
        <div className="p-4 border rounded-lg bg-muted/30">
          <Label className="mb-3 block">Vista Previa</Label>
          <div className="flex items-center gap-3">
            <Button>Botón Primario</Button>
            <Button variant="outline">Botón Secundario</Button>
            <div className="w-6 h-6 rounded-full bg-primary" />
          </div>
        </div>

        <Separator />

        <div className="flex items-center justify-between">
          <div>
            <p className="font-medium">Mostrar logo en tickets</p>
            <p className="text-sm text-muted-foreground">Incluir logo en tickets impresos</p>
          </div>
          <Switch
            checked={showLogo}
            onCheckedChange={setShowLogo}
          />
        </div>

        <div className="flex items-center justify-between">
          <div>
            <p className="font-medium">Modo compacto</p>
            <p className="text-sm text-muted-foreground">Reduce el espaciado para ver más contenido</p>
          </div>
          <Switch
            checked={compactMode}
            onCheckedChange={setCompactMode}
          />
        </div>
      </CardContent>
    </Card>
  );
}