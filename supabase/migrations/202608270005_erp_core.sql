-- SmartOne ERP core: finance, catalog, procurement, inventory, HR, projects and support
create table if not exists public.products (
 id uuid primary key default gen_random_uuid(), organization_id uuid not null references public.organizations(id) on delete cascade,
 name text not null, sku text, type text not null default 'service' check(type in('product','service')), sale_price numeric(18,2) not null default 0,
 cost_price numeric(18,2) not null default 0, unit text default 'عدد', status text not null default 'active' check(status in('active','inactive')),
 created_by uuid not null default auth.uid() references auth.users(id), created_at timestamptz not null default now(), updated_at timestamptz not null default now(), unique(organization_id,sku)
);
create table if not exists public.invoices (
 id uuid primary key default gen_random_uuid(), organization_id uuid not null references public.organizations(id) on delete cascade,
 number text not null, title text not null, company_id uuid references public.companies(id) on delete set null, amount numeric(18,2) not null default 0,
 paid_amount numeric(18,2) not null default 0, status text not null default 'draft' check(status in('draft','issued','paid','overdue','cancelled')),
 due_date date, created_by uuid not null default auth.uid() references auth.users(id), created_at timestamptz not null default now(), updated_at timestamptz not null default now(), unique(organization_id,number)
);
create table if not exists public.expenses (
 id uuid primary key default gen_random_uuid(), organization_id uuid not null references public.organizations(id) on delete cascade,
 title text not null, category text, amount numeric(18,2) not null default 0, expense_date date not null default current_date, status text not null default 'pending' check(status in('pending','approved','paid','rejected')),
 created_by uuid not null default auth.uid() references auth.users(id), created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table if not exists public.suppliers (
 id uuid primary key default gen_random_uuid(), organization_id uuid not null references public.organizations(id) on delete cascade,
 name text not null, contact_name text, phone text, email text, status text not null default 'active' check(status in('active','inactive')),
 created_by uuid not null default auth.uid() references auth.users(id), created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table if not exists public.purchase_orders (
 id uuid primary key default gen_random_uuid(), organization_id uuid not null references public.organizations(id) on delete cascade,
 number text not null, title text not null, supplier_id uuid references public.suppliers(id) on delete set null, amount numeric(18,2) not null default 0,
 status text not null default 'draft' check(status in('draft','approved','ordered','received','cancelled')), expected_date date,
 created_by uuid not null default auth.uid() references auth.users(id), created_at timestamptz not null default now(), updated_at timestamptz not null default now(), unique(organization_id,number)
);
create table if not exists public.warehouses (
 id uuid primary key default gen_random_uuid(), organization_id uuid not null references public.organizations(id) on delete cascade,
 name text not null, city text, address text, created_by uuid not null default auth.uid() references auth.users(id), created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table if not exists public.inventory_items (
 id uuid primary key default gen_random_uuid(), organization_id uuid not null references public.organizations(id) on delete cascade,
 product_id uuid not null references public.products(id) on delete cascade, warehouse_id uuid not null references public.warehouses(id) on delete cascade,
 quantity numeric(18,3) not null default 0, reorder_point numeric(18,3) not null default 0, created_at timestamptz not null default now(), updated_at timestamptz not null default now(), unique(product_id,warehouse_id)
);
create table if not exists public.employees (
 id uuid primary key default gen_random_uuid(), organization_id uuid not null references public.organizations(id) on delete cascade,
 first_name text not null, last_name text, personnel_code text, job_title text, department text, phone text, email text,
 employment_status text not null default 'active' check(employment_status in('active','on_leave','terminated')), hire_date date,
 created_by uuid not null default auth.uid() references auth.users(id), created_at timestamptz not null default now(), updated_at timestamptz not null default now(), unique(organization_id,personnel_code)
);
create table if not exists public.projects (
 id uuid primary key default gen_random_uuid(), organization_id uuid not null references public.organizations(id) on delete cascade,
 name text not null, description text, status text not null default 'planned' check(status in('planned','active','on_hold','completed','cancelled')),
 progress integer not null default 0 check(progress between 0 and 100), start_date date, due_date date,
 created_by uuid not null default auth.uid() references auth.users(id), created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table if not exists public.project_tasks (
 id uuid primary key default gen_random_uuid(), organization_id uuid not null references public.organizations(id) on delete cascade,
 project_id uuid references public.projects(id) on delete cascade, title text not null, status text not null default 'todo' check(status in('todo','doing','done','blocked')),
 priority text not null default 'medium' check(priority in('low','medium','high','urgent')), due_date date, assigned_to uuid references auth.users(id),
 created_by uuid not null default auth.uid() references auth.users(id), created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table if not exists public.tickets (
 id uuid primary key default gen_random_uuid(), organization_id uuid not null references public.organizations(id) on delete cascade,
 subject text not null, company_id uuid references public.companies(id) on delete set null, contact_id uuid references public.contacts(id) on delete set null,
 status text not null default 'open' check(status in('open','pending','resolved','closed')), priority text not null default 'normal' check(priority in('low','normal','high','urgent')),
 assigned_to uuid references auth.users(id), created_by uuid not null default auth.uid() references auth.users(id), created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);

do $$ declare t text; begin
 foreach t in array array['products','invoices','expenses','suppliers','purchase_orders','warehouses','inventory_items','employees','projects','project_tasks','tickets'] loop
  execute format('alter table public.%I enable row level security',t);
  execute format('grant select,insert,update,delete on public.%I to authenticated',t);
  execute format('drop policy if exists tenant_access on public.%I',t);
  execute format('create policy tenant_access on public.%I for all to authenticated using(private.is_active_org_member(organization_id)) with check(private.is_active_org_member(organization_id))',t);
 end loop;
end $$;
create index if not exists invoices_org_status_idx on public.invoices(organization_id,status,due_date);
create index if not exists expenses_org_date_idx on public.expenses(organization_id,expense_date desc);
create index if not exists purchase_org_status_idx on public.purchase_orders(organization_id,status);
create index if not exists employees_org_status_idx on public.employees(organization_id,employment_status);
create index if not exists projects_org_status_idx on public.projects(organization_id,status);
create index if not exists tasks_org_status_idx on public.project_tasks(organization_id,status,due_date);
create index if not exists tickets_org_status_idx on public.tickets(organization_id,status,priority);
