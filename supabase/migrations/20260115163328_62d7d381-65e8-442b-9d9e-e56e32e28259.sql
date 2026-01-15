-- Add customer code with auto-generation
ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS code TEXT UNIQUE;

-- Create function to generate customer code
CREATE OR REPLACE FUNCTION public.generate_customer_code()
RETURNS TRIGGER AS $$
DECLARE
  new_code TEXT;
  sequence_num INTEGER;
  max_attempts INTEGER := 10;
  attempt INTEGER := 0;
BEGIN
  -- Only generate if code is NULL
  IF NEW.code IS NULL THEN
    LOOP
      attempt := attempt + 1;
      
      -- Get next sequence number
      SELECT COALESCE(MAX(
        CAST(NULLIF(SUBSTRING(code FROM 'CLI-(\d+)'), '') AS INTEGER)
      ), 0) + 1
      INTO sequence_num
      FROM customers
      WHERE code IS NOT NULL;
      
      new_code := 'CLI-' || LPAD(sequence_num::TEXT, 5, '0');
      
      -- Check if this code already exists
      IF NOT EXISTS (SELECT 1 FROM customers WHERE code = new_code) THEN
        NEW.code := new_code;
        EXIT;
      END IF;
      
      -- If max attempts reached, use UUID suffix to guarantee uniqueness
      IF attempt >= max_attempts THEN
        NEW.code := 'CLI-' || LPAD(sequence_num::TEXT, 5, '0') || '-' || SUBSTRING(gen_random_uuid()::text, 1, 4);
        EXIT;
      END IF;
      
      sequence_num := sequence_num + 1;
    END LOOP;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Create trigger for auto-generating customer code
DROP TRIGGER IF EXISTS generate_customer_code_trigger ON customers;
CREATE TRIGGER generate_customer_code_trigger
  BEFORE INSERT ON customers
  FOR EACH ROW
  EXECUTE FUNCTION public.generate_customer_code();

-- Update existing customers without code
DO $$
DECLARE
  customer_record RECORD;
  sequence_num INTEGER := 1;
BEGIN
  FOR customer_record IN 
    SELECT id FROM customers WHERE code IS NULL ORDER BY created_at
  LOOP
    UPDATE customers 
    SET code = 'CLI-' || LPAD(sequence_num::TEXT, 5, '0')
    WHERE id = customer_record.id;
    sequence_num := sequence_num + 1;
  END LOOP;
END $$;

-- Modify employee_loans to support weekly deduction frequency
-- Note: weekly_deduction and deduction_frequency columns already exist in the table