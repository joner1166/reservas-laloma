/* =========================================================
   0) EXTENSION
   ========================================================= */
create extension if not exists "pgcrypto";

/* =========================================================
   1) Crear tabla reservations
   ========================================================= */
create table if not exists public.reservations (
  id            bigserial primary key,
  "firstName"   text not null,
  "lastName"    text not null,
  guests        integer not null default 2,
  "dateISO"     text not null,
  "timeHHMM"    text not null,
  phone         text not null,
  email         text null,
  celebration   text not null default 'None',
  dietary       text not null default 'None',
  notes         text null,
  status        text not null default 'reserved',
  source        text not null default 'reservation',
  seated_at     timestamptz null,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

/* =========================================================
   2) Asegurar columnas
   ========================================================= */
alter table public.reservations
  add column if not exists "firstName"        text,
  add column if not exists "lastName"         text,
  add column if not exists guests             integer not null default 2,
  add column if not exists "dateISO"          text,
  add column if not exists "timeHHMM"         text,
  add column if not exists phone              text,
  add column if not exists email              text,
  add column if not exists celebration        text not null default 'None',
  add column if not exists dietary            text not null default 'None',
  add column if not exists notes              text,
  add column if not exists status             text not null default 'reserved',
  add column if not exists source             text not null default 'reservation',
  add column if not exists seated_at          timestamptz,
  add column if not exists created_at         timestamptz not null default now(),
  add column if not exists updated_at         timestamptz not null default now(),
  add column if not exists "sms_opt_in"       boolean default false,
  add column if not exists "cancel_token"     text,
  add column if not exists "reminder_sent_at" timestamptz null,
  add column if not exists "confirmed_at"     timestamptz default null,
  add column if not exists notified_at        timestamptz null,
  add column if not exists estimated_wait     integer null,
  add column if not exists checked_in_at      timestamptz null;

/* =========================================================
   3) Limpieza de datos
   ========================================================= */
update public.reservations set status = 'reserved'
where status is null or btrim(status) = ''
   or lower(btrim(status)) not in ('reserved','waitlist','seated','cancelled','no_show');

update public.reservations set source = 'reservation'
where source is null or btrim(source) = ''
   or lower(btrim(source)) not in ('reservation','walkin','online','phone');

update public.reservations set status = lower(btrim(status)) where status is not null;
update public.reservations set source = lower(btrim(source)) where source is not null;

/* =========================================================
   4) Constraints
   ========================================================= */
do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'reservations_status_check') then
    execute $c$ alter table public.reservations add constraint reservations_status_check
      check (status in ('reserved','waitlist','seated','cancelled','no_show')) not valid $c$;
    execute 'alter table public.reservations validate constraint reservations_status_check';
  end if;
  if exists (select 1 from pg_constraint where conname = 'reservations_source_check') then
    execute 'alter table public.reservations drop constraint reservations_source_check';
  end if;
  execute $c$ alter table public.reservations add constraint reservations_source_check
    check (source in ('reservation','walkin','online','phone')) not valid $c$;
  execute 'alter table public.reservations validate constraint reservations_source_check';
end $$;

/* =========================================================
   5) Trigger updated_at
   ========================================================= */
create or replace function public.set_updated_at()
returns trigger as $$
begin new.updated_at = now(); return new; end;
$$ language plpgsql;

drop trigger if exists reservations_set_updated_at on public.reservations;
create trigger reservations_set_updated_at
before update on public.reservations
for each row execute function public.set_updated_at();

/* =========================================================
   6) Índices
   ========================================================= */
create index if not exists reservations_date_status_idx   on public.reservations ("dateISO", status);
create index if not exists reservations_status_idx         on public.reservations (status);
create index if not exists reservations_created_at_idx     on public.reservations (created_at desc);
create index if not exists reservations_cancel_token_idx   on public.reservations ("cancel_token");
create index if not exists reservations_notified_at_idx    on public.reservations (notified_at);

/* =========================================================
   7) Realtime reservations
   ========================================================= */
