-- Fix: Owners and technicians should see ALL laundries
DROP POLICY IF EXISTS "Users can view their laundries" ON public.laundries;

CREATE POLICY "Users can view their laundries" 
ON public.laundries 
FOR SELECT 
USING (
  user_belongs_to_laundry(auth.uid(), id) 
  OR has_role(auth.uid(), 'owner'::app_role) 
  OR has_role(auth.uid(), 'technician'::app_role)
);