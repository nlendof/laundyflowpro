-- Tabla para información salarial de empleados
CREATE TABLE public.employee_salaries (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  salary_type TEXT NOT NULL DEFAULT 'monthly' CHECK (salary_type IN ('monthly', 'biweekly', 'weekly', 'hourly')),
  base_salary NUMERIC NOT NULL DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'MXN',
  effective_date DATE NOT NULL DEFAULT CURRENT_DATE,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  created_by UUID REFERENCES auth.users(id)
);

-- Tabla para registros de pago de nómina
CREATE TABLE public.payroll_records (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  base_amount NUMERIC NOT NULL DEFAULT 0,
  bonuses NUMERIC NOT NULL DEFAULT 0,
  deductions NUMERIC NOT NULL DEFAULT 0,
  overtime_hours NUMERIC NOT NULL DEFAULT 0,
  overtime_amount NUMERIC NOT NULL DEFAULT 0,
  total_amount NUMERIC NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'paid', 'cancelled')),
  payment_date DATE,
  payment_method TEXT,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  created_by UUID REFERENCES auth.users(id),
  approved_by UUID REFERENCES auth.users(id),
  approved_at TIMESTAMP WITH TIME ZONE
);

-- Tabla para bonificaciones y deducciones
CREATE TABLE public.payroll_adjustments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  payroll_id UUID NOT NULL REFERENCES public.payroll_records(id) ON DELETE CASCADE,
  adjustment_type TEXT NOT NULL CHECK (adjustment_type IN ('bonus', 'deduction')),
  category TEXT NOT NULL,
  description TEXT,
  amount NUMERIC NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Tabla para horarios de trabajo
CREATE TABLE public.work_schedules (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  day_of_week INTEGER NOT NULL CHECK (day_of_week BETWEEN 0 AND 6),
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(user_id, day_of_week)
);

-- Tabla para registro de asistencia
CREATE TABLE public.attendance_records (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  check_in TIMESTAMP WITH TIME ZONE,
  check_out TIMESTAMP WITH TIME ZONE,
  status TEXT NOT NULL DEFAULT 'present' CHECK (status IN ('present', 'absent', 'late', 'half_day', 'vacation', 'sick_leave')),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(user_id, date)
);

-- Tabla para vacaciones y permisos
CREATE TABLE public.time_off_requests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  request_type TEXT NOT NULL CHECK (request_type IN ('vacation', 'sick_leave', 'personal', 'other')),
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'cancelled')),
  reason TEXT,
  response_notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  approved_by UUID REFERENCES auth.users(id),
  approved_at TIMESTAMP WITH TIME ZONE
);

-- Habilitar RLS
ALTER TABLE public.employee_salaries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payroll_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payroll_adjustments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.work_schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendance_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.time_off_requests ENABLE ROW LEVEL SECURITY;

-- Políticas RLS para employee_salaries
CREATE POLICY "Admins can manage salaries" ON public.employee_salaries FOR ALL TO authenticated
USING (public.is_admin(auth.uid()));

CREATE POLICY "Users can view own salary" ON public.employee_salaries FOR SELECT TO authenticated
USING (auth.uid() = user_id);

-- Políticas RLS para payroll_records
CREATE POLICY "Admins can manage payroll" ON public.payroll_records FOR ALL TO authenticated
USING (public.is_admin(auth.uid()));

CREATE POLICY "Users can view own payroll" ON public.payroll_records FOR SELECT TO authenticated
USING (auth.uid() = user_id);

-- Políticas RLS para payroll_adjustments
CREATE POLICY "Admins can manage adjustments" ON public.payroll_adjustments FOR ALL TO authenticated
USING (public.is_admin(auth.uid()));

CREATE POLICY "Users can view own adjustments" ON public.payroll_adjustments FOR SELECT TO authenticated
USING (EXISTS (SELECT 1 FROM public.payroll_records pr WHERE pr.id = payroll_id AND pr.user_id = auth.uid()));

-- Políticas RLS para work_schedules
CREATE POLICY "Admins can manage schedules" ON public.work_schedules FOR ALL TO authenticated
USING (public.is_admin(auth.uid()));

CREATE POLICY "Authenticated users can view schedules" ON public.work_schedules FOR SELECT TO authenticated
USING (true);

-- Políticas RLS para attendance_records
CREATE POLICY "Admins can manage attendance" ON public.attendance_records FOR ALL TO authenticated
USING (public.is_admin(auth.uid()));

CREATE POLICY "Users can view own attendance" ON public.attendance_records FOR SELECT TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own attendance" ON public.attendance_records FOR INSERT TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own attendance" ON public.attendance_records FOR UPDATE TO authenticated
USING (auth.uid() = user_id AND check_out IS NULL);

-- Políticas RLS para time_off_requests
CREATE POLICY "Admins can manage time off" ON public.time_off_requests FOR ALL TO authenticated
USING (public.is_admin(auth.uid()));

CREATE POLICY "Users can view own requests" ON public.time_off_requests FOR SELECT TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can create own requests" ON public.time_off_requests FOR INSERT TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update pending requests" ON public.time_off_requests FOR UPDATE TO authenticated
USING (auth.uid() = user_id AND status = 'pending');

-- Trigger para actualizar updated_at en work_schedules
CREATE TRIGGER update_work_schedules_updated_at
BEFORE UPDATE ON public.work_schedules
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at();