-- Stack n Stock authenticated access policies
-- Run this after creating inventory_items and quarantine_items.
-- This replaces demo public CRUD policies with authenticated-user-only CRUD.

alter table public.inventory_items enable row level security;
alter table public.quarantine_items enable row level security;
alter table if exists public.bin_locations enable row level security;
alter table if exists public.stock_movements enable row level security;

drop policy if exists "inventory_items_select" on public.inventory_items;
drop policy if exists "inventory_items_insert" on public.inventory_items;
drop policy if exists "inventory_items_update" on public.inventory_items;
drop policy if exists "inventory_items_delete" on public.inventory_items;
drop policy if exists "quarantine_items_select" on public.quarantine_items;
drop policy if exists "quarantine_items_insert" on public.quarantine_items;
drop policy if exists "quarantine_items_update" on public.quarantine_items;
drop policy if exists "quarantine_items_delete" on public.quarantine_items;

drop policy if exists "authenticated_inventory_select" on public.inventory_items;
drop policy if exists "authenticated_inventory_insert" on public.inventory_items;
drop policy if exists "authenticated_inventory_update" on public.inventory_items;
drop policy if exists "authenticated_inventory_delete" on public.inventory_items;
drop policy if exists "authenticated_quarantine_select" on public.quarantine_items;
drop policy if exists "authenticated_quarantine_insert" on public.quarantine_items;
drop policy if exists "authenticated_quarantine_update" on public.quarantine_items;
drop policy if exists "authenticated_quarantine_delete" on public.quarantine_items;

create policy "authenticated_inventory_select" on public.inventory_items for select to authenticated using (true);
create policy "authenticated_inventory_insert" on public.inventory_items for insert to authenticated with check (true);
create policy "authenticated_inventory_update" on public.inventory_items for update to authenticated using (true) with check (true);
create policy "authenticated_inventory_delete" on public.inventory_items for delete to authenticated using (true);

create policy "authenticated_quarantine_select" on public.quarantine_items for select to authenticated using (true);
create policy "authenticated_quarantine_insert" on public.quarantine_items for insert to authenticated with check (true);
create policy "authenticated_quarantine_update" on public.quarantine_items for update to authenticated using (true) with check (true);
create policy "authenticated_quarantine_delete" on public.quarantine_items for delete to authenticated using (true);


drop policy if exists "authenticated_bin_locations_select" on public.bin_locations;
drop policy if exists "authenticated_bin_locations_insert" on public.bin_locations;
drop policy if exists "authenticated_bin_locations_update" on public.bin_locations;
drop policy if exists "authenticated_bin_locations_delete" on public.bin_locations;
drop policy if exists "authenticated_stock_movements_select" on public.stock_movements;
drop policy if exists "authenticated_stock_movements_insert" on public.stock_movements;
drop policy if exists "authenticated_stock_movements_update" on public.stock_movements;
drop policy if exists "authenticated_stock_movements_delete" on public.stock_movements;

create policy "authenticated_bin_locations_select" on public.bin_locations for select to authenticated using (true);
create policy "authenticated_bin_locations_insert" on public.bin_locations for insert to authenticated with check (true);
create policy "authenticated_bin_locations_update" on public.bin_locations for update to authenticated using (true) with check (true);
create policy "authenticated_bin_locations_delete" on public.bin_locations for delete to authenticated using (true);

create policy "authenticated_stock_movements_select" on public.stock_movements for select to authenticated using (true);
create policy "authenticated_stock_movements_insert" on public.stock_movements for insert to authenticated with check (true);
create policy "authenticated_stock_movements_update" on public.stock_movements for update to authenticated using (true) with check (true);
create policy "authenticated_stock_movements_delete" on public.stock_movements for delete to authenticated using (true);
