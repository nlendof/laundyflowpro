-- Tighten and re-create RLS policies for branches to ensure laundry_id is always enforced
DROP POLICY IF EXISTS "Branches viewable by laundry members" ON public.branches;
DROP POLICY IF EXISTS "Branches insertable by owners and admins" ON public.branches;
DROP POLICY IF EXISTS "Branches updatable by owners and admins" ON public.branches;
DROP POLICY IF EXISTS "Branches deletable by owners and admins" ON public.branches;

-- View: members of the laundry can view, and platform owners can view all
CREATE POLICY "Branches viewable by laundry members"
ON public.branches
FOR SELECT
USING (
  public.user_belongs_to_laundry(auth.uid(), laundry_id)
  OR public.has_role(auth.uid(), 'owner')
);

-- Insert: must target a specific laundry_id; allowed for laundry admins/owners
CREATE POLICY "Branches insertable by owners and admins"
ON public.branches
FOR INSERT
WITH CHECK (
  laundry_id IS NOT NULL
  AND (
    public.is_laundry_admin(auth.uid(), laundry_id)
    OR public.has_role(auth.uid(), 'owner')
  )
);

-- Update: only admins/owners of the laundry; prevent moving rows across laundries
CREATE POLICY "Branches updatable by owners and admins"
ON public.branches
FOR UPDATE
USING (
  public.is_laundry_admin(auth.uid(), laundry_id)
  OR public.has_role(auth.uid(), 'owner')
)
WITH CHECK (
  laundry_id IS NOT NULL
  AND (
    public.is_laundry_admin(auth.uid(), laundry_id)
    OR public.has_role(auth.uid(), 'owner')
  )
);

-- Delete: only admins/owners of the laundry
CREATE POLICY "Branches deletable by owners and admins"
ON public.branches
FOR DELETE
USING (
  public.is_laundry_admin(auth.uid(), laundry_id)
  OR public.has_role(auth.uid(), 'owner')
);