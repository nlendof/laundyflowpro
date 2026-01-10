-- First, fix the stuck record with TEMP ticket code
UPDATE orders 
SET ticket_code = 'LC-2026-0001',
    qr_code = 'qr_lc_2026_0001'
WHERE ticket_code = 'TEMP';

-- Drop existing trigger first, then function with CASCADE
DROP TRIGGER IF EXISTS generate_order_ticket_code ON orders;
DROP TRIGGER IF EXISTS generate_order_ticket ON orders;
DROP FUNCTION IF EXISTS generate_ticket_code() CASCADE;

-- Create improved ticket code generator with better concurrency handling
CREATE OR REPLACE FUNCTION public.generate_ticket_code()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  new_code TEXT;
  year_part TEXT;
  sequence_num INTEGER;
  max_attempts INTEGER := 10;
  attempt INTEGER := 0;
BEGIN
  -- Only generate if ticket_code is TEMP or NULL
  IF NEW.ticket_code IS NULL OR NEW.ticket_code = 'TEMP' THEN
    year_part := to_char(now(), 'YYYY');
    
    LOOP
      attempt := attempt + 1;
      
      -- Get next sequence number
      SELECT COALESCE(MAX(
        CAST(NULLIF(SUBSTRING(ticket_code FROM 'LC-' || year_part || '-(\d+)'), '') AS INTEGER)
      ), 0) + 1
      INTO sequence_num
      FROM orders
      WHERE ticket_code LIKE 'LC-' || year_part || '-%'
        AND ticket_code != 'TEMP';
      
      new_code := 'LC-' || year_part || '-' || LPAD(sequence_num::TEXT, 4, '0');
      
      -- Check if this code already exists
      IF NOT EXISTS (SELECT 1 FROM orders WHERE ticket_code = new_code) THEN
        NEW.ticket_code := new_code;
        NEW.qr_code := 'qr_' || LOWER(REPLACE(new_code, '-', '_'));
        EXIT;
      END IF;
      
      -- If max attempts reached, use UUID suffix to guarantee uniqueness
      IF attempt >= max_attempts THEN
        NEW.ticket_code := 'LC-' || year_part || '-' || LPAD(sequence_num::TEXT, 4, '0') || '-' || SUBSTRING(gen_random_uuid()::text, 1, 4);
        NEW.qr_code := 'qr_' || LOWER(REPLACE(NEW.ticket_code, '-', '_'));
        EXIT;
      END IF;
      
      -- Increment sequence for next attempt
      sequence_num := sequence_num + 1;
    END LOOP;
  END IF;
  
  RETURN NEW;
END;
$function$;

-- Recreate the trigger
CREATE TRIGGER generate_order_ticket_code
  BEFORE INSERT ON orders
  FOR EACH ROW
  EXECUTE FUNCTION generate_ticket_code();