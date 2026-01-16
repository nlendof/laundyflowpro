-- Update RLS policies for branches - ONLY owners can create/update/delete
DROP POLICY IF EXISTS "Branches insertable by owners and admins" ON public.branches;
DROP POLICY IF EXISTS "Branches updatable by owners and admins" ON public.branches;
DROP POLICY IF EXISTS "Branches deletable by owners and admins" ON public.branches;

-- Insert: ONLY owners can create branches
CREATE POLICY "Branches insertable by owners only"
ON public.branches
FOR INSERT
WITH CHECK (
  laundry_id IS NOT NULL
  AND public.has_role(auth.uid(), 'owner')
);

-- Update: ONLY owners can update branches
CREATE POLICY "Branches updatable by owners only"
ON public.branches
FOR UPDATE
USING (public.has_role(auth.uid(), 'owner'))
WITH CHECK (
  laundry_id IS NOT NULL
  AND public.has_role(auth.uid(), 'owner')
);

-- Delete: ONLY owners can delete branches
CREATE POLICY "Branches deletable by owners only"
ON public.branches
FOR DELETE
USING (public.has_role(auth.uid(), 'owner'));

-- Update RLS policies for laundries - ONLY owners can create/update/delete
DROP POLICY IF EXISTS "Laundries insertable by owners" ON public.laundries;
DROP POLICY IF EXISTS "Laundries updatable by admins" ON public.laundries;
DROP POLICY IF EXISTS "Laundries deletable by owners" ON public.laundries;

-- Insert: ONLY owners can create laundries
CREATE POLICY "Laundries insertable by owners only"
ON public.laundries
FOR INSERT
WITH CHECK (public.has_role(auth.uid(), 'owner'));

-- Update: ONLY owners can update laundries
CREATE POLICY "Laundries updatable by owners only"
ON public.laundries
FOR UPDATE
USING (public.has_role(auth.uid(), 'owner'));

-- Delete: ONLY owners can delete laundries
CREATE POLICY "Laundries deletable by owners only"
ON public.laundries
FOR DELETE
USING (public.has_role(auth.uid(), 'owner'));