-- Run this in the Procurement Hub Supabase project if the dashboard cannot read public.po_lines.
-- This allows the frontend to read PO line product names and prices using the publishable/anon key.
-- Do not run this if po_lines contains sensitive values that production users must not see.

alter table public.po_lines enable row level security;

drop policy if exists "allow_delivery_challan_read_po_lines" on public.po_lines;

create policy "allow_delivery_challan_read_po_lines"
on public.po_lines
for select
to anon, authenticated
using (true);
