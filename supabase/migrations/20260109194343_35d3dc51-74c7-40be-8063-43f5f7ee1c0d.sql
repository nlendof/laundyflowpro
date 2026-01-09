-- Create function to update customer stats when order is created
CREATE OR REPLACE FUNCTION public.update_customer_stats_on_order()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Update customer stats when order is inserted
  IF TG_OP = 'INSERT' THEN
    IF NEW.customer_id IS NOT NULL THEN
      UPDATE customers
      SET 
        total_orders = total_orders + 1,
        total_spent = total_spent + COALESCE(NEW.total_amount, 0),
        updated_at = now()
      WHERE id = NEW.customer_id;
    END IF;
  END IF;
  
  -- Update customer stats when order amount changes
  IF TG_OP = 'UPDATE' THEN
    IF NEW.customer_id IS NOT NULL AND OLD.total_amount IS DISTINCT FROM NEW.total_amount THEN
      UPDATE customers
      SET 
        total_spent = total_spent - COALESCE(OLD.total_amount, 0) + COALESCE(NEW.total_amount, 0),
        updated_at = now()
      WHERE id = NEW.customer_id;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger for updating customer stats
DROP TRIGGER IF EXISTS trigger_update_customer_stats ON orders;
CREATE TRIGGER trigger_update_customer_stats
  AFTER INSERT OR UPDATE ON orders
  FOR EACH ROW
  EXECUTE FUNCTION update_customer_stats_on_order();

-- Create function to register order payment in cash register
CREATE OR REPLACE FUNCTION public.register_order_payment()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Only register when order becomes fully paid
  IF NEW.is_paid = true AND (OLD.is_paid IS NULL OR OLD.is_paid = false) THEN
    INSERT INTO cash_register (amount, category, entry_type, description, order_id, created_by)
    VALUES (
      NEW.total_amount,
      'venta',
      'income',
      'Pago de pedido ' || NEW.ticket_code,
      NEW.id,
      NEW.created_by
    );
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger for registering payments
DROP TRIGGER IF EXISTS trigger_register_order_payment ON orders;
CREATE TRIGGER trigger_register_order_payment
  AFTER INSERT OR UPDATE ON orders
  FOR EACH ROW
  EXECUTE FUNCTION register_order_payment();