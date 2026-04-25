-- Stack n Stock Inventory Dashboard Supabase Schema
-- Run this in Supabase SQL Editor, then add the project URL and anon key in config.js.

create table if not exists public.inventory_items (
  id text primary key,
  supplier text not null default '',
  item_code text not null default '',
  description text not null default '',
  uom text default '',
  qty numeric default 0,
  status text not null default 'OK' check (status in ('OK','HOLD','REJECT','MRB')),
  bin text default '',
  part_no text default '',
  updated_at timestamptz default now()
);

create table if not exists public.quarantine_items (
  id text primary key,
  date_quarantine date default current_date,
  ncr_no text not null default '',
  po_ref text default '',
  supplier text not null default '',
  item_code text not null default '',
  description text default '',
  lot_batch text default '',
  qty_hold numeric default 0,
  reason text default '',
  status text not null default 'HOLD' check (status in ('OK','HOLD','REJECT','MRB')),
  location text default '',
  disposition text default '',
  owner text default '',
  target_close date,
  actual_close date,
  remarks text default '',
  updated_at timestamptz default now()
);

create index if not exists idx_inventory_supplier on public.inventory_items (supplier);
create index if not exists idx_inventory_status on public.inventory_items (status);
create index if not exists idx_inventory_item_code on public.inventory_items (item_code);
create index if not exists idx_quarantine_status on public.quarantine_items (status);

alter table public.inventory_items enable row level security;
alter table public.quarantine_items enable row level security;

-- Authenticated policies for the dashboard. Create users in Supabase Auth first.
create policy "authenticated_inventory_select" on public.inventory_items for select to authenticated using (true);
create policy "authenticated_inventory_insert" on public.inventory_items for insert to authenticated with check (true);
create policy "authenticated_inventory_update" on public.inventory_items for update to authenticated using (true) with check (true);
create policy "authenticated_inventory_delete" on public.inventory_items for delete to authenticated using (true);

create policy "authenticated_quarantine_select" on public.quarantine_items for select to authenticated using (true);
create policy "authenticated_quarantine_insert" on public.quarantine_items for insert to authenticated with check (true);
create policy "authenticated_quarantine_update" on public.quarantine_items for update to authenticated using (true) with check (true);
create policy "authenticated_quarantine_delete" on public.quarantine_items for delete to authenticated using (true);


-- Bin location register from Store Map workbook
create table if not exists public.bin_locations (
  id text primary key,
  bin_id text not null unique,
  zone text default '',
  area_room text default '',
  rack_no text default '',
  level text default '',
  bin_no text default '',
  bin_type text default '',
  status text default 'Active',
  allowed_category text default '',
  esd_required text default '',
  capacity text default '',
  current_item_codes text default '',
  label_posted text default '',
  created_by_date text default '',
  notes text default '',
  updated_at timestamptz default now()
);

-- Production issue / stock movement log
create table if not exists public.stock_movements (
  id text primary key,
  item_id text default '',
  item_code text not null default '',
  description text default '',
  bin text default '',
  qty_taken numeric default 0,
  qty_before numeric default 0,
  qty_after numeric default 0,
  issued_to text default 'Production',
  work_order text default '',
  notes text default '',
  movement_type text default 'PRODUCTION_ISSUE',
  created_at timestamptz default now()
);

create index if not exists idx_bin_locations_bin_id on public.bin_locations (bin_id);
create index if not exists idx_bin_locations_status on public.bin_locations (status);
create index if not exists idx_stock_movements_item_code on public.stock_movements (item_code);
create index if not exists idx_stock_movements_created_at on public.stock_movements (created_at desc);

alter table public.bin_locations enable row level security;
alter table public.stock_movements enable row level security;

create policy "authenticated_bin_locations_select" on public.bin_locations for select to authenticated using (true);
create policy "authenticated_bin_locations_insert" on public.bin_locations for insert to authenticated with check (true);
create policy "authenticated_bin_locations_update" on public.bin_locations for update to authenticated using (true) with check (true);
create policy "authenticated_bin_locations_delete" on public.bin_locations for delete to authenticated using (true);

create policy "authenticated_stock_movements_select" on public.stock_movements for select to authenticated using (true);
create policy "authenticated_stock_movements_insert" on public.stock_movements for insert to authenticated with check (true);
create policy "authenticated_stock_movements_update" on public.stock_movements for update to authenticated using (true) with check (true);
create policy "authenticated_stock_movements_delete" on public.stock_movements for delete to authenticated using (true);

-- For existing projects that already used public demo policies, run supabase-auth-policies.sql once.
