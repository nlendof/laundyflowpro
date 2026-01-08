-- =============================================
-- SISTEMA DE GESTIÓN DE LAVANDERÍA - ESQUEMA COMPLETO
-- =============================================

-- 1. Crear enum para roles de usuario
CREATE TYPE public.app_role AS ENUM ('admin', 'cajero', 'operador', 'delivery');

-- 2. Crear enum para estados de orden
CREATE TYPE public.order_status AS ENUM (
  'pending_pickup',
  'in_store',
  'washing',
  'drying',
  'ironing',
  'ready_delivery',
  'in_transit',
  'delivered'
);

-- 3. Crear enum para tipos de item
CREATE TYPE public.item_type AS ENUM ('weight', 'piece');

-- 4. Crear enum para categorías de gasto
CREATE TYPE public.expense_category AS ENUM ('rent', 'utilities', 'payroll', 'supplies', 'other');

-- 5. Crear enum para categorías de inventario
CREATE TYPE public.inventory_category AS ENUM ('detergent', 'softener', 'stain_remover', 'other');

-- =============================================
-- TABLA: PERFILES DE USUARIO
-- =============================================
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  avatar_url TEXT,
  is_active BOOLEAN DEFAULT true,
  hire_date TIMESTAMPTZ DEFAULT now(),
  last_login TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- =============================================
-- TABLA: ROLES DE USUARIO (separada por seguridad)
-- =============================================
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL DEFAULT 'cajero',
  UNIQUE (user_id, role)
);

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- =============================================
-- TABLA: PERMISOS DE MÓDULOS POR USUARIO
-- =============================================
CREATE TABLE public.user_permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  module_key TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE (user_id, module_key)
);

ALTER TABLE public.user_permissions ENABLE ROW LEVEL SECURITY;

-- =============================================
-- TABLA: CLIENTES
-- =============================================
CREATE TABLE public.customers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  phone TEXT,
  email TEXT,
  address TEXT,
  notes TEXT,
  total_orders INTEGER DEFAULT 0,
  total_spent DECIMAL(12,2) DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;

