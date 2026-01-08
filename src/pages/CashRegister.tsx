import { useState, useMemo } from 'react';
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
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
  FileText,
  ArrowUpCircle,
  ArrowDownCircle,
  Building,
  Zap,
  Users,
  Package,
  MoreHorizontal,
  Calculator,
  CheckCircle,
  AlertCircle,
  Loader2,
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { useCashRegister } from '@/hooks/useCashRegister';
import { useConfig } from '@/contexts/ConfigContext';
import { formatCurrency } from '@/lib/currency';
import { Expense } from '@/types';

// Expense categories with labels and icons
const EXPENSE_CATEGORIES = {
  rent: { label: 'Renta', icon: Building },
  utilities: { label: 'Servicios (Luz, Agua, Gas)', icon: Zap },
  payroll: { label: 'Nómina', icon: Users },
  supplies: { label: 'Suministros', icon: Package },
  other: { label: 'Otros', icon: MoreHorizontal },
} as const;

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
  
  // New expense dialog
  const [isNewExpenseOpen, setIsNewExpenseOpen] = useState(false);
  const [expenseCategory, setExpenseCategory] = useState<keyof typeof EXPENSE_CATEGORIES>('other');
  const [expenseAmount, setExpenseAmount] = useState('');
  const [expenseDescription, setExpenseDescription] = useState('');
  
  // Opening balance dialog
  const [isBalanceOpen, setIsBalanceOpen] = useState(false);
  const [newOpeningBalance, setNewOpeningBalance] = useState('');

  // Monthly expenses summary
  const monthlyExpenses = useMemo(() => {
    const currentMonth = new Date().getMonth();
    const currentYear = new Date().getFullYear();
    
    const monthlyData = expenses.filter(e => {
      const expDate = new Date(e.date);
      return expDate.getMonth() === currentMonth && expDate.getFullYear() === currentYear;
    });
    
    const byCategory = Object.keys(EXPENSE_CATEGORIES).reduce((acc, key) => {
      acc[key] = monthlyData
        .filter(e => e.category === key)
        .reduce((sum, e) => sum + e.amount, 0);
      return acc;
    }, {} as Record<string, number>);
    
    const total = Object.values(byCategory).reduce((sum, val) => sum + val, 0);
    
    return { byCategory, total };
  }, [expenses]);

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

  const handleAddExpense = async () => {
    if (!expenseAmount || parseFloat(expenseAmount) <= 0) {
      toast.error('Ingresa un monto válido');
      return;
    }
    
    setIsSubmitting(true);
    try {
      await addExpense({
        category: expenseCategory,
        amount: parseFloat(expenseAmount),
        description: expenseDescription,
        date: new Date(),
      });
      resetExpenseForm();
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

  const resetExpenseForm = () => {
    setIsNewExpenseOpen(false);
    setExpenseAmount('');
    setExpenseCategory('other');
    setExpenseDescription('');
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
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Opening Balance */}
        <Card className="bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 border-slate-200 dark:border-slate-700">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Saldo Inicial</p>
                <p className="text-2xl font-bold">{formatCurrency(openingBalance, business.currency)}</p>
              </div>
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
            </div>
          </CardContent>
        </Card>

        {/* Total Income */}
        <Card className="bg-gradient-to-br from-green-50 to-emerald-100 dark:from-green-950 dark:to-emerald-900 border-green-200 dark:border-green-800">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-green-600 dark:text-green-400">Ingresos del Día</p>
                <p className="text-2xl font-bold text-green-700 dark:text-green-300">
                  +{formatCurrency(totals.income, business.currency)}
                </p>
              </div>
              <ArrowUpCircle className="w-10 h-10 text-green-500/50" />
            </div>
          </CardContent>
        </Card>

        {/* Total Expenses */}
        <Card className="bg-gradient-to-br from-red-50 to-rose-100 dark:from-red-950 dark:to-rose-900 border-red-200 dark:border-red-800">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-red-600 dark:text-red-400">Egresos del Día</p>
                <p className="text-2xl font-bold text-red-700 dark:text-red-300">
                  -{formatCurrency(totals.expense, business.currency)}
                </p>
              </div>
              <ArrowDownCircle className="w-10 h-10 text-red-500/50" />
            </div>
          </CardContent>
        </Card>

        {/* Balance */}
        <Card className={cn(
          "bg-gradient-to-br border",
          totals.balance >= openingBalance 
            ? "from-blue-50 to-indigo-100 dark:from-blue-950 dark:to-indigo-900 border-blue-200 dark:border-blue-800"
            : "from-amber-50 to-orange-100 dark:from-amber-950 dark:to-orange-900 border-amber-200 dark:border-amber-800"
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
                <CheckCircle className="w-10 h-10 text-blue-500/50" />
              ) : (
                <AlertCircle className="w-10 h-10 text-amber-500/50" />
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Panel - Movements */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <Receipt className="w-5 h-5" />
                  Movimientos del Día
                </CardTitle>
                <div className="flex gap-2">
                  {/* Add Income */}
                  <Dialog open={isNewEntryOpen && entryType === 'income'} onOpenChange={(open) => {
                    setIsNewEntryOpen(open);
                    if (open) setEntryType('income');
                  }}>
                    <DialogTrigger asChild>
                      <Button size="sm" className="gap-1 bg-green-600 hover:bg-green-700">
                        <Plus className="w-4 h-4" />
                        Ingreso
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle className="flex items-center gap-2 text-green-600">
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
                        <Button className="w-full bg-green-600 hover:bg-green-700" onClick={handleAddEntry} disabled={isSubmitting}>
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
                      <Button size="sm" variant="outline" className="gap-1 text-red-600 border-red-200 hover:bg-red-50">
                        <Minus className="w-4 h-4" />
                        Gasto
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle className="flex items-center gap-2 text-red-600">
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
                          entry.type === 'income' ? 'text-green-600' : 'text-red-600'
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
        </div>

        {/* Right Panel - Monthly Expenses */}
        <div>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="w-5 h-5" />
                Gastos del Mes
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {Object.entries(EXPENSE_CATEGORIES).map(([key, config]) => {
                const amount = monthlyExpenses.byCategory[key] || 0;
                const Icon = config.icon;
                
                return (
                  <div key={key} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Icon className="w-4 h-4 text-muted-foreground" />
                      <span className="text-sm">{config.label}</span>
                    </div>
                    <span className="font-medium">
                      {formatCurrency(amount, business.currency)}
                    </span>
                  </div>
                );
              })}
              
              <Separator />
              
              <div className="flex items-center justify-between font-bold">
                <span>Total del Mes</span>
                <span className="text-red-600">
                  {formatCurrency(monthlyExpenses.total, business.currency)}
                </span>
              </div>

              {/* Add Operational Expense */}
              <Dialog open={isNewExpenseOpen} onOpenChange={setIsNewExpenseOpen}>
                <DialogTrigger asChild>
                  <Button variant="outline" className="w-full gap-2">
                    <Plus className="w-4 h-4" />
                    Agregar Gasto Operativo
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Registrar Gasto Operativo</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4 pt-4">
                    <div className="space-y-2">
                      <Label>Categoría</Label>
                      <Select value={expenseCategory} onValueChange={(v) => setExpenseCategory(v as keyof typeof EXPENSE_CATEGORIES)}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {Object.entries(EXPENSE_CATEGORIES).map(([key, config]) => (
                            <SelectItem key={key} value={key}>
                              {config.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Monto</Label>
                      <div className="relative">
                        <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <Input
                          type="number"
                          placeholder="0.00"
                          value={expenseAmount}
                          onChange={(e) => setExpenseAmount(e.target.value)}
                          className="pl-9"
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label>Descripción</Label>
                      <Textarea
                        placeholder="Descripción del gasto..."
                        value={expenseDescription}
                        onChange={(e) => setExpenseDescription(e.target.value)}
                      />
                    </div>
                    <Button className="w-full" onClick={handleAddExpense} disabled={isSubmitting}>
                      {isSubmitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                      Registrar Gasto
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
