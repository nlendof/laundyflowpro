import { useState, useMemo } from 'react';
import { format, startOfDay, endOfDay, isToday } from 'date-fns';
import { es } from 'date-fns/locale';
import { CashRegisterEntry, Expense } from '@/types';
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
  Banknote,
  CreditCard,
  Building,
  Zap,
  Users,
  Package,
  MoreHorizontal,
  Calculator,
  CheckCircle,
  AlertCircle,
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

// Expense categories with labels and icons
const EXPENSE_CATEGORIES = {
  rent: { label: 'Renta', icon: Building },
  utilities: { label: 'Servicios (Luz, Agua, Gas)', icon: Zap },
  payroll: { label: 'Nómina', icon: Users },
  supplies: { label: 'Suministros', icon: Package },
  other: { label: 'Otros', icon: MoreHorizontal },
} as const;

// Mock data for demo
const generateMockEntries = (): CashRegisterEntry[] => {
  const today = new Date();
  return [
    {
      id: '1',
      type: 'income',
      category: 'Venta de Servicio',
      amount: 450.00,
      description: 'Orden LC-2024-001 - María García',
      orderId: '1',
      createdAt: new Date(today.setHours(9, 30)),
      createdBy: 'Admin',
    },
    {
      id: '2',
      type: 'income',
      category: 'Venta de Servicio',
      amount: 320.00,
      description: 'Orden LC-2024-002 - Juan López',
      orderId: '2',
      createdAt: new Date(today.setHours(10, 15)),
      createdBy: 'Admin',
    },
    {
      id: '3',
      type: 'expense',
      category: 'supplies',
      amount: 150.00,
      description: 'Compra de detergente industrial',
      createdAt: new Date(today.setHours(11, 0)),
      createdBy: 'Admin',
    },
    {
      id: '4',
      type: 'income',
      category: 'Venta de Producto',
      amount: 85.00,
      description: 'Venta rápida - Jabón y suavizante',
      createdAt: new Date(today.setHours(12, 30)),
      createdBy: 'Cajero',
    },
    {
      id: '5',
      type: 'expense',
      category: 'other',
      amount: 50.00,
      description: 'Cambio para caja chica',
      createdAt: new Date(today.setHours(13, 0)),
      createdBy: 'Admin',
    },
    {
      id: '6',
      type: 'income',
      category: 'Venta de Servicio',
      amount: 680.00,
      description: 'Orden LC-2024-003 - Ana Martínez',
      orderId: '3',
      createdAt: new Date(today.setHours(14, 45)),
      createdBy: 'Cajero',
    },
  ];
};

const generateMockExpenses = (): Expense[] => {
  const today = new Date();
  const lastMonth = new Date(today);
  lastMonth.setMonth(lastMonth.getMonth() - 1);
  
  return [
    {
      id: '1',
      category: 'rent',
      amount: 15000.00,
      description: 'Renta mensual del local',
      date: new Date(lastMonth.setDate(1)),
      createdBy: 'Admin',
    },
    {
      id: '2',
      category: 'utilities',
      amount: 2500.00,
      description: 'Recibo de luz - Enero',
      date: new Date(lastMonth.setDate(15)),
      createdBy: 'Admin',
    },
    {
      id: '3',
      category: 'payroll',
      amount: 25000.00,
      description: 'Nómina quincenal',
      date: new Date(lastMonth.setDate(15)),
      createdBy: 'Admin',
    },
  ];
};

