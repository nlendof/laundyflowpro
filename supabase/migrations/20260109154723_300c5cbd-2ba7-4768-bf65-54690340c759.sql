-- Fix profiles RLS: Users can only view their own profile, admins can view all
DROP POLICY IF EXISTS "Users can view all profiles" ON public.profiles;
CREATE POLICY "Users can view own profile or admins view all" 
  ON public.profiles 
  FOR SELECT 
  TO authenticated 
  USING (auth.uid() = id OR is_admin(auth.uid()));

-- Fix customers RLS: Only admins and cajeros can manage customers
DROP POLICY IF EXISTS "Authenticated users can manage customers" ON public.customers;
CREATE POLICY "Admins and cajeros can manage customers" 
  ON public.customers 
  FOR ALL 
  TO authenticated 
  USING (is_admin(auth.uid()) OR has_role(auth.uid(), 'cajero'::app_role))
  WITH CHECK (is_admin(auth.uid()) OR has_role(auth.uid(), 'cajero'::app_role));

-- Fix orders RLS: Only admins, cajeros, and operadores can manage orders
DROP POLICY IF EXISTS "Authenticated users can manage orders" ON public.orders;
CREATE POLICY "Staff can manage orders" 
  ON public.orders 
  FOR ALL 
  TO authenticated 
  USING (is_admin(auth.uid()) OR has_role(auth.uid(), 'cajero'::app_role) OR has_role(auth.uid(), 'operador'::app_role) OR has_role(auth.uid(), 'delivery'::app_role))
  WITH CHECK (is_admin(auth.uid()) OR has_role(auth.uid(), 'cajero'::app_role) OR has_role(auth.uid(), 'operador'::app_role) OR has_role(auth.uid(), 'delivery'::app_role));

-- Fix order_items RLS: Same as orders
DROP POLICY IF EXISTS "Authenticated users can manage order items" ON public.order_items;
CREATE POLICY "Staff can manage order items" 
  ON public.order_items 
  FOR ALL 
  TO authenticated 
  USING (is_admin(auth.uid()) OR has_role(auth.uid(), 'cajero'::app_role) OR has_role(auth.uid(), 'operador'::app_role) OR has_role(auth.uid(), 'delivery'::app_role))
  WITH CHECK (is_admin(auth.uid()) OR has_role(auth.uid(), 'cajero'::app_role) OR has_role(auth.uid(), 'operador'::app_role) OR has_role(auth.uid(), 'delivery'::app_role));

-- Fix inventory_movements RLS: Only admins and operadores can manage
DROP POLICY IF EXISTS "Authenticated users can manage inventory movements" ON public.inventory_movements;
CREATE POLICY "Admins and operators can manage inventory movements" 
  ON public.inventory_movements 
  FOR ALL 
  TO authenticated 
  USING (is_admin(auth.uid()) OR has_role(auth.uid(), 'operador'::app_role))
  WITH CHECK (is_admin(auth.uid()) OR has_role(auth.uid(), 'operador'::app_role));

-- Fix cash_register RLS: Only admins and cajeros can manage
DROP POLICY IF EXISTS "Authenticated users can manage cash register" ON public.cash_register;
CREATE POLICY "Admins and cajeros can manage cash register" 
  ON public.cash_register 
  FOR ALL 
  TO authenticated 
  USING (is_admin(auth.uid()) OR has_role(auth.uid(), 'cajero'::app_role))
  WITH CHECK (is_admin(auth.uid()) OR has_role(auth.uid(), 'cajero'::app_role));