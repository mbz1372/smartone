create extension if not exists pgcrypto;
create schema if not exists private;

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
  primary key (organization_id, user_id)
);

create index if not exists organization_memberships_user_idx on public.organization_memberships(user_id, status);
create index if not exists organization_memberships_org_role_idx on public.organization_memberships(organization_id, role, status);

create or replace function private.user_organization_ids()
returns setof uuid language sql stable security definer set search_path = '' as $$
  select organization_id from public.organization_memberships
  where user_id = (select auth.uid()) and status = 'active'
$$;

revoke all on function private.user_organization_ids() from public;
grant usage on schema private to authenticated;
grant execute on function private.user_organization_ids() to authenticated;

create or replace function public.create_organization(organization_name text)
returns uuid language plpgsql security definer set search_path = '' as $$
declare new_id uuid; base_slug text;
begin
  if auth.uid() is null then raise exception 'Authentication required'; end if;
  if char_length(trim(organization_name)) not between 2 and 80 then raise exception 'Invalid organization name'; end if;
  base_slug := lower(regexp_replace(trim(organization_name), '[^a-zA-Z0-9]+', '-', 'g'));
  if base_slug = '' then base_slug := 'org'; end if;
  insert into public.organizations(name, slug, created_by)
  values (trim(organization_name), base_slug || '-' || substr(gen_random_uuid()::text, 1, 8), auth.uid())
  returning id into new_id;
  insert into public.organization_memberships(organization_id, user_id, role, status)
  values (new_id, auth.uid(), 'owner', 'active');
  return new_id;
end;
$$;

revoke all on function public.create_organization(text) from public, anon;
grant execute on function public.create_organization(text) to authenticated;

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  insert into public.profiles(id, full_name) values (new.id, new.raw_user_meta_data->>'full_name') on conflict do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users for each row execute procedure public.handle_new_user();

alter table public.profiles enable row level security;
alter table public.organizations enable row level security;
alter table public.organization_memberships enable row level security;
revoke all on public.profiles, public.organizations, public.organization_memberships from anon, authenticated;
grant select, update on public.profiles to authenticated;
grant select on public.organizations, public.organization_memberships to authenticated;

create policy profiles_select_self on public.profiles for select to authenticated using ((select auth.uid()) = id);
create policy profiles_update_self on public.profiles for update to authenticated using ((select auth.uid()) = id) with check ((select auth.uid()) = id);
create policy organizations_select_member on public.organizations for select to authenticated using (id in (select private.user_organization_ids()));
create policy memberships_select_member on public.organization_memberships for select to authenticated using (organization_id in (select private.user_organization_ids()));
