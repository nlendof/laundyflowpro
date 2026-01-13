-- Add nickname column to customers table
ALTER TABLE public.customers 
ADD COLUMN nickname text;

-- Add comment for documentation
COMMENT ON COLUMN public.customers.nickname IS 'Optional nickname/alias for the customer';