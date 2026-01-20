-- Create a function to check if a user is owner or technician (both have full access)
CREATE OR REPLACE FUNCTION public.is_owner_or_technician(_user_id uuid)
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
      AND role IN ('owner', 'technician')
  )
$$;

-- Create a function to check if user is a general admin (admin without branch_id)
CREATE OR REPLACE FUNCTION public.is_general_admin(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles ur
    JOIN public.profiles p ON p.id = ur.user_id
    WHERE ur.user_id = _user_id
      AND ur.role = 'admin'
      AND p.branch_id IS NULL
  )
$$;

-- Create a function to check if user is a branch admin (admin with branch_id)
CREATE OR REPLACE FUNCTION public.is_branch_admin(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles ur
    JOIN public.profiles p ON p.id = ur.user_id
    WHERE ur.user_id = _user_id
      AND ur.role = 'admin'
      AND p.branch_id IS NOT NULL
  )
$$;