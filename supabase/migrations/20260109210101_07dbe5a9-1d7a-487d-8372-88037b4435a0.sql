-- Create table for backup schedule configuration
CREATE TABLE public.backup_schedules (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  is_enabled BOOLEAN NOT NULL DEFAULT false,
  frequency TEXT NOT NULL DEFAULT 'daily' CHECK (frequency IN ('daily', 'weekly')),
  day_of_week INTEGER CHECK (day_of_week >= 0 AND day_of_week <= 6),
  time_of_day TIME NOT NULL DEFAULT '03:00:00',
  notification_email TEXT,
  last_backup_at TIMESTAMP WITH TIME ZONE,
  next_backup_at TIMESTAMP WITH TIME ZONE,
  tables_to_backup JSONB NOT NULL DEFAULT '["customers", "orders", "order_items", "inventory", "catalog_services", "catalog_articles", "catalog_extras", "cash_register", "profiles", "system_config"]'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create table for backup history
CREATE TABLE public.backup_history (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  backup_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  status TEXT NOT NULL DEFAULT 'completed' CHECK (status IN ('completed', 'failed', 'in_progress')),
  tables_backed_up JSONB,
  file_size_bytes INTEGER,
  error_message TEXT,
  email_sent BOOLEAN DEFAULT false,
  email_recipient TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.backup_schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.backup_history ENABLE ROW LEVEL SECURITY;

-- RLS policies for backup_schedules (only admins)
CREATE POLICY "Admins can view backup schedules" 
ON public.backup_schedules 
FOR SELECT 
USING (public.is_admin(auth.uid()));

CREATE POLICY "Admins can insert backup schedules" 
ON public.backup_schedules 
FOR INSERT 
WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY "Admins can update backup schedules" 
ON public.backup_schedules 
FOR UPDATE 
USING (public.is_admin(auth.uid()));

CREATE POLICY "Admins can delete backup schedules" 
ON public.backup_schedules 
FOR DELETE 
USING (public.is_admin(auth.uid()));

-- RLS policies for backup_history (only admins)
CREATE POLICY "Admins can view backup history" 
ON public.backup_history 
FOR SELECT 
USING (public.is_admin(auth.uid()));

CREATE POLICY "Admins can insert backup history" 
ON public.backup_history 
FOR INSERT 
WITH CHECK (public.is_admin(auth.uid()));

-- Add trigger for updated_at
CREATE TRIGGER update_backup_schedules_updated_at
BEFORE UPDATE ON public.backup_schedules
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at();

-- Insert default schedule (disabled by default)
INSERT INTO public.backup_schedules (is_enabled, frequency, time_of_day)
VALUES (false, 'daily', '03:00:00');