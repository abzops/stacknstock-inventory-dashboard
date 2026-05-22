-- Stack n Stock Inventory Dashboard V11: Add price and PO number to inventory items
-- Add price and po_no columns to inventory_items table

ALTER TABLE public.inventory_items
ADD COLUMN IF NOT EXISTS price numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS po_no text DEFAULT '';