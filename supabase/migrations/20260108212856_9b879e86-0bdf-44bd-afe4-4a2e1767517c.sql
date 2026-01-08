-- Corregir funciones sin search_path
CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.generate_ticket_code()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
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