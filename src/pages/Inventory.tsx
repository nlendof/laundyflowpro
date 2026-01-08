import { useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import {
  Package,
  Search,
  Plus,
  AlertTriangle,
  CheckCircle,
  TrendingDown,
  Droplets,
  Sparkles,
  FlaskConical,
  Box,
  Edit,
  PackagePlus,
  Trash2,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { InventoryItem } from '@/types';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

// Mock inventory data
const INITIAL_INVENTORY: InventoryItem[] = [
  {
    id: '1',
    name: 'Detergente Industrial',
    category: 'detergent',
    currentStock: 45,
    minStock: 20,
    unit: 'litros',
    unitCost: 85.50,
    lastRestocked: new Date('2024-01-10'),
  },
  {
    id: '2',
    name: 'Suavizante Premium',
    category: 'softener',
    currentStock: 12,
    minStock: 15,
    unit: 'litros',
    unitCost: 120.00,
    lastRestocked: new Date('2024-01-08'),
  },
  {
    id: '3',
    name: 'Quitamanchas Profesional',
    category: 'stain_remover',
    currentStock: 8,
    minStock: 10,
    unit: 'litros',
    unitCost: 95.00,
    lastRestocked: new Date('2024-01-05'),
  },
  {
    id: '4',
    name: 'Bolsas para Entrega (Grande)',
    category: 'other',
    currentStock: 250,
    minStock: 100,
    unit: 'unidades',
    unitCost: 2.50,
    lastRestocked: new Date('2024-01-12'),
  },
  {
    id: '5',
    name: 'Bolsas para Entrega (Mediana)',
    category: 'other',
    currentStock: 180,
    minStock: 100,
    unit: 'unidades',
    unitCost: 1.80,
    lastRestocked: new Date('2024-01-12'),
  },
  {
    id: '6',
    name: 'Perchas Plásticas',
    category: 'other',
    currentStock: 45,
    minStock: 50,
    unit: 'unidades',
    unitCost: 8.00,
    lastRestocked: new Date('2024-01-03'),
  },
  {
    id: '7',
    name: 'Blanqueador',
    category: 'detergent',
    currentStock: 30,
    minStock: 15,
    unit: 'litros',
    unitCost: 45.00,
    lastRestocked: new Date('2024-01-09'),
  },
  {
    id: '8',
    name: 'Almidón en Spray',
    category: 'other',
    currentStock: 5,
    minStock: 12,
    unit: 'unidades',
    unitCost: 65.00,
    lastRestocked: new Date('2024-01-02'),
  },
];

type CategoryFilter = 'all' | InventoryItem['category'];

const CATEGORY_CONFIG = {
  detergent: { label: 'Detergentes', icon: Droplets, color: 'text-blue-500' },
  softener: { label: 'Suavizantes', icon: Sparkles, color: 'text-pink-500' },
  stain_remover: { label: 'Quitamanchas', icon: FlaskConical, color: 'text-purple-500' },
  other: { label: 'Otros', icon: Box, color: 'text-gray-500' },
};

export default function Inventory() {
  const [items, setItems] = useState<InventoryItem[]>(INITIAL_INVENTORY);
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<CategoryFilter>('all');
  const [showLowStockOnly, setShowLowStockOnly] = useState(false);
  
  // Dialogs
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showRestockDialog, setShowRestockDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [selectedItem, setSelectedItem] = useState<InventoryItem | null>(null);
  
  // Form states
  const [newItem, setNewItem] = useState({
    name: '',
    category: 'detergent' as InventoryItem['category'],
    currentStock: 0,
    minStock: 10,
    unit: 'unidades',
    unitCost: 0,
  });
  const [restockAmount, setRestockAmount] = useState(0);

  // Filter items
  const filteredItems = useMemo(() => {
    return items.filter(item => {
      if (categoryFilter !== 'all' && item.category !== categoryFilter) return false;
      if (showLowStockOnly && item.currentStock >= item.minStock) return false;
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        return item.name.toLowerCase().includes(query);
      }
      return true;
    });
  }, [items, categoryFilter, showLowStockOnly, searchQuery]);

  // Stats
  const stats = useMemo(() => {
    const lowStockItems = items.filter(i => i.currentStock < i.minStock);
    const totalValue = items.reduce((sum, i) => sum + (i.currentStock * i.unitCost), 0);
    const criticalItems = items.filter(i => i.currentStock < i.minStock * 0.5);
    
    return {
      totalItems: items.length,
      lowStockCount: lowStockItems.length,
      criticalCount: criticalItems.length,
      totalValue,
      healthyItems: items.length - lowStockItems.length,
    };
  }, [items]);

  const getStockStatus = (item: InventoryItem) => {
    const percentage = (item.currentStock / item.minStock) * 100;
    if (percentage >= 100) return { status: 'healthy', color: 'text-green-600', bg: 'bg-green-500' };
    if (percentage >= 50) return { status: 'warning', color: 'text-amber-600', bg: 'bg-amber-500' };
    return { status: 'critical', color: 'text-red-600', bg: 'bg-red-500' };
  };

  const handleAddItem = () => {
    if (!newItem.name.trim()) {
      toast.error('Ingresa el nombre del producto');
      return;
    }
    
    const item: InventoryItem = {
      id: Date.now().toString(),
      ...newItem,
      lastRestocked: new Date(),
    };
    
    setItems(prev => [...prev, item]);
    toast.success('Producto agregado al inventario');
    setShowAddDialog(false);
    setNewItem({
      name: '',
      category: 'detergent',
      currentStock: 0,
      minStock: 10,
      unit: 'unidades',
      unitCost: 0,
    });
  };

  const handleRestock = () => {
    if (!selectedItem || restockAmount <= 0) return;
    
    setItems(prev => prev.map(i => 
      i.id === selectedItem.id 
        ? { ...i, currentStock: i.currentStock + restockAmount, lastRestocked: new Date() }
        : i
    ));
    
    toast.success(`Se agregaron ${restockAmount} ${selectedItem.unit} de ${selectedItem.name}`);
    setShowRestockDialog(false);
    setSelectedItem(null);
    setRestockAmount(0);
  };

  const handleEditItem = () => {
    if (!selectedItem) return;
    
    setItems(prev => prev.map(i => 
      i.id === selectedItem.id ? selectedItem : i
    ));
    
    toast.success('Producto actualizado');
    setShowEditDialog(false);
    setSelectedItem(null);
  };

  const handleDeleteItem = (item: InventoryItem) => {
    setItems(prev => prev.filter(i => i.id !== item.id));
    toast.success('Producto eliminado del inventario');
  };

  const openRestockDialog = (item: InventoryItem) => {
    setSelectedItem(item);
    setRestockAmount(item.minStock - item.currentStock > 0 ? item.minStock - item.currentStock : 10);
    setShowRestockDialog(true);
  };

  const openEditDialog = (item: InventoryItem) => {
    setSelectedItem({ ...item });
    setShowEditDialog(true);
  };

  return (
    <div className="p-4 lg:p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold flex items-center gap-3">
            <Package className="w-8 h-8 text-primary" />
            Inventario
          </h1>
          <p className="text-muted-foreground">Gestión de insumos y materiales</p>
        </div>
        
        <div className="flex items-center gap-3">
          <div className="relative w-full md:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Buscar producto..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          
          <Button onClick={() => setShowAddDialog(true)} className="gap-2">
            <Plus className="w-4 h-4" />
            Agregar
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <Card className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-950/30 dark:to-indigo-950/30 border-blue-200 dark:border-blue-800">
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-gradient-to-br from-blue-500 to-indigo-500 rounded-lg text-white">
                <Package className="w-5 h-5" />
              </div>
              <div>
                <p className="text-2xl font-bold text-blue-700 dark:text-blue-400">
                  {stats.totalItems}
                </p>
                <p className="text-xs text-blue-600 dark:text-blue-500">Productos</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-950/30 dark:to-emerald-950/30 border-green-200 dark:border-green-800">
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-gradient-to-br from-green-500 to-emerald-500 rounded-lg text-white">
                <CheckCircle className="w-5 h-5" />
              </div>
              <div>
                <p className="text-2xl font-bold text-green-700 dark:text-green-400">
                  {stats.healthyItems}
                </p>
                <p className="text-xs text-green-600 dark:text-green-500">Stock OK</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className={cn(
          "bg-gradient-to-br border",
          stats.lowStockCount > 0 
            ? "from-amber-50 to-orange-50 dark:from-amber-950/30 dark:to-orange-950/30 border-amber-200 dark:border-amber-800"
            : "from-gray-50 to-slate-50 dark:from-gray-950/30 dark:to-slate-950/30 border-gray-200 dark:border-gray-800"
        )}>
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className={cn(
                "p-2 rounded-lg text-white",
                stats.lowStockCount > 0 
                  ? "bg-gradient-to-br from-amber-500 to-orange-500"
                  : "bg-gradient-to-br from-gray-400 to-slate-400"
              )}>
                <TrendingDown className="w-5 h-5" />
              </div>
              <div>
                <p className={cn(
                  "text-2xl font-bold",
                  stats.lowStockCount > 0 
                    ? "text-amber-700 dark:text-amber-400"
                    : "text-gray-600 dark:text-gray-400"
                )}>
                  {stats.lowStockCount}
                </p>
                <p className={cn(
                  "text-xs",
                  stats.lowStockCount > 0 
                    ? "text-amber-600 dark:text-amber-500"
                    : "text-gray-500 dark:text-gray-500"
                )}>Stock Bajo</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-purple-50 to-fuchsia-50 dark:from-purple-950/30 dark:to-fuchsia-950/30 border-purple-200 dark:border-purple-800">
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-gradient-to-br from-purple-500 to-fuchsia-500 rounded-lg text-white">
                <span className="text-sm font-bold">$</span>
              </div>
              <div>
                <p className="text-2xl font-bold text-purple-700 dark:text-purple-400">
                  ${stats.totalValue.toLocaleString()}
                </p>
                <p className="text-xs text-purple-600 dark:text-purple-500">Valor Total</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3 mb-6">
        <Tabs value={categoryFilter} onValueChange={(v) => setCategoryFilter(v as CategoryFilter)}>
          <TabsList>
            <TabsTrigger value="all">Todos</TabsTrigger>
            {Object.entries(CATEGORY_CONFIG).map(([key, config]) => (
              <TabsTrigger key={key} value={key} className="gap-1">
                <config.icon className={cn("w-4 h-4", config.color)} />
                <span className="hidden sm:inline">{config.label}</span>
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>

        <Button
          variant={showLowStockOnly ? "default" : "outline"}
          size="sm"
          onClick={() => setShowLowStockOnly(!showLowStockOnly)}
          className="gap-2"
        >
          <AlertTriangle className="w-4 h-4" />
          Stock Bajo
          {stats.lowStockCount > 0 && (
            <Badge variant="secondary" className="ml-1">
              {stats.lowStockCount}
            </Badge>
          )}
        </Button>
      </div>

      {/* Inventory Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredItems.length === 0 ? (
          <div className="col-span-full text-center py-12 text-muted-foreground">
            <Package className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p>No se encontraron productos</p>
          </div>
        ) : (
          filteredItems.map(item => {
            const CategoryIcon = CATEGORY_CONFIG[item.category].icon;
            const stockStatus = getStockStatus(item);
            const stockPercentage = Math.min((item.currentStock / item.minStock) * 100, 100);
            
            return (
              <Card key={item.id} className="hover:shadow-md transition-shadow">
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2">
                      <div className={cn("p-2 rounded-lg bg-muted", CATEGORY_CONFIG[item.category].color)}>
                        <CategoryIcon className="w-4 h-4" />
                      </div>
                      <div>
                        <CardTitle className="text-base">{item.name}</CardTitle>
                        <p className="text-xs text-muted-foreground">
                          {CATEGORY_CONFIG[item.category].label}
                        </p>
                      </div>
                    </div>
                    
                    {item.currentStock < item.minStock && (
                      <Badge variant="destructive" className="gap-1">
                        <AlertTriangle className="w-3 h-3" />
                        Bajo
                      </Badge>
                    )}
                  </div>
                </CardHeader>
                
                <CardContent className="space-y-4">
                  {/* Stock Level */}
                  <div>
                    <div className="flex items-baseline justify-between mb-1">
                      <span className={cn("text-2xl font-bold", stockStatus.color)}>
                        {item.currentStock}
                      </span>
                      <span className="text-sm text-muted-foreground">
                        / {item.minStock} {item.unit} (mín)
                      </span>
                    </div>
                    <Progress 
                      value={stockPercentage} 
                      className={cn("h-2", stockStatus.status === 'critical' && "[&>div]:bg-red-500", stockStatus.status === 'warning' && "[&>div]:bg-amber-500")}
                    />
                  </div>

                  {/* Info */}
                  <div className="flex items-center justify-between text-sm text-muted-foreground">
                    <span>Costo: ${item.unitCost.toFixed(2)}/{item.unit.slice(0, -1) || item.unit}</span>
                    <span>
                      {format(item.lastRestocked, 'dd MMM', { locale: es })}
                    </span>
                  </div>

                  {/* Actions */}
                  <div className="flex gap-2">
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="flex-1 gap-1"
                      onClick={() => openRestockDialog(item)}
                    >
                      <PackagePlus className="w-4 h-4" />
                      Reabastecer
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="sm"
                      onClick={() => openEditDialog(item)}
                    >
                      <Edit className="w-4 h-4" />
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="sm"
                      className="text-destructive hover:text-destructive"
                      onClick={() => handleDeleteItem(item)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })
        )}
      </div>

      {/* Add Item Dialog */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Agregar Producto</DialogTitle>
            <DialogDescription>
              Agrega un nuevo producto al inventario
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Nombre del producto</Label>
              <Input
                placeholder="Ej: Detergente Premium"
                value={newItem.name}
                onChange={(e) => setNewItem(prev => ({ ...prev, name: e.target.value }))}
              />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Categoría</Label>
                <Select 
                  value={newItem.category} 
                  onValueChange={(v) => setNewItem(prev => ({ ...prev, category: v as InventoryItem['category'] }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(CATEGORY_CONFIG).map(([key, config]) => (
                      <SelectItem key={key} value={key}>
                        {config.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <Label>Unidad</Label>
                <Select 
                  value={newItem.unit} 
                  onValueChange={(v) => setNewItem(prev => ({ ...prev, unit: v }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="unidades">Unidades</SelectItem>
                    <SelectItem value="litros">Litros</SelectItem>
                    <SelectItem value="kilos">Kilos</SelectItem>
                    <SelectItem value="metros">Metros</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Stock Inicial</Label>
                <Input
                  type="number"
                  min="0"
                  value={newItem.currentStock}
                  onChange={(e) => setNewItem(prev => ({ ...prev, currentStock: Number(e.target.value) }))}
                />
              </div>
              
              <div className="space-y-2">
                <Label>Stock Mínimo</Label>
                <Input
                  type="number"
                  min="1"
                  value={newItem.minStock}
                  onChange={(e) => setNewItem(prev => ({ ...prev, minStock: Number(e.target.value) }))}
                />
              </div>
              
              <div className="space-y-2">
                <Label>Costo Unitario</Label>
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  value={newItem.unitCost}
                  onChange={(e) => setNewItem(prev => ({ ...prev, unitCost: Number(e.target.value) }))}
                />
              </div>
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddDialog(false)}>
              Cancelar
            </Button>
            <Button onClick={handleAddItem}>
              Agregar Producto
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Restock Dialog */}
      <Dialog open={showRestockDialog} onOpenChange={setShowRestockDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reabastecer Stock</DialogTitle>
            <DialogDescription>
              {selectedItem?.name}
            </DialogDescription>
          </DialogHeader>
          
          {selectedItem && (
            <div className="space-y-4">
              <div className="p-4 bg-muted rounded-lg">
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Stock actual:</span>
                  <span className="font-bold">{selectedItem.currentStock} {selectedItem.unit}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Stock mínimo:</span>
                  <span>{selectedItem.minStock} {selectedItem.unit}</span>
                </div>
              </div>
              
              <div className="space-y-2">
                <Label>Cantidad a agregar</Label>
                <Input
                  type="number"
                  min="1"
                  value={restockAmount}
                  onChange={(e) => setRestockAmount(Number(e.target.value))}
                />
                <p className="text-sm text-muted-foreground">
                  Stock final: {selectedItem.currentStock + restockAmount} {selectedItem.unit}
                </p>
              </div>
              
              <div className="p-3 bg-primary/10 rounded-lg">
                <p className="text-sm font-medium">
                  Costo estimado: ${(restockAmount * selectedItem.unitCost).toFixed(2)}
                </p>
              </div>
            </div>
          )}
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowRestockDialog(false)}>
              Cancelar
            </Button>
            <Button onClick={handleRestock} className="gap-2">
              <PackagePlus className="w-4 h-4" />
              Reabastecer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar Producto</DialogTitle>
          </DialogHeader>
          
          {selectedItem && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Nombre del producto</Label>
                <Input
                  value={selectedItem.name}
                  onChange={(e) => setSelectedItem(prev => prev ? { ...prev, name: e.target.value } : null)}
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Categoría</Label>
                  <Select 
                    value={selectedItem.category} 
                    onValueChange={(v) => setSelectedItem(prev => prev ? { ...prev, category: v as InventoryItem['category'] } : null)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(CATEGORY_CONFIG).map(([key, config]) => (
                        <SelectItem key={key} value={key}>
                          {config.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <Label>Unidad</Label>
                  <Select 
                    value={selectedItem.unit} 
                    onValueChange={(v) => setSelectedItem(prev => prev ? { ...prev, unit: v } : null)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="unidades">Unidades</SelectItem>
                      <SelectItem value="litros">Litros</SelectItem>
                      <SelectItem value="kilos">Kilos</SelectItem>
                      <SelectItem value="metros">Metros</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Stock Mínimo</Label>
                  <Input
                    type="number"
                    min="1"
                    value={selectedItem.minStock}
                    onChange={(e) => setSelectedItem(prev => prev ? { ...prev, minStock: Number(e.target.value) } : null)}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label>Costo Unitario</Label>
                  <Input
                    type="number"
                    min="0"
                    step="0.01"
                    value={selectedItem.unitCost}
                    onChange={(e) => setSelectedItem(prev => prev ? { ...prev, unitCost: Number(e.target.value) } : null)}
                  />
                </div>
              </div>
            </div>
          )}
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEditDialog(false)}>
              Cancelar
            </Button>
            <Button onClick={handleEditItem}>
              Guardar Cambios
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
