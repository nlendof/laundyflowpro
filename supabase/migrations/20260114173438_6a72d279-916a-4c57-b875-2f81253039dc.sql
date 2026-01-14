-- Add discount type and value columns to admin_discount_codes
ALTER TABLE public.admin_discount_codes 
ADD COLUMN IF NOT EXISTS discount_type TEXT DEFAULT 'percentage' CHECK (discount_type IN ('percentage', 'fixed')),
ADD COLUMN IF NOT EXISTS discount_value NUMERIC DEFAULT 0;