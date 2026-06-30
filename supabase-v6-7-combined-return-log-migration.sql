-- v6.7 New Combined Return Log (NCRL)
-- Creates traceability tables for converting multiple issued items into one new inventory item.

create table if not exists public.combined_return_logs (
  id text primary key,
  ncrl_no text not null unique,
  ncrl_date date not null default current_date,
  source_ticket_no text,
  returned_by text,
  returned_by_email text,
  received_by text,
  notes text,
  new_item_id text,
  new_item_code text not null,
  new_description text,
  new_supplier text,
  new_uom text,
  new_qty_added numeric default 0,
  new_bin text,
  new_status text default 'OK',
  new_part_no text,
  created_by uuid,
  created_by_email text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists public.combined_return_log_lines (
  id text primary key,
  combined_return_id text not null references public.combined_return_logs(id) on delete cascade,
  source_ticket_no text,
  source_item_id text,
  source_item_code text,
  source_description text,
  source_bin text,
  source_uom text,
  qty_issued numeric default 0,
  qty_already_returned numeric default 0,
  qty_available numeric default 0,
  qty_used numeric default 0,
  remarks text,
  created_at timestamptz default now()
);

alter table public.combined_return_logs enable row level security;
alter table public.combined_return_log_lines enable row level security;

do $$ begin
  create policy "Authenticated users can read combined_return_logs" on public.combined_return_logs for select to authenticated using (true);
exception when duplicate_object then null; end $$;
do $$ begin
  create policy "Authenticated users can insert combined_return_logs" on public.combined_return_logs for insert to authenticated with check (true);
exception when duplicate_object then null; end $$;
do $$ begin
  create policy "Authenticated users can update combined_return_logs" on public.combined_return_logs for update to authenticated using (true) with check (true);
exception when duplicate_object then null; end $$;
do $$ begin
  create policy "Authenticated users can delete combined_return_logs" on public.combined_return_logs for delete to authenticated using (true);
exception when duplicate_object then null; end $$;

do $$ begin
  create policy "Authenticated users can read combined_return_log_lines" on public.combined_return_log_lines for select to authenticated using (true);
exception when duplicate_object then null; end $$;
do $$ begin
  create policy "Authenticated users can insert combined_return_log_lines" on public.combined_return_log_lines for insert to authenticated with check (true);
exception when duplicate_object then null; end $$;
do $$ begin
  create policy "Authenticated users can update combined_return_log_lines" on public.combined_return_log_lines for update to authenticated using (true) with check (true);
exception when duplicate_object then null; end $$;
do $$ begin
  create policy "Authenticated users can delete combined_return_log_lines" on public.combined_return_log_lines for delete to authenticated using (true);
exception when duplicate_object then null; end $$;

create index if not exists idx_combined_return_logs_source_ticket on public.combined_return_logs(source_ticket_no);
create index if not exists idx_combined_return_lines_combined_id on public.combined_return_log_lines(combined_return_id);
create index if not exists idx_combined_return_lines_source on public.combined_return_log_lines(source_ticket_no, source_item_code, source_bin);
