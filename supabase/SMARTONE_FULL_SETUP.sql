-- ============================================================================
-- SmartOne - Complete Supabase Setup
-- Generated: 2026-08-30
-- Run once in Supabase Dashboard > SQL Editor as the postgres project owner.
-- Safe to run again: tables, indexes, functions, triggers and policies are
-- created or replaced idempotently. The whole setup is transactional.
-- Super administrator: mbz1372@gmail.com
-- ============================================================================

begin;

create extension if not exists pgcrypto;
create schema if not exists private;
grant usage on schema private to authenticated;

-- 1. Identity, organizations and memberships
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  locale text not null default 'fa' check (locale in ('fa','en')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 2 and 80),
  slug text not null unique,
  created_by uuid not null references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.organization_memberships (
  organization_id uuid not null references public.organizations(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null check (role in ('owner','admin','manager','member','viewer')),
  status text not null default 'active' check (status in ('invited','active','suspended')),
  branch_id uuid,
  team_id uuid,
  created_at timestamptz not null default now(),
  primary key (organization_id,user_id)
);

create table if not exists public.platform_admins (
  user_id uuid primary key references auth.users(id) on delete cascade,
  granted_at timestamptz not null default now(),
  note text
);

create index if not exists organization_memberships_user_idx on public.organization_memberships(user_id,status);
create index if not exists organization_memberships_org_role_idx on public.organization_memberships(organization_id,role,status);

create or replace function private.user_organization_ids()
returns setof uuid language sql stable security definer set search_path = '' as $$
  select organization_id
  from public.organization_memberships
  where user_id = (select auth.uid()) and status = 'active'
$$;

create or replace function private.is_super_admin()
returns boolean language sql stable security definer set search_path = '' as $$
  select exists(
    select 1 from public.platform_admins where user_id = (select auth.uid())
  )
$$;

create or replace function private.is_active_org_member(target_org uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists(
    select 1 from public.organization_memberships
    where organization_id = target_org
      and user_id = (select auth.uid())
      and status = 'active'
  )
$$;

revoke all on function private.user_organization_ids() from public;
revoke all on function private.is_super_admin() from public;
revoke all on function private.is_active_org_member(uuid) from public;
grant execute on function private.user_organization_ids() to authenticated;
grant execute on function private.is_super_admin() to authenticated;
grant execute on function private.is_active_org_member(uuid) to authenticated;

create or replace function public.create_organization(organization_name text)
returns uuid language plpgsql security definer set search_path = '' as $$
declare new_id uuid; base_slug text;
begin
  if auth.uid() is null then raise exception 'Authentication required'; end if;
  if char_length(trim(organization_name)) not between 2 and 80 then raise exception 'Invalid organization name'; end if;
  base_slug := lower(regexp_replace(trim(organization_name),'[^a-zA-Z0-9]+','-','g'));
  if base_slug = '' then base_slug := 'org'; end if;
  insert into public.organizations(name,slug,created_by)
  values(trim(organization_name),base_slug || '-' || substr(gen_random_uuid()::text,1,8),auth.uid())
  returning id into new_id;
  insert into public.organization_memberships(organization_id,user_id,role,status)
  values(new_id,auth.uid(),'owner','active');
  return new_id;
end;
$$;

revoke all on function public.create_organization(text) from public,anon;
grant execute on function public.create_organization(text) to authenticated;

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  insert into public.profiles(id,full_name)
  values(new.id,new.raw_user_meta_data->>'full_name') on conflict do nothing;
  if lower(new.email) = 'mbz1372@gmail.com' then
    insert into public.platform_admins(user_id,note)
    values(new.id,'Initial SmartOne super administrator') on conflict do nothing;
  end if;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users for each row execute procedure public.handle_new_user();

-- 2. CRM core
create table if not exists public.companies (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  name text not null check (char_length(name) between 2 and 160),
  website text, phone text, industry text, city text,
  owner_id uuid references auth.users(id),
  created_by uuid not null default auth.uid() references auth.users(id),
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);

create table if not exists public.contacts (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  company_id uuid references public.companies(id) on delete set null,
  first_name text not null, last_name text, email text, phone text, job_title text,
  owner_id uuid references auth.users(id),
  created_by uuid not null default auth.uid() references auth.users(id),
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);

create table if not exists public.leads (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  title text not null, first_name text, last_name text, company_name text, email text, phone text,
  source text,
  status text not null default 'new' check (status in ('new','working','qualified','unqualified','converted')),
  score integer not null default 0 check (score between 0 and 100),
  owner_id uuid references auth.users(id),
  created_by uuid not null default auth.uid() references auth.users(id),
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);

create table if not exists public.pipelines (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  name text not null, is_default boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists public.pipeline_stages (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  pipeline_id uuid not null references public.pipelines(id) on delete cascade,
  name text not null, position integer not null,
  probability integer not null default 0 check (probability between 0 and 100),
  unique (pipeline_id,position)
);

create table if not exists public.deals (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  pipeline_id uuid not null references public.pipelines(id),
  stage_id uuid not null references public.pipeline_stages(id),
  company_id uuid references public.companies(id) on delete set null,
  contact_id uuid references public.contacts(id) on delete set null,
  title text not null, amount numeric(18,2) not null default 0,
  currency char(3) not null default 'IRR',
  status text not null default 'open' check (status in ('open','won','lost')),
  expected_close_date date,
  owner_id uuid references auth.users(id),
  created_by uuid not null default auth.uid() references auth.users(id),
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);

create table if not exists public.activities (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  type text not null check (type in ('task','call','meeting','email','note')),
  subject text not null, description text, due_at timestamptz, completed_at timestamptz,
  contact_id uuid references public.contacts(id) on delete cascade,
  company_id uuid references public.companies(id) on delete cascade,
  deal_id uuid references public.deals(id) on delete cascade,
  assigned_to uuid references auth.users(id),
  created_by uuid not null default auth.uid() references auth.users(id),
  created_at timestamptz not null default now()
);

create table if not exists public.lead_conversions (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  lead_id uuid not null unique references public.leads(id) on delete restrict,
  company_id uuid references public.companies(id),
  contact_id uuid references public.contacts(id),
  deal_id uuid references public.deals(id),
  converted_by uuid not null default auth.uid() references auth.users(id),
  converted_at timestamptz not null default now()
);

create index if not exists companies_org_created_idx on public.companies(organization_id,created_at desc);
create index if not exists contacts_org_created_idx on public.contacts(organization_id,created_at desc);
create index if not exists leads_org_status_idx on public.leads(organization_id,status,created_at desc);
create index if not exists deals_org_stage_idx on public.deals(organization_id,stage_id,status);
create index if not exists activities_org_due_idx on public.activities(organization_id,due_at);

create or replace function public.ensure_default_pipeline(target_org uuid)
returns uuid language plpgsql security definer set search_path = '' as $$
declare pipeline_uuid uuid;
begin
  if not private.is_active_org_member(target_org) then raise exception 'Access denied'; end if;
  select id into pipeline_uuid from public.pipelines
  where organization_id = target_org and is_default limit 1;
  if pipeline_uuid is null then
    insert into public.pipelines(organization_id,name,is_default)
    values(target_org,'فروش اصلی',true) returning id into pipeline_uuid;
    insert into public.pipeline_stages(organization_id,pipeline_id,name,position,probability) values
      (target_org,pipeline_uuid,'جدید',1,10),
      (target_org,pipeline_uuid,'نیازسنجی',2,30),
      (target_org,pipeline_uuid,'پیشنهاد',3,60),
      (target_org,pipeline_uuid,'مذاکره',4,80),
      (target_org,pipeline_uuid,'نهایی',5,100);
  end if;
  return pipeline_uuid;
end;
$$;

revoke all on function public.ensure_default_pipeline(uuid) from public,anon;
grant execute on function public.ensure_default_pipeline(uuid) to authenticated;

create or replace function public.convert_lead(target_lead uuid)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  l public.leads; company_uuid uuid; contact_uuid uuid; deal_uuid uuid;
  pipeline_uuid uuid; stage_uuid uuid; prior public.lead_conversions;
begin
  select * into l from public.leads where id = target_lead for update;
  if l.id is null or not private.is_active_org_member(l.organization_id) then
    raise exception 'Lead not found or access denied';
  end if;
  select * into prior from public.lead_conversions where lead_id = l.id;
  if prior.id is not null then
    return jsonb_build_object('company_id',prior.company_id,'contact_id',prior.contact_id,'deal_id',prior.deal_id,'already_converted',true);
  end if;
  if nullif(trim(l.company_name),'') is not null then
    insert into public.companies(organization_id,name,phone,owner_id,created_by)
    values(l.organization_id,l.company_name,l.phone,l.owner_id,auth.uid()) returning id into company_uuid;
  end if;
  insert into public.contacts(organization_id,company_id,first_name,last_name,email,phone,owner_id,created_by)
  values(l.organization_id,company_uuid,coalesce(nullif(trim(l.first_name),''),'بدون نام'),l.last_name,l.email,l.phone,l.owner_id,auth.uid())
  returning id into contact_uuid;
  pipeline_uuid := public.ensure_default_pipeline(l.organization_id);
  select id into stage_uuid from public.pipeline_stages where pipeline_id = pipeline_uuid order by position limit 1;
  insert into public.deals(organization_id,pipeline_id,stage_id,company_id,contact_id,title,owner_id,created_by)
  values(l.organization_id,pipeline_uuid,stage_uuid,company_uuid,contact_uuid,l.title,l.owner_id,auth.uid())
  returning id into deal_uuid;
  update public.leads set status = 'converted',updated_at = now() where id = l.id;
  insert into public.lead_conversions(organization_id,lead_id,company_id,contact_id,deal_id)
  values(l.organization_id,l.id,company_uuid,contact_uuid,deal_uuid);
  return jsonb_build_object('company_id',company_uuid,'contact_id',contact_uuid,'deal_id',deal_uuid,'already_converted',false);
end;
$$;

revoke all on function public.convert_lead(uuid) from public,anon;
grant execute on function public.convert_lead(uuid) to authenticated;

-- 3. ERP core
create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  name text not null, sku text,
  type text not null default 'service' check (type in ('product','service')),
  sale_price numeric(18,2) not null default 0,
  cost_price numeric(18,2) not null default 0,
  unit text default 'عدد',
  status text not null default 'active' check (status in ('active','inactive')),
  created_by uuid not null default auth.uid() references auth.users(id),
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  unique (organization_id,sku)
);

create table if not exists public.invoices (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  number text not null, title text not null,
  company_id uuid references public.companies(id) on delete set null,
  amount numeric(18,2) not null default 0,
  paid_amount numeric(18,2) not null default 0,
  status text not null default 'draft' check (status in ('draft','issued','paid','overdue','cancelled')),
  due_date date,
  created_by uuid not null default auth.uid() references auth.users(id),
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  unique (organization_id,number)
);

create table if not exists public.expenses (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  title text not null, category text,
  amount numeric(18,2) not null default 0,
  expense_date date not null default current_date,
  status text not null default 'pending' check (status in ('pending','approved','paid','rejected')),
  created_by uuid not null default auth.uid() references auth.users(id),
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);

create table if not exists public.suppliers (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  name text not null, contact_name text, phone text, email text,
  status text not null default 'active' check (status in ('active','inactive')),
  created_by uuid not null default auth.uid() references auth.users(id),
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);

create table if not exists public.purchase_orders (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  number text not null, title text not null,
  supplier_id uuid references public.suppliers(id) on delete set null,
  amount numeric(18,2) not null default 0,
  status text not null default 'draft' check (status in ('draft','approved','ordered','received','cancelled')),
  expected_date date,
  created_by uuid not null default auth.uid() references auth.users(id),
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  unique (organization_id,number)
);

create table if not exists public.warehouses (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  name text not null, city text, address text,
  created_by uuid not null default auth.uid() references auth.users(id),
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);

create table if not exists public.inventory_items (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  product_id uuid not null references public.products(id) on delete cascade,
  warehouse_id uuid not null references public.warehouses(id) on delete cascade,
  quantity numeric(18,3) not null default 0,
  reorder_point numeric(18,3) not null default 0,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  unique (product_id,warehouse_id)
);

create table if not exists public.employees (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  first_name text not null, last_name text, personnel_code text, job_title text,
  department text, phone text, email text,
  employment_status text not null default 'active' check (employment_status in ('active','on_leave','terminated')),
  hire_date date,
  created_by uuid not null default auth.uid() references auth.users(id),
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  unique (organization_id,personnel_code)
);

create table if not exists public.projects (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  name text not null, description text,
  status text not null default 'planned' check (status in ('planned','active','on_hold','completed','cancelled')),
  progress integer not null default 0 check (progress between 0 and 100),
  start_date date, due_date date,
  created_by uuid not null default auth.uid() references auth.users(id),
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);

create table if not exists public.project_tasks (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  project_id uuid references public.projects(id) on delete cascade,
  title text not null,
  status text not null default 'todo' check (status in ('todo','doing','done','blocked')),
  priority text not null default 'medium' check (priority in ('low','medium','high','urgent')),
  due_date date, assigned_to uuid references auth.users(id),
  created_by uuid not null default auth.uid() references auth.users(id),
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);

create table if not exists public.tickets (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  subject text not null,
  company_id uuid references public.companies(id) on delete set null,
  contact_id uuid references public.contacts(id) on delete set null,
  status text not null default 'open' check (status in ('open','pending','resolved','closed')),
  priority text not null default 'normal' check (priority in ('low','normal','high','urgent')),
  assigned_to uuid references auth.users(id),
  created_by uuid not null default auth.uid() references auth.users(id),
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);

create index if not exists invoices_org_status_idx on public.invoices(organization_id,status,due_date);
create index if not exists expenses_org_date_idx on public.expenses(organization_id,expense_date desc);
create index if not exists purchase_org_status_idx on public.purchase_orders(organization_id,status);
create index if not exists employees_org_status_idx on public.employees(organization_id,employment_status);
create index if not exists projects_org_status_idx on public.projects(organization_id,status);
create index if not exists tasks_org_status_idx on public.project_tasks(organization_id,status,due_date);
create index if not exists tickets_org_status_idx on public.tickets(organization_id,status,priority);

-- 4. Grants and row-level security
alter table public.profiles enable row level security;
alter table public.organizations enable row level security;
alter table public.organization_memberships enable row level security;
alter table public.platform_admins enable row level security;

revoke all on public.profiles,public.organizations,public.organization_memberships,public.platform_admins from anon,authenticated;
grant select,update on public.profiles to authenticated;
grant select on public.organizations,public.organization_memberships,public.platform_admins to authenticated;

drop policy if exists profiles_select_self on public.profiles;
drop policy if exists profiles_update_self on public.profiles;
drop policy if exists organizations_select_member on public.organizations;
drop policy if exists organizations_select_super_admin on public.organizations;
drop policy if exists memberships_select_member on public.organization_memberships;
drop policy if exists memberships_select_super_admin on public.organization_memberships;
drop policy if exists platform_admin_select_self on public.platform_admins;

create policy profiles_select_self on public.profiles for select to authenticated
using ((select auth.uid()) = id);
create policy profiles_update_self on public.profiles for update to authenticated
using ((select auth.uid()) = id) with check ((select auth.uid()) = id);
create policy organizations_select_member on public.organizations for select to authenticated
using (id in (select private.user_organization_ids()));
create policy organizations_select_super_admin on public.organizations for select to authenticated
using ((select private.is_super_admin()));
create policy memberships_select_member on public.organization_memberships for select to authenticated
using (organization_id in (select private.user_organization_ids()));
create policy memberships_select_super_admin on public.organization_memberships for select to authenticated
using ((select private.is_super_admin()));
create policy platform_admin_select_self on public.platform_admins for select to authenticated
using (user_id = (select auth.uid()));

do $$
declare t text;
begin
  foreach t in array array[
    'companies','contacts','leads','pipelines','pipeline_stages','deals','activities',
    'products','invoices','expenses','suppliers','purchase_orders','warehouses',
    'inventory_items','employees','projects','project_tasks','tickets'
  ] loop
    execute format('alter table public.%I enable row level security',t);
    execute format('revoke all on public.%I from anon,authenticated',t);
    execute format('grant select,insert,update,delete on public.%I to authenticated',t);
    execute format('drop policy if exists tenant_access on public.%I',t);
    execute format(
      'create policy tenant_access on public.%I for all to authenticated using (private.is_active_org_member(organization_id)) with check (private.is_active_org_member(organization_id))',t
    );
  end loop;
end $$;

alter table public.lead_conversions enable row level security;
revoke all on public.lead_conversions from anon,authenticated;
grant select on public.lead_conversions to authenticated;
drop policy if exists tenant_access on public.lead_conversions;
create policy tenant_access on public.lead_conversions for select to authenticated
using (private.is_active_org_member(organization_id));

-- 5. Assign the confirmed super administrator if the Auth user already exists.
insert into public.platform_admins(user_id,note)
select id,'Initial SmartOne super administrator'
from auth.users where lower(email) = 'mbz1372@gmail.com'
on conflict (user_id) do update set note = excluded.note;

-- 6. Final validation. Any missing object aborts and rolls back the transaction.
do $$
declare
  required_tables text[] := array[
    'profiles','organizations','organization_memberships','platform_admins',
    'companies','contacts','leads','pipelines','pipeline_stages','deals','activities','lead_conversions',
    'products','invoices','expenses','suppliers','purchase_orders','warehouses','inventory_items',
    'employees','projects','project_tasks','tickets'
  ];
  table_name text;
begin
  foreach table_name in array required_tables loop
    if to_regclass('public.' || table_name) is null then
      raise exception 'SmartOne setup validation failed: missing table %',table_name;
    end if;
  end loop;
  if to_regprocedure('public.create_organization(text)') is null then
    raise exception 'SmartOne setup validation failed: create_organization function is missing';
  end if;
  if to_regprocedure('public.ensure_default_pipeline(uuid)') is null then
    raise exception 'SmartOne setup validation failed: ensure_default_pipeline function is missing';
  end if;
  if to_regprocedure('public.convert_lead(uuid)') is null then
    raise exception 'SmartOne setup validation failed: convert_lead function is missing';
  end if;
end $$;

commit;

-- Verification result shown in the SQL Editor after a successful run.
select
  'SmartOne setup completed successfully' as result,
  count(*) filter (where schemaname = 'public') as public_tables_with_rls
from pg_tables
where schemaname = 'public' and rowsecurity = true;

select
  case when exists(
    select 1 from public.platform_admins pa
    join auth.users u on u.id = pa.user_id
    where lower(u.email) = 'mbz1372@gmail.com'
  ) then 'SUPER ADMIN READY'
  else 'USER NOT CREATED YET - super admin will be assigned automatically after signup'
  end as super_admin_status;
