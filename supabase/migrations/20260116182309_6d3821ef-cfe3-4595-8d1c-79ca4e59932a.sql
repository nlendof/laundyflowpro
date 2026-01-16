-- MIGRACIÓN 2: Agregar laundry_id a tablas principales

-- Agregar laundry_id a branches (sucursales pertenecen a una lavandería)
ALTER TABLE public.branches ADD COLUMN IF NOT EXISTS laundry_id UUID REFERENCES public.laundries(id) ON DELETE CASCADE;
CREATE INDEX IF NOT EXISTS idx_branches_laundry ON public.branches(laundry_id);

-- Agregar laundry_id a customers
ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS laundry_id UUID REFERENCES public.laundries(id) ON DELETE CASCADE;
CREATE INDEX IF NOT EXISTS idx_customers_laundry ON public.customers(laundry_id);

-- Agregar laundry_id a orders
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS laundry_id UUID REFERENCES public.laundries(id) ON DELETE CASCADE;
CREATE INDEX IF NOT EXISTS idx_orders_laundry ON public.orders(laundry_id);

-- Agregar laundry_id a inventory
ALTER TABLE public.inventory ADD COLUMN IF NOT EXISTS laundry_id UUID REFERENCES public.laundries(id) ON DELETE CASCADE;
CREATE INDEX IF NOT EXISTS idx_inventory_laundry ON public.inventory(laundry_id);

-- Agregar laundry_id a catalog_services
ALTER TABLE public.catalog_services ADD COLUMN IF NOT EXISTS laundry_id UUID REFERENCES public.laundries(id) ON DELETE CASCADE;
CREATE INDEX IF NOT EXISTS idx_catalog_services_laundry ON public.catalog_services(laundry_id);

-- Agregar laundry_id a catalog_articles
ALTER TABLE public.catalog_articles ADD COLUMN IF NOT EXISTS laundry_id UUID REFERENCES public.laundries(id) ON DELETE CASCADE;
CREATE INDEX IF NOT EXISTS idx_catalog_articles_laundry ON public.catalog_articles(laundry_id);

-- Agregar laundry_id a catalog_extras
ALTER TABLE public.catalog_extras ADD COLUMN IF NOT EXISTS laundry_id UUID REFERENCES public.laundries(id) ON DELETE CASCADE;
CREATE INDEX IF NOT EXISTS idx_catalog_extras_laundry ON public.catalog_extras(laundry_id);

-- Agregar laundry_id a cash_register
ALTER TABLE public.cash_register ADD COLUMN IF NOT EXISTS laundry_id UUID REFERENCES public.laundries(id) ON DELETE CASCADE;
CREATE INDEX IF NOT EXISTS idx_cash_register_laundry ON public.cash_register(laundry_id);

-- Agregar laundry_id a cash_closings
ALTER TABLE public.cash_closings ADD COLUMN IF NOT EXISTS laundry_id UUID REFERENCES public.laundries(id) ON DELETE CASCADE;
CREATE INDEX IF NOT EXISTS idx_cash_closings_laundry ON public.cash_closings(laundry_id);

-- Agregar laundry_id a expenses
ALTER TABLE public.expenses ADD COLUMN IF NOT EXISTS laundry_id UUID REFERENCES public.laundries(id) ON DELETE CASCADE;
CREATE INDEX IF NOT EXISTS idx_expenses_laundry ON public.expenses(laundry_id);

-- Agregar laundry_id a purchases
ALTER TABLE public.purchases ADD COLUMN IF NOT EXISTS laundry_id UUID REFERENCES public.laundries(id) ON DELETE CASCADE;
CREATE INDEX IF NOT EXISTS idx_purchases_laundry ON public.purchases(laundry_id);

-- Agregar laundry_id a system_config (configuración por lavandería)
ALTER TABLE public.system_config ADD COLUMN IF NOT EXISTS laundry_id UUID REFERENCES public.laundries(id) ON DELETE CASCADE;
CREATE INDEX IF NOT EXISTS idx_system_config_laundry ON public.system_config(laundry_id);

