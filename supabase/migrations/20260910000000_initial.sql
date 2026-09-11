create extension if not exists pgcrypto;

create type public.staff_role as enum (
  'SUPER_ADMIN',
  'BRANCH_MANAGER',
  'RECEPTIONIST',
  'DENTIST',
  'CASHIER',
  'INVENTORY_STAFF'
);

create type public.appointment_status as enum (
  'PENDING_REVIEW',
  'CONFIRMED',
  'RESCHEDULE_PROPOSED',
  'CANCELLED',
  'DECLINED',
  'CHECKED_IN',
  'IN_TREATMENT',
  'COMPLETED',
  'NO_SHOW'
);

create type public.payment_status as enum ('UNPAID', 'PARTIAL', 'PAID', 'VOID', 'REFUNDED');
create type public.payment_method as enum ('Cash', 'GCash', 'Maya', 'Bank Transfer', 'Card', 'Other');
create type public.inventory_movement_type as enum ('IN', 'OUT', 'ADJUSTMENT');

create table public.branches (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  address text not null,
  plus_code text not null,
  latitude numeric,
  longitude numeric,
  smart_phone text,
  globe_phone text,
  maps_url text,
  google_business_profile_url text,
  google_review_url text,
  is_google_business_verified boolean not null default false,
  timezone text not null default 'Asia/Manila',
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.services (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  category text not null,
  short_description text not null,
  long_description text not null,
  default_duration_minutes integer not null default 60 check (default_duration_minutes > 0),
  price numeric check (price is null or price >= 0),
  is_active boolean not null default true,
  is_featured boolean not null default false,
  concern_tags jsonb not null default '[]'::jsonb,
  process_steps jsonb not null default '[]'::jsonb,
  faq jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.branch_services (
  branch_id uuid not null references public.branches(id) on delete cascade,
  service_id uuid not null references public.services(id) on delete cascade,
  is_available boolean not null default true,
  custom_duration_minutes integer,
  custom_price numeric,
  primary key (branch_id, service_id)
);

create table public.staff_profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  full_name text not null,
  role public.staff_role not null,
  branch_id uuid references public.branches(id) on delete set null,
  is_active boolean not null default true,
  must_change_password boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.patients (
  id uuid primary key default gen_random_uuid(),
  full_name text not null,
  phone text not null,
  phone_normalized text not null unique,
  email text,
  preferred_branch_id uuid references public.branches(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  last_visit_at timestamptz
);

create table public.appointments (
  id uuid primary key default gen_random_uuid(),
  public_code text not null unique,
  patient_id uuid not null references public.patients(id) on delete restrict,
  branch_id uuid not null references public.branches(id) on delete restrict,
  service_id uuid references public.services(id) on delete set null,
  concern_text text,
  requested_start_at timestamptz not null,
  confirmed_start_at timestamptz,
  duration_minutes integer not null default 30 check (duration_minutes > 0),
  status public.appointment_status not null default 'PENDING_REVIEW',
  source text not null default 'PUBLIC' check (source in ('PUBLIC', 'STAFF')),
  patient_message text,
  internal_note text,
  assigned_dentist_id uuid references public.staff_profiles(id) on delete set null,
  created_by_staff_id uuid references public.staff_profiles(id) on delete set null,
  updated_by_staff_id uuid references public.staff_profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  cancelled_at timestamptz,
  completed_at timestamptz
);

create index appointments_branch_time_idx on public.appointments (branch_id, requested_start_at);
create index appointments_status_idx on public.appointments (status);
create index appointments_patient_idx on public.appointments (patient_id);

create table public.appointment_status_history (
  id uuid primary key default gen_random_uuid(),
  appointment_id uuid not null references public.appointments(id) on delete cascade,
  from_status public.appointment_status,
  to_status public.appointment_status not null,
  changed_by uuid references public.staff_profiles(id) on delete set null,
  note text,
  created_at timestamptz not null default now()
);

create table public.availability_rules (
  id uuid primary key default gen_random_uuid(),
  branch_id uuid not null references public.branches(id) on delete cascade,
  staff_id uuid references public.staff_profiles(id) on delete cascade,
  weekday smallint not null check (weekday between 0 and 6),
  open_time time not null,
  close_time time not null,
  slot_interval_minutes integer not null default 30 check (slot_interval_minutes > 0),
  capacity integer not null default 1 check (capacity > 0),
  is_active boolean not null default true,
  unique (branch_id, staff_id, weekday)
);

create table public.blocked_times (
  id uuid primary key default gen_random_uuid(),
  branch_id uuid not null references public.branches(id) on delete cascade,
  staff_id uuid references public.staff_profiles(id) on delete cascade,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  reason text not null,
  created_by uuid references public.staff_profiles(id) on delete set null,
  check (ends_at > starts_at)
);

create table public.payments (
  id uuid primary key default gen_random_uuid(),
  appointment_id uuid references public.appointments(id) on delete set null,
  patient_id uuid not null references public.patients(id) on delete restrict,
  branch_id uuid not null references public.branches(id) on delete restrict,
  amount numeric not null check (amount > 0),
  payment_method public.payment_method not null,
  status public.payment_status not null default 'PAID',
  reference_number text,
  paid_at timestamptz,
  created_by uuid references public.staff_profiles(id) on delete set null,
  created_at timestamptz not null default now()
);

create table public.inventory_items (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  sku text unique,
  unit text not null,
  reorder_level numeric not null default 0 check (reorder_level >= 0),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.inventory_stock (
  branch_id uuid not null references public.branches(id) on delete cascade,
  inventory_item_id uuid not null references public.inventory_items(id) on delete cascade,
  quantity numeric not null default 0 check (quantity >= 0),
  updated_at timestamptz not null default now(),
  primary key (branch_id, inventory_item_id)
);

create table public.inventory_movements (
  id uuid primary key default gen_random_uuid(),
  branch_id uuid not null references public.branches(id) on delete restrict,
  inventory_item_id uuid not null references public.inventory_items(id) on delete restrict,
  type public.inventory_movement_type not null,
  quantity numeric not null check (quantity > 0),
  reason text not null,
  appointment_id uuid references public.appointments(id) on delete set null,
  created_by uuid references public.staff_profiles(id) on delete set null,
  created_at timestamptz not null default now()
);

create table public.verified_reviews (
  id uuid primary key default gen_random_uuid(),
  branch_id uuid references public.branches(id) on delete set null,
  reviewer_display_name text not null,
  rating integer not null check (rating between 1 and 5),
  review_text text not null,
  source text not null,
  source_url text,
  is_verified boolean not null default false,
  is_published boolean not null default false,
  created_at timestamptz not null default now()
);

create table public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  actor_user_id uuid references auth.users(id) on delete set null,
  action text not null,
  entity_type text not null,
  entity_id uuid,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table public.system_settings (
  key text primary key,
  value jsonb not null,
  updated_by uuid references public.staff_profiles(id) on delete set null,
  updated_at timestamptz not null default now()
);

create schema if not exists private;

create or replace function private.current_staff_role()
returns public.staff_role
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select role
  from public.staff_profiles
  where id = (select auth.uid()) and is_active = true
  limit 1
$$;

create or replace function private.staff_can_branch(target_branch_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1
    from public.staff_profiles
    where id = (select auth.uid())
      and is_active = true
      and (role = 'SUPER_ADMIN' or branch_id = target_branch_id)
  )
$$;

revoke all on function private.current_staff_role() from public;
revoke all on function private.staff_can_branch(uuid) from public;
grant execute on function private.current_staff_role() to authenticated;
grant execute on function private.staff_can_branch(uuid) to authenticated;

alter table public.branches enable row level security;
alter table public.services enable row level security;
alter table public.branch_services enable row level security;
alter table public.staff_profiles enable row level security;
alter table public.patients enable row level security;
alter table public.appointments enable row level security;
alter table public.appointment_status_history enable row level security;
alter table public.availability_rules enable row level security;
alter table public.blocked_times enable row level security;
alter table public.payments enable row level security;
alter table public.inventory_items enable row level security;
alter table public.inventory_stock enable row level security;
alter table public.inventory_movements enable row level security;
alter table public.verified_reviews enable row level security;
alter table public.audit_logs enable row level security;
alter table public.system_settings enable row level security;

revoke all on all tables in schema public from anon;
revoke all on all tables in schema public from authenticated;

grant select on public.branches, public.services, public.branch_services, public.verified_reviews to anon;
grant select on all tables in schema public to authenticated;
grant insert, update on public.appointments, public.appointment_status_history, public.payments, public.inventory_items, public.inventory_stock, public.inventory_movements, public.services, public.branches, public.system_settings to authenticated;

-- The deployed Next.js server uses Supabase's server-only service_role key.
-- Keep this grant explicit because the table-wide authenticated revoke above
-- does not grant the server role access to newly created tables.
grant usage on schema public to service_role;
grant select, insert, update, delete on all tables in schema public to service_role;
grant usage, select on all sequences in schema public to service_role;
alter default privileges in schema public grant select, insert, update, delete on tables to service_role;
alter default privileges in schema public grant usage, select on sequences to service_role;

create policy public_active_branches on public.branches for select to anon, authenticated using (is_active = true);
create policy public_active_services on public.services for select to anon, authenticated using (is_active = true);
create policy public_available_branch_services on public.branch_services for select to anon, authenticated using (is_available = true);
create policy public_published_reviews on public.verified_reviews for select to anon, authenticated using (is_published = true and is_verified = true);

create policy staff_profile_access on public.staff_profiles for select to authenticated using (id = (select auth.uid()) or private.current_staff_role() = 'SUPER_ADMIN');
create policy staff_profile_update_super_admin on public.staff_profiles for update to authenticated using (private.current_staff_role() = 'SUPER_ADMIN') with check (private.current_staff_role() = 'SUPER_ADMIN');

create policy staff_branch_appointments_select on public.appointments for select to authenticated using (private.staff_can_branch(branch_id));
create policy staff_branch_appointments_insert on public.appointments for insert to authenticated with check (private.staff_can_branch(branch_id));
create policy staff_branch_appointments_update on public.appointments for update to authenticated using (private.staff_can_branch(branch_id)) with check (private.staff_can_branch(branch_id));

create policy staff_branch_history_select on public.appointment_status_history for select to authenticated using (exists (select 1 from public.appointments a where a.id = appointment_id and private.staff_can_branch(a.branch_id)));
create policy staff_branch_history_insert on public.appointment_status_history for insert to authenticated with check (exists (select 1 from public.appointments a where a.id = appointment_id and private.staff_can_branch(a.branch_id)));

create policy staff_patient_select on public.patients for select to authenticated using (private.staff_can_branch(preferred_branch_id) or private.current_staff_role() = 'SUPER_ADMIN');
create policy staff_patient_insert on public.patients for insert to authenticated with check (private.staff_can_branch(preferred_branch_id) or private.current_staff_role() = 'SUPER_ADMIN');
create policy staff_patient_update on public.patients for update to authenticated using (private.staff_can_branch(preferred_branch_id) or private.current_staff_role() = 'SUPER_ADMIN') with check (private.staff_can_branch(preferred_branch_id) or private.current_staff_role() = 'SUPER_ADMIN');

create policy staff_branch_payments_select on public.payments for select to authenticated using (private.staff_can_branch(branch_id) and private.current_staff_role() in ('SUPER_ADMIN', 'BRANCH_MANAGER', 'CASHIER'));
create policy staff_branch_payments_insert on public.payments for insert to authenticated with check (private.staff_can_branch(branch_id) and private.current_staff_role() in ('SUPER_ADMIN', 'BRANCH_MANAGER', 'CASHIER'));

create policy staff_inventory_items_access on public.inventory_items for all to authenticated using (private.current_staff_role() in ('SUPER_ADMIN', 'BRANCH_MANAGER', 'INVENTORY_STAFF')) with check (private.current_staff_role() in ('SUPER_ADMIN', 'BRANCH_MANAGER', 'INVENTORY_STAFF'));
create policy staff_inventory_stock_access on public.inventory_stock for all to authenticated using (private.staff_can_branch(branch_id) and private.current_staff_role() in ('SUPER_ADMIN', 'BRANCH_MANAGER', 'INVENTORY_STAFF')) with check (private.staff_can_branch(branch_id) and private.current_staff_role() in ('SUPER_ADMIN', 'BRANCH_MANAGER', 'INVENTORY_STAFF'));
create policy staff_inventory_movement_access on public.inventory_movements for all to authenticated using (private.staff_can_branch(branch_id) and private.current_staff_role() in ('SUPER_ADMIN', 'BRANCH_MANAGER', 'INVENTORY_STAFF')) with check (private.staff_can_branch(branch_id) and private.current_staff_role() in ('SUPER_ADMIN', 'BRANCH_MANAGER', 'INVENTORY_STAFF'));

create policy staff_branch_availability_select on public.availability_rules for select to authenticated using (private.staff_can_branch(branch_id));
create policy staff_branch_blocked_select on public.blocked_times for select to authenticated using (private.staff_can_branch(branch_id));
create policy staff_reviews_manage on public.verified_reviews for all to authenticated using (private.current_staff_role() in ('SUPER_ADMIN', 'BRANCH_MANAGER')) with check (private.current_staff_role() in ('SUPER_ADMIN', 'BRANCH_MANAGER'));
create policy super_admin_audit_read on public.audit_logs for select to authenticated using (private.current_staff_role() = 'SUPER_ADMIN');
create policy super_admin_settings_access on public.system_settings for all to authenticated using (private.current_staff_role() = 'SUPER_ADMIN') with check (private.current_staff_role() = 'SUPER_ADMIN');

do $$
begin
  begin
    alter publication supabase_realtime add table public.appointments;
  exception when duplicate_object then
    null;
  end;
end $$;
