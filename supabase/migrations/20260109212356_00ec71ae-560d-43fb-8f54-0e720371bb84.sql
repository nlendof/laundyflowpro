-- Create purchases table
CREATE TABLE public.purchases (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  purchase_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  supplier_name TEXT,
  total_amount NUMERIC NOT NULL DEFAULT 0,
  notes TEXT,
  status TEXT NOT NULL DEFAULT 'completed',
  created_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create purchase items table
CREATE TABLE public.purchase_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  purchase_id UUID NOT NULL REFERENCES public.purchases(id) ON DELETE CASCADE,
  item_type TEXT NOT NULL DEFAULT 'inventory', -- 'inventory' or 'catalog_article'
  inventory_id UUID REFERENCES public.inventory(id),
  article_id UUID REFERENCES public.catalog_articles(id),
  item_name TEXT NOT NULL,
  quantity NUMERIC NOT NULL,
  unit_cost NUMERIC NOT NULL DEFAULT 0,
  total_cost NUMERIC NOT NULL DEFAULT 0,
  stock_before NUMERIC NOT NULL DEFAULT 0,
  stock_action TEXT NOT NULL DEFAULT 'add', -- 'add' or 'replace'
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.purchases ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.purchase_items ENABLE ROW LEVEL SECURITY;

-- RLS policies for purchases
CREATE POLICY "Admins and operators can manage purchases"
ON public.purchases
FOR ALL
USING (is_admin(auth.uid()) OR has_role(auth.uid(), 'operador'::app_role));

CREATE POLICY "Staff can view purchases"
ON public.purchases
FOR SELECT
USING (is_admin(auth.uid()) OR has_role(auth.uid(), 'cajero'::app_role) OR has_role(auth.uid(), 'operador'::app_role));

-- RLS policies for purchase items
CREATE POLICY "Admins and operators can manage purchase items"
ON public.purchase_items
FOR ALL
USING (is_admin(auth.uid()) OR has_role(auth.uid(), 'operador'::app_role));

CREATE POLICY "Staff can view purchase items"
ON public.purchase_items
FOR SELECT
USING (is_admin(auth.uid()) OR has_role(auth.uid(), 'cajero'::app_role) OR has_role(auth.uid(), 'operador'::app_role));

-- Add updated_at trigger
CREATE TRIGGER update_purchases_updated_at
BEFORE UPDATE ON public.purchases
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at();