import { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { CashRegisterEntry, Expense } from '@/types';
import { useAuth } from './useAuth';
import { Tables, TablesInsert } from '@/integrations/supabase/types';
import { startOfDay, endOfDay } from 'date-fns';

type DbCashRegister = Tables<'cash_register'>;
type DbExpense = Tables<'expenses'>;
type DbCashClosing = Tables<'cash_closings'>;

export function useCashRegister() {
  const { user } = useAuth();
  const [entries, setEntries] = useState<CashRegisterEntry[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [openingBalance, setOpeningBalanceState] = useState(0);

  // Fetch entries for selected date
  const fetchEntries = useCallback(async () => {
    try {
      setLoading(true);
      const start = startOfDay(selectedDate).toISOString();
      const end = endOfDay(selectedDate).toISOString();

      const { data, error } = await supabase
        .from('cash_register')
        .select('*')
        .gte('created_at', start)
        .lte('created_at', end)
        .order('created_at', { ascending: false });

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
  }, [selectedDate]);

  // Fetch all expenses
  const fetchExpenses = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('expenses')
        .select('*')
        .order('expense_date', { ascending: false });

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
  }, []);

  // Fetch opening balance for the day
  const fetchOpeningBalance = useCallback(async () => {
    try {
      const dateStr = selectedDate.toISOString().split('T')[0];
      const { data } = await supabase
        .from('cash_closings')
        .select('expected_balance')
        .eq('closing_date', dateStr)
        .single();

      if (data) {
        setOpeningBalanceState(data.expected_balance);
      } else {
        // Get previous day's closing balance or default
        const prevDate = new Date(selectedDate);
        prevDate.setDate(prevDate.getDate() - 1);
        const prevDateStr = prevDate.toISOString().split('T')[0];
        
        const { data: prevData } = await supabase
          .from('cash_closings')
          .select('expected_balance')
          .eq('closing_date', prevDateStr)
          .single();

        setOpeningBalanceState(prevData?.expected_balance || 0);
      }
    } catch {
      setOpeningBalanceState(0);
    }
  }, [selectedDate]);

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
        });
      }

      await fetchEntries();
      toast.success(`${entryData.type === 'income' ? 'Ingreso' : 'Gasto'} registrado`);
    } catch (error) {
      console.error('Error adding entry:', error);
      toast.error('Error al registrar el movimiento');
    }
  }, [user, fetchEntries]);

  // Add expense
  const addExpense = useCallback(async (expenseData: Omit<Expense, 'id' | 'createdBy'>) => {
    try {
      const insert: TablesInsert<'expenses'> = {
        category: expenseData.category,
        amount: expenseData.amount,
        description: expenseData.description,
        expense_date: expenseData.date.toISOString().split('T')[0],
        created_by: user?.id,
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
      });

      await Promise.all([fetchEntries(), fetchExpenses()]);
      toast.success('Gasto operativo registrado');
    } catch (error) {
      console.error('Error adding expense:', error);
      toast.error('Error al registrar el gasto');
    }
  }, [user, fetchEntries, fetchExpenses]);

  // Set opening balance
  const setOpeningBalance = useCallback(async (balance: number) => {
    try {
      const dateStr = selectedDate.toISOString().split('T')[0];
      
      const { error } = await supabase
        .from('cash_closings')
        .upsert({
          closing_date: dateStr,
          opening_balance: balance,
          expected_balance: balance,
          total_income: 0,
          total_expense: 0,
          closed_by: user?.id,
        });

      if (error) throw error;

      setOpeningBalanceState(balance);
      toast.success('Saldo inicial actualizado');
    } catch (error) {
      console.error('Error setting opening balance:', error);
      toast.error('Error al establecer el saldo');
    }
  }, [selectedDate, user]);

  // Initial fetch
  useEffect(() => {
    fetchEntries();
    fetchExpenses();
    fetchOpeningBalance();
  }, [fetchEntries, fetchExpenses, fetchOpeningBalance]);

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
    fetchEntries,
    fetchExpenses,
  };
}
