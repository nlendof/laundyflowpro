import { useState } from 'react';
import { format, isToday } from 'date-fns';
import { es } from 'date-fns/locale';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Wallet,
  TrendingUp,
  TrendingDown,
  Plus,
  Minus,
  CalendarIcon,
  Clock,
  DollarSign,
  Receipt,
  ArrowUpCircle,
  ArrowDownCircle,
  CheckCircle,
  AlertCircle,
  Loader2,
  Lock,
  History,
  Calculator,
  FileText,
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { useCashRegister } from '@/hooks/useCashRegister';
import { useConfig } from '@/contexts/ConfigContext';
import { formatCurrency } from '@/lib/currency';
import { CashClosingDialog } from '@/components/cash-register/CashClosingDialog';
import { ExpenseManagement } from '@/components/cash-register/ExpenseManagement';
import { CashClosingHistory } from '@/components/cash-register/CashClosingHistory';

export default function CashRegister() {
  const { business } = useConfig();
  const {
    entries,
    expenses,
    loading,
    selectedDate,
    setSelectedDate,
    openingBalance,
    setOpeningBalance,
    totals,
    addEntry,
    addExpense,
    updateExpense,
    deleteExpense,
    closeCashRegister,
    currentClosing,
  } = useCashRegister();

  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('movements');
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // New entry dialog
  const [isNewEntryOpen, setIsNewEntryOpen] = useState(false);
  const [entryType, setEntryType] = useState<'income' | 'expense'>('income');
  const [entryAmount, setEntryAmount] = useState('');
  const [entryCategory, setEntryCategory] = useState('');
  const [entryDescription, setEntryDescription] = useState('');
  
  // Opening balance dialog
  const [isBalanceOpen, setIsBalanceOpen] = useState(false);
  const [newOpeningBalance, setNewOpeningBalance] = useState('');
  
  // Cash closing dialog
  const [isClosingOpen, setIsClosingOpen] = useState(false);

  const isClosed = currentClosing?.actual_balance !== null;
  const expectedBalance = openingBalance + totals.income - totals.expense;

  const handleAddEntry = async () => {
    if (!entryAmount || parseFloat(entryAmount) <= 0) {
      toast.error('Ingresa un monto válido');
      return;
    }
    
    setIsSubmitting(true);
    try {
      await addEntry({
        type: entryType,
        category: entryCategory || (entryType === 'income' ? 'Ingreso General' : 'Gasto General'),
        amount: parseFloat(entryAmount),
        description: entryDescription,
      });
      resetEntryForm();
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSetOpeningBalance = async () => {
    const balance = parseFloat(newOpeningBalance);
    if (isNaN(balance) || balance < 0) {
      toast.error('Ingresa un monto válido');
      return;
    }
    
    setIsSubmitting(true);
    try {
      await setOpeningBalance(balance);
      setIsBalanceOpen(false);
      setNewOpeningBalance('');
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetEntryForm = () => {
    setIsNewEntryOpen(false);
    setEntryAmount('');
    setEntryCategory('');
    setEntryDescription('');
    setEntryType('income');
  };

  if (loading) {
    return (
      <div className="min-h-screen p-4 lg:p-6 space-y-6">
        <div className="flex items-center justify-between">
          <Skeleton className="h-10 w-48" />
          <Skeleton className="h-10 w-32" />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(i => (
            <Skeleton key={i} className="h-24" />
          ))}
        </div>
        <Skeleton className="h-96" />
      </div>
    );
  }

  return (
    <div className="min-h-screen p-4 lg:p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold flex items-center gap-3">
            <Wallet className="w-8 h-8 text-primary" />
            Caja Registradora
          </h1>
          <p className="text-muted-foreground">Arqueo diario y control de ingresos/egresos</p>
        </div>

        <div className="flex items-center gap-2">
          {/* Date Picker */}
          <Popover open={isCalendarOpen} onOpenChange={setIsCalendarOpen}>
            <PopoverTrigger asChild>
              <Button variant="outline" className="gap-2">
                <CalendarIcon className="w-4 h-4" />
                {isToday(selectedDate) ? 'Hoy' : format(selectedDate, 'dd/MM/yyyy', { locale: es })}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="end">
              <Calendar
                mode="single"
                selected={selectedDate}
                onSelect={(date) => {
                  if (date) {
                    setSelectedDate(date);
                    setIsCalendarOpen(false);
                  }
                }}
                locale={es}
              />
            </PopoverContent>
          </Popover>

          {/* Close Cash Register Button */}
          <Button
            onClick={() => setIsClosingOpen(true)}
            className={cn(
              "gap-2",
              isClosed 
                ? "bg-secondary text-secondary-foreground" 
                : "bg-primary text-primary-foreground"
            )}
          >
            <Lock className="w-4 h-4" />
            {isClosed ? 'Ver Cierre' : 'Cerrar Caja'}
          </Button>
        </div>
      </div>

      {/* Closed Alert */}
      {isClosed && (
        <div className="bg-secondary/50 border border-border rounded-lg p-4 flex items-center gap-3">
          <CheckCircle className="w-5 h-5 text-primary" />
          <div>
            <p className="font-medium">Caja cerrada</p>
            <p className="text-sm text-muted-foreground">
              El cierre de caja para este día ya fue realizado. Solo puedes consultar los movimientos.
            </p>
          </div>
        </div>
      )}

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Opening Balance */}
        <Card className="bg-card border-border">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Saldo Inicial</p>
                <p className="text-2xl font-bold">{formatCurrency(openingBalance, business.currency)}</p>
              </div>
              {!isClosed && (
                <Dialog open={isBalanceOpen} onOpenChange={setIsBalanceOpen}>
                  <DialogTrigger asChild>
                    <Button size="icon" variant="ghost">
                      <Calculator className="w-5 h-5" />
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Establecer Saldo Inicial</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 pt-4">
                      <div className="space-y-2">
                        <Label>Monto de apertura</Label>
                        <div className="relative">
                          <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                          <Input
                            type="number"
                            placeholder="0.00"
                            value={newOpeningBalance}
                            onChange={(e) => setNewOpeningBalance(e.target.value)}
                            className="pl-9"
                          />
                        </div>
                      </div>
                      <Button className="w-full" onClick={handleSetOpeningBalance} disabled={isSubmitting}>
                        {isSubmitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                        Guardar
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Total Income */}
        <Card className="bg-primary/5 border-primary/20">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-primary">Ingresos del Día</p>
                <p className="text-2xl font-bold text-primary">
                  +{formatCurrency(totals.income, business.currency)}
                </p>
              </div>
              <ArrowUpCircle className="w-10 h-10 text-primary/30" />
            </div>
          </CardContent>
        </Card>

        {/* Total Expenses */}
        <Card className="bg-destructive/5 border-destructive/20">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-destructive">Egresos del Día</p>
                <p className="text-2xl font-bold text-destructive">
                  -{formatCurrency(totals.expense, business.currency)}
                </p>
              </div>
              <ArrowDownCircle className="w-10 h-10 text-destructive/30" />
            </div>
          </CardContent>
        </Card>

        {/* Balance */}
        <Card className={cn(
          "border",
          totals.balance >= openingBalance 
            ? "bg-secondary/50 border-secondary"
            : "bg-accent/50 border-accent"
        )}>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Saldo en Caja</p>
                <p className="text-2xl font-bold">
                  {formatCurrency(totals.balance, business.currency)}
                </p>
              </div>
              {totals.balance >= openingBalance ? (
                <CheckCircle className="w-10 h-10 text-primary/30" />
              ) : (
                <AlertCircle className="w-10 h-10 text-accent-foreground/30" />
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content with Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList>
          <TabsTrigger value="movements" className="gap-2">
            <Receipt className="w-4 h-4" />
            Movimientos
          </TabsTrigger>
          <TabsTrigger value="expenses" className="gap-2">
            <FileText className="w-4 h-4" />
            Gastos Operativos
          </TabsTrigger>
          <TabsTrigger value="history" className="gap-2">
            <History className="w-4 h-4" />
            Historial
          </TabsTrigger>
        </TabsList>

        {/* Movements Tab */}
        <TabsContent value="movements" className="space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <Receipt className="w-5 h-5" />
                  Movimientos del Día
                </CardTitle>
                {!isClosed && (
                  <div className="flex gap-2">
                    {/* Add Income */}
                    <Dialog open={isNewEntryOpen && entryType === 'income'} onOpenChange={(open) => {
                      setIsNewEntryOpen(open);
                      if (open) setEntryType('income');
                    }}>
                      <DialogTrigger asChild>
                        <Button size="sm" className="gap-1">
                          <Plus className="w-4 h-4" />
                          Ingreso
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle className="flex items-center gap-2 text-primary">
                            <TrendingUp className="w-5 h-5" />
                            Registrar Ingreso
                          </DialogTitle>
                        </DialogHeader>
                        <div className="space-y-4 pt-4">
                          <div className="space-y-2">
                            <Label>Monto</Label>
                            <div className="relative">
                              <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                              <Input
                                type="number"
                                placeholder="0.00"
                                value={entryAmount}
                                onChange={(e) => setEntryAmount(e.target.value)}
                                className="pl-9"
                              />
                            </div>
                          </div>
                          <div className="space-y-2">
                            <Label>Categoría</Label>
                            <Input
                              placeholder="Ej: Venta de Servicio"
                              value={entryCategory}
                              onChange={(e) => setEntryCategory(e.target.value)}
                            />
                          </div>
                          <div className="space-y-2">
                            <Label>Descripción (opcional)</Label>
                            <Textarea
                              placeholder="Detalles adicionales..."
                              value={entryDescription}
                              onChange={(e) => setEntryDescription(e.target.value)}
                            />
                          </div>
                          <Button className="w-full" onClick={handleAddEntry} disabled={isSubmitting}>
                            {isSubmitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                            Registrar Ingreso
                          </Button>
                        </div>
                      </DialogContent>
                    </Dialog>

                    {/* Add Expense */}
                    <Dialog open={isNewEntryOpen && entryType === 'expense'} onOpenChange={(open) => {
                      setIsNewEntryOpen(open);
                      if (open) setEntryType('expense');
                    }}>
                      <DialogTrigger asChild>
                        <Button size="sm" variant="outline" className="gap-1 text-destructive border-destructive/30 hover:bg-destructive/10">
                          <Minus className="w-4 h-4" />
                          Gasto
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle className="flex items-center gap-2 text-destructive">
                            <TrendingDown className="w-5 h-5" />
                            Registrar Gasto
                          </DialogTitle>
                        </DialogHeader>
                        <div className="space-y-4 pt-4">
                          <div className="space-y-2">
                            <Label>Monto</Label>
                            <div className="relative">
                              <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                              <Input
                                type="number"
                                placeholder="0.00"
                                value={entryAmount}
                                onChange={(e) => setEntryAmount(e.target.value)}
                                className="pl-9"
                              />
                            </div>
                          </div>
                          <div className="space-y-2">
                            <Label>Categoría</Label>
                            <Input
                              placeholder="Ej: Compra de suministros"
                              value={entryCategory}
                              onChange={(e) => setEntryCategory(e.target.value)}
                            />
                          </div>
                          <div className="space-y-2">
                            <Label>Descripción (opcional)</Label>
                            <Textarea
                              placeholder="Detalles adicionales..."
                              value={entryDescription}
                              onChange={(e) => setEntryDescription(e.target.value)}
                            />
                          </div>
                          <Button className="w-full" variant="destructive" onClick={handleAddEntry} disabled={isSubmitting}>
                            {isSubmitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                            Registrar Gasto
                          </Button>
                        </div>
                      </DialogContent>
                    </Dialog>
                  </div>
                )}
              </div>
            </CardHeader>
            <CardContent>
              {entries.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Receipt className="w-12 h-12 mx-auto mb-3 opacity-50" />
                  <p>No hay movimientos para este día</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Hora</TableHead>
                      <TableHead>Tipo</TableHead>
                      <TableHead>Categoría</TableHead>
                      <TableHead>Descripción</TableHead>
                      <TableHead className="text-right">Monto</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {entries.map((entry) => (
                      <TableRow key={entry.id}>
                        <TableCell className="text-muted-foreground">
                          <div className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {format(new Date(entry.createdAt), 'HH:mm')}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant={entry.type === 'income' ? 'default' : 'destructive'}>
                            {entry.type === 'income' ? 'Ingreso' : 'Gasto'}
                          </Badge>
                        </TableCell>
                        <TableCell>{entry.category}</TableCell>
                        <TableCell className="max-w-[200px] truncate">
                          {entry.description || '-'}
                        </TableCell>
                        <TableCell className={cn(
                          "text-right font-medium",
                          entry.type === 'income' ? 'text-primary' : 'text-destructive'
                        )}>
                          {entry.type === 'income' ? '+' : '-'}
                          {formatCurrency(entry.amount, business.currency)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Expenses Tab */}
        <TabsContent value="expenses">
          <ExpenseManagement
            expenses={expenses}
            currency={business.currency}
            onAddExpense={addExpense}
            onUpdateExpense={updateExpense}
            onDeleteExpense={deleteExpense}
          />
        </TabsContent>

        {/* History Tab */}
        <TabsContent value="history">
          <CashClosingHistory currency={business.currency} />
        </TabsContent>
      </Tabs>

      {/* Cash Closing Dialog */}
      <CashClosingDialog
        open={isClosingOpen}
        onOpenChange={setIsClosingOpen}
        selectedDate={selectedDate}
        openingBalance={openingBalance}
        totalIncome={totals.income}
        totalExpense={totals.expense}
        expectedBalance={expectedBalance}
        currency={business.currency}
        onClose={closeCashRegister}
        existingClosing={currentClosing}
      />
    </div>
  );
}
