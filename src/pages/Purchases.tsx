import { useState, useMemo, useEffect } from 'react';
import { Plus, ShoppingCart, Package, Search, Trash2, Eye, Calendar, Building2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { ScrollArea } from '@/components/ui/scroll-area';
import { usePurchases, PurchaseItem } from '@/hooks/usePurchases';
import { useInventory } from '@/hooks/useInventory';
import { useCatalog } from '@/hooks/useCatalog';
import { useConfig } from '@/contexts/ConfigContext';
import { supabase } from '@/integrations/supabase/client';
import { formatCurrency } from '@/lib/currency';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { toast } from 'sonner';

export default function Purchases() {
  const { purchases, loading, createPurchase, deletePurchase } = usePurchases();
  const { items: inventoryItems } = useInventory();
  const { articles: catalogArticles } = useCatalog();
  const { business } = useConfig();
  const [articleStocks, setArticleStocks] = useState<Record<string, { stock: number; cost: number }>>({});

  // Fetch article stocks from catalog_articles table
  useEffect(() => {
    const fetchArticleStocks = async () => {
      const { data } = await supabase
        .from('catalog_articles')
        .select('id, stock, cost');
      if (data) {
        const stocks: Record<string, { stock: number; cost: number }> = {};
        data.forEach(a => {
          stocks[a.id] = { stock: a.stock || 0, cost: a.cost || 0 };
        });
        setArticleStocks(stocks);
      }
    };
    fetchArticleStocks();
  }, []);

  const [searchQuery, setSearchQuery] = useState('');
  const [isNewPurchaseOpen, setIsNewPurchaseOpen] = useState(false);
  const [isViewOpen, setIsViewOpen] = useState(false);
  const [selectedPurchase, setSelectedPurchase] = useState<typeof purchases[0] | null>(null);

  // New purchase form state
  const [supplierName, setSupplierName] = useState('');
  const [notes, setNotes] = useState('');
  const [purchaseItems, setPurchaseItems] = useState<PurchaseItem[]>([]);
  const [selectedItemType, setSelectedItemType] = useState<'inventory' | 'catalog_article'>('inventory');
  const [selectedItemId, setSelectedItemId] = useState('');
  const [quantity, setQuantity] = useState('');
  const [unitCost, setUnitCost] = useState('');
  const [stockAction, setStockAction] = useState<'add' | 'replace'>('add');

  // Combined items for selection
  const availableItems = useMemo(() => {
    if (selectedItemType === 'inventory') {
      return inventoryItems.map(item => ({
        id: item.id,
        name: item.name,
        currentStock: item.currentStock,
        unit: item.unit,
        unitCost: item.unitCost,
      }));
    } else {
      return catalogArticles.map(article => ({
        id: article.id,
        name: article.name,
        currentStock: articleStocks[article.id]?.stock || 0,
        unit: 'unidad',
        unitCost: articleStocks[article.id]?.cost || 0,
      }));
    }
  }, [selectedItemType, inventoryItems, catalogArticles, articleStocks]);

  const selectedItem = useMemo(() => {
    return availableItems.find(item => item.id === selectedItemId);
  }, [availableItems, selectedItemId]);

  const filteredPurchases = useMemo(() => {
    if (!searchQuery) return purchases;
    const query = searchQuery.toLowerCase();
    return purchases.filter(p => 
      p.supplierName?.toLowerCase().includes(query) ||
      p.notes?.toLowerCase().includes(query) ||
      p.items?.some(item => item.itemName.toLowerCase().includes(query))
    );
  }, [purchases, searchQuery]);

  const totalPurchases = purchases.reduce((sum, p) => sum + p.totalAmount, 0);
  const purchasesThisMonth = purchases.filter(p => {
    const now = new Date();
    return p.purchaseDate.getMonth() === now.getMonth() && 
           p.purchaseDate.getFullYear() === now.getFullYear();
  });
  const totalThisMonth = purchasesThisMonth.reduce((sum, p) => sum + p.totalAmount, 0);

  const handleAddItem = () => {
    if (!selectedItemId || !quantity || !unitCost) {
      toast.error('Completa todos los campos del artículo');
      return;
    }

    const item = availableItems.find(i => i.id === selectedItemId);
    if (!item) return;

    const qty = parseFloat(quantity);
    const cost = parseFloat(unitCost);

    const newItem: PurchaseItem = {
      itemType: selectedItemType,
      inventoryId: selectedItemType === 'inventory' ? selectedItemId : undefined,
      articleId: selectedItemType === 'catalog_article' ? selectedItemId : undefined,
      itemName: item.name,
      quantity: qty,
      unitCost: cost,
      totalCost: qty * cost,
      stockBefore: item.currentStock,
      stockAction,
    };

    setPurchaseItems([...purchaseItems, newItem]);
    setSelectedItemId('');
    setQuantity('');
    setUnitCost('');
    setStockAction('add');
  };

  const handleRemoveItem = (index: number) => {
    setPurchaseItems(purchaseItems.filter((_, i) => i !== index));
  };

  const handleCreatePurchase = async () => {
    if (purchaseItems.length === 0) {
      toast.error('Agrega al menos un artículo');
      return;
    }

    await createPurchase({
      supplierName: supplierName || undefined,
      notes: notes || undefined,
      items: purchaseItems,
    });

    setIsNewPurchaseOpen(false);
    resetForm();
  };

  const resetForm = () => {
    setSupplierName('');
    setNotes('');
    setPurchaseItems([]);
    setSelectedItemType('inventory');
    setSelectedItemId('');
    setQuantity('');
    setUnitCost('');
    setStockAction('add');
  };

  const handleViewPurchase = (purchase: typeof purchases[0]) => {
    setSelectedPurchase(purchase);
    setIsViewOpen(true);
  };

  const purchaseTotal = purchaseItems.reduce((sum, item) => sum + item.totalCost, 0);

  if (loading) {
    return (
      <div className="space-y-6 p-6">
        <div className="flex items-center justify-between">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-10 w-40" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[1, 2, 3].map(i => <Skeleton key={i} className="h-24" />)}
        </div>
        <Skeleton className="h-96" />
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Compras</h1>
          <p className="text-muted-foreground">Registra y gestiona las compras de inventario y artículos</p>
        </div>
        <Button onClick={() => setIsNewPurchaseOpen(true)} className="gap-2">
          <Plus className="h-4 w-4" />
          Nueva Compra
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <ShoppingCart className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Compras</p>
                <p className="text-xl font-bold">{purchases.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-green-500/10">
                <Package className="h-5 w-5 text-green-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Este Mes</p>
                <p className="text-xl font-bold">{formatCurrency(totalThisMonth, business.currency)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-500/10">
                <Calendar className="h-5 w-5 text-blue-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Histórico</p>
                <p className="text-xl font-bold">{formatCurrency(totalPurchases, business.currency)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Buscar compras..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-9"
        />
      </div>

      {/* Purchases List */}
      <Card>
        <CardHeader>
          <CardTitle>Historial de Compras</CardTitle>
        </CardHeader>
        <CardContent>
          {filteredPurchases.length === 0 ? (
            <div className="text-center py-12">
              <ShoppingCart className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">No hay compras registradas</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Fecha</TableHead>
                  <TableHead>Proveedor</TableHead>
                  <TableHead>Artículos</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredPurchases.map((purchase) => (
                  <TableRow key={purchase.id}>
                    <TableCell>
                      {format(purchase.purchaseDate, 'dd MMM yyyy', { locale: es })}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Building2 className="h-4 w-4 text-muted-foreground" />
                        {purchase.supplierName || 'Sin proveedor'}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary">
                        {purchase.items?.length || 0} artículos
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      {formatCurrency(purchase.totalAmount, business.currency)}
                    </TableCell>
                    <TableCell>
                      <Badge variant="default" className="bg-green-500">
                        Completada
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleViewPurchase(purchase)}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => deletePurchase(purchase.id)}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* New Purchase Dialog */}
      <Dialog open={isNewPurchaseOpen} onOpenChange={setIsNewPurchaseOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle>Nueva Compra</DialogTitle>
          </DialogHeader>
          
          <ScrollArea className="flex-1 pr-4">
            <div className="space-y-6">
              {/* Supplier Info */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Proveedor (opcional)</Label>
                  <Input
                    placeholder="Nombre del proveedor"
                    value={supplierName}
                    onChange={(e) => setSupplierName(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Notas (opcional)</Label>
                  <Textarea
                    placeholder="Notas adicionales..."
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    rows={1}
                  />
                </div>
              </div>

              {/* Add Item Section */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">Agregar Artículo</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Tipo</Label>
                      <Select
                        value={selectedItemType}
                        onValueChange={(v) => {
                          setSelectedItemType(v as 'inventory' | 'catalog_article');
                          setSelectedItemId('');
                        }}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="inventory">Inventario</SelectItem>
                          <SelectItem value="catalog_article">Catálogo (Artículos)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Artículo</Label>
                      <Select value={selectedItemId} onValueChange={setSelectedItemId}>
                        <SelectTrigger>
                          <SelectValue placeholder="Seleccionar artículo" />
                        </SelectTrigger>
                        <SelectContent>
                          {availableItems.map((item) => (
                            <SelectItem key={item.id} value={item.id}>
                              {item.name} (Stock: {item.currentStock} {item.unit})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  {selectedItem && (
                    <>
                      <div className="p-3 bg-muted rounded-lg">
                        <p className="text-sm">
                          <strong>Stock actual:</strong> {selectedItem.currentStock} {selectedItem.unit}
                        </p>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label>Cantidad</Label>
                          <Input
                            type="number"
                            placeholder="0"
                            value={quantity}
                            onChange={(e) => setQuantity(e.target.value)}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Costo Unitario</Label>
                          <Input
                            type="number"
                            placeholder="0.00"
                            value={unitCost}
                            onChange={(e) => setUnitCost(e.target.value)}
                          />
                        </div>
                      </div>

                      <div className="space-y-3">
                        <Label>Acción de Stock</Label>
                        <RadioGroup
                          value={stockAction}
                          onValueChange={(v) => setStockAction(v as 'add' | 'replace')}
                          className="grid grid-cols-2 gap-4"
                        >
                          <div className="flex items-center space-x-2 p-3 border rounded-lg">
                            <RadioGroupItem value="add" id="add" />
                            <Label htmlFor="add" className="cursor-pointer flex-1">
                              <div>Sumar al existente</div>
                              <p className="text-xs text-muted-foreground">
                                {selectedItem.currentStock} + {quantity || 0} = {selectedItem.currentStock + (parseFloat(quantity) || 0)}
                              </p>
                            </Label>
                          </div>
                          <div className="flex items-center space-x-2 p-3 border rounded-lg">
                            <RadioGroupItem value="replace" id="replace" />
                            <Label htmlFor="replace" className="cursor-pointer flex-1">
                              <div>Reemplazar valor</div>
                              <p className="text-xs text-muted-foreground">
                                Stock quedará en: {quantity || 0}
                              </p>
                            </Label>
                          </div>
                        </RadioGroup>
                      </div>

                      <Button onClick={handleAddItem} className="w-full">
                        <Plus className="h-4 w-4 mr-2" />
                        Agregar a la compra
                      </Button>
                    </>
                  )}
                </CardContent>
              </Card>

              {/* Items List */}
              {purchaseItems.length > 0 && (
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base">Artículos en la compra</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Artículo</TableHead>
                          <TableHead>Cantidad</TableHead>
                          <TableHead>Costo Unit.</TableHead>
                          <TableHead>Acción</TableHead>
                          <TableHead className="text-right">Total</TableHead>
                          <TableHead></TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {purchaseItems.map((item, index) => (
                          <TableRow key={index}>
                            <TableCell>
                              <div>
                                <p className="font-medium">{item.itemName}</p>
                                <p className="text-xs text-muted-foreground">
                                  {item.itemType === 'inventory' ? 'Inventario' : 'Catálogo'}
                                </p>
                              </div>
                            </TableCell>
                            <TableCell>{item.quantity}</TableCell>
                            <TableCell>{formatCurrency(item.unitCost, business.currency)}</TableCell>
                            <TableCell>
                              <Badge variant={item.stockAction === 'add' ? 'default' : 'secondary'}>
                                {item.stockAction === 'add' ? 'Sumar' : 'Reemplazar'}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-right font-medium">
                              {formatCurrency(item.totalCost, business.currency)}
                            </TableCell>
                            <TableCell>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleRemoveItem(index)}
                              >
                                <Trash2 className="h-4 w-4 text-destructive" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                    <div className="mt-4 p-3 bg-muted rounded-lg flex justify-between items-center">
                      <span className="font-medium">Total de la Compra:</span>
                      <span className="text-xl font-bold">
                        {formatCurrency(purchaseTotal, business.currency)}
                      </span>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          </ScrollArea>

          <DialogFooter className="mt-4">
            <Button variant="outline" onClick={() => {
              setIsNewPurchaseOpen(false);
              resetForm();
            }}>
              Cancelar
            </Button>
            <Button onClick={handleCreatePurchase} disabled={purchaseItems.length === 0}>
              Registrar Compra
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* View Purchase Dialog */}
      <Dialog open={isViewOpen} onOpenChange={setIsViewOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Detalle de Compra</DialogTitle>
          </DialogHeader>
          
          {selectedPurchase && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Fecha</p>
                  <p className="font-medium">
                    {format(selectedPurchase.purchaseDate, 'dd MMMM yyyy, HH:mm', { locale: es })}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Proveedor</p>
                  <p className="font-medium">{selectedPurchase.supplierName || 'Sin proveedor'}</p>
                </div>
              </div>

              {selectedPurchase.notes && (
                <div>
                  <p className="text-sm text-muted-foreground">Notas</p>
                  <p>{selectedPurchase.notes}</p>
                </div>
              )}

              <div>
                <p className="text-sm text-muted-foreground mb-2">Artículos</p>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Artículo</TableHead>
                      <TableHead>Cantidad</TableHead>
                      <TableHead>Stock Antes</TableHead>
                      <TableHead>Acción</TableHead>
                      <TableHead className="text-right">Total</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {selectedPurchase.items?.map((item, index) => (
                      <TableRow key={index}>
                        <TableCell>{item.itemName}</TableCell>
                        <TableCell>{item.quantity}</TableCell>
                        <TableCell>{item.stockBefore}</TableCell>
                        <TableCell>
                          <Badge variant={item.stockAction === 'add' ? 'default' : 'secondary'}>
                            {item.stockAction === 'add' ? 'Sumado' : 'Reemplazado'}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          {formatCurrency(item.totalCost, business.currency)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              <div className="p-3 bg-muted rounded-lg flex justify-between items-center">
                <span className="font-medium">Total:</span>
                <span className="text-xl font-bold">
                  {formatCurrency(selectedPurchase.totalAmount, business.currency)}
                </span>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
