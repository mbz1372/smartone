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
  source text, status text not null default 'new' check (status in ('new','working','qualified','unqualified','converted')),
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
  name text not null, position integer not null, probability integer not null default 0 check (probability between 0 and 100),
  unique (pipeline_id, position)
);

create table if not exists public.deals (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  pipeline_id uuid not null references public.pipelines(id), stage_id uuid not null references public.pipeline_stages(id),
  company_id uuid references public.companies(id) on delete set null, contact_id uuid references public.contacts(id) on delete set null,
  title text not null, amount numeric(18,2) not null default 0, currency char(3) not null default 'IRR',
  status text not null default 'open' check (status in ('open','won','lost')), expected_close_date date,
  owner_id uuid references auth.users(id), created_by uuid not null default auth.uid() references auth.users(id),
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
  assigned_to uuid references auth.users(id), created_by uuid not null default auth.uid() references auth.users(id),
  created_at timestamptz not null default now()
);

create index if not exists companies_org_created_idx on public.companies(organization_id, created_at desc);
create index if not exists contacts_org_created_idx on public.contacts(organization_id, created_at desc);
create index if not exists leads_org_status_idx on public.leads(organization_id, status, created_at desc);
create index if not exists deals_org_stage_idx on public.deals(organization_id, stage_id, status);
create index if not exists activities_org_due_idx on public.activities(organization_id, due_at);

create or replace function private.is_active_org_member(target_org uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists(select 1 from public.organization_memberships where organization_id = target_org and user_id = auth.uid() and status = 'active')
$$;
revoke all on function private.is_active_org_member(uuid) from public;
grant execute on function private.is_active_org_member(uuid) to authenticated;

do $$ declare t text; begin
  foreach t in array array['companies','contacts','leads','pipelines','pipeline_stages','deals','activities'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('revoke all on public.%I from anon, authenticated', t);
    execute format('grant select, insert, update, delete on public.%I to authenticated', t);
    execute format('drop policy if exists tenant_access on public.%I', t);
    execute format('create policy tenant_access on public.%I for all to authenticated using (private.is_active_org_member(organization_id)) with check (private.is_active_org_member(organization_id))', t);
  end loop;
end $$;

create or replace function public.ensure_default_pipeline(target_org uuid)
returns uuid language plpgsql security definer set search_path = '' as $$
declare pipeline_uuid uuid;
begin
  if not private.is_active_org_member(target_org) then raise exception 'Access denied'; end if;
  select id into pipeline_uuid from public.pipelines where organization_id=target_org and is_default limit 1;
  if pipeline_uuid is null then
    insert into public.pipelines(organization_id,name,is_default) values(target_org,'فروش اصلی',true) returning id into pipeline_uuid;
    insert into public.pipeline_stages(organization_id,pipeline_id,name,position,probability) values
      (target_org,pipeline_uuid,'جدید',1,10),(target_org,pipeline_uuid,'نیازسنجی',2,30),
      (target_org,pipeline_uuid,'پیشنهاد',3,60),(target_org,pipeline_uuid,'مذاکره',4,80),(target_org,pipeline_uuid,'نهایی',5,100);
  end if;
  return pipeline_uuid;
end $$;
revoke all on function public.ensure_default_pipeline(uuid) from public, anon;
grant execute on function public.ensure_default_pipeline(uuid) to authenticated;
