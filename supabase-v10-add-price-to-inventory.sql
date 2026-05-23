-- Stack n Stock Inventory Dashboard V10: Add price to inventory items
-- Add price column to inventory_items table

ALTER TABLE public.inventory_items
ADD COLUMN IF NOT EXISTS price numeric DEFAULT 0;