-- Ajuste de RLS en profiles para que el propietario/administradores de lavandería puedan ver y editar perfiles

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- SELECT: antes solo permitía (self) o (admin global). Ahora permite:
-- - ver su propio perfil
-- - ver perfiles de su lavandería si es admin/owner de esa lavandería
-- - owner global puede ver todos
DROP POLICY IF EXISTS "Users can view own profile or admins view all" ON public.profiles;
CREATE POLICY "Users can view own profile or laundry admins"
ON public.profiles
FOR SELECT
TO authenticated
USING (
  auth.uid() = id
  OR is_laundry_admin(auth.uid(), laundry_id)
  OR has_role(auth.uid(), 'owner'::app_role)
);

-- UPDATE: permitir que owner/admin de la lavandería edite perfiles (p.ej. asignar sucursal)
DROP POLICY IF EXISTS "Admins can update any profile" ON public.profiles;
CREATE POLICY "Laundry admins can update profiles"
ON public.profiles
FOR UPDATE
TO authenticated
USING (
  is_laundry_admin(auth.uid(), laundry_id)
  OR has_role(auth.uid(), 'owner'::app_role)
)
WITH CHECK (
  is_laundry_admin(auth.uid(), laundry_id)
  OR has_role(auth.uid(), 'owner'::app_role)
);
