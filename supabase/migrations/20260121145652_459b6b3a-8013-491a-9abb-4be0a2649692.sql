-- Create table to store deletion confirmation codes
CREATE TABLE public.deletion_confirmation_codes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  laundry_id UUID NOT NULL REFERENCES public.laundries(id) ON DELETE CASCADE,
  code VARCHAR(6) NOT NULL,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.deletion_confirmation_codes ENABLE ROW LEVEL SECURITY;

-- Only the service role should access this table (via edge function)
-- No user-facing policies needed since all access is through the edge function with service role key

-- Add index for faster lookups
CREATE INDEX idx_deletion_codes_lookup ON public.deletion_confirmation_codes(user_id, laundry_id);

-- Add cleanup function to remove expired codes
CREATE OR REPLACE FUNCTION public.cleanup_expired_deletion_codes()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  DELETE FROM public.deletion_confirmation_codes WHERE expires_at < now();
END;
$$;