alter table public.reservations replica identity full;
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'reservations'
  ) then execute 'alter publication supabase_realtime add table public.reservations'; end if;
end $$;

/* =========================================================
   8) RLS reservations
   ========================================================= */
alter table public.reservations enable row level security;
drop policy if exists "reservations_select_all" on public.reservations;
drop policy if exists "reservations_insert_all" on public.reservations;
drop policy if exists "reservations_update_all" on public.reservations;
drop policy if exists "reservations_delete_all" on public.reservations;
create policy "reservations_select_all" on public.reservations for select using (true);
create policy "reservations_insert_all" on public.reservations for insert with check (true);
create policy "reservations_update_all" on public.reservations for update using (true) with check (true);
create policy "reservations_delete_all" on public.reservations for delete using (true);

grant select on public.reservations to anon;
grant select, insert, update, delete on public.reservations to authenticated;
grant select, insert, update, delete on public.reservations to service_role;

/* =========================================================
   9) Tabla table_status
   ========================================================= */
create table if not exists public.table_status (
  id     text primary key,
  status text not null default 'av' check (status in ('av', 'occ'))
);
alter table public.table_status enable row level security;
drop policy if exists "ts_select" on public.table_status;
drop policy if exists "ts_insert" on public.table_status;
drop policy if exists "ts_update" on public.table_status;
create policy "ts_select" on public.table_status for select using (true);
create policy "ts_insert" on public.table_status for insert with check (true);
create policy "ts_update" on public.table_status for update using (true) with check (true);

grant select on public.table_status to anon;
grant select, insert, update, delete on public.table_status to authenticated;
grant select, insert, update, delete on public.table_status to service_role;
alter table public.table_status replica identity full;
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'table_status'
  ) then execute 'alter publication supabase_realtime add table public.table_status'; end if;
end $$;

insert into public.table_status (id, status) values
  ('VIEW-60','av'),('VIEW-61','av'),('VIEW-62','av'),('VIEW-63','av'),('VIEW-64','av'),
  ('VIEW-65','av'),('VIEW-66','av'),('VIEW-67','av'),('VIEW-68','av'),('VIEW-69','av'),
  ('VIEW-70','av'),('VIEW-71','av'),('VIEW-72','av'),('VIEW-73','av'),('VIEW-74','av'),
  ('VIEW-75','av'),('VIEW-76','av'),('VIEW-77','av'),('VIEW-78','av'),
  ('THIRTIES-30','av'),('THIRTIES-31','av'),('THIRTIES-32','av'),('THIRTIES-33','av'),
  ('THIRTIES-34','av'),('THIRTIES-35','av'),('THIRTIES-36','av'),('THIRTIES-37','av'),
  ('BAR-1','av'),('BAR-2','av'),('BAR-3','av'),('BAR-4','av'),('BAR-5','av'),
  ('BAR-6','av'),('BAR-7','av'),('BAR-8','av'),('BAR-9','av'),('BAR-10','av'),
  ('BAR-11','av'),('BAR-12','av'),('BAR-13','av'),('BAR-14','av'),('BAR-15','av'),
  ('BAR-16','av'),('BAR-17','av'),
  ('FIFTIES-50','av'),('FIFTIES-51','av'),('FIFTIES-52','av'),('FIFTIES-53','av'),
  ('EIGHTIES-80','av'),('EIGHTIES-81','av'),('EIGHTIES-82','av'),('EIGHTIES-83','av'),('EIGHTIES-84','av'),
  ('TWENTIES-20','av'),('TWENTIES-21','av'),('TWENTIES-22','av'),('TWENTIES-23','av'),
  ('TWENTIES-24','av'),('TWENTIES-25','av'),('TWENTIES-26','av'),('TWENTIES-27','av'),
  ('TWENTIES-28','av'),('TWENTIES-44','av'),('TWENTIES-45','av'),('TWENTIES-46','av'),('TWENTIES-47','av'),
  ('TENS-1','av'),('TENS-2','av'),('TENS-3','av'),('TENS-4','av'),('TENS-5','av'),
  ('TENS-6','av'),('TENS-7','av'),('TENS-8','av'),('TENS-10','av'),('TENS-11','av'),
  ('TENS-12','av'),('TENS-13','av'),('TENS-14','av'),('TENS-15','av'),('TENS-16','av'),
  ('TENS-17','av'),('TENS-40','av'),('TENS-41','av'),('TENS-42','av'),('TENS-43','av')
