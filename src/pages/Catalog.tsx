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
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import {
  Tag,
  Search,
  Plus,
  Edit,
  Trash2,
  Shirt,
  Scale,
  Hash,
  Sparkles,
  Clock,
  DollarSign,
  Package,
  Layers,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { useConfig } from '@/contexts/ConfigContext';
import { useCatalog, CatalogItem, CatalogExtra, CatalogItemType, PricingType } from '@/contexts/CatalogContext';

type TabFilter = 'all' | 'service' | 'article';

export default function Catalog() {
  const { activeCategories } = useConfig();
  const { items, addItem, updateItem, deleteItem, toggleActive } = useCatalog();
  const categoryNames = activeCategories.map(c => c.name);
  
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<TabFilter>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  
  // Dialogs
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [selectedItem, setSelectedItem] = useState<CatalogItem | null>(null);
  
  // Form state
  const [formData, setFormData] = useState<Partial<CatalogItem>>({
    name: '',
    description: '',
    type: 'service',
    pricingType: 'weight',
    price: 0,
    category: 'Lavado',
    estimatedTime: 24,
    isActive: true,
    extras: [],
  });
  const [newExtra, setNewExtra] = useState({ name: '', price: 0 });

  // Filter items
  const filteredItems = useMemo(() => {
    return items.filter(item => {
      if (activeTab !== 'all' && item.type !== activeTab) return false;
      if (categoryFilter !== 'all' && item.category !== categoryFilter) return false;
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        return (
          item.name.toLowerCase().includes(query) ||
          item.description?.toLowerCase().includes(query) ||
          item.category.toLowerCase().includes(query)
        );
      }
      return true;
    });
  }, [items, activeTab, categoryFilter, searchQuery]);

  // Stats
  const stats = useMemo(() => {
    const services = items.filter(i => i.type === 'service');
    const articles = items.filter(i => i.type === 'article');
    const active = items.filter(i => i.isActive);
    const categories = [...new Set(items.map(i => i.category))];
    
    return {
      totalItems: items.length,
      services: services.length,
      articles: articles.length,
      active: active.length,
      inactive: items.length - active.length,
      categories: categories.length,
    };
  }, [items]);

  const getPricingIcon = (pricingType: PricingType) => {
    switch (pricingType) {
      case 'weight': return Scale;
      case 'piece': return Hash;
      case 'fixed': return DollarSign;
    }
  };

  const getPricingLabel = (pricingType: PricingType) => {
    switch (pricingType) {
      case 'weight': return 'Por Kilo';
      case 'piece': return 'Por Pieza';
      case 'fixed': return 'Precio Fijo';
    }
  };

  const handleAddItem = () => {
    if (!formData.name?.trim()) {
      toast.error('Ingresa el nombre del artículo o servicio');
      return;
    }
    
    addItem({
      name: formData.name,
      description: formData.description,
      type: formData.type || 'service',
      pricingType: formData.pricingType || 'piece',
      price: formData.price || 0,
      category: formData.category || 'Lavado',
      estimatedTime: formData.estimatedTime,
      isActive: formData.isActive ?? true,
      extras: formData.extras || [],
    });
    
    toast.success(`${formData.type === 'service' ? 'Servicio' : 'Artículo'} agregado al catálogo`);
    setShowAddDialog(false);
    resetForm();
  };

  const handleEditItem = () => {
    if (!selectedItem || !formData.name?.trim()) return;
    
    updateItem(selectedItem.id, formData);
    
    toast.success('Elemento actualizado');
    setShowEditDialog(false);
    setSelectedItem(null);
    resetForm();
  };

  const handleDeleteItem = (item: CatalogItem) => {
    deleteItem(item.id);
    toast.success('Elemento eliminado del catálogo');
  };

  const handleToggleActive = (item: CatalogItem) => {
    toggleActive(item.id);
    toast.success(item.isActive ? 'Elemento desactivado' : 'Elemento activado');
  };

  const openEditDialog = (item: CatalogItem) => {
    setSelectedItem(item);
    setFormData({
      name: item.name,
      description: item.description,
      type: item.type,
      pricingType: item.pricingType,
      price: item.price,
      category: item.category,
      estimatedTime: item.estimatedTime,
      isActive: item.isActive,
      extras: item.extras || [],
    });
    setShowEditDialog(true);
  };

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      type: 'service',
      pricingType: 'weight',
      price: 0,
      category: 'Lavado',
      estimatedTime: 24,
      isActive: true,
      extras: [],
    });
    setNewExtra({ name: '', price: 0 });
  };

  const addExtra = () => {
    if (!newExtra.name.trim()) return;
    
    setFormData(prev => ({
      ...prev,
      extras: [...(prev.extras || []), { 
        id: Date.now().toString(), 
        name: newExtra.name, 
        price: newExtra.price 
      }],
    }));
    setNewExtra({ name: '', price: 0 });
  };

  const removeExtra = (extraId: string) => {
    setFormData(prev => ({
      ...prev,
      extras: prev.extras?.filter(e => e.id !== extraId) || [],
    }));
  };

  const openAddDialog = (type: CatalogItemType) => {
    resetForm();
    setFormData(prev => ({ ...prev, type }));
    setShowAddDialog(true);
  };

  return (
    <div className="p-4 lg:p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold flex items-center gap-3">
            <Tag className="w-8 h-8 text-primary" />
            Catálogo
          </h1>
          <p className="text-muted-foreground">Gestión de artículos y servicios</p>
        </div>
        
        <div className="flex items-center gap-3">
          <div className="relative w-full md:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Buscar..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          
          <Button onClick={() => openAddDialog('service')} variant="outline" className="gap-2">
            <Sparkles className="w-4 h-4" />
            Servicio
          </Button>
          <Button onClick={() => openAddDialog('article')} className="gap-2">
            <Shirt className="w-4 h-4" />
            Artículo
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <Card className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-950/30 dark:to-indigo-950/30 border-blue-200 dark:border-blue-800">
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-gradient-to-br from-blue-500 to-indigo-500 rounded-lg text-white">
                <Layers className="w-5 h-5" />
              </div>
              <div>
                <p className="text-2xl font-bold text-blue-700 dark:text-blue-400">
                  {stats.totalItems}
                </p>
                <p className="text-xs text-blue-600 dark:text-blue-500">Total</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-purple-50 to-fuchsia-50 dark:from-purple-950/30 dark:to-fuchsia-950/30 border-purple-200 dark:border-purple-800">
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-gradient-to-br from-purple-500 to-fuchsia-500 rounded-lg text-white">
                <Sparkles className="w-5 h-5" />
              </div>
              <div>
                <p className="text-2xl font-bold text-purple-700 dark:text-purple-400">
                  {stats.services}
                </p>
                <p className="text-xs text-purple-600 dark:text-purple-500">Servicios</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-orange-50 to-amber-50 dark:from-orange-950/30 dark:to-amber-950/30 border-orange-200 dark:border-orange-800">
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-gradient-to-br from-orange-500 to-amber-500 rounded-lg text-white">
                <Shirt className="w-5 h-5" />
              </div>
              <div>
                <p className="text-2xl font-bold text-orange-700 dark:text-orange-400">
                  {stats.articles}
                </p>
                <p className="text-xs text-orange-600 dark:text-orange-500">Artículos</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-950/30 dark:to-emerald-950/30 border-green-200 dark:border-green-800">
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-gradient-to-br from-green-500 to-emerald-500 rounded-lg text-white">
                <Package className="w-5 h-5" />
              </div>
              <div>
                <p className="text-2xl font-bold text-green-700 dark:text-green-400">
                  {stats.categories}
                </p>
                <p className="text-xs text-green-600 dark:text-green-500">Categorías</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3 mb-6">
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as TabFilter)}>
          <TabsList>
            <TabsTrigger value="all" className="gap-2">
              <Layers className="w-4 h-4" />
              Todos
            </TabsTrigger>
            <TabsTrigger value="service" className="gap-2">
              <Sparkles className="w-4 h-4" />
              Servicios
            </TabsTrigger>
            <TabsTrigger value="article" className="gap-2">
              <Shirt className="w-4 h-4" />
              Artículos
            </TabsTrigger>
          </TabsList>
        </Tabs>

        <Select value={categoryFilter} onValueChange={setCategoryFilter}>
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="Categoría" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas</SelectItem>
            {categoryNames.map(cat => (
              <SelectItem key={cat} value={cat}>{cat}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Catalog Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredItems.length === 0 ? (
          <div className="col-span-full text-center py-12 text-muted-foreground">
            <Tag className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p>No se encontraron elementos</p>
          </div>
        ) : (
          filteredItems.map(item => {
            const PricingIcon = getPricingIcon(item.pricingType);
            
            return (
              <Card 
                key={item.id} 
                className={cn(
                  "hover:shadow-md transition-shadow",
                  !item.isActive && "opacity-60"
                )}
              >
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2">
                      <div className={cn(
                        "p-2 rounded-lg",
                        item.type === 'service' 
                          ? "bg-purple-100 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400"
                          : "bg-orange-100 text-orange-600 dark:bg-orange-900/30 dark:text-orange-400"
                      )}>
                        {item.type === 'service' ? <Sparkles className="w-4 h-4" /> : <Shirt className="w-4 h-4" />}
                      </div>
                      <div>
                        <CardTitle className="text-base">{item.name}</CardTitle>
                        <p className="text-xs text-muted-foreground">{item.category}</p>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-1">
                      <Badge variant={item.isActive ? "default" : "secondary"}>
                        {item.isActive ? 'Activo' : 'Inactivo'}
                      </Badge>
                    </div>
                  </div>
                </CardHeader>
                
                <CardContent className="space-y-3">
                  {item.description && (
                    <p className="text-sm text-muted-foreground line-clamp-2">
                      {item.description}
                    </p>
                  )}
                  
                  {/* Price and Info */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-2xl font-bold text-primary">
                        ${item.price.toFixed(2)}
                      </span>
                      <Badge variant="outline" className="gap-1">
                        <PricingIcon className="w-3 h-3" />
                        {getPricingLabel(item.pricingType)}
                      </Badge>
                    </div>
                  </div>

                  {/* Estimated Time (for services) */}
                  {item.type === 'service' && item.estimatedTime && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Clock className="w-4 h-4" />
                      <span>
                        {item.estimatedTime >= 24 
                          ? `${Math.floor(item.estimatedTime / 24)} día(s)`
                          : `${item.estimatedTime} hora(s)`
                        }
                      </span>
                    </div>
                  )}

                  {/* Extras */}
                  {item.extras && item.extras.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {item.extras.map(extra => (
                        <Badge key={extra.id} variant="secondary" className="text-xs">
                          +{extra.name} (${extra.price})
                        </Badge>
                      ))}
                    </div>
                  )}

                  {/* Actions */}
                  <div className="flex items-center gap-2 pt-2">
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="flex-1"
                      onClick={() => openEditDialog(item)}
                    >
                      <Edit className="w-4 h-4 mr-1" />
                      Editar
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="sm"
                      onClick={() => handleToggleActive(item)}
                    >
                      {item.isActive ? 'Desactivar' : 'Activar'}
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

      {/* Add/Edit Dialog */}
      <Dialog 
        open={showAddDialog || showEditDialog} 
        onOpenChange={(open) => {
          if (!open) {
            setShowAddDialog(false);
            setShowEditDialog(false);
            setSelectedItem(null);
            resetForm();
          }
        }}
      >
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {showEditDialog ? 'Editar' : 'Agregar'} {formData.type === 'service' ? 'Servicio' : 'Artículo'}
            </DialogTitle>
            <DialogDescription>
              {showEditDialog 
                ? 'Modifica los datos del elemento' 
                : 'Completa los datos para agregar al catálogo'
              }
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            {/* Type Toggle (only for new items) */}
            {showAddDialog && (
              <div className="flex items-center gap-4">
                <Label>Tipo:</Label>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant={formData.type === 'service' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setFormData(prev => ({ ...prev, type: 'service' }))}
                    className="gap-2"
                  >
                    <Sparkles className="w-4 h-4" />
                    Servicio
                  </Button>
                  <Button
                    type="button"
                    variant={formData.type === 'article' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setFormData(prev => ({ ...prev, type: 'article' }))}
                    className="gap-2"
                  >
                    <Shirt className="w-4 h-4" />
                    Artículo
                  </Button>
                </div>
              </div>
            )}

            <div className="space-y-2">
              <Label>Nombre *</Label>
              <Input
                placeholder="Ej: Lavado Premium"
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
              />
            </div>

            <div className="space-y-2">
              <Label>Descripción</Label>
              <Textarea
                placeholder="Descripción del artículo o servicio..."
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                rows={2}
              />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Categoría</Label>
                <Select 
                  value={formData.category} 
                  onValueChange={(v) => setFormData(prev => ({ ...prev, category: v }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {categoryNames.map(cat => (
                      <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <Label>Tipo de Precio</Label>
                <Select 
                  value={formData.pricingType} 
                  onValueChange={(v) => setFormData(prev => ({ ...prev, pricingType: v as PricingType }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="weight">Por Kilo</SelectItem>
                    <SelectItem value="piece">Por Pieza</SelectItem>
                    <SelectItem value="fixed">Precio Fijo</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Precio ($)</Label>
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  value={formData.price}
                  onChange={(e) => setFormData(prev => ({ ...prev, price: Number(e.target.value) }))}
                />
              </div>
              
              {formData.type === 'service' && (
                <div className="space-y-2">
                  <Label>Tiempo Estimado (hrs)</Label>
                  <Input
                    type="number"
                    min="1"
                    value={formData.estimatedTime}
                    onChange={(e) => setFormData(prev => ({ ...prev, estimatedTime: Number(e.target.value) }))}
                  />
                </div>
              )}
            </div>

            {/* Extras (only for services) */}
            {formData.type === 'service' && (
              <div className="space-y-3">
                <Label>Extras Opcionales</Label>
                
                {formData.extras && formData.extras.length > 0 && (
                  <div className="space-y-2">
                    {formData.extras.map(extra => (
                      <div key={extra.id} className="flex items-center justify-between p-2 bg-muted rounded-lg">
                        <span className="text-sm">{extra.name} - ${extra.price}</span>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => removeExtra(extra.id)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
                
                <div className="flex gap-2">
                  <Input
                    placeholder="Nombre del extra"
                    value={newExtra.name}
                    onChange={(e) => setNewExtra(prev => ({ ...prev, name: e.target.value }))}
                    className="flex-1"
                  />
                  <Input
                    type="number"
                    placeholder="Precio"
                    value={newExtra.price || ''}
                    onChange={(e) => setNewExtra(prev => ({ ...prev, price: Number(e.target.value) }))}
                    className="w-24"
                  />
                  <Button type="button" variant="outline" size="icon" onClick={addExtra}>
                    <Plus className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            )}

            {/* Active Toggle */}
            <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
              <div>
                <Label>Estado Activo</Label>
                <p className="text-xs text-muted-foreground">
                  Los elementos inactivos no aparecen en la venta
                </p>
              </div>
              <Switch
                checked={formData.isActive}
                onCheckedChange={(checked) => setFormData(prev => ({ ...prev, isActive: checked }))}
              />
            </div>
          </div>
          
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => {
                setShowAddDialog(false);
                setShowEditDialog(false);
                resetForm();
              }}
            >
              Cancelar
            </Button>
            <Button onClick={showEditDialog ? handleEditItem : handleAddItem}>
              {showEditDialog ? 'Guardar Cambios' : 'Agregar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
