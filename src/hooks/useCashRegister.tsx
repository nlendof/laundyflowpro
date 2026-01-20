import { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { CashRegisterEntry, Expense } from '@/types';
import { useAuth } from './useAuth';
import { Tables, TablesInsert } from '@/integrations/supabase/types';
import { startOfDay, endOfDay, format } from 'date-fns';
import { useBranchFilter } from '@/contexts/LaundryContext';

type DbCashRegister = Tables<'cash_register'>;
type DbExpense = Tables<'expenses'>;
type DbCashClosing = Tables<'cash_closings'>;

export interface CashClosingData {
  id: string;
  closing_date: string;
  opening_balance: number;
  total_income: number;
  total_expense: number;
  expected_balance: number;
  actual_balance: number | null;
  difference: number | null;
  notes: string | null;
  created_at: string;
  closed_by: string | null;
}

export function useCashRegister() {
  const { user } = useAuth();
  const { laundryId } = useBranchFilter();
  const [entries, setEntries] = useState<CashRegisterEntry[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [openingBalance, setOpeningBalanceState] = useState(0);
  const [currentClosing, setCurrentClosing] = useState<CashClosingData | null>(null);

  // Fetch entries for selected date
  const fetchEntries = useCallback(async () => {
    try {
      setLoading(true);
      const start = startOfDay(selectedDate).toISOString();
      const end = endOfDay(selectedDate).toISOString();

      let query = supabase
        .from('cash_register')
        .select('*')
        .gte('created_at', start)
        .lte('created_at', end)
        .order('created_at', { ascending: false });

      if (laundryId) {
        query = query.eq('laundry_id', laundryId);
      }

      const { data, error } = await query;

      if (error) throw error;

      const mapped: CashRegisterEntry[] = (data || []).map(e => ({
        id: e.id,
        type: e.entry_type as 'income' | 'expense',
        category: e.category,
        amount: e.amount,
        description: e.description || '',
        orderId: e.order_id || undefined,
        createdAt: new Date(e.created_at || new Date()),
        createdBy: e.created_by || 'Sistema',
      }));

      setEntries(mapped);
    } catch (error) {
      console.error('Error fetching entries:', error);
      toast.error('Error al cargar los movimientos');
    } finally {
      setLoading(false);
    }
  }, [selectedDate, laundryId]);

  // Fetch all expenses
  const fetchExpenses = useCallback(async () => {
    try {
      let query = supabase
        .from('expenses')
        .select('*')
        .order('expense_date', { ascending: false });

      if (laundryId) {
        query = query.eq('laundry_id', laundryId);
      }

      const { data, error } = await query;

      if (error) throw error;

      const mapped: Expense[] = (data || []).map(e => ({
        id: e.id,
        category: e.category as Expense['category'],
        amount: e.amount,
        description: e.description || '',
        date: new Date(e.expense_date),
        createdBy: e.created_by || 'Sistema',
      }));

      setExpenses(mapped);
    } catch (error) {
      console.error('Error fetching expenses:', error);
    }
  }, [laundryId]);

  // Fetch closing for selected date
  const fetchClosing = useCallback(async () => {
    try {
      const dateStr = format(selectedDate, 'yyyy-MM-dd');
      let query = supabase
        .from('cash_closings')
        .select('*')
        .eq('closing_date', dateStr);

      if (laundryId) {
        query = query.eq('laundry_id', laundryId);
      }

      const { data, error } = await query.maybeSingle();

      if (error) throw error;

      setCurrentClosing(data);
      
      if (data) {
        setOpeningBalanceState(data.opening_balance);
      } else {
        // Get previous day's closing balance
        const prevDate = new Date(selectedDate);
        prevDate.setDate(prevDate.getDate() - 1);
        const prevDateStr = format(prevDate, 'yyyy-MM-dd');
        
        let prevQuery = supabase
          .from('cash_closings')
          .select('expected_balance, actual_balance')
          .eq('closing_date', prevDateStr);

        if (laundryId) {
          prevQuery = prevQuery.eq('laundry_id', laundryId);
        }

        const { data: prevData } = await prevQuery.maybeSingle();

        setOpeningBalanceState(prevData?.actual_balance ?? prevData?.expected_balance ?? 0);
      }
    } catch {
      setOpeningBalanceState(0);
      setCurrentClosing(null);
    }
  }, [selectedDate, laundryId]);

  // Calculate totals
  const totals = useMemo(() => {
    const income = entries
      .filter(e => e.type === 'income')
      .reduce((sum, e) => sum + e.amount, 0);

    const expense = entries
      .filter(e => e.type === 'expense')
      .reduce((sum, e) => sum + e.amount, 0);

    const balance = openingBalance + income - expense;

    return { income, expense, balance };
  }, [entries, openingBalance]);

  // Add entry
  const addEntry = useCallback(async (entryData: Omit<CashRegisterEntry, 'id' | 'createdAt' | 'createdBy'>) => {
    try {
      const insert: TablesInsert<'cash_register'> = {
        entry_type: entryData.type,
        category: entryData.category,
        amount: entryData.amount,
        description: entryData.description,
        order_id: entryData.orderId,
        created_by: user?.id,
        laundry_id: laundryId || undefined,
      };

      const { error } = await supabase.from('cash_register').insert(insert);
      if (error) throw error;

      // If it's an expense, also add to expenses table
      if (entryData.type === 'expense') {
        await supabase.from('expenses').insert({
          category: 'other',
          amount: entryData.amount,
          description: entryData.description,
          expense_date: new Date().toISOString().split('T')[0],
          created_by: user?.id,
          laundry_id: laundryId || undefined,
        });
      }

      await fetchEntries();
      toast.success(`${entryData.type === 'income' ? 'Ingreso' : 'Gasto'} registrado`);
    } catch (error) {
      console.error('Error adding entry:', error);
      toast.error('Error al registrar el movimiento');
    }
  }, [user, laundryId, fetchEntries]);

  // Add expense
  const addExpense = useCallback(async (expenseData: Omit<Expense, 'id' | 'createdBy'>) => {
    try {
      const insert: TablesInsert<'expenses'> = {
        category: expenseData.category,
        amount: expenseData.amount,
        description: expenseData.description,
        expense_date: format(expenseData.date, 'yyyy-MM-dd'),
        created_by: user?.id,
        laundry_id: laundryId || undefined,
      };

      const { error: expenseError } = await supabase.from('expenses').insert(insert);
      if (expenseError) throw expenseError;

      // Also add to cash register
      await supabase.from('cash_register').insert({
        entry_type: 'expense',
        category: expenseData.category,
        amount: expenseData.amount,
        description: expenseData.description,
        created_by: user?.id,
        laundry_id: laundryId || undefined,
      });

      await Promise.all([fetchEntries(), fetchExpenses()]);
      toast.success('Gasto operativo registrado');
    } catch (error) {
      console.error('Error adding expense:', error);
      toast.error('Error al registrar el gasto');
    }
  }, [user, laundryId, fetchEntries, fetchExpenses]);

  // Update expense
  const updateExpense = useCallback(async (id: string, expenseData: Partial<Expense>) => {
    try {
      const update: Partial<TablesInsert<'expenses'>> = {};
      
      if (expenseData.category) update.category = expenseData.category;
      if (expenseData.amount !== undefined) update.amount = expenseData.amount;
      if (expenseData.description !== undefined) update.description = expenseData.description;
      if (expenseData.date) update.expense_date = format(expenseData.date, 'yyyy-MM-dd');

      const { error } = await supabase.from('expenses').update(update).eq('id', id);
      if (error) throw error;

      await fetchExpenses();
      toast.success('Gasto actualizado');
    } catch (error) {
      console.error('Error updating expense:', error);
      toast.error('Error al actualizar el gasto');
    }
  }, [fetchExpenses]);

  // Delete expense
  const deleteExpense = useCallback(async (id: string) => {
    try {
      const { error } = await supabase.from('expenses').delete().eq('id', id);
      if (error) throw error;

      await fetchExpenses();
      toast.success('Gasto eliminado');
    } catch (error) {
      console.error('Error deleting expense:', error);
      toast.error('Error al eliminar el gasto');
    }
  }, [fetchExpenses]);

  // Set opening balance
  const setOpeningBalance = useCallback(async (balance: number) => {
    try {
      const dateStr = format(selectedDate, 'yyyy-MM-dd');
      
      const { error } = await supabase
        .from('cash_closings')
        .upsert({
          closing_date: dateStr,
          opening_balance: balance,
          expected_balance: balance + totals.income - totals.expense,
          total_income: totals.income,
          total_expense: totals.expense,
          closed_by: user?.id,
          laundry_id: laundryId || undefined,
        });

      if (error) throw error;

      setOpeningBalanceState(balance);
      await fetchClosing();
      toast.success('Saldo inicial actualizado');
    } catch (error) {
      console.error('Error setting opening balance:', error);
      toast.error('Error al establecer el saldo');
    }
  }, [selectedDate, user, laundryId, totals, fetchClosing]);

  // Close cash register
  const closeCashRegister = useCallback(async (data: { actualBalance: number; notes: string }) => {
    try {
      const dateStr = format(selectedDate, 'yyyy-MM-dd');
      const expectedBalance = openingBalance + totals.income - totals.expense;
      const difference = data.actualBalance - expectedBalance;
      
      const { error } = await supabase
        .from('cash_closings')
        .upsert({
          closing_date: dateStr,
          opening_balance: openingBalance,
          total_income: totals.income,
          total_expense: totals.expense,
          expected_balance: expectedBalance,
          actual_balance: data.actualBalance,
          difference: difference,
          notes: data.notes || null,
          closed_by: user?.id,
          laundry_id: laundryId || undefined,
        });

      if (error) throw error;

      await fetchClosing();
      toast.success('Caja cerrada correctamente');
    } catch (error) {
      console.error('Error closing cash register:', error);
      toast.error('Error al cerrar la caja');
    }
  }, [selectedDate, user, laundryId, openingBalance, totals, fetchClosing]);

  // Initial fetch
  useEffect(() => {
    fetchEntries();
    fetchExpenses();
    fetchClosing();
  }, [fetchEntries, fetchExpenses, fetchClosing]);

  // Real-time subscription for cash register changes
  useEffect(() => {
    const channel = supabase
      .channel('cash-register-realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'cash_register' },
        () => {
          fetchEntries();
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'expenses' },
        () => {
          fetchExpenses();
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'cash_closings' },
        () => {
          fetchClosing();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchEntries, fetchExpenses, fetchClosing]);

  return {
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
    fetchEntries,
    fetchExpenses,
  };
}
