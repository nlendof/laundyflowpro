import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useConfig } from '@/contexts/ConfigContext';
import { formatCurrency, CURRENCIES, CurrencyCode } from '@/lib/currency';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
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
  DollarSign,
  Plus,
  Pencil,
  Calendar,
  Loader2,
  History,
} from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import type { Employee } from './EmployeeList';

interface Salary {
  id: string;
  user_id: string;
  salary_type: 'monthly' | 'biweekly' | 'weekly' | 'hourly';
  base_salary: number;
  currency: string;
  effective_date: string;
  notes?: string;
  created_at: string;
}

interface SalaryManagementProps {
  employees: Employee[];
  onRefresh: () => void;
}

const SALARY_TYPES = {
  monthly: 'Mensual',
  biweekly: 'Quincenal',
  weekly: 'Semanal',
  hourly: 'Por hora',
};

export function SalaryManagement({ employees }: SalaryManagementProps) {
  const { business } = useConfig();
  const [salaries, setSalaries] = useState<Record<string, Salary[]>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
  const [formData, setFormData] = useState({
    salary_type: 'monthly' as Salary['salary_type'],
    base_salary: '',
    currency: business.currency,
    effective_date: format(new Date(), 'yyyy-MM-dd'),
    notes: '',
  });
  const [isSaving, setIsSaving] = useState(false);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [historyEmployee, setHistoryEmployee] = useState<Employee | null>(null);

  const fetchSalaries = async () => {
    try {
      setIsLoading(true);
      const { data, error } = await supabase
        .from('employee_salaries')
        .select('*')
        .order('effective_date', { ascending: false });
      
      if (error) throw error;
      
      // Group by user_id
      const grouped: Record<string, Salary[]> = {};
      (data || []).forEach(salary => {
        if (!grouped[salary.user_id]) {
          grouped[salary.user_id] = [];
        }
        grouped[salary.user_id].push(salary as Salary);
      });
      
      setSalaries(grouped);
    } catch (error) {
      console.error('Error fetching salaries:', error);
      toast.error('Error al cargar salarios');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchSalaries();
  }, []);

  const getCurrentSalary = (userId: string): Salary | undefined => {
    const userSalaries = salaries[userId];
    if (!userSalaries || userSalaries.length === 0) return undefined;
    
    const today = new Date();
    return userSalaries.find(s => new Date(s.effective_date) <= today) || userSalaries[0];
  };

  const handleOpenDialog = (employee: Employee, isEdit = false) => {
    setSelectedEmployee(employee);
    
    if (isEdit) {
      const current = getCurrentSalary(employee.id);
      if (current) {
        setFormData({
          salary_type: current.salary_type,
          base_salary: current.base_salary.toString(),
          currency: current.currency,
          effective_date: format(new Date(), 'yyyy-MM-dd'),
          notes: '',
        });
      }
    } else {
      setFormData({
        salary_type: 'monthly',
        base_salary: '',
        currency: business.currency,
        effective_date: format(new Date(), 'yyyy-MM-dd'),
        notes: '',
      });
    }
    
    setIsDialogOpen(true);
  };

  const handleSave = async () => {
    if (!selectedEmployee || !formData.base_salary) {
      toast.error('Completa todos los campos requeridos');
      return;
    }
    
    setIsSaving(true);
    
    try {
      const { error } = await supabase
        .from('employee_salaries')
        .insert({
          user_id: selectedEmployee.id,
          salary_type: formData.salary_type,
          base_salary: parseFloat(formData.base_salary),
          currency: formData.currency,
          effective_date: formData.effective_date,
          notes: formData.notes || null,
        });
      
      if (error) throw error;
      
      toast.success('Salario guardado correctamente');
      setIsDialogOpen(false);
      fetchSalaries();
    } catch (error) {
      console.error('Error saving salary:', error);
      toast.error('Error al guardar salario');
    } finally {
      setIsSaving(false);
    }
  };

  const handleOpenHistory = (employee: Employee) => {
    setHistoryEmployee(employee);
    setIsHistoryOpen(true);
  };

  const formatSalaryCurrency = (amount: number, currency: string) => {
    return formatCurrency(amount, currency as CurrencyCode);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  const activeEmployees = employees.filter(e => e.is_active);

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="w-5 h-5" />
            Salarios de Empleados
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Empleado</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Salario Base</TableHead>
                  <TableHead>Vigente desde</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {activeEmployees.map((employee) => {
                  const currentSalary = getCurrentSalary(employee.id);
                  
                  return (
                    <TableRow key={employee.id}>
                      <TableCell>
                        <div>
                          <p className="font-medium">{employee.name}</p>
                          <p className="text-sm text-muted-foreground">{employee.email}</p>
                        </div>
                      </TableCell>
                      <TableCell>
                        {currentSalary ? (
                          <Badge variant="outline">
                            {SALARY_TYPES[currentSalary.salary_type]}
                          </Badge>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {currentSalary ? (
                          <span className="font-medium text-green-600">
                            {formatSalaryCurrency(currentSalary.base_salary, currentSalary.currency)}
                          </span>
                        ) : (
                          <span className="text-muted-foreground">Sin configurar</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {currentSalary ? (
                          <div className="flex items-center gap-1 text-sm text-muted-foreground">
                            <Calendar className="w-3 h-3" />
                            {format(new Date(currentSalary.effective_date), 'dd MMM yyyy', { locale: es })}
                          </div>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          {salaries[employee.id]?.length > 0 && (
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleOpenHistory(employee)}
                              title="Historial"
                            >
                              <History className="w-4 h-4" />
                            </Button>
                          )}
                          {currentSalary ? (
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleOpenDialog(employee, true)}
                              title="Ajustar salario"
                            >
                              <Pencil className="w-4 h-4" />
                            </Button>
                          ) : (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleOpenDialog(employee)}
                            >
                              <Plus className="w-4 h-4 mr-1" />
                              Configurar
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Salary Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {getCurrentSalary(selectedEmployee?.id || '') ? 'Ajustar' : 'Configurar'} Salario
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="p-3 bg-muted rounded-lg">
              <p className="font-medium">{selectedEmployee?.name}</p>
              <p className="text-sm text-muted-foreground">{selectedEmployee?.email}</p>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Tipo de pago</Label>
                <Select
                  value={formData.salary_type}
                  onValueChange={(v) => setFormData(prev => ({ ...prev, salary_type: v as Salary['salary_type'] }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(SALARY_TYPES).map(([key, label]) => (
                      <SelectItem key={key} value={key}>{label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <Label>Moneda</Label>
                <Select
                  value={formData.currency}
                  onValueChange={(v) => setFormData(prev => ({ ...prev, currency: v }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(CURRENCIES).map(([code, curr]) => (
                      <SelectItem key={code} value={code}>{curr.symbol} ({curr.name})</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            <div className="space-y-2">
              <Label>Salario base *</Label>
              <Input
                type="number"
                value={formData.base_salary}
                onChange={(e) => setFormData(prev => ({ ...prev, base_salary: e.target.value }))}
                placeholder="0.00"
              />
            </div>
            
            <div className="space-y-2">
              <Label>Fecha de vigencia</Label>
              <Input
                type="date"
                value={formData.effective_date}
                onChange={(e) => setFormData(prev => ({ ...prev, effective_date: e.target.value }))}
              />
            </div>
            
            <div className="space-y-2">
              <Label>Notas (opcional)</Label>
              <Textarea
                value={formData.notes}
                onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                placeholder="Razón del ajuste..."
                rows={2}
              />
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSave} disabled={isSaving}>
              {isSaving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Guardar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* History Dialog */}
      <Dialog open={isHistoryOpen} onOpenChange={setIsHistoryOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <History className="w-5 h-5" />
              Historial de Salarios - {historyEmployee?.name}
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-3 py-4 max-h-[400px] overflow-y-auto">
            {salaries[historyEmployee?.id || '']?.map((salary, index) => (
              <div
                key={salary.id}
                className={`p-3 rounded-lg border ${index === 0 ? 'bg-primary/5 border-primary/20' : ''}`}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-lg">
                      {formatSalaryCurrency(salary.base_salary, salary.currency)}
                    </p>
                    <Badge variant="outline" className="mt-1">
                      {SALARY_TYPES[salary.salary_type]}
                    </Badge>
                  </div>
                  <div className="text-right text-sm text-muted-foreground">
                    <p>Desde {format(new Date(salary.effective_date), 'dd MMM yyyy', { locale: es })}</p>
                    {index === 0 && <Badge className="mt-1">Actual</Badge>}
                  </div>
                </div>
                {salary.notes && (
                  <p className="text-sm text-muted-foreground mt-2">{salary.notes}</p>
                )}
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
