-- Add must_change_password flag to profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS must_change_password boolean DEFAULT false;

-- Add profile_completed flag to profiles  
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS profile_completed boolean DEFAULT true;

-- Allow admins to insert profiles (needed for creating employees)
CREATE POLICY "Admins can insert profiles"
ON public.profiles
FOR INSERT
WITH CHECK (is_admin(auth.uid()));