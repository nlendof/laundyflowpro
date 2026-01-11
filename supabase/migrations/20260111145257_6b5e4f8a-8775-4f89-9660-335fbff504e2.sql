-- Add branch support for multi-location businesses
CREATE TABLE IF NOT EXISTS public.branches (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  code VARCHAR(10) NOT NULL UNIQUE,
  name VARCHAR(255) NOT NULL,
  address TEXT,
  phone VARCHAR(50),
  is_active BOOLEAN DEFAULT true,
  is_main BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.branches ENABLE ROW LEVEL SECURITY;

-- Create policies for branches (all authenticated can read, admin can write)
CREATE POLICY "Authenticated users can view branches"
  ON public.branches FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins can insert branches"
  ON public.branches FOR INSERT
  TO authenticated
  WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY "Admins can update branches"
  ON public.branches FOR UPDATE
  TO authenticated
  USING (public.is_admin(auth.uid()));

CREATE POLICY "Admins can delete branches"
  ON public.branches FOR DELETE
  TO authenticated
  USING (public.is_admin(auth.uid()));

-- Insert default main branch
INSERT INTO public.branches (code, name, is_main, is_active)
VALUES ('LC1', 'Sucursal Principal', true, true)
ON CONFLICT (code) DO NOTHING;

-- Add branch_id to orders table
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS branch_id UUID REFERENCES public.branches(id);

-- Update existing orders to use main branch
UPDATE public.orders SET branch_id = (SELECT id FROM public.branches WHERE is_main = true LIMIT 1) WHERE branch_id IS NULL;

-- Add admin_discount_codes table for admin approval of discounts
CREATE TABLE IF NOT EXISTS public.admin_discount_codes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  admin_id UUID NOT NULL REFERENCES public.profiles(id),
  code VARCHAR(10) NOT NULL,
  is_active BOOLEAN DEFAULT true,
  uses_remaining INTEGER DEFAULT 1,
  expires_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.admin_discount_codes ENABLE ROW LEVEL SECURITY;

-- Only admins can manage discount codes, authenticated users can verify them
CREATE POLICY "Admins can manage discount codes"
  ON public.admin_discount_codes FOR ALL
  TO authenticated
  USING (public.is_admin(auth.uid()));

CREATE POLICY "Authenticated users can verify codes"
  ON public.admin_discount_codes FOR SELECT
  TO authenticated
  USING (true);

-- Add returns/refunds table
CREATE TABLE IF NOT EXISTS public.order_returns (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  order_id UUID NOT NULL REFERENCES public.orders(id),
  reason TEXT NOT NULL,
  refund_amount NUMERIC(10,2) NOT NULL DEFAULT 0,
  refund_method VARCHAR(50),
  status VARCHAR(20) DEFAULT 'pending',
  processed_by UUID REFERENCES public.profiles(id),
  processed_at TIMESTAMP WITH TIME ZONE,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.order_returns ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view returns"
  ON public.order_returns FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can create returns"
  ON public.order_returns FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Admins can update returns"
  ON public.order_returns FOR UPDATE
  TO authenticated
  USING (public.is_admin(auth.uid()));

-- Update employee_loans table to support weekly deductions
ALTER TABLE public.employee_loans ADD COLUMN IF NOT EXISTS deduction_frequency VARCHAR(20) DEFAULT 'monthly';
ALTER TABLE public.employee_loans ADD COLUMN IF NOT EXISTS weekly_deduction NUMERIC(10,2);

-- Update ticket code generation function to include branch code
CREATE OR REPLACE FUNCTION public.generate_ticket_code()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  new_code TEXT;
  year_part TEXT;
  sequence_num INTEGER;
  max_attempts INTEGER := 10;
  attempt INTEGER := 0;
  branch_code TEXT := 'LC1';
BEGIN
  -- Only generate if ticket_code is TEMP or NULL
  IF NEW.ticket_code IS NULL OR NEW.ticket_code = 'TEMP' THEN
    year_part := to_char(now(), 'YYYY');
    
    -- Get branch code if branch_id is provided
    IF NEW.branch_id IS NOT NULL THEN
      SELECT code INTO branch_code FROM public.branches WHERE id = NEW.branch_id;
    ELSE
      -- Get default branch code
      SELECT code INTO branch_code FROM public.branches WHERE is_main = true LIMIT 1;
      IF branch_code IS NULL THEN
        branch_code := 'LC1';
      END IF;
    END IF;
    
    LOOP
      attempt := attempt + 1;
      
      -- Get next sequence number for this branch and year
      SELECT COALESCE(MAX(
        CAST(NULLIF(SUBSTRING(ticket_code FROM branch_code || '-' || year_part || '-(\d+)'), '') AS INTEGER)
      ), 0) + 1
      INTO sequence_num
      FROM orders
      WHERE ticket_code LIKE branch_code || '-' || year_part || '-%'
        AND ticket_code != 'TEMP';
      
      new_code := branch_code || '-' || year_part || '-' || LPAD(sequence_num::TEXT, 3, '0');
      
      -- Check if this code already exists
      IF NOT EXISTS (SELECT 1 FROM orders WHERE ticket_code = new_code) THEN
        NEW.ticket_code := new_code;
        NEW.qr_code := 'qr_' || LOWER(REPLACE(new_code, '-', '_'));
        EXIT;
      END IF;
      
      -- If max attempts reached, use UUID suffix to guarantee uniqueness
      IF attempt >= max_attempts THEN
        NEW.ticket_code := branch_code || '-' || year_part || '-' || LPAD(sequence_num::TEXT, 3, '0') || '-' || SUBSTRING(gen_random_uuid()::text, 1, 4);
        NEW.qr_code := 'qr_' || LOWER(REPLACE(NEW.ticket_code, '-', '_'));
        EXIT;
      END IF;
      
      -- Increment sequence for next attempt
      sequence_num := sequence_num + 1;
    END LOOP;
  END IF;
  
  RETURN NEW;
END;
$function$;