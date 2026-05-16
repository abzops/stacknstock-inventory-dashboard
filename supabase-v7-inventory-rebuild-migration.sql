-- Stack n Stock Inventory Dashboard V7 migration
-- Run after the base schema and v4/v5/v6.5 migrations.

create table if not exists public.stock_ledger (
  id text primary key,
  ledger_date date not null default current_date,
  movement_type text not null,
  source_doc_type text default '',
  source_doc_no text default '',
  source_line_id text default '',
  item_id text default '',
  item_code text not null default '',
  description text default '',
  uom text default '',
  in_qty numeric default 0,
  out_qty numeric default 0,
  from_bin text default '',
  to_bin text default '',
  location_status text default 'OK',
  work_order text default '',
  department text default '',
  vendor text default '',
  qty_before numeric default 0,
  qty_after numeric default 0,
  unit_cost numeric default 0,
  total_value numeric default 0,
  remarks text default '',
  created_by uuid,
  created_by_email text default '',
  created_at timestamptz default now()
);

create table if not exists public.grn_headers (
  id text primary key,
  grn_no text not null unique,
  grn_date date not null default current_date,
  po_no text default '',
  supplier text not null default '',
  invoice_no text default '',
  dc_no text default '',
  received_by text default '',
  qc_status text default 'PENDING',
  remarks text default '',
  created_by uuid,
  created_by_email text default '',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists public.grn_lines (
  id text primary key,
  grn_id text not null references public.grn_headers(id) on delete cascade,
  item_code text not null default '',
  description text default '',
  uom text default '',
  ordered_qty numeric default 0,
  received_qty numeric default 0,
  accepted_qty numeric default 0,
  rejected_qty numeric default 0,
  hold_qty numeric default 0,
  putaway_bin text default '',
  unit_rate numeric default 0,
  landed_cost numeric default 0,
  qc_status text default 'PENDING',
  remarks text default '',
  created_at timestamptz default now()
);

create table if not exists public.miv_headers (
  id text primary key,
  miv_no text not null unique,
  miv_date date not null default current_date,
  source_ticket_no text default '',
  issued_from text default '',
  issued_to text default '',
  department text default '',
  work_order text default '',
  issue_type text default 'PRODUCTION',
  return_expected text default 'N',
  expected_return_date date,
  issued_by text default '',
  received_by text default '',
  status text default 'ISSUED',
  remarks text default '',
  created_by uuid,
  created_by_email text default '',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists public.miv_lines (
  id text primary key,
  miv_id text not null references public.miv_headers(id) on delete cascade,
  item_id text default '',
  item_code text not null default '',
  description text default '',
  uom text default '',
  from_bin text default '',
  qty_requested numeric default 0,
  qty_issued numeric default 0,
  remarks text default '',
  created_at timestamptz default now()
);

create table if not exists public.delivery_challans (
  id text primary key,
  dc_no text not null unique,
  dc_date date not null default current_date,
  linked_job_work_no text default '',
  vendor text not null default '',
  vendor_address text default '',
  vendor_gstin text default '',
  purpose text default 'JOB_WORK',
  returnable text default 'Y',
  expected_return_date date,
  vehicle_no text default '',
  transporter text default '',
  eway_bill_no text default '',
  approx_value numeric default 0,
  status text default 'OPEN',
  remarks text default '',
  created_by uuid,
  created_by_email text default '',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists public.delivery_challan_lines (
  id text primary key,
  dc_id text not null references public.delivery_challans(id) on delete cascade,
  item_code text not null default '',
  description text default '',
  hsn_sac text default '',
  uom text default '',
  qty numeric default 0,
  rate numeric default 0,
  value numeric default 0,
  remarks text default '',
  created_at timestamptz default now()
);

create table if not exists public.job_work_headers (
  id text primary key,
  job_work_no text not null unique,
  date_sent date not null default current_date,
  vendor text not null default '',
  delivery_challan_no text default '',
  expected_return_date date,
  process_instruction text default '',
  status text default 'OPEN',
  vendor_invoice_no text default '',
  job_charges numeric default 0,
  transport_cost numeric default 0,
  gst_amount numeric default 0,
  remarks text default '',
  created_by uuid,
  created_by_email text default '',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists public.job_work_lines (
  id text primary key,
  job_work_id text not null references public.job_work_headers(id) on delete cascade,
  source_item_code text not null default '',
  source_description text default '',
  source_uom text default '',
  qty_sent numeric default 0,
  output_item_code text default '',
  output_description text default '',
  qty_received numeric default 0,
  wastage_qty numeric default 0,
  qc_status text default 'PENDING',
  remarks text default '',
  created_at timestamptz default now()
);

create table if not exists public.wip_conversions (
  id text primary key,
  wip_no text not null unique,
  start_date date not null default current_date,
  completion_date date,
  work_order text default '',
  process_name text default '',
  output_item_code text not null default '',
  output_description text default '',
  output_uom text default '',
  output_qty numeric default 0,
  labour_cost numeric default 0,
  consumables_cost numeric default 0,
  status text default 'IN_PROGRESS',
  remarks text default '',
  created_by uuid,
  created_by_email text default '',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists public.wip_conversion_lines (
  id text primary key,
  wip_id text not null references public.wip_conversions(id) on delete cascade,
  input_item_code text not null default '',
  input_description text default '',
  input_uom text default '',
  qty_used numeric default 0,
  unit_cost numeric default 0,
  total_value numeric default 0,
  remarks text default '',
  created_at timestamptz default now()
);

create table if not exists public.scrap_register (
  id text primary key,
  scrap_no text not null unique,
  scrap_date date not null default current_date,
  source_doc_type text default '',
  source_doc_no text default '',
  item_code text not null default '',
  description text default '',
  uom text default '',
  qty_scrapped numeric default 0,
  reason text default '',
  approved_by text default '',
  scrap_value numeric default 0,
  status text default 'RECORDED',
  remarks text default '',
  created_by uuid,
  created_by_email text default '',
  created_at timestamptz default now()
);

create table if not exists public.reorder_settings (
  id text primary key,
  item_code text not null unique,
  reorder_point numeric default 0,
  reorder_qty numeric default 0,
  enabled boolean default true,
  preferred_supplier text default '',
  lead_time_days numeric default 0,
  updated_by uuid,
  updated_at timestamptz default now()
);

create table if not exists public.item_cost_layers (
  id text primary key,
  item_code text not null default '',
  source_doc_type text default '',
  source_doc_no text default '',
  qty numeric default 0,
  unit_cost numeric default 0,
  total_value numeric default 0,
  cost_method text default 'ACTUAL',
  created_at timestamptz default now()
);

create table if not exists public.user_roles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  role text not null default 'viewer',
  department text default '',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index if not exists idx_stock_ledger_item_code on public.stock_ledger(item_code);
create index if not exists idx_stock_ledger_doc on public.stock_ledger(source_doc_type, source_doc_no);
create index if not exists idx_stock_ledger_created_at on public.stock_ledger(created_at desc);
create index if not exists idx_grn_headers_grn_no on public.grn_headers(grn_no);
create index if not exists idx_grn_lines_grn_id on public.grn_lines(grn_id);
create index if not exists idx_miv_headers_miv_no on public.miv_headers(miv_no);
create index if not exists idx_miv_lines_miv_id on public.miv_lines(miv_id);
create index if not exists idx_delivery_challans_dc_no on public.delivery_challans(dc_no);
create index if not exists idx_job_work_headers_no on public.job_work_headers(job_work_no);
create index if not exists idx_wip_conversions_no on public.wip_conversions(wip_no);
create index if not exists idx_scrap_register_no on public.scrap_register(scrap_no);
create index if not exists idx_reorder_settings_item_code on public.reorder_settings(item_code);
create index if not exists idx_item_cost_layers_item_code on public.item_cost_layers(item_code);

alter table public.stock_ledger enable row level security;
alter table public.grn_headers enable row level security;
alter table public.grn_lines enable row level security;
alter table public.miv_headers enable row level security;
alter table public.miv_lines enable row level security;
alter table public.delivery_challans enable row level security;
alter table public.delivery_challan_lines enable row level security;
alter table public.job_work_headers enable row level security;
alter table public.job_work_lines enable row level security;
alter table public.wip_conversions enable row level security;
alter table public.wip_conversion_lines enable row level security;
alter table public.scrap_register enable row level security;
alter table public.reorder_settings enable row level security;
alter table public.item_cost_layers enable row level security;
alter table public.user_roles enable row level security;

drop policy if exists "authenticated_stock_ledger_all" on public.stock_ledger;
drop policy if exists "authenticated_grn_headers_all" on public.grn_headers;
drop policy if exists "authenticated_grn_lines_all" on public.grn_lines;
drop policy if exists "authenticated_miv_headers_all" on public.miv_headers;
drop policy if exists "authenticated_miv_lines_all" on public.miv_lines;
drop policy if exists "authenticated_delivery_challans_all" on public.delivery_challans;
drop policy if exists "authenticated_delivery_challan_lines_all" on public.delivery_challan_lines;
drop policy if exists "authenticated_job_work_headers_all" on public.job_work_headers;
drop policy if exists "authenticated_job_work_lines_all" on public.job_work_lines;
drop policy if exists "authenticated_wip_conversions_all" on public.wip_conversions;
drop policy if exists "authenticated_wip_conversion_lines_all" on public.wip_conversion_lines;
drop policy if exists "authenticated_scrap_register_all" on public.scrap_register;
drop policy if exists "authenticated_reorder_settings_all" on public.reorder_settings;
drop policy if exists "authenticated_item_cost_layers_all" on public.item_cost_layers;
drop policy if exists "authenticated_user_roles_all" on public.user_roles;

create policy "authenticated_stock_ledger_all" on public.stock_ledger for all to authenticated using (true) with check (true);
create policy "authenticated_grn_headers_all" on public.grn_headers for all to authenticated using (true) with check (true);
create policy "authenticated_grn_lines_all" on public.grn_lines for all to authenticated using (true) with check (true);
create policy "authenticated_miv_headers_all" on public.miv_headers for all to authenticated using (true) with check (true);
create policy "authenticated_miv_lines_all" on public.miv_lines for all to authenticated using (true) with check (true);
create policy "authenticated_delivery_challans_all" on public.delivery_challans for all to authenticated using (true) with check (true);
create policy "authenticated_delivery_challan_lines_all" on public.delivery_challan_lines for all to authenticated using (true) with check (true);
create policy "authenticated_job_work_headers_all" on public.job_work_headers for all to authenticated using (true) with check (true);
create policy "authenticated_job_work_lines_all" on public.job_work_lines for all to authenticated using (true) with check (true);
create policy "authenticated_wip_conversions_all" on public.wip_conversions for all to authenticated using (true) with check (true);
create policy "authenticated_wip_conversion_lines_all" on public.wip_conversion_lines for all to authenticated using (true) with check (true);
create policy "authenticated_scrap_register_all" on public.scrap_register for all to authenticated using (true) with check (true);
create policy "authenticated_reorder_settings_all" on public.reorder_settings for all to authenticated using (true) with check (true);
create policy "authenticated_item_cost_layers_all" on public.item_cost_layers for all to authenticated using (true) with check (true);
create policy "authenticated_user_roles_all" on public.user_roles for all to authenticated using (true) with check (true);