-- =============================================
-- TABLA: CATÁLOGO - SERVICIOS
-- =============================================
CREATE TABLE public.catalog_services (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL,
  price DECIMAL(10,2) NOT NULL,
  unit TEXT NOT NULL DEFAULT 'kg',
  estimated_time INTEGER, -- en minutos
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.catalog_services ENABLE ROW LEVEL SECURITY;

-- =============================================
-- TABLA: CATÁLOGO - ARTÍCULOS
-- =============================================
CREATE TABLE public.catalog_articles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL,
  price DECIMAL(10,2) NOT NULL,
  cost DECIMAL(10,2) DEFAULT 0,
  stock INTEGER DEFAULT 0,
  min_stock INTEGER DEFAULT 5,
  track_inventory BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.catalog_articles ENABLE ROW LEVEL SECURITY;

-- =============================================
-- TABLA: EXTRAS/ADICIONALES
-- =============================================
CREATE TABLE public.catalog_extras (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  price DECIMAL(10,2) NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.catalog_extras ENABLE ROW LEVEL SECURITY;

-- =============================================
-- TABLA: PEDIDOS/ÓRDENES
-- =============================================
CREATE TABLE public.orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_code TEXT NOT NULL UNIQUE,
  qr_code TEXT,
  customer_id UUID REFERENCES public.customers(id),
  customer_name TEXT NOT NULL,
  customer_phone TEXT,
  customer_address TEXT,
  status order_status DEFAULT 'in_store',
  total_amount DECIMAL(12,2) NOT NULL DEFAULT 0,
  paid_amount DECIMAL(12,2) DEFAULT 0,
  is_paid BOOLEAN DEFAULT false,
  needs_pickup BOOLEAN DEFAULT false,
  needs_delivery BOOLEAN DEFAULT false,
  pickup_cost DECIMAL(10,2) DEFAULT 0,
  delivery_cost DECIMAL(10,2) DEFAULT 0,
  pickup_address TEXT,
  delivery_address TEXT,
  pickup_slot TEXT,
  delivery_slot TEXT,
  pickup_driver_id UUID REFERENCES auth.users(id),
  delivery_driver_id UUID REFERENCES auth.users(id),
  pickup_completed_at TIMESTAMPTZ,
  delivery_completed_at TIMESTAMPTZ,
  notes TEXT,
  item_checks JSONB DEFAULT '{}',
  estimated_ready_at TIMESTAMPTZ,
  delivered_at TIMESTAMPTZ,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;

-- =============================================
-- TABLA: ITEMS DE PEDIDO
-- =============================================
CREATE TABLE public.order_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID REFERENCES public.orders(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  item_type item_type NOT NULL DEFAULT 'piece',
  quantity DECIMAL(10,2) NOT NULL,
  unit_price DECIMAL(10,2) NOT NULL,
  extras JSONB DEFAULT '[]',
  service_id UUID REFERENCES public.catalog_services(id),
  article_id UUID REFERENCES public.catalog_articles(id),
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;

-- =============================================
-- TABLA: INVENTARIO
-- =============================================
CREATE TABLE public.inventory (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  category inventory_category NOT NULL DEFAULT 'other',
  current_stock DECIMAL(10,2) NOT NULL DEFAULT 0,
  min_stock DECIMAL(10,2) NOT NULL DEFAULT 10,
  unit TEXT NOT NULL DEFAULT 'unidad',
  unit_cost DECIMAL(10,2) DEFAULT 0,
  last_restocked TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.inventory ENABLE ROW LEVEL SECURITY;

-- =============================================
-- TABLA: MOVIMIENTOS DE INVENTARIO
-- =============================================
CREATE TABLE public.inventory_movements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  inventory_id UUID REFERENCES public.inventory(id) ON DELETE CASCADE NOT NULL,
  movement_type TEXT NOT NULL, -- 'in', 'out', 'adjustment'
  quantity DECIMAL(10,2) NOT NULL,
  reason TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.inventory_movements ENABLE ROW LEVEL SECURITY;

-- =============================================
-- TABLA: CAJA - MOVIMIENTOS DIARIOS
-- =============================================
CREATE TABLE public.cash_register (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entry_type TEXT NOT NULL, -- 'income', 'expense'
  category TEXT NOT NULL,
  amount DECIMAL(12,2) NOT NULL,
  description TEXT,
  order_id UUID REFERENCES public.orders(id),
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.cash_register ENABLE ROW LEVEL SECURITY;

-- =============================================
-- TABLA: GASTOS OPERATIVOS
-- =============================================
CREATE TABLE public.expenses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category expense_category NOT NULL,
  amount DECIMAL(12,2) NOT NULL,
  description TEXT,
  expense_date DATE NOT NULL DEFAULT CURRENT_DATE,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;

-- =============================================
-- TABLA: ARQUEOS DE CAJA
-- =============================================
CREATE TABLE public.cash_closings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  closing_date DATE NOT NULL UNIQUE,
  opening_balance DECIMAL(12,2) NOT NULL DEFAULT 0,
  total_income DECIMAL(12,2) NOT NULL DEFAULT 0,
  total_expense DECIMAL(12,2) NOT NULL DEFAULT 0,
  expected_balance DECIMAL(12,2) NOT NULL DEFAULT 0,
  actual_balance DECIMAL(12,2),
  difference DECIMAL(12,2),
  notes TEXT,
  closed_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.cash_closings ENABLE ROW LEVEL SECURITY;

-- =============================================
-- TABLA: CONFIGURACIÓN DEL SISTEMA
-- =============================================
CREATE TABLE public.system_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key TEXT NOT NULL UNIQUE,
  value JSONB NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.system_config ENABLE ROW LEVEL SECURITY;

-- =============================================
-- FUNCIÓN: Verificar si usuario tiene un rol
-- =============================================
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- =============================================
-- FUNCIÓN: Obtener rol del usuario actual
-- =============================================
CREATE OR REPLACE FUNCTION public.get_user_role(_user_id UUID)
RETURNS app_role
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role
  FROM public.user_roles
  WHERE user_id = _user_id
  LIMIT 1
$$;

-- =============================================
-- FUNCIÓN: Verificar si es admin
-- =============================================
CREATE OR REPLACE FUNCTION public.is_admin(_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = 'admin'
  )
$$;

-- =============================================
-- FUNCIÓN: Crear perfil y asignar rol al nuevo usuario
-- =============================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  -- Crear perfil
  INSERT INTO public.profiles (id, name, email)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data ->> 'name', NEW.email),
    NEW.email
  );
  
  -- Asignar rol por defecto (cajero) o admin si es el primer usuario
  INSERT INTO public.user_roles (user_id, role)
  SELECT NEW.id, 
    CASE 
      WHEN NOT EXISTS (SELECT 1 FROM public.user_roles) THEN 'admin'::app_role
      ELSE 'cajero'::app_role
    END;
  
  -- Asignar permisos por defecto según el rol
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
$$;

-- Trigger para nuevo usuario
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- =============================================
-- FUNCIÓN: Actualizar timestamp
-- =============================================
CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- Triggers para updated_at
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
CREATE TRIGGER update_customers_updated_at BEFORE UPDATE ON public.customers FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
CREATE TRIGGER update_orders_updated_at BEFORE UPDATE ON public.orders FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
CREATE TRIGGER update_catalog_services_updated_at BEFORE UPDATE ON public.catalog_services FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
CREATE TRIGGER update_catalog_articles_updated_at BEFORE UPDATE ON public.catalog_articles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
CREATE TRIGGER update_inventory_updated_at BEFORE UPDATE ON public.inventory FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- =============================================
-- FUNCIÓN: Generar código de ticket
-- =============================================
CREATE OR REPLACE FUNCTION public.generate_ticket_code()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  new_code TEXT;
  year_part TEXT;
  sequence_num INTEGER;
BEGIN
  year_part := to_char(now(), 'YYYY');
  
  SELECT COALESCE(MAX(
    CAST(SUBSTRING(ticket_code FROM 'LC-' || year_part || '-(\d+)') AS INTEGER)
  ), 0) + 1
  INTO sequence_num
  FROM public.orders
  WHERE ticket_code LIKE 'LC-' || year_part || '-%';
  
  NEW.ticket_code := 'LC-' || year_part || '-' || LPAD(sequence_num::TEXT, 4, '0');
  NEW.qr_code := 'qr_' || LOWER(REPLACE(NEW.ticket_code, '-', '_'));
  
  RETURN NEW;
END;
$$;

CREATE TRIGGER generate_order_ticket_code
  BEFORE INSERT ON public.orders
  FOR EACH ROW
  WHEN (NEW.ticket_code IS NULL OR NEW.ticket_code = '')
  EXECUTE FUNCTION public.generate_ticket_code();

-- =============================================
-- POLÍTICAS RLS
-- =============================================

-- Profiles: usuarios autenticados pueden ver todos, editar el suyo
CREATE POLICY "Users can view all profiles" ON public.profiles FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = id);
CREATE POLICY "Admins can update any profile" ON public.profiles FOR UPDATE TO authenticated USING (public.is_admin(auth.uid()));

-- User Roles: solo admins pueden modificar, todos pueden ver
CREATE POLICY "Users can view roles" ON public.user_roles FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can manage roles" ON public.user_roles FOR ALL TO authenticated USING (public.is_admin(auth.uid()));

-- User Permissions: similar a roles
CREATE POLICY "Users can view permissions" ON public.user_permissions FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can manage permissions" ON public.user_permissions FOR ALL TO authenticated USING (public.is_admin(auth.uid()));

-- Customers: todos los autenticados pueden CRUD
CREATE POLICY "Authenticated users can manage customers" ON public.customers FOR ALL TO authenticated USING (true);

-- Catalog Services: todos pueden ver, admins pueden modificar
CREATE POLICY "Anyone can view services" ON public.catalog_services FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can manage services" ON public.catalog_services FOR ALL TO authenticated USING (public.is_admin(auth.uid()));

-- Catalog Articles: similar a services
CREATE POLICY "Anyone can view articles" ON public.catalog_articles FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can manage articles" ON public.catalog_articles FOR ALL TO authenticated USING (public.is_admin(auth.uid()));

-- Catalog Extras
CREATE POLICY "Anyone can view extras" ON public.catalog_extras FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can manage extras" ON public.catalog_extras FOR ALL TO authenticated USING (public.is_admin(auth.uid()));

-- Orders: todos los autenticados pueden gestionar
CREATE POLICY "Authenticated users can manage orders" ON public.orders FOR ALL TO authenticated USING (true);

-- Order Items
CREATE POLICY "Authenticated users can manage order items" ON public.order_items FOR ALL TO authenticated USING (true);

-- Inventory
CREATE POLICY "Authenticated users can view inventory" ON public.inventory FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins and operators can manage inventory" ON public.inventory FOR ALL TO authenticated 
  USING (public.is_admin(auth.uid()) OR public.has_role(auth.uid(), 'operador'));

-- Inventory Movements
CREATE POLICY "Authenticated users can manage inventory movements" ON public.inventory_movements FOR ALL TO authenticated USING (true);

-- Cash Register
CREATE POLICY "Authenticated users can manage cash register" ON public.cash_register FOR ALL TO authenticated USING (true);

-- Expenses: solo admins y cajeros
CREATE POLICY "View expenses" ON public.expenses FOR SELECT TO authenticated USING (true);
CREATE POLICY "Manage expenses" ON public.expenses FOR ALL TO authenticated 
  USING (public.is_admin(auth.uid()) OR public.has_role(auth.uid(), 'cajero'));

-- Cash Closings
CREATE POLICY "View cash closings" ON public.cash_closings FOR SELECT TO authenticated USING (true);
CREATE POLICY "Manage cash closings" ON public.cash_closings FOR ALL TO authenticated 
  USING (public.is_admin(auth.uid()) OR public.has_role(auth.uid(), 'cajero'));

-- System Config: solo admins
CREATE POLICY "Anyone can view config" ON public.system_config FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can manage config" ON public.system_config FOR ALL TO authenticated USING (public.is_admin(auth.uid()));