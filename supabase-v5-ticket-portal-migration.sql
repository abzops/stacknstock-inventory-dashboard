-- Stack n Stock v5 migration: production request portal + material issue tickets
-- Run once after v4 migration. This does not delete existing inventory data.

create table if not exists public.material_issue_tickets (
  id text primary key,
  ticket_no text not null unique,
  status text not null default 'PENDING',
  requested_by_user_id uuid,
  requested_by_email text default '',
  requested_by_name text default '',
  department text default 'Production',
  work_order text default '',
  request_ref text default '',
  return_expected text default 'N',
  received_by text default '',
  issued_by text default '',
  notes text default '',
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  issued_at timestamptz
);

create table if not exists public.material_issue_ticket_lines (
  id text primary key,
  ticket_id text not null references public.material_issue_tickets(id) on delete cascade,
  item_id text default '',
  item_code text not null default '',
  part_no text default '',
  description text default '',
  lot_trace_id text default '',
  from_bin text default '',
  uom text default '',
  qty_requested numeric default 0,
  qty_issued numeric default 0
);

alter table public.stock_movements add column if not exists ticket_no text default '';

create index if not exists idx_material_issue_tickets_status on public.material_issue_tickets(status);
create index if not exists idx_material_issue_tickets_created_at on public.material_issue_tickets(created_at desc);
create index if not exists idx_material_issue_ticket_lines_ticket_id on public.material_issue_ticket_lines(ticket_id);
create index if not exists idx_material_issue_ticket_lines_item_code on public.material_issue_ticket_lines(item_code);

alter table public.material_issue_tickets enable row level security;
alter table public.material_issue_ticket_lines enable row level security;

-- Development/simple internal policy: every signed-in user can create/read tickets; UI separates Production and Stores views.
drop policy if exists "authenticated_material_issue_tickets_select" on public.material_issue_tickets;
drop policy if exists "authenticated_material_issue_tickets_insert" on public.material_issue_tickets;
drop policy if exists "authenticated_material_issue_tickets_update" on public.material_issue_tickets;
drop policy if exists "authenticated_material_issue_tickets_delete" on public.material_issue_tickets;
drop policy if exists "authenticated_material_issue_ticket_lines_select" on public.material_issue_ticket_lines;
drop policy if exists "authenticated_material_issue_ticket_lines_insert" on public.material_issue_ticket_lines;
drop policy if exists "authenticated_material_issue_ticket_lines_update" on public.material_issue_ticket_lines;
drop policy if exists "authenticated_material_issue_ticket_lines_delete" on public.material_issue_ticket_lines;

create policy "authenticated_material_issue_tickets_select" on public.material_issue_tickets for select to authenticated using (true);
create policy "authenticated_material_issue_tickets_insert" on public.material_issue_tickets for insert to authenticated with check (true);
create policy "authenticated_material_issue_tickets_update" on public.material_issue_tickets for update to authenticated using (true) with check (true);
create policy "authenticated_material_issue_tickets_delete" on public.material_issue_tickets for delete to authenticated using (true);

create policy "authenticated_material_issue_ticket_lines_select" on public.material_issue_ticket_lines for select to authenticated using (true);
create policy "authenticated_material_issue_ticket_lines_insert" on public.material_issue_ticket_lines for insert to authenticated with check (true);
create policy "authenticated_material_issue_ticket_lines_update" on public.material_issue_ticket_lines for update to authenticated using (true) with check (true);
create policy "authenticated_material_issue_ticket_lines_delete" on public.material_issue_ticket_lines for delete to authenticated using (true);
