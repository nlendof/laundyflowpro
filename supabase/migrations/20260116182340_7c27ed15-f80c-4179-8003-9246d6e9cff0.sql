-- MIGRACIÓN 3: Actualizar políticas RLS para multi-tenancy

-- Actualizar política de branches para filtrar por laundry_id
DROP POLICY IF EXISTS "Authenticated users can view branches" ON public.branches;
CREATE POLICY "Users can view branches of their laundry"
ON public.branches FOR SELECT
USING (
  laundry_id IS NULL -- datos legacy sin laundry
  OR public.user_belongs_to_laundry(auth.uid(), laundry_id)
);

-- Actualizar políticas de customers
DROP POLICY IF EXISTS "Admins and cajeros can manage customers" ON public.customers;
CREATE POLICY "Staff can manage customers of their laundry"
ON public.customers FOR ALL
USING (
  (laundry_id IS NULL OR public.user_belongs_to_laundry(auth.uid(), laundry_id))
  AND (is_admin(auth.uid()) OR has_role(auth.uid(), 'cajero'::app_role))
)
WITH CHECK (
  (laundry_id IS NULL OR public.user_belongs_to_laundry(auth.uid(), laundry_id))
  AND (is_admin(auth.uid()) OR has_role(auth.uid(), 'cajero'::app_role))
);

-- Actualizar políticas de orders
DROP POLICY IF EXISTS "Staff can manage orders" ON public.orders;
CREATE POLICY "Staff can manage orders of their laundry"
ON public.orders FOR ALL
USING (
  (laundry_id IS NULL OR public.user_belongs_to_laundry(auth.uid(), laundry_id))
  AND (is_admin(auth.uid()) OR has_role(auth.uid(), 'cajero'::app_role) OR has_role(auth.uid(), 'operador'::app_role) OR has_role(auth.uid(), 'delivery'::app_role))
)
WITH CHECK (
  (laundry_id IS NULL OR public.user_belongs_to_laundry(auth.uid(), laundry_id))
  AND (is_admin(auth.uid()) OR has_role(auth.uid(), 'cajero'::app_role) OR has_role(auth.uid(), 'operador'::app_role) OR has_role(auth.uid(), 'delivery'::app_role))
);

-- Actualizar políticas de inventory
DROP POLICY IF EXISTS "Admins and operators can manage inventory" ON public.inventory;
DROP POLICY IF EXISTS "Authenticated users can view inventory" ON public.inventory;

CREATE POLICY "Staff can manage inventory of their laundry"
ON public.inventory FOR ALL
USING (
  (laundry_id IS NULL OR public.user_belongs_to_laundry(auth.uid(), laundry_id))
  AND (is_admin(auth.uid()) OR has_role(auth.uid(), 'operador'::app_role))
);

CREATE POLICY "Users can view inventory of their laundry"
ON public.inventory FOR SELECT
USING (
  laundry_id IS NULL OR public.user_belongs_to_laundry(auth.uid(), laundry_id)
);

-- Actualizar políticas de catalog_services
DROP POLICY IF EXISTS "Anyone can view services" ON public.catalog_services;
DROP POLICY IF EXISTS "Admins can manage services" ON public.catalog_services;

CREATE POLICY "Users can view services of their laundry"
ON public.catalog_services FOR SELECT
USING (
  laundry_id IS NULL OR public.user_belongs_to_laundry(auth.uid(), laundry_id) OR is_customer(auth.uid())
);

CREATE POLICY "Admins can manage services of their laundry"
ON public.catalog_services FOR ALL
USING (
  (laundry_id IS NULL OR public.user_belongs_to_laundry(auth.uid(), laundry_id))
  AND is_admin(auth.uid())
);

-- Actualizar políticas de catalog_articles
DROP POLICY IF EXISTS "Anyone can view articles" ON public.catalog_articles;
DROP POLICY IF EXISTS "Admins can manage articles" ON public.catalog_articles;

CREATE POLICY "Users can view articles of their laundry"
ON public.catalog_articles FOR SELECT
USING (
  laundry_id IS NULL OR public.user_belongs_to_laundry(auth.uid(), laundry_id) OR is_customer(auth.uid())
);

CREATE POLICY "Admins can manage articles of their laundry"
ON public.catalog_articles FOR ALL
USING (
  (laundry_id IS NULL OR public.user_belongs_to_laundry(auth.uid(), laundry_id))
  AND is_admin(auth.uid())
);

-- Actualizar políticas de catalog_extras
DROP POLICY IF EXISTS "Anyone can view extras" ON public.catalog_extras;
DROP POLICY IF EXISTS "Admins can manage extras" ON public.catalog_extras;

CREATE POLICY "Users can view extras of their laundry"
ON public.catalog_extras FOR SELECT
USING (
  laundry_id IS NULL OR public.user_belongs_to_laundry(auth.uid(), laundry_id) OR is_customer(auth.uid())
);

CREATE POLICY "Admins can manage extras of their laundry"
ON public.catalog_extras FOR ALL
USING (
  (laundry_id IS NULL OR public.user_belongs_to_laundry(auth.uid(), laundry_id))
  AND is_admin(auth.uid())
);

-- Actualizar políticas de cash_register
DROP POLICY IF EXISTS "Admins and cajeros can manage cash register" ON public.cash_register;

CREATE POLICY "Staff can manage cash register of their laundry"
ON public.cash_register FOR ALL
USING (
  (laundry_id IS NULL OR public.user_belongs_to_laundry(auth.uid(), laundry_id))
  AND (is_admin(auth.uid()) OR has_role(auth.uid(), 'cajero'::app_role))
)
WITH CHECK (
  (laundry_id IS NULL OR public.user_belongs_to_laundry(auth.uid(), laundry_id))
  AND (is_admin(auth.uid()) OR has_role(auth.uid(), 'cajero'::app_role))
);

-- Actualizar políticas de system_config
DROP POLICY IF EXISTS "Anyone can view config" ON public.system_config;
DROP POLICY IF EXISTS "Admins can manage config" ON public.system_config;

CREATE POLICY "Users can view config of their laundry"
ON public.system_config FOR SELECT
USING (
  laundry_id IS NULL OR public.user_belongs_to_laundry(auth.uid(), laundry_id)
);

CREATE POLICY "Admins can manage config of their laundry"
ON public.system_config FOR ALL
USING (
  (laundry_id IS NULL OR public.user_belongs_to_laundry(auth.uid(), laundry_id))
  AND is_admin(auth.uid())
);