-- Create customer_addresses table for multiple addresses with coordinates
CREATE TABLE IF NOT EXISTS public.customer_addresses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  label TEXT NOT NULL DEFAULT 'Casa',
  address TEXT NOT NULL,
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION,
  delivery_instructions TEXT,
  is_default BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create customer_profiles table for additional customer data
CREATE TABLE IF NOT EXISTS public.customer_profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  phone TEXT,
  avatar_url TEXT,
  delivery_notes TEXT,
  preferred_pickup_time TEXT,
  preferred_delivery_time TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.customer_addresses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customer_profiles ENABLE ROW LEVEL SECURITY;

-- RLS policies for customer_addresses
CREATE POLICY "Customers can view own addresses"
ON public.customer_addresses FOR SELECT
USING (auth.uid() = customer_id);

CREATE POLICY "Customers can insert own addresses"
ON public.customer_addresses FOR INSERT
WITH CHECK (auth.uid() = customer_id);

CREATE POLICY "Customers can update own addresses"
ON public.customer_addresses FOR UPDATE
USING (auth.uid() = customer_id);

CREATE POLICY "Customers can delete own addresses"
ON public.customer_addresses FOR DELETE
USING (auth.uid() = customer_id);

CREATE POLICY "Staff can view all addresses for delivery"
ON public.customer_addresses FOR SELECT
USING (
  is_admin(auth.uid()) OR 
  has_role(auth.uid(), 'delivery') OR 
  has_role(auth.uid(), 'cajero')
);

-- RLS policies for customer_profiles
CREATE POLICY "Customers can view own profile"
ON public.customer_profiles FOR SELECT
USING (auth.uid() = id);

CREATE POLICY "Customers can insert own profile"
ON public.customer_profiles FOR INSERT
WITH CHECK (auth.uid() = id);

CREATE POLICY "Customers can update own profile"
ON public.customer_profiles FOR UPDATE
USING (auth.uid() = id);

CREATE POLICY "Staff can view customer profiles"
ON public.customer_profiles FOR SELECT
USING (
  is_admin(auth.uid()) OR 
  has_role(auth.uid(), 'delivery') OR 
  has_role(auth.uid(), 'cajero')
);

-- Function to check if user is a customer
CREATE OR REPLACE FUNCTION public.is_customer(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = 'cliente'
  )
$$;

-- Add coordinates columns to orders for pickup/delivery locations
ALTER TABLE public.orders 
ADD COLUMN IF NOT EXISTS pickup_latitude DOUBLE PRECISION,
ADD COLUMN IF NOT EXISTS pickup_longitude DOUBLE PRECISION,
ADD COLUMN IF NOT EXISTS delivery_latitude DOUBLE PRECISION,
ADD COLUMN IF NOT EXISTS delivery_longitude DOUBLE PRECISION;

-- Update customers table to add user_id reference FIRST
ALTER TABLE public.customers
ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id);

-- Now create policies that reference user_id
CREATE POLICY "Customers can view own customer record"
ON public.customers FOR SELECT
USING (user_id = auth.uid());

CREATE POLICY "Customers can update own customer record"
ON public.customers FOR UPDATE
USING (user_id = auth.uid());

-- Update orders table to allow customers to view their own orders
CREATE POLICY "Customers can view own orders"
ON public.orders FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM customers c 
    WHERE c.id = orders.customer_id 
    AND c.user_id = auth.uid()
  )
);

-- Allow customers to create orders (pickup requests)
CREATE POLICY "Customers can create pickup orders"
ON public.orders FOR INSERT
WITH CHECK (has_role(auth.uid(), 'cliente'));