export default function CashRegister() {
  const [entries, setEntries] = useState<CashRegisterEntry[]>(generateMockEntries);
  const [expenses, setExpenses] = useState<Expense[]>(generateMockExpenses);
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('movements');
  
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
  
  // Opening balance
  const [openingBalance, setOpeningBalance] = useState(5000);
  const [isBalanceOpen, setIsBalanceOpen] = useState(false);
  const [newOpeningBalance, setNewOpeningBalance] = useState('');

  // Filter entries by selected date
  const filteredEntries = useMemo(() => {
    const start = startOfDay(selectedDate);
    const end = endOfDay(selectedDate);
    return entries.filter(entry => {
      const entryDate = new Date(entry.createdAt);
      return entryDate >= start && entryDate <= end;
    });
  }, [entries, selectedDate]);

  // Calculate totals
  const totals = useMemo(() => {
    const income = filteredEntries
      .filter(e => e.type === 'income')
      .reduce((sum, e) => sum + e.amount, 0);
    
    const expense = filteredEntries
      .filter(e => e.type === 'expense')
      .reduce((sum, e) => sum + e.amount, 0);
    
    const balance = openingBalance + income - expense;
    
    return { income, expense, balance };
  }, [filteredEntries, openingBalance]);

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

  const handleAddEntry = () => {
    if (!entryAmount || parseFloat(entryAmount) <= 0) {
      toast.error('Ingresa un monto válido');
      return;
    }
    
    const newEntry: CashRegisterEntry = {
      id: crypto.randomUUID(),
      type: entryType,
      category: entryCategory || (entryType === 'income' ? 'Ingreso General' : 'Gasto General'),
      amount: parseFloat(entryAmount),
      description: entryDescription,
      createdAt: new Date(),
      createdBy: 'Admin', // TODO: Get from auth context
    };
    
    setEntries(prev => [newEntry, ...prev]);
    
    // If it's an expense, also add to expenses list
    if (entryType === 'expense') {
      const newExpense: Expense = {
        id: crypto.randomUUID(),
        category: 'other',
        amount: parseFloat(entryAmount),
        description: entryDescription,
        date: new Date(),
        createdBy: 'Admin',
      };
      setExpenses(prev => [newExpense, ...prev]);
    }
    
    toast.success(`${entryType === 'income' ? 'Ingreso' : 'Gasto'} registrado correctamente`);
    resetEntryForm();
  };

  const handleAddExpense = () => {
    if (!expenseAmount || parseFloat(expenseAmount) <= 0) {
      toast.error('Ingresa un monto válido');
      return;
    }
    
    const newExpense: Expense = {
      id: crypto.randomUUID(),
      category: expenseCategory,
      amount: parseFloat(expenseAmount),
      description: expenseDescription,
      date: new Date(),
      createdBy: 'Admin',
    };
    
    setExpenses(prev => [newExpense, ...prev]);
    
    // Also add to daily entries
    const newEntry: CashRegisterEntry = {
      id: crypto.randomUUID(),
      type: 'expense',
      category: EXPENSE_CATEGORIES[expenseCategory].label,
      amount: parseFloat(expenseAmount),
      description: expenseDescription,
      createdAt: new Date(),
      createdBy: 'Admin',
    };
    
    setEntries(prev => [newEntry, ...prev]);
    
    toast.success('Gasto operativo registrado');
    resetExpenseForm();
  };

  const handleSetOpeningBalance = () => {
    const balance = parseFloat(newOpeningBalance);
    if (isNaN(balance) || balance < 0) {
      toast.error('Ingresa un monto válido');
      return;
    }
    setOpeningBalance(balance);
    setIsBalanceOpen(false);
    setNewOpeningBalance('');
    toast.success('Saldo inicial actualizado');
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
                <p className="text-2xl font-bold">${openingBalance.toLocaleString('es-MX', { minimumFractionDigits: 2 })}</p>
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
                    <Button className="w-full" onClick={handleSetOpeningBalance}>
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
                  +${totals.income.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
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
                  -${totals.expense.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
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
                  ${totals.balance.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
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
                          <Select value={entryCategory} onValueChange={setEntryCategory}>
                            <SelectTrigger>
                              <SelectValue placeholder="Seleccionar categoría" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="Venta de Servicio">Venta de Servicio</SelectItem>
                              <SelectItem value="Venta de Producto">Venta de Producto</SelectItem>
                              <SelectItem value="Cobro Delivery">Cobro Delivery</SelectItem>
                              <SelectItem value="Anticipo">Anticipo</SelectItem>
                              <SelectItem value="Otro">Otro Ingreso</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <Label>Descripción</Label>
                          <Textarea
                            placeholder="Detalles del ingreso..."
                            value={entryDescription}
                            onChange={(e) => setEntryDescription(e.target.value)}
                          />
                        </div>
                        <Button className="w-full bg-green-600 hover:bg-green-700" onClick={handleAddEntry}>
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
                        Egreso
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle className="flex items-center gap-2 text-red-600">
                          <TrendingDown className="w-5 h-5" />
                          Registrar Egreso
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
                          <Select value={entryCategory} onValueChange={setEntryCategory}>
                            <SelectTrigger>
                              <SelectValue placeholder="Seleccionar categoría" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="Cambio">Cambio / Fondo de Caja</SelectItem>
                              <SelectItem value="Devolución">Devolución</SelectItem>
                              <SelectItem value="Compra Menor">Compra Menor</SelectItem>
                              <SelectItem value="Retiro">Retiro de Efectivo</SelectItem>
                              <SelectItem value="Otro">Otro Egreso</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <Label>Descripción</Label>
                          <Textarea
                            placeholder="Detalles del egreso..."
                            value={entryDescription}
                            onChange={(e) => setEntryDescription(e.target.value)}
                          />
                        </div>
                        <Button className="w-full" variant="destructive" onClick={handleAddEntry}>
                          Registrar Egreso
                        </Button>
                      </div>
                    </DialogContent>
                  </Dialog>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {filteredEntries.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <Receipt className="w-12 h-12 mx-auto mb-3 opacity-30" />
                  <p>No hay movimientos registrados para esta fecha</p>
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
                    {filteredEntries.map((entry) => (
                      <TableRow key={entry.id}>
                        <TableCell className="text-muted-foreground">
                          <div className="flex items-center gap-1">
                            <Clock className="w-3.5 h-3.5" />
                            {format(new Date(entry.createdAt), 'HH:mm')}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant={entry.type === 'income' ? 'default' : 'destructive'} className={cn(
                            entry.type === 'income' 
                              ? 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300'
                              : 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300'
                          )}>
                            {entry.type === 'income' ? 'Ingreso' : 'Egreso'}
                          </Badge>
                        </TableCell>
                        <TableCell className="font-medium">{entry.category}</TableCell>
                        <TableCell className="max-w-[200px] truncate text-muted-foreground">
                          {entry.description || '-'}
                        </TableCell>
                        <TableCell className={cn(
                          "text-right font-semibold",
                          entry.type === 'income' ? 'text-green-600' : 'text-red-600'
                        )}>
                          {entry.type === 'income' ? '+' : '-'}${entry.amount.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right Panel - Expenses & Summary */}
        <div className="space-y-6">
          {/* Monthly Expenses */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2 text-base">
                  <FileText className="w-5 h-5" />
                  Gastos Operativos
                </CardTitle>
                <Dialog open={isNewExpenseOpen} onOpenChange={setIsNewExpenseOpen}>
                  <DialogTrigger asChild>
                    <Button size="sm" variant="outline" className="gap-1">
                      <Plus className="w-4 h-4" />
                      Agregar
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
                            {Object.entries(EXPENSE_CATEGORIES).map(([key, { label, icon: Icon }]) => (
                              <SelectItem key={key} value={key}>
                                <div className="flex items-center gap-2">
                                  <Icon className="w-4 h-4" />
                                  {label}
                                </div>
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
                          placeholder="Detalles del gasto..."
                          value={expenseDescription}
                          onChange={(e) => setExpenseDescription(e.target.value)}
                        />
                      </div>
                      <Button className="w-full" onClick={handleAddExpense}>
                        Registrar Gasto
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-xs text-muted-foreground mb-2">
                Resumen del mes: {format(new Date(), 'MMMM yyyy', { locale: es })}
              </p>
              
              {Object.entries(EXPENSE_CATEGORIES).map(([key, { label, icon: Icon }]) => {
                const amount = monthlyExpenses.byCategory[key] || 0;
                return (
                  <div key={key} className="flex items-center justify-between p-2 rounded-lg bg-muted/50">
                    <div className="flex items-center gap-2">
                      <Icon className="w-4 h-4 text-muted-foreground" />
                      <span className="text-sm">{label}</span>
                    </div>
                    <span className={cn(
                      "text-sm font-medium",
                      amount > 0 ? "text-red-600" : "text-muted-foreground"
                    )}>
                      ${amount.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                );
              })}
              
              <Separator />
              
              <div className="flex items-center justify-between p-2 bg-red-50 dark:bg-red-950/30 rounded-lg">
                <span className="font-medium">Total Gastos</span>
                <span className="font-bold text-red-600">
                  ${monthlyExpenses.total.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                </span>
              </div>
            </CardContent>
          </Card>

          {/* Quick Stats */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <Banknote className="w-5 h-5" />
                Resumen del Día
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Transacciones</span>
                <Badge variant="secondary">{filteredEntries.length}</Badge>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Ingresos</span>
                <span className="text-sm font-medium text-green-600">
                  {filteredEntries.filter(e => e.type === 'income').length} mov.
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Egresos</span>
                <span className="text-sm font-medium text-red-600">
                  {filteredEntries.filter(e => e.type === 'expense').length} mov.
                </span>
              </div>
              <Separator />
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Diferencia</span>
                <span className={cn(
                  "font-bold",
                  totals.income - totals.expense >= 0 ? "text-green-600" : "text-red-600"
                )}>
                  {totals.income - totals.expense >= 0 ? '+' : ''}
                  ${(totals.income - totals.expense).toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                </span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