on conflict (id) do nothing;

/* =========================================================
   10) Tabla blackout_dates
   ========================================================= */
create table if not exists public.blackout_dates (
  date_iso text primary key
);
alter table public.blackout_dates enable row level security;
drop policy if exists "bd_select" on public.blackout_dates;
drop policy if exists "bd_insert" on public.blackout_dates;
drop policy if exists "bd_delete" on public.blackout_dates;
create policy "bd_select" on public.blackout_dates for select using (true);
create policy "bd_insert" on public.blackout_dates for insert with check (true);
create policy "bd_delete" on public.blackout_dates for delete using (true);

grant select on public.blackout_dates to anon;
grant select, insert, update, delete on public.blackout_dates to authenticated;
grant select, insert, update, delete on public.blackout_dates to service_role;
alter table public.blackout_dates replica identity full;
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'blackout_dates'
  ) then execute 'alter publication supabase_realtime add table public.blackout_dates'; end if;
end $$;
alter table public.blackout_dates add column if not exists notes text;
alter table public.blackout_dates add column if not exists type text default 'closed';
alter table public.table_status  add column if not exists server_names text[] default '{}';
alter table public.table_status  add column if not exists reserved_name text default null;
do $$
begin
  if exists (select 1 from pg_constraint where conname = 'table_status_status_check') then
    execute 'alter table public.table_status drop constraint table_status_status_check';
  end if;
  execute $c$ alter table public.table_status add constraint table_status_status_check
    check (status in ('av','occ','reserved')) $c$;
end $$;

/* =========================================================
   11) Tabla table_events
   ========================================================= */
create table if not exists public.table_events (
  id          bigserial primary key,
  table_id    text not null,
  server_name text null,
  date_iso    text not null,
  created_at  timestamptz not null default now()
);
alter table public.table_events enable row level security;
drop policy if exists "te_select" on public.table_events;
drop policy if exists "te_insert" on public.table_events;
create policy "te_select" on public.table_events for select using (true);
create policy "te_insert" on public.table_events for insert with check (true);

grant select on public.table_events to anon;
grant select, insert, update, delete on public.table_events to authenticated;
grant select, insert, update, delete on public.table_events to service_role;
alter table public.table_events replica identity full;
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and tablename = 'table_events'
  ) then execute 'alter publication supabase_realtime add table public.table_events'; end if;
end $$;

create index if not exists te_table_date_idx on public.table_events (table_id, date_iso);
create index if not exists te_date_idx       on public.table_events (date_iso);

/* =========================================================
   12) Tabla servers
   ========================================================= */
create table if not exists public.servers (
  id         bigserial primary key,
  name       text not null,
  created_at timestamptz not null default now()
);
alter table public.servers enable row level security;
drop policy if exists "servers_select" on public.servers;
drop policy if exists "servers_insert" on public.servers;
drop policy if exists "servers_update" on public.servers;
drop policy if exists "servers_delete" on public.servers;
create policy "servers_select" on public.servers for select using (true);
create policy "servers_insert" on public.servers for insert with check (true);
create policy "servers_update" on public.servers for update using (true) with check (true);
create policy "servers_delete" on public.servers for delete using (true);

grant select on public.servers to anon;
grant select, insert, update, delete on public.servers to authenticated;
grant select, insert, update, delete on public.servers to service_role;
alter table public.servers replica identity full;
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'servers'
  ) then execute 'alter publication supabase_realtime add table public.servers'; end if;
end $$;
