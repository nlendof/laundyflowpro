-- MIGRACIÓN 1B: Crear tablas laundries y laundry_users

-- Tabla principal de lavanderías (tenants)
CREATE TABLE IF NOT EXISTS public.laundries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  slug VARCHAR(100) UNIQUE NOT NULL,
  logo_url TEXT,
  phone VARCHAR(50),
  email VARCHAR(255),
  address TEXT,
  timezone VARCHAR(50) DEFAULT 'America/Mexico_City',
  currency VARCHAR(10) DEFAULT 'MXN',
  is_active BOOLEAN DEFAULT true,
  subscription_status VARCHAR(50) DEFAULT 'trial',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Relación usuarios ↔ lavanderías
CREATE TABLE IF NOT EXISTS public.laundry_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  laundry_id UUID NOT NULL REFERENCES public.laundries(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  is_primary BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(laundry_id, user_id)
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_laundry_users_user ON public.laundry_users(user_id);
CREATE INDEX IF NOT EXISTS idx_laundry_users_laundry ON public.laundry_users(laundry_id);
CREATE INDEX IF NOT EXISTS idx_laundries_slug ON public.laundries(slug);

-- RLS para laundries
ALTER TABLE public.laundries ENABLE ROW LEVEL SECURITY;

-- Trigger para updated_at
DROP TRIGGER IF EXISTS update_laundries_updated_at ON public.laundries;
CREATE TRIGGER update_laundries_updated_at
  BEFORE UPDATE ON public.laundries
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at();