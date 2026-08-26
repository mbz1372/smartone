create table if not exists public.platform_admins (
  user_id uuid primary key references auth.users(id) on delete cascade,
  granted_at timestamptz not null default now(),
  note text
);

create or replace function private.is_super_admin()
returns boolean language sql stable security definer set search_path = '' as $$
  select exists(select 1 from public.platform_admins where user_id = (select auth.uid()))
$$;

revoke all on function private.is_super_admin() from public;
grant execute on function private.is_super_admin() to authenticated;

alter table public.platform_admins enable row level security;
revoke all on public.platform_admins from anon, authenticated;
grant select on public.platform_admins to authenticated;
create policy platform_admin_select_self on public.platform_admins for select to authenticated using (user_id = (select auth.uid()));
create policy organizations_select_super_admin on public.organizations for select to authenticated using ((select private.is_super_admin()));
create policy memberships_select_super_admin on public.organization_memberships for select to authenticated using ((select private.is_super_admin()));

insert into public.platform_admins(user_id, note)
select id, 'Initial SmartOne super administrator' from auth.users
where lower(email) = 'mbz1372@gmail.com'
on conflict (user_id) do nothing;

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  insert into public.profiles(id, full_name) values (new.id, new.raw_user_meta_data->>'full_name') on conflict do nothing;
  if lower(new.email) = 'mbz1372@gmail.com' then
    insert into public.platform_admins(user_id, note) values (new.id, 'Initial SmartOne super administrator') on conflict do nothing;
  end if;
  return new;
end;
$$;
