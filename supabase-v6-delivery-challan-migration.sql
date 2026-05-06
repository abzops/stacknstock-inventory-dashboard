
-- Stack n Stock v6 Delivery Challan migration
create table if not exists public.product_price_master (
  id uuid primary key default gen_random_uuid(),
  item_code text not null unique,
  description text,
  hsn_sac text,
  uom text,
  default_rate numeric default 0,
  gst_percent numeric default 0,
  supplier text,
  part_no text,
  active boolean default true,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

insert into public.product_price_master (item_code, description, uom, supplier, part_no, default_rate, gst_percent)
select distinct item_code, description, uom, supplier, part_no, 0, 0
from public.inventory_items
where coalesce(item_code,'') <> ''
on conflict (item_code) do update set
  description = excluded.description,
  uom = excluded.uom,
  supplier = excluded.supplier,
  part_no = excluded.part_no,
  updated_at = now();

create table if not exists public.delivery_challans (
  id uuid primary key default gen_random_uuid(),
  challan_no text not null unique,
  challan_date date not null default current_date,
  po_so_ref text,
  eway_bill_no text,
  mode_of_transport text,
  place_of_supply text,
  bill_to_name text,
  bill_to_address text,
  bill_to_gstin text,
  bill_to_contact text,
  ship_to_address text,
  ship_to_contact text,
  purpose text,
  expected_return_date text,
  prepared_by text,
  authorized_by text,
  remarks text,
  total_qty numeric default 0,
  total_amount numeric default 0,
  created_by uuid,
  created_by_email text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists public.delivery_challan_lines (
  id uuid primary key default gen_random_uuid(),
  challan_id uuid references public.delivery_challans(id) on delete cascade,
  sl_no integer,
  item_code text,
  description text,
  hsn_sac text,
  uom text,
  qty numeric default 0,
  rate numeric default 0,
  amount numeric default 0,
  gst_percent numeric default 0,
  box_serial_no text,
  remarks text,
  created_at timestamptz default now()
);

alter table public.product_price_master enable row level security;
alter table public.delivery_challans enable row level security;
alter table public.delivery_challan_lines enable row level security;

drop policy if exists "authenticated_price_master_select" on public.product_price_master;
drop policy if exists "authenticated_price_master_insert" on public.product_price_master;
drop policy if exists "authenticated_price_master_update" on public.product_price_master;
drop policy if exists "authenticated_delivery_challans_all" on public.delivery_challans;
drop policy if exists "authenticated_delivery_challan_lines_all" on public.delivery_challan_lines;

create policy "authenticated_price_master_select" on public.product_price_master for select to authenticated using (true);
create policy "authenticated_price_master_insert" on public.product_price_master for insert to authenticated with check (true);
create policy "authenticated_price_master_update" on public.product_price_master for update to authenticated using (true) with check (true);
create policy "authenticated_delivery_challans_all" on public.delivery_challans for all to authenticated using (true) with check (true);
create policy "authenticated_delivery_challan_lines_all" on public.delivery_challan_lines for all to authenticated using (true) with check (true);
