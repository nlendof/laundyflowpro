-- Create a scheduled job table to track cron executions
CREATE TABLE IF NOT EXISTS public.scheduled_jobs (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  job_name text NOT NULL UNIQUE,
  last_run_at timestamp with time zone,
  next_run_at timestamp with time zone,
  is_enabled boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.scheduled_jobs ENABLE ROW LEVEL SECURITY;

-- Only system/admins can view scheduled jobs
CREATE POLICY "Admins can view scheduled jobs" ON public.scheduled_jobs
  FOR SELECT USING (is_owner_or_technician(auth.uid()));

CREATE POLICY "Admins can manage scheduled jobs" ON public.scheduled_jobs
  FOR ALL USING (is_owner_or_technician(auth.uid()));

-- Insert the subscription notifications job
INSERT INTO public.scheduled_jobs (job_name, is_enabled, next_run_at)
VALUES ('subscription_notifications', true, now() + interval '1 day')
ON CONFLICT (job_name) DO NOTHING;

-- Create function to update subscription statuses automatically
CREATE OR REPLACE FUNCTION public.process_subscription_expirations()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  sub RECORD;
  grace_days INTEGER;
BEGIN
  -- Process trial expirations
  UPDATE branch_subscriptions
  SET status = 'past_due',
      past_due_since = now(),
      updated_at = now()
  WHERE status = 'trial'
    AND trial_ends_at < now();

  -- Process past_due to suspended (after grace period)
  FOR sub IN 
    SELECT bs.*, sp.grace_period_days
    FROM branch_subscriptions bs
    JOIN subscription_plans sp ON sp.id = bs.plan_id
    WHERE bs.status = 'past_due'
  LOOP
    grace_days := COALESCE(sub.grace_period_days, 5);
    
    IF sub.past_due_since + (grace_days || ' days')::interval < now() THEN
      UPDATE branch_subscriptions
      SET status = 'suspended',
          suspended_at = now(),
          updated_at = now()
      WHERE id = sub.id;
    END IF;
  END LOOP;
END;
$$;

-- Create trigger to auto-update timestamps
CREATE TRIGGER update_scheduled_jobs_updated_at
BEFORE UPDATE ON public.scheduled_jobs
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at();