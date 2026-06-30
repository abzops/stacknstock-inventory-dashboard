-- Remove Stack n Stock mailing feature database columns.
-- Run this once in the Supabase SQL editor for projects where mail tracking was already applied.

ALTER TABLE IF EXISTS public.grn_headers
  DROP COLUMN IF EXISTS grn_mail_status,
  DROP COLUMN IF EXISTS grn_mail_sent,
  DROP COLUMN IF EXISTS grn_mail_sent_at,
  DROP COLUMN IF EXISTS grn_mail_error;

ALTER TABLE IF EXISTS public.return_logs
  DROP COLUMN IF EXISTS approval_mail_sent,
  DROP COLUMN IF EXISTS approval_mail_sent_at,
  DROP COLUMN IF EXISTS approval_mail_error;

ALTER TABLE IF EXISTS public.combined_return_logs
  DROP COLUMN IF EXISTS approval_mail_sent,
  DROP COLUMN IF EXISTS approval_mail_sent_at,
  DROP COLUMN IF EXISTS approval_mail_error;
