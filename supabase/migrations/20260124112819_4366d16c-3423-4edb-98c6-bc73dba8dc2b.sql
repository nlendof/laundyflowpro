-- Create storage bucket for payment receipts
INSERT INTO storage.buckets (id, name, public)
VALUES ('payment-receipts', 'payment-receipts', false)
ON CONFLICT (id) DO NOTHING;

-- RLS policies for payment-receipts bucket
-- Allow authenticated users to upload their own receipts
CREATE POLICY "Users can upload payment receipts"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'payment-receipts');

-- Allow authenticated users to view their own receipts
CREATE POLICY "Users can view their own receipts"
ON storage.objects
FOR SELECT
TO authenticated
USING (bucket_id = 'payment-receipts');

-- Allow owners and technicians to view all receipts
CREATE POLICY "Owners can view all receipts"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'payment-receipts' 
  AND public.is_owner_or_technician(auth.uid())
);

-- Add receipt_url column to subscription_payments if not exists
ALTER TABLE public.subscription_payments
ADD COLUMN IF NOT EXISTS receipt_url TEXT,
ADD COLUMN IF NOT EXISTS receipt_uploaded_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS uploaded_by UUID REFERENCES auth.users(id),
ADD COLUMN IF NOT EXISTS admin_notes TEXT,
ADD COLUMN IF NOT EXISTS reviewed_by UUID REFERENCES auth.users(id),
ADD COLUMN IF NOT EXISTS reviewed_at TIMESTAMPTZ;