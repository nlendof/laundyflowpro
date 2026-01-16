-- MIGRACIÓN 1C: Funciones helper y políticas RLS

-- Función helper para verificar membresía a lavandería (evita recursión)
CREATE OR REPLACE FUNCTION public.user_belongs_to_laundry(_user_id UUID, _laundry_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.laundry_users
    WHERE user_id = _user_id AND laundry_id = _laundry_id
  )
$$;

-- Función helper para verificar si usuario es owner/admin de lavandería
CREATE OR REPLACE FUNCTION public.is_laundry_admin(_user_id UUID, _laundry_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.laundry_users lu
    JOIN public.user_roles ur ON ur.user_id = lu.user_id
    WHERE lu.user_id = _user_id 
    AND lu.laundry_id = _laundry_id
    AND ur.role IN ('owner', 'admin')
  )
$$;

-- Función helper para obtener laundry_id del usuario actual
CREATE OR REPLACE FUNCTION public.get_user_laundry_id()
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT laundry_id
  FROM public.laundry_users
  WHERE user_id = auth.uid()
  LIMIT 1
$$;

-- RLS para laundry_users
ALTER TABLE public.laundry_users ENABLE ROW LEVEL SECURITY;

-- Políticas RLS para laundries
CREATE POLICY "Users can view their laundries"
ON public.laundries FOR SELECT
USING (public.user_belongs_to_laundry(auth.uid(), id));

CREATE POLICY "Owners can update their laundry"
ON public.laundries FOR UPDATE
USING (public.is_laundry_admin(auth.uid(), id));

CREATE POLICY "System can insert laundries"
ON public.laundries FOR INSERT
WITH CHECK (true);

-- Políticas RLS para laundry_users
CREATE POLICY "Users can view their laundry memberships"
ON public.laundry_users FOR SELECT
USING (user_id = auth.uid() OR public.is_laundry_admin(auth.uid(), laundry_id));

-- Permitir primer usuario (creador) o admins existentes
CREATE POLICY "First user or admin can insert laundry users"
ON public.laundry_users FOR INSERT
WITH CHECK (
  public.is_laundry_admin(auth.uid(), laundry_id) 
  OR NOT EXISTS (SELECT 1 FROM public.laundry_users lu2 WHERE lu2.laundry_id = laundry_users.laundry_id)
);

CREATE POLICY "Owners can update laundry users"
ON public.laundry_users FOR UPDATE
USING (public.is_laundry_admin(auth.uid(), laundry_id));

CREATE POLICY "Owners can delete laundry users"
ON public.laundry_users FOR DELETE
USING (public.is_laundry_admin(auth.uid(), laundry_id));