-- Agregar laundry_id a admin_discount_codes
ALTER TABLE public.admin_discount_codes ADD COLUMN IF NOT EXISTS laundry_id UUID REFERENCES public.laundries(id) ON DELETE CASCADE;
CREATE INDEX IF NOT EXISTS idx_admin_discount_codes_laundry ON public.admin_discount_codes(laundry_id);

-- Agregar laundry_id a profiles (empleados pertenecen a una lavandería)
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS laundry_id UUID REFERENCES public.laundries(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_profiles_laundry ON public.profiles(laundry_id);

-- Agregar laundry_id a employee_salaries
ALTER TABLE public.employee_salaries ADD COLUMN IF NOT EXISTS laundry_id UUID REFERENCES public.laundries(id) ON DELETE CASCADE;
CREATE INDEX IF NOT EXISTS idx_employee_salaries_laundry ON public.employee_salaries(laundry_id);

-- Agregar laundry_id a employee_loans
ALTER TABLE public.employee_loans ADD COLUMN IF NOT EXISTS laundry_id UUID REFERENCES public.laundries(id) ON DELETE CASCADE;
CREATE INDEX IF NOT EXISTS idx_employee_loans_laundry ON public.employee_loans(laundry_id);

-- Agregar laundry_id a payroll_records
ALTER TABLE public.payroll_records ADD COLUMN IF NOT EXISTS laundry_id UUID REFERENCES public.laundries(id) ON DELETE CASCADE;
CREATE INDEX IF NOT EXISTS idx_payroll_records_laundry ON public.payroll_records(laundry_id);

-- Agregar laundry_id a attendance_records
ALTER TABLE public.attendance_records ADD COLUMN IF NOT EXISTS laundry_id UUID REFERENCES public.laundries(id) ON DELETE CASCADE;
CREATE INDEX IF NOT EXISTS idx_attendance_records_laundry ON public.attendance_records(laundry_id);

-- Agregar laundry_id a work_schedules
ALTER TABLE public.work_schedules ADD COLUMN IF NOT EXISTS laundry_id UUID REFERENCES public.laundries(id) ON DELETE CASCADE;
CREATE INDEX IF NOT EXISTS idx_work_schedules_laundry ON public.work_schedules(laundry_id);

-- Agregar laundry_id a time_off_requests
ALTER TABLE public.time_off_requests ADD COLUMN IF NOT EXISTS laundry_id UUID REFERENCES public.laundries(id) ON DELETE CASCADE;
CREATE INDEX IF NOT EXISTS idx_time_off_requests_laundry ON public.time_off_requests(laundry_id);

-- Agregar laundry_id a order_returns
ALTER TABLE public.order_returns ADD COLUMN IF NOT EXISTS laundry_id UUID REFERENCES public.laundries(id) ON DELETE CASCADE;
CREATE INDEX IF NOT EXISTS idx_order_returns_laundry ON public.order_returns(laundry_id);

-- Agregar laundry_id a backup_schedules (backups por lavandería)
ALTER TABLE public.backup_schedules ADD COLUMN IF NOT EXISTS laundry_id UUID REFERENCES public.laundries(id) ON DELETE CASCADE;
CREATE INDEX IF NOT EXISTS idx_backup_schedules_laundry ON public.backup_schedules(laundry_id);

-- Agregar laundry_id a backup_history
ALTER TABLE public.backup_history ADD COLUMN IF NOT EXISTS laundry_id UUID REFERENCES public.laundries(id) ON DELETE CASCADE;
CREATE INDEX IF NOT EXISTS idx_backup_history_laundry ON public.backup_history(laundry_id);

-- Agregar laundry_id a audit_logs
ALTER TABLE public.audit_logs ADD COLUMN IF NOT EXISTS laundry_id UUID REFERENCES public.laundries(id) ON DELETE CASCADE;
CREATE INDEX IF NOT EXISTS idx_audit_logs_laundry ON public.audit_logs(laundry_id);