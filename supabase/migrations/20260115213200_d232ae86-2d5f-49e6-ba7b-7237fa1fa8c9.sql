-- Fix the handle_new_user trigger to NOT create profiles/roles for customers
-- Customers will register through the customer portal which handles their own profile creation

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  -- Check if this is a customer registration (has is_customer in metadata)
  IF NEW.raw_user_meta_data ->> 'is_customer' = 'true' THEN
    -- For customers, don't create profile or assign role here
    -- The customer portal handles customer_profiles, user_roles, and customers table
    RETURN NEW;
  END IF;

  -- For non-customer users (employees), create profile
  INSERT INTO public.profiles (id, name, email)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data ->> 'name', NEW.email),
    NEW.email
  );
  
  -- Assign default role (cajero) or admin if first user
  INSERT INTO public.user_roles (user_id, role)
  SELECT NEW.id, 
    CASE 
      WHEN NOT EXISTS (SELECT 1 FROM public.user_roles) THEN 'admin'::app_role
      ELSE 'cajero'::app_role
    END;
  
  -- Assign default permissions based on role
  INSERT INTO public.user_permissions (user_id, module_key)
  SELECT NEW.id, unnest(
    CASE 
      WHEN NOT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id != NEW.id) THEN
        ARRAY['dashboard', 'pos', 'orders', 'operations', 'deliveries', 'cash_register', 'inventory', 'catalog', 'reports', 'employees', 'settings']
      ELSE
        ARRAY['dashboard', 'pos', 'orders', 'cash_register']
    END
  );
  
  RETURN NEW;
END;
$function$;