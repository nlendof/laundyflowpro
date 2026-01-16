-- Add branch_id to profiles for branch-specific assignments
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS branch_id uuid REFERENCES public.branches(id);

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_profiles_branch_id ON public.profiles(branch_id);

-- Create function to check if user is a branch admin
CREATE OR REPLACE FUNCTION public.is_branch_admin(_user_id uuid, _branch_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 
    FROM profiles p
    JOIN user_roles ur ON ur.user_id = p.id
    WHERE p.id = _user_id 
      AND p.branch_id = _branch_id
      AND ur.role = 'admin'
  )
$$;

-- Create function to get user's branch_id
CREATE OR REPLACE FUNCTION public.get_user_branch_id(_user_id uuid)
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT branch_id FROM profiles WHERE id = _user_id
$$;

-- Create function to check if user can access branch data
-- Returns true if: user is owner, OR user is admin of the laundry, OR user belongs to the branch
CREATE OR REPLACE FUNCTION public.can_access_branch(_user_id uuid, _branch_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    -- User is owner (can access all)
    SELECT 1 FROM user_roles WHERE user_id = _user_id AND role = 'owner'
  ) OR EXISTS (
    -- User is admin of the laundry that owns this branch
    SELECT 1 
    FROM branches b
    JOIN laundry_users lu ON lu.laundry_id = b.laundry_id
    JOIN user_roles ur ON ur.user_id = lu.user_id
    WHERE b.id = _branch_id 
      AND lu.user_id = _user_id
      AND ur.role = 'admin'
  ) OR EXISTS (
    -- User belongs to this specific branch
    SELECT 1 
    FROM profiles p
    WHERE p.id = _user_id 
      AND p.branch_id = _branch_id
  )
$$;

-- Update orders RLS to consider branch access
-- First drop existing policy
DROP POLICY IF EXISTS "Staff can manage orders of their laundry" ON public.orders;

-- Create new policy that considers branch access
CREATE POLICY "Staff can manage orders of their laundry" ON public.orders
FOR ALL
USING (
  -- Check laundry access
  ((laundry_id IS NULL) OR user_belongs_to_laundry(auth.uid(), laundry_id))
  AND (
    -- Owner can access all
    has_role(auth.uid(), 'owner')
    -- Admin of the laundry can access all branches
    OR is_admin(auth.uid())
    -- Staff roles can access their branch or laundry-wide if no branch assigned
    OR (
      (has_role(auth.uid(), 'cajero') OR has_role(auth.uid(), 'operador') OR has_role(auth.uid(), 'delivery'))
      AND (
        branch_id IS NULL 
        OR get_user_branch_id(auth.uid()) IS NULL 
        OR branch_id = get_user_branch_id(auth.uid())
      )
    )
  )
)
WITH CHECK (
  ((laundry_id IS NULL) OR user_belongs_to_laundry(auth.uid(), laundry_id))
  AND (
    has_role(auth.uid(), 'owner')
    OR is_admin(auth.uid())
    OR (
      (has_role(auth.uid(), 'cajero') OR has_role(auth.uid(), 'operador') OR has_role(auth.uid(), 'delivery'))
      AND (
        branch_id IS NULL 
        OR get_user_branch_id(auth.uid()) IS NULL 
        OR branch_id = get_user_branch_id(auth.uid())
      )
    )
  )
);