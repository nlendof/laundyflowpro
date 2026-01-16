-- FIX 1: order_returns - Only staff can create returns, not any authenticated user
DROP POLICY IF EXISTS "Authenticated users can create returns" ON public.order_returns;

CREATE POLICY "Staff can create returns" 
ON public.order_returns 
FOR INSERT 
WITH CHECK (
  is_admin(auth.uid()) 
  OR has_role(auth.uid(), 'cajero'::app_role)
);

-- FIX 2: audit_logs - Only allow inserts via trigger (SECURITY DEFINER), not direct client access
DROP POLICY IF EXISTS "System can insert audit logs" ON public.audit_logs;

-- Create a more restrictive policy - only service role can insert
-- Regular users can't insert directly, only through triggers
CREATE POLICY "Only triggers can insert audit logs" 
ON public.audit_logs 
FOR INSERT 
WITH CHECK (
  -- This effectively prevents direct client inserts while allowing trigger inserts
  -- because triggers run with SECURITY DEFINER and bypass RLS
  false
);

-- FIX 3: Add policy for order_items to allow customers to view their own order items
CREATE POLICY "Customers can view own order items"
ON public.order_items
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.orders o
    JOIN public.customers c ON c.id = o.customer_id
    WHERE o.id = order_items.order_id
    AND c.user_id = auth.uid()
  )
);