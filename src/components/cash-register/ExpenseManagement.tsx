import { useState } from 'react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
  FileText,
  Plus,
  Edit2,
  Trash2,
  DollarSign,
  CalendarIcon,
  Loader2,
  Building,
  Zap,
  Users,
  Package,
  MoreHorizontal,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatCurrency } from '@/lib/currency';
import { Expense } from '@/types';

const EXPENSE_CATEGORIES = {
  rent: { label: 'Renta', icon: Building },
  utilities: { label: 'Servicios', icon: Zap },
  payroll: { label: 'Nómina', icon: Users },
  supplies: { label: 'Suministros', icon: Package },
  other: { label: 'Otros', icon: MoreHorizontal },
} as const;

interface ExpenseManagementProps {
  expenses: Expense[];
  currency: string;
  onAddExpense: (data: Omit<Expense, 'id' | 'createdBy'>) => Promise<void>;
  onUpdateExpense: (id: string, data: Partial<Expense>) => Promise<void>;
  onDeleteExpense: (id: string) => Promise<void>;
  loading?: boolean;
}

export function ExpenseManagement({
  expenses,
  currency,
  onAddExpense,
  onUpdateExpense,
  onDeleteExpense,
  loading,
}: ExpenseManagementProps) {
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
  const [deletingExpense, setDeletingExpense] = useState<Expense | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Form state
  const [category, setCategory] = useState<keyof typeof EXPENSE_CATEGORIES>('other');
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [expenseDate, setExpenseDate] = useState<Date>(new Date());
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);

  // Get current month expenses
  const currentMonth = new Date().getMonth();
  const currentYear = new Date().getFullYear();
  const monthlyExpenses = expenses.filter(e => {
    const expDate = new Date(e.date);
    return expDate.getMonth() === currentMonth && expDate.getFullYear() === currentYear;
  });

  // Calculate summary by category
  const summaryByCategory = Object.keys(EXPENSE_CATEGORIES).reduce((acc, key) => {
    acc[key] = monthlyExpenses
      .filter(e => e.category === key)
      .reduce((sum, e) => sum + e.amount, 0);
    return acc;
  }, {} as Record<string, number>);

  const totalMonthly = Object.values(summaryByCategory).reduce((sum, val) => sum + val, 0);

  const resetForm = () => {
    setCategory('other');
    setAmount('');
    setDescription('');
    setExpenseDate(new Date());
  };

  const handleAdd = async () => {
    if (!amount || parseFloat(amount) <= 0) return;
    
    setIsSubmitting(true);
    try {
      await onAddExpense({
        category,
        amount: parseFloat(amount),
        description,
        date: expenseDate,
      });
      resetForm();
      setIsAddOpen(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEdit = async () => {
    if (!editingExpense || !amount || parseFloat(amount) <= 0) return;
    
    setIsSubmitting(true);
    try {
      await onUpdateExpense(editingExpense.id, {
        category,
        amount: parseFloat(amount),
        description,
        date: expenseDate,
      });
      setEditingExpense(null);
      resetForm();
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!deletingExpense) return;
    
    setIsSubmitting(true);
    try {
      await onDeleteExpense(deletingExpense.id);
      setDeletingExpense(null);
    } finally {
      setIsSubmitting(false);
    }
  };

  const openEditDialog = (expense: Expense) => {
    setEditingExpense(expense);
    setCategory(expense.category);
    setAmount(expense.amount.toString());
    setDescription(expense.description);
    setExpenseDate(new Date(expense.date));
  };

  const ExpenseForm = ({ isEditing = false }: { isEditing?: boolean }) => (
    <div className="space-y-4 pt-4">
      <div className="space-y-2">
        <Label>Categoría</Label>
        <Select value={category} onValueChange={(v) => setCategory(v as keyof typeof EXPENSE_CATEGORIES)}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {Object.entries(EXPENSE_CATEGORIES).map(([key, config]) => {
              const Icon = config.icon;
              return (
                <SelectItem key={key} value={key}>
                  <div className="flex items-center gap-2">
                    <Icon className="w-4 h-4" />
                    {config.label}
                  </div>
                </SelectItem>
              );
            })}
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
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label>Fecha</Label>
        <Popover open={isCalendarOpen} onOpenChange={setIsCalendarOpen}>
          <PopoverTrigger asChild>
            <Button variant="outline" className="w-full justify-start gap-2">
              <CalendarIcon className="w-4 h-4" />
              {format(expenseDate, 'dd/MM/yyyy', { locale: es })}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0">
            <Calendar
              mode="single"
              selected={expenseDate}
              onSelect={(date) => {
                if (date) {
                  setExpenseDate(date);
                  setIsCalendarOpen(false);
                }
              }}
              locale={es}
            />
          </PopoverContent>
        </Popover>
      </div>

      <div className="space-y-2">
        <Label>Descripción</Label>
        <Textarea
          placeholder="Descripción del gasto..."
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={2}
        />
      </div>

      <DialogFooter>
        <Button
          variant="outline"
          onClick={() => {
            if (isEditing) {
              setEditingExpense(null);
            } else {
              setIsAddOpen(false);
            }
            resetForm();
          }}
        >
          Cancelar
        </Button>
        <Button
          onClick={isEditing ? handleEdit : handleAdd}
          disabled={isSubmitting || !amount || parseFloat(amount) <= 0}
        >
          {isSubmitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
          {isEditing ? 'Guardar Cambios' : 'Agregar Gasto'}
        </Button>
      </DialogFooter>
    </div>
  );

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5" />
            Gastos Operativos
          </CardTitle>
          <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
            <DialogTrigger asChild>
              <Button size="sm" className="gap-1">
                <Plus className="w-4 h-4" />
                Agregar
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Agregar Gasto Operativo</DialogTitle>
              </DialogHeader>
              <ExpenseForm />
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Monthly Summary */}
        <div className="space-y-3">
          <h4 className="text-sm font-medium text-muted-foreground">
            Resumen del Mes ({format(new Date(), 'MMMM yyyy', { locale: es })})
          </h4>
          {Object.entries(EXPENSE_CATEGORIES).map(([key, config]) => {
            const catAmount = summaryByCategory[key] || 0;
            const Icon = config.icon;
            
            return (
              <div key={key} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Icon className="w-4 h-4 text-muted-foreground" />
                  <span className="text-sm">{config.label}</span>
                </div>
                <span className="font-medium">{formatCurrency(catAmount, currency)}</span>
              </div>
            );
          })}
          
          <Separator />
          
          <div className="flex items-center justify-between font-bold">
            <span>Total del Mes</span>
            <span className="text-red-600">{formatCurrency(totalMonthly, currency)}</span>
          </div>
        </div>

        <Separator />

        {/* Recent Expenses List */}
        <div className="space-y-3">
          <h4 className="text-sm font-medium text-muted-foreground">Gastos Recientes</h4>
          
          {monthlyExpenses.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              No hay gastos registrados este mes
            </p>
          ) : (
            <div className="space-y-2 max-h-[300px] overflow-y-auto">
              {monthlyExpenses.slice(0, 10).map((expense) => {
                const CategoryIcon = EXPENSE_CATEGORIES[expense.category]?.icon || MoreHorizontal;
                return (
                  <div
                    key={expense.id}
                    className="flex items-center justify-between p-2 rounded-lg bg-muted/50 hover:bg-muted transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <CategoryIcon className="w-4 h-4 text-muted-foreground" />
                      <div>
                        <p className="text-sm font-medium">
                          {EXPENSE_CATEGORIES[expense.category]?.label || expense.category}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {format(new Date(expense.date), 'dd/MM/yyyy', { locale: es })}
                          {expense.description && ` • ${expense.description}`}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-red-600">
                        -{formatCurrency(expense.amount, currency)}
                      </span>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-8 w-8"
                        onClick={() => openEditDialog(expense)}
                      >
                        <Edit2 className="w-3 h-3" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-8 w-8 text-destructive hover:text-destructive"
                        onClick={() => setDeletingExpense(expense)}
                      >
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </CardContent>

      {/* Edit Dialog */}
      <Dialog open={!!editingExpense} onOpenChange={(open) => !open && setEditingExpense(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar Gasto</DialogTitle>
          </DialogHeader>
          <ExpenseForm isEditing />
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deletingExpense} onOpenChange={(open) => !open && setDeletingExpense(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar gasto?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción eliminará el gasto de{' '}
              <span className="font-bold">
                {deletingExpense && formatCurrency(deletingExpense.amount, currency)}
              </span>{' '}
              de forma permanente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isSubmitting}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={isSubmitting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isSubmitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}
