-- v6.5 return logs
create table if not exists public.return_logs (
  id text primary key,
  return_no text not null unique,
  return_date date not null default current_date,
  source_ticket_no text,
  returned_by text,
  received_by text,
  notes text,
  total_qty numeric default 0,
  created_by uuid,
  created_by_email text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists public.return_log_lines (
  id text primary key,
  return_id text not null references public.return_logs(id) on delete cascade,
  source_ticket_no text,
  item_id text,
  item_code text,
  description text,
  from_bin text,
  uom text,
  qty_issued numeric default 0,
  qty_already_returned numeric default 0,
  qty_returnable numeric default 0,
  qty_returned numeric default 0,
  remarks text,
  created_at timestamptz default now()
);

alter table public.return_logs enable row level security;
alter table public.return_log_lines enable row level security;

do $$ begin
  create policy "Authenticated users can read return_logs" on public.return_logs for select to authenticated using (true);
exception when duplicate_object then null; end $$;
do $$ begin
  create policy "Authenticated users can insert return_logs" on public.return_logs for insert to authenticated with check (true);
exception when duplicate_object then null; end $$;
do $$ begin
  create policy "Authenticated users can update return_logs" on public.return_logs for update to authenticated using (true) with check (true);
exception when duplicate_object then null; end $$;

do $$ begin
  create policy "Authenticated users can read return_log_lines" on public.return_log_lines for select to authenticated using (true);
exception when duplicate_object then null; end $$;
do $$ begin
  create policy "Authenticated users can insert return_log_lines" on public.return_log_lines for insert to authenticated with check (true);
exception when duplicate_object then null; end $$;
do $$ begin
  create policy "Authenticated users can update return_log_lines" on public.return_log_lines for update to authenticated using (true) with check (true);
exception when duplicate_object then null; end $$;
