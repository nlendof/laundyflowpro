-- Add discount_amount column to orders table
ALTER TABLE public.orders 
ADD COLUMN discount_amount numeric DEFAULT 0;

-- Add comment for documentation
COMMENT ON COLUMN public.orders.discount_amount IS 'Discount amount applied to the order (in currency units, not percentage)';