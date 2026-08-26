create table if not exists public.lead_conversions (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  lead_id uuid not null unique references public.leads(id) on delete restrict,
  company_id uuid references public.companies(id), contact_id uuid references public.contacts(id), deal_id uuid references public.deals(id),
  converted_by uuid not null default auth.uid() references auth.users(id), converted_at timestamptz not null default now()
);
alter table public.lead_conversions enable row level security;
grant select on public.lead_conversions to authenticated;
drop policy if exists tenant_access on public.lead_conversions;
create policy tenant_access on public.lead_conversions for select to authenticated using (private.is_active_org_member(organization_id));

create or replace function public.convert_lead(target_lead uuid)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare l public.leads; company_uuid uuid; contact_uuid uuid; deal_uuid uuid; pipeline_uuid uuid; stage_uuid uuid; prior public.lead_conversions;
begin
  select * into l from public.leads where id=target_lead for update;
  if l.id is null or not private.is_active_org_member(l.organization_id) then raise exception 'Lead not found or access denied'; end if;
  select * into prior from public.lead_conversions where lead_id=l.id;
  if prior.id is not null then return jsonb_build_object('company_id',prior.company_id,'contact_id',prior.contact_id,'deal_id',prior.deal_id,'already_converted',true); end if;
  if nullif(trim(l.company_name),'') is not null then
    insert into public.companies(organization_id,name,phone,owner_id,created_by) values(l.organization_id,l.company_name,l.phone,l.owner_id,auth.uid()) returning id into company_uuid;
  end if;
  insert into public.contacts(organization_id,company_id,first_name,last_name,email,phone,owner_id,created_by)
    values(l.organization_id,company_uuid,coalesce(nullif(trim(l.first_name),''),'بدون نام'),l.last_name,l.email,l.phone,l.owner_id,auth.uid()) returning id into contact_uuid;
  pipeline_uuid:=public.ensure_default_pipeline(l.organization_id);
  select id into stage_uuid from public.pipeline_stages where pipeline_id=pipeline_uuid order by position limit 1;
  insert into public.deals(organization_id,pipeline_id,stage_id,company_id,contact_id,title,owner_id,created_by)
    values(l.organization_id,pipeline_uuid,stage_uuid,company_uuid,contact_uuid,l.title,l.owner_id,auth.uid()) returning id into deal_uuid;
  update public.leads set status='converted',updated_at=now() where id=l.id;
  insert into public.lead_conversions(organization_id,lead_id,company_id,contact_id,deal_id) values(l.organization_id,l.id,company_uuid,contact_uuid,deal_uuid);
  return jsonb_build_object('company_id',company_uuid,'contact_id',contact_uuid,'deal_id',deal_uuid,'already_converted',false);
end $$;
revoke all on function public.convert_lead(uuid) from public,anon;
grant execute on function public.convert_lead(uuid) to authenticated;
