-- Stack n Stock Inventory Dashboard V12: GRN Zoho Flow mail tracking

ALTER TABLE public.grn_headers
ADD COLUMN IF NOT EXISTS grn_mail_status text DEFAULT 'PENDING',
ADD COLUMN IF NOT EXISTS grn_mail_sent boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS grn_mail_sent_at timestamptz,
ADD COLUMN IF NOT EXISTS grn_mail_error text DEFAULT '';
