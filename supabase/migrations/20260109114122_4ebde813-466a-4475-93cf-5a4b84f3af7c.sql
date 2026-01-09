-- Create table for employee loans/advances
CREATE TABLE public.employee_loans (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  employee_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  amount DECIMAL(10,2) NOT NULL,
  remaining_amount DECIMAL(10,2) NOT NULL,
  reason TEXT,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'paid', 'cancelled')),
  monthly_deduction DECIMAL(10,2), -- Optional fixed monthly deduction amount
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID REFERENCES public.profiles(id),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create table for loan payment records
CREATE TABLE public.loan_payments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  loan_id UUID NOT NULL REFERENCES public.employee_loans(id) ON DELETE CASCADE,
  payroll_id UUID REFERENCES public.payroll_records(id),
  amount DECIMAL(10,2) NOT NULL,
  payment_date DATE NOT NULL DEFAULT CURRENT_DATE,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.employee_loans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.loan_payments ENABLE ROW LEVEL SECURITY;

-- RLS Policies for employee_loans
CREATE POLICY "Admins can manage all loans"
ON public.employee_loans
FOR ALL
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Employees can view their own loans"
ON public.employee_loans
FOR SELECT
USING (employee_id = auth.uid());

-- RLS Policies for loan_payments
CREATE POLICY "Admins can manage all loan payments"
ON public.loan_payments
FOR ALL
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Employees can view their own loan payments"
ON public.loan_payments
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.employee_loans
    WHERE employee_loans.id = loan_payments.loan_id
    AND employee_loans.employee_id = auth.uid()
  )
);

-- Add trigger for updated_at
CREATE TRIGGER update_employee_loans_updated_at
BEFORE UPDATE ON public.employee_loans
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at();