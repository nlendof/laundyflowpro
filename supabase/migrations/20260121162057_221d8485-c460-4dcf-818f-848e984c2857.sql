
-- =============================================
-- SISTEMA DE SUSCRIPCIONES POR SUCURSAL
-- =============================================

-- Enum para estados de suscripción
CREATE TYPE subscription_status AS ENUM ('trial', 'active', 'past_due', 'suspended', 'cancelled');

-- Enum para intervalos de facturación
CREATE TYPE billing_interval AS ENUM ('monthly', 'annual');

-- Enum para métodos de pago
CREATE TYPE payment_method_type AS ENUM ('card', 'bank_transfer');

-- =============================================
-- TABLA: Planes de suscripción
-- =============================================
CREATE TABLE public.subscription_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL,
  description TEXT,
  price_monthly DECIMAL(10,2) NOT NULL,
  price_annual DECIMAL(10,2) NOT NULL,
  currency VARCHAR(3) DEFAULT 'USD',
  trial_days INTEGER DEFAULT 30,
  grace_period_days INTEGER DEFAULT 5,
  features JSONB DEFAULT '[]'::jsonb,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- =============================================
-- TABLA: Suscripciones por sucursal
-- =============================================
CREATE TABLE public.branch_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  branch_id UUID NOT NULL REFERENCES public.branches(id) ON DELETE CASCADE,
  plan_id UUID NOT NULL REFERENCES public.subscription_plans(id),
  status subscription_status NOT NULL DEFAULT 'trial',
  billing_interval billing_interval NOT NULL DEFAULT 'monthly',
  
  -- Fechas importantes
  trial_started_at TIMESTAMPTZ DEFAULT now(),
  trial_ends_at TIMESTAMPTZ,
  current_period_start TIMESTAMPTZ,
  current_period_end TIMESTAMPTZ,
  billing_anchor_day INTEGER, -- Día del mes para facturación (1-28)
  
  -- Estado de pago
  last_payment_at TIMESTAMPTZ,
  next_payment_due TIMESTAMPTZ,
  past_due_since TIMESTAMPTZ,
  suspended_at TIMESTAMPTZ,
  cancelled_at TIMESTAMPTZ,
  
  -- Stripe (preparado para integración)
  stripe_subscription_id VARCHAR(255),
  stripe_customer_id VARCHAR(255),
  
  -- Método de pago preferido
  preferred_payment_method payment_method_type,
  
  -- Metadata
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  created_by UUID REFERENCES auth.users(id),
  
  UNIQUE(branch_id) -- Una suscripción por sucursal
);

-- =============================================
-- TABLA: Historial de pagos
-- =============================================
CREATE TABLE public.subscription_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subscription_id UUID NOT NULL REFERENCES public.branch_subscriptions(id) ON DELETE CASCADE,
  branch_id UUID NOT NULL REFERENCES public.branches(id),
  
  -- Detalles del pago
  amount DECIMAL(10,2) NOT NULL,
  currency VARCHAR(3) DEFAULT 'USD',
  payment_method payment_method_type NOT NULL,
  status VARCHAR(50) NOT NULL DEFAULT 'pending', -- pending, completed, failed, refunded
  
  -- Período facturado
  period_start TIMESTAMPTZ NOT NULL,
  period_end TIMESTAMPTZ NOT NULL,
  
  -- Stripe (preparado)
  stripe_payment_intent_id VARCHAR(255),
  stripe_invoice_id VARCHAR(255),
  
  -- Transferencia bancaria
  bank_reference VARCHAR(255),
  confirmed_by UUID REFERENCES auth.users(id),
  confirmed_at TIMESTAMPTZ,
  
  -- Facturación
  invoice_number VARCHAR(50),
  invoice_url TEXT,
  
  -- Metadata
  notes TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- =============================================
-- TABLA: Facturas
-- =============================================
CREATE TABLE public.subscription_invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subscription_id UUID NOT NULL REFERENCES public.branch_subscriptions(id) ON DELETE CASCADE,
  payment_id UUID REFERENCES public.subscription_payments(id),
  branch_id UUID NOT NULL REFERENCES public.branches(id),
  
  -- Numeración
  invoice_number VARCHAR(50) NOT NULL,
  
  -- Detalles
  subtotal DECIMAL(10,2) NOT NULL,
  tax_amount DECIMAL(10,2) DEFAULT 0,
  total DECIMAL(10,2) NOT NULL,
  currency VARCHAR(3) DEFAULT 'USD',
  
  -- Período
  period_start TIMESTAMPTZ NOT NULL,
  period_end TIMESTAMPTZ NOT NULL,
  
  -- Estado
  status VARCHAR(50) DEFAULT 'draft', -- draft, sent, paid, void
  due_date TIMESTAMPTZ,
  paid_at TIMESTAMPTZ,
  
  -- PDF
  pdf_url TEXT,
  
  -- Datos fiscales (preparado)
  billing_name VARCHAR(255),
  billing_address TEXT,
  billing_tax_id VARCHAR(50),
  
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- =============================================
-- TABLA: Notificaciones de suscripción
-- =============================================
CREATE TABLE public.subscription_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subscription_id UUID NOT NULL REFERENCES public.branch_subscriptions(id) ON DELETE CASCADE,
  branch_id UUID NOT NULL REFERENCES public.branches(id),
  
  -- Tipo de notificación
  notification_type VARCHAR(50) NOT NULL, -- trial_ending, payment_due, past_due, suspended, etc.
  
  -- Destinatarios
  recipient_user_id UUID REFERENCES auth.users(id),
  recipient_email VARCHAR(255),
  
  -- Estado
  channel VARCHAR(50) NOT NULL, -- email, in_app
  status VARCHAR(50) DEFAULT 'pending', -- pending, sent, failed
  sent_at TIMESTAMPTZ,
  
  -- Contenido
  subject TEXT,
  body TEXT,
  
  created_at TIMESTAMPTZ DEFAULT now()
);

-- =============================================
-- INSERTAR PLAN POR DEFECTO
-- =============================================
INSERT INTO public.subscription_plans (name, description, price_monthly, price_annual, features)
VALUES (
  'Plan Profesional',
  'Acceso completo a todos los módulos, usuarios ilimitados',
  29.99,
  299.99,
  '["Todos los módulos", "Usuarios ilimitados", "Soporte prioritario", "Reportes avanzados", "Notificaciones automáticas"]'::jsonb
);

-- =============================================
-- FUNCIÓN: Crear suscripción trial para nueva sucursal
-- =============================================
CREATE OR REPLACE FUNCTION public.create_branch_trial_subscription()
RETURNS TRIGGER AS $$
DECLARE
  default_plan_id UUID;
BEGIN
  -- Obtener plan por defecto
  SELECT id INTO default_plan_id FROM public.subscription_plans WHERE is_active = true LIMIT 1;
  
  IF default_plan_id IS NOT NULL THEN
    INSERT INTO public.branch_subscriptions (
      branch_id,
      plan_id,
      status,
      trial_started_at,
      trial_ends_at
    ) VALUES (
      NEW.id,
      default_plan_id,
      'trial',
      now(),
      now() + INTERVAL '30 days'
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Trigger para crear suscripción automática
CREATE TRIGGER on_branch_created_create_subscription
  AFTER INSERT ON public.branches
  FOR EACH ROW
  EXECUTE FUNCTION public.create_branch_trial_subscription();

-- =============================================
-- FUNCIÓN: Verificar estado de suscripción
-- =============================================
CREATE OR REPLACE FUNCTION public.check_branch_subscription_status(p_branch_id UUID)
RETURNS TABLE (
  can_operate BOOLEAN,
  is_in_grace_period BOOLEAN,
  days_until_suspension INTEGER,
  status subscription_status,
  message TEXT
) AS $$
DECLARE
  v_subscription RECORD;
  v_grace_days INTEGER;
BEGIN
  -- Obtener suscripción de la sucursal
  SELECT bs.*, sp.grace_period_days
  INTO v_subscription
  FROM public.branch_subscriptions bs
  JOIN public.subscription_plans sp ON sp.id = bs.plan_id
  WHERE bs.branch_id = p_branch_id;
  
  -- Si no hay suscripción, permitir operar (fallback)
  IF v_subscription IS NULL THEN
    RETURN QUERY SELECT true, false, 0, 'trial'::subscription_status, 'Sin suscripción registrada';
    RETURN;
  END IF;
  
  -- Verificar estados
  CASE v_subscription.status
    WHEN 'trial' THEN
      IF v_subscription.trial_ends_at > now() THEN
        RETURN QUERY SELECT true, false, 
          EXTRACT(DAY FROM v_subscription.trial_ends_at - now())::INTEGER,
          'trial'::subscription_status,
          'Período de prueba activo';
      ELSE
        -- Trial expirado, debería pasar a past_due
        RETURN QUERY SELECT true, true, 0, 'past_due'::subscription_status, 
          'Período de prueba terminado, se requiere pago';
      END IF;
      
    WHEN 'active' THEN
      RETURN QUERY SELECT true, false, 0, 'active'::subscription_status, 'Suscripción activa';
      
    WHEN 'past_due' THEN
      v_grace_days := COALESCE(v_subscription.grace_period_days, 5);
      IF v_subscription.past_due_since + (v_grace_days || ' days')::INTERVAL > now() THEN
        RETURN QUERY SELECT true, true,
          EXTRACT(DAY FROM (v_subscription.past_due_since + (v_grace_days || ' days')::INTERVAL) - now())::INTEGER,
          'past_due'::subscription_status,
          'Pago vencido - período de gracia';
      ELSE
        RETURN QUERY SELECT false, false, 0, 'suspended'::subscription_status, 
          'Suscripción suspendida por falta de pago';
      END IF;
      
    WHEN 'suspended' THEN
      RETURN QUERY SELECT false, false, 0, 'suspended'::subscription_status, 
        'Suscripción suspendida';
        
    WHEN 'cancelled' THEN
      RETURN QUERY SELECT false, false, 0, 'cancelled'::subscription_status, 
        'Suscripción cancelada';
        
    ELSE
      RETURN QUERY SELECT true, false, 0, v_subscription.status, 'Estado desconocido';
  END CASE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- =============================================
-- RLS POLICIES
-- =============================================

-- subscription_plans: públicamente legible
ALTER TABLE public.subscription_plans ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view active plans"
  ON public.subscription_plans FOR SELECT
  USING (is_active = true);

CREATE POLICY "Only owners can manage plans"
  ON public.subscription_plans FOR ALL
  USING (has_role(auth.uid(), 'owner'::app_role));

-- branch_subscriptions
ALTER TABLE public.branch_subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view branch subscriptions"
  ON public.branch_subscriptions FOR SELECT
  USING (
    is_admin(auth.uid()) 
    OR has_role(auth.uid(), 'owner'::app_role)
    OR is_branch_admin(auth.uid(), branch_id)
  );

CREATE POLICY "Admins can manage branch subscriptions"
  ON public.branch_subscriptions FOR ALL
  USING (
    has_role(auth.uid(), 'owner'::app_role)
    OR is_laundry_admin(auth.uid(), (SELECT laundry_id FROM branches WHERE id = branch_id))
    OR is_branch_admin(auth.uid(), branch_id)
  );

-- subscription_payments
ALTER TABLE public.subscription_payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view payments"
  ON public.subscription_payments FOR SELECT
  USING (
    is_admin(auth.uid())
    OR has_role(auth.uid(), 'owner'::app_role)
    OR is_branch_admin(auth.uid(), branch_id)
  );

CREATE POLICY "Admins can manage payments"
  ON public.subscription_payments FOR ALL
  USING (
    has_role(auth.uid(), 'owner'::app_role)
    OR is_laundry_admin(auth.uid(), (SELECT laundry_id FROM branches WHERE id = branch_id))
  );

-- subscription_invoices
ALTER TABLE public.subscription_invoices ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view invoices"
  ON public.subscription_invoices FOR SELECT
  USING (
    is_admin(auth.uid())
    OR has_role(auth.uid(), 'owner'::app_role)
    OR is_branch_admin(auth.uid(), branch_id)
  );

CREATE POLICY "System can manage invoices"
  ON public.subscription_invoices FOR ALL
  USING (has_role(auth.uid(), 'owner'::app_role));

-- subscription_notifications
ALTER TABLE public.subscription_notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own notifications"
  ON public.subscription_notifications FOR SELECT
  USING (
    recipient_user_id = auth.uid()
    OR is_admin(auth.uid())
    OR has_role(auth.uid(), 'owner'::app_role)
  );

CREATE POLICY "System can manage notifications"
  ON public.subscription_notifications FOR ALL
  USING (has_role(auth.uid(), 'owner'::app_role));

-- =============================================
-- TRIGGERS PARA updated_at
-- =============================================
CREATE TRIGGER update_subscription_plans_updated_at
  BEFORE UPDATE ON public.subscription_plans
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER update_branch_subscriptions_updated_at
  BEFORE UPDATE ON public.branch_subscriptions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER update_subscription_payments_updated_at
  BEFORE UPDATE ON public.subscription_payments
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER update_subscription_invoices_updated_at
  BEFORE UPDATE ON public.subscription_invoices
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
