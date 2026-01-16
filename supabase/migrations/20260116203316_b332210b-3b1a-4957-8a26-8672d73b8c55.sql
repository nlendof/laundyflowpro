-- Drop existing policies for branches if they exist
DROP POLICY IF EXISTS "Branches viewable by laundry members" ON public.branches;
DROP POLICY IF EXISTS "Branches manageable by laundry admins" ON public.branches;

-- Create policy for viewing branches
CREATE POLICY "Branches viewable by laundry members"
ON public.branches
FOR SELECT
USING (
  public.user_belongs_to_laundry(auth.uid(), laundry_id)
  OR public.has_role(auth.uid(), 'owner')
);

-- Create policy for inserting branches (owners and admins of the laundry)
CREATE POLICY "Branches insertable by owners and admins"
ON public.branches
FOR INSERT
WITH CHECK (
  public.is_laundry_admin(auth.uid(), laundry_id)
  OR public.has_role(auth.uid(), 'owner')
);

-- Create policy for updating branches
CREATE POLICY "Branches updatable by owners and admins"
ON public.branches
FOR UPDATE
USING (
  public.is_laundry_admin(auth.uid(), laundry_id)
  OR public.has_role(auth.uid(), 'owner')
);

-- Create policy for deleting branches
CREATE POLICY "Branches deletable by owners and admins"
ON public.branches
FOR DELETE
USING (
  public.is_laundry_admin(auth.uid(), laundry_id)
  OR public.has_role(auth.uid(), 'owner')
);