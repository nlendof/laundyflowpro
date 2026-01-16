-- Drop the global unique constraint on code
ALTER TABLE public.branches DROP CONSTRAINT IF EXISTS branches_code_key;

-- Add a unique constraint on (laundry_id, code) so codes are unique per laundry
ALTER TABLE public.branches ADD CONSTRAINT branches_laundry_code_unique UNIQUE (laundry_id, code);