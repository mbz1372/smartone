import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { WorkspaceShell } from "@/components/workspace-shell";
import { createClient } from "@/lib/supabase/server";
import { erpModules, type ModuleKey, type ErpTable } from "@/lib/erp-modules";
import { createErpRecord, deleteErpRecord, updateErpRecord } from "./actions";

type Props = {
  params: Promise<{ organizationId: string; module: string }>;
  searchParams: Promise<{ tab?: string; error?: string; success?: string; edit?: string; delete?: string; deleted?: string }>;
};
type Row = Record<string, unknown>;
type Choice = { id: string; name: string };
type FormChoices = {
  products: Choice[];
  warehouses: Choice[];
  suppliers: Choice[];
  projects: Choice[];
  companies: Choice[];
  contacts: Choice[];
};

const statusLabels: Record<string, string> = {
  active: "فعال", inactive: "غیرفعال", draft: "پیش‌نویس", issued: "صادرشده", paid: "پرداخت‌شده",
  overdue: "سررسید گذشته", cancelled: "لغوشده", pending: "در انتظار", approved: "تأییدشده",
  rejected: "ردشده", product: "کالا", service: "خدمت", on_leave: "مرخصی", terminated: "قطع همکاری",
  planned: "برنامه‌ریزی", on_hold: "متوقف", completed: "تکمیل‌شده", todo: "برای انجام", doing: "در حال انجام",
  done: "انجام‌شده", blocked: "مسدود", open: "باز", resolved: "حل‌شده", closed: "بسته",
};

export default async function ModulePage({ params, searchParams }: Props) {
  const [{ organizationId, module: rawModule }, query] = await Promise.all([params, searchParams]);
  if (!(rawModule in erpModules)) notFound();
  const moduleKey = rawModule as ModuleKey;
  const config = erpModules[moduleKey];
  const tabs = config.tabs as Record<string, { label: string; table: string; primary: string }>;
  const keys = Object.keys(tabs) as ErpTable[];
  const tab = keys.includes(query.tab as ErpTable) ? query.tab as ErpTable : keys[0];
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth");

  const [
    { data: organization }, { data: membership }, { data: rows }, { data: products }, { data: warehouses },
    { data: suppliers }, { data: projects }, { data: companies }, { data: contacts },
  ] = await Promise.all([
    supabase.from("organizations").select("id,name").eq("id", organizationId).maybeSingle(),
    supabase.from("organization_memberships").select("role").eq("organization_id", organizationId).eq("user_id", user.id).eq("status", "active").maybeSingle(),
    supabase.from(tab).select("*").eq("organization_id", organizationId).order("created_at", { ascending: false }).limit(100),
    supabase.from("products").select("id,name").eq("organization_id", organizationId).order("name"),
    supabase.from("warehouses").select("id,name").eq("organization_id", organizationId).order("name"),
    supabase.from("suppliers").select("id,name").eq("organization_id", organizationId).order("name"),
    supabase.from("projects").select("id,name").eq("organization_id", organizationId).order("name"),
    supabase.from("companies").select("id,name").eq("organization_id", organizationId).order("name"),
    supabase.from("contacts").select("id,first_name,last_name").eq("organization_id", organizationId).order("first_name"),
  ]);
  if (!organization || !membership) notFound();

  const records = (rows ?? []) as Row[];
  const editRecord = query.edit ? records.find((row) => String(row.id) === query.edit) : undefined;
  const deleteRecord = query.delete ? records.find((row) => String(row.id) === query.delete) : undefined;
  const choices: FormChoices = {
    products: products ?? [], warehouses: warehouses ?? [], suppliers: suppliers ?? [], projects: projects ?? [], companies: companies ?? [],
    contacts: (contacts ?? []).map((contact) => ({ id: contact.id, name: `${contact.first_name ?? ""} ${contact.last_name ?? ""}`.trim() || "مخاطب" })),
  };
  const baseUrl = `/dashboard/${organizationId}/${moduleKey}?tab=${tab}`;

  return (
    <WorkspaceShell organizationId={organizationId} organizationName={organization.name} email={user.email ?? "U"} active={moduleKey}>
      <div className="page-wrap">
        <section className="page-heading">
          <div><p>SmartOne ERP</p><h1>{config.title}</h1><span className="heading-subtitle">{config.description}</span></div>
          <a className="btn btn-primary" href="#record-form">+ ثبت جدید</a>
        </section>

        <div className="crm-toolbar">
          <nav className="view-tabs" aria-label={`بخش‌های ${config.title}`}>
            {keys.map((key) => <Link className={tab === key ? "active" : ""} href={`?tab=${key}`} key={key}>{tabs[key]?.label ?? key}</Link>)}
          </nav>
          <span className="count-pill">{records.length.toLocaleString("fa-IR")} رکورد</span>
        </div>

        {query.error ? <p className="form-message error notice">{query.error}</p> : null}
        {query.success ? <p className="form-message success notice">{query.success === "updated" ? "تغییرات رکورد ذخیره شد." : "رکورد جدید با موفقیت ثبت شد."}</p> : null}
        {query.deleted ? <p className="form-message success notice">رکورد با موفقیت حذف شد.</p> : null}

        {deleteRecord ? (
          <section className="surface delete-confirm">
            <div><strong>حذف «{recordTitle(deleteRecord, tab, choices)}»؟</strong><p>این عملیات قابل بازگشت نیست و فقط بعد از تأیید شما انجام می‌شود.</p></div>
            <div className="heading-actions">
              <Link className="btn" href={baseUrl}>انصراف</Link>
              <form action={deleteErpRecord}>
                <Hidden organizationId={organizationId} moduleKey={moduleKey} table={tab} recordId={String(deleteRecord.id)} />
                <button className="btn btn-danger" type="submit">تأیید حذف</button>
              </form>
            </div>
          </section>
        ) : null}

        <section className="data-layout">
          <article className="surface data-card">
            <div className="record record-head"><span>عنوان</span><span>وضعیت / اطلاعات</span><span>عملیات</span></div>
            {records.length ? (
              <div className="records">
                {records.map((row) => (
                  <div className="record" key={String(row.id)}>
                    <div><strong>{recordTitle(row, tab, choices)}</strong><small className="record-date">ثبت: {dateLabel(row.created_at ?? row.updated_at)}</small></div>
                    <span>{recordSummary(row)}</span>
                    <div className="row-actions">
                      <Link className="btn btn-small" href={`${baseUrl}&edit=${row.id}#record-form`}>ویرایش</Link>
                      <Link className="btn btn-small btn-danger" href={`${baseUrl}&delete=${row.id}`}>حذف</Link>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="empty-state"><div className="empty-visual">＋</div><strong>هنوز اطلاعاتی ثبت نشده</strong><p>اولین رکورد را از فرم روبه‌رو ایجاد کنید.</p></div>
            )}
          </article>

          <article className="surface form-panel" id="record-form">
            <div className="surface-head">
              <div><small>{tabs[tab]?.label}</small><h2>{editRecord ? "ویرایش رکورد" : "ثبت رکورد جدید"}</h2></div>
              {editRecord ? <Link href={baseUrl}>انصراف</Link> : null}
            </div>
            <ErpForm table={tab} moduleKey={moduleKey} organizationId={organizationId} choices={choices} record={editRecord} />
          </article>
        </section>
      </div>
    </WorkspaceShell>
  );
}

function field(record: Row | undefined, key: string) {
  const result = record?.[key];
  return result === null || result === undefined ? "" : String(result);
}

function dateLabel(value: unknown) {
  if (!value) return "—";
  const date = new Date(String(value));
  return Number.isNaN(date.getTime()) ? "—" : date.toLocaleDateString("fa-IR");
}

function recordTitle(row: Row, table: ErpTable, choices: FormChoices) {
  if (table === "inventory_items") {
    const product = choices.products.find((item) => item.id === row.product_id)?.name ?? "محصول";
    const warehouse = choices.warehouses.find((item) => item.id === row.warehouse_id)?.name ?? "انبار";
    return `${product} · ${warehouse}`;
  }
  const direct = row.name ?? row.title ?? row.subject;
  if (direct) return String(direct);
  return `${row.first_name ?? ""} ${row.last_name ?? ""}`.trim() || "رکورد";
}

function recordSummary(row: Row) {
  const status = String(row.status ?? row.employment_status ?? row.type ?? "");
  if (status) return statusLabels[status] ?? status;
  if (row.amount !== undefined) return `${Number(row.amount).toLocaleString("fa-IR")} ریال`;
  if (row.quantity !== undefined) return `موجودی ${Number(row.quantity).toLocaleString("fa-IR")}`;
  return "فعال";
}

function Hidden({ organizationId, moduleKey, table, recordId }: { organizationId: string; moduleKey: string; table: string; recordId?: string }) {
  return <>
    <input type="hidden" name="organizationId" value={organizationId} />
    <input type="hidden" name="module" value={moduleKey} />
    <input type="hidden" name="table" value={table} />
    {recordId ? <input type="hidden" name="recordId" value={recordId} /> : null}
  </>;
}

function Input({ name, label, type = "text", required = false, defaultValue = "", step }: { name: string; label: string; type?: string; required?: boolean; defaultValue?: string; step?: string }) {
  return <label>{label}<input name={name} type={type} required={required} defaultValue={defaultValue} step={step} /></label>;
}

function SelectChoice({ name, label, items, defaultValue = "", empty = "انتخاب کنید", required = false }: { name: string; label: string; items: Choice[]; defaultValue?: string; empty?: string; required?: boolean }) {
  return <label>{label}<select name={name} defaultValue={defaultValue} required={required}><option value="">{empty}</option>{items.map((item) => <option value={item.id} key={item.id}>{item.name}</option>)}</select></label>;
}

function Select({ name, label, defaultValue, options }: { name: string; label: string; defaultValue: string; options: Array<[string, string]> }) {
  return <label>{label}<select name={name} defaultValue={defaultValue}>{options.map(([value, text]) => <option value={value} key={value}>{text}</option>)}</select></label>;
}

function ErpForm({ table, moduleKey, organizationId, choices, record }: { table: ErpTable; moduleKey: string; organizationId: string; choices: FormChoices; record?: Row }) {
  const action = record ? updateErpRecord : createErpRecord;
  return <form action={action}>
    <Hidden organizationId={organizationId} moduleKey={moduleKey} table={table} recordId={record ? String(record.id) : undefined} />
    {table === "products" ? <>
      <Input name="name" label="نام محصول یا خدمت" required defaultValue={field(record, "name")} />
      <Input name="sku" label="کد محصول" defaultValue={field(record, "sku")} />
      <Select name="type" label="نوع" defaultValue={field(record, "type") || "service"} options={[["service", "خدمت"], ["product", "کالا"]]} />
      <Input name="salePrice" label="قیمت فروش" type="number" step="0.01" defaultValue={field(record, "sale_price")} />
      <Input name="costPrice" label="بهای تمام‌شده" type="number" step="0.01" defaultValue={field(record, "cost_price")} />
      <Input name="unit" label="واحد" defaultValue={field(record, "unit")} />
      <Select name="status" label="وضعیت" defaultValue={field(record, "status") || "active"} options={[["active", "فعال"], ["inactive", "غیرفعال"]]} />
    </> : null}
    {table === "invoices" ? <>
      <Input name="number" label="شماره فاکتور" required defaultValue={field(record, "number")} />
      <Input name="title" label="عنوان" required defaultValue={field(record, "title")} />
      <SelectChoice name="companyId" label="مشتری" items={choices.companies} defaultValue={field(record, "company_id")} empty="بدون مشتری" />
      <Input name="amount" label="مبلغ کل" type="number" step="0.01" defaultValue={field(record, "amount")} />
      <Input name="paidAmount" label="مبلغ پرداخت‌شده" type="number" step="0.01" defaultValue={field(record, "paid_amount")} />
      <Input name="date" label="تاریخ سررسید" type="date" defaultValue={field(record, "due_date")} />
      <Select name="status" label="وضعیت" defaultValue={field(record, "status") || "draft"} options={[["draft", "پیش‌نویس"], ["issued", "صادرشده"], ["paid", "پرداخت‌شده"], ["overdue", "سررسید گذشته"], ["cancelled", "لغوشده"]]} />
    </> : null}
    {table === "purchase_orders" ? <>
      <Input name="number" label="شماره سفارش" required defaultValue={field(record, "number")} />
      <Input name="title" label="عنوان" required defaultValue={field(record, "title")} />
      <SelectChoice name="relationId" label="تأمین‌کننده" items={choices.suppliers} defaultValue={field(record, "supplier_id")} />
      <Input name="amount" label="مبلغ" type="number" step="0.01" defaultValue={field(record, "amount")} />
      <Input name="date" label="تاریخ مورد انتظار" type="date" defaultValue={field(record, "expected_date")} />
      <Select name="status" label="وضعیت" defaultValue={field(record, "status") || "draft"} options={[["draft", "پیش‌نویس"], ["approved", "تأییدشده"], ["ordered", "سفارش‌داده‌شده"], ["received", "دریافت‌شده"], ["cancelled", "لغوشده"]]} />
    </> : null}
    {table === "expenses" ? <>
      <Input name="title" label="عنوان هزینه" required defaultValue={field(record, "title")} />
      <Input name="category" label="دسته‌بندی" defaultValue={field(record, "category")} />
      <Input name="amount" label="مبلغ" type="number" step="0.01" defaultValue={field(record, "amount")} />
      <Input name="date" label="تاریخ" type="date" defaultValue={field(record, "expense_date")} />
      <Select name="status" label="وضعیت" defaultValue={field(record, "status") || "pending"} options={[["pending", "در انتظار"], ["approved", "تأییدشده"], ["paid", "پرداخت‌شده"], ["rejected", "ردشده"]]} />
    </> : null}
    {table === "suppliers" ? <>
      <Input name="name" label="نام تأمین‌کننده" required defaultValue={field(record, "name")} />
      <Input name="contactName" label="شخص رابط" defaultValue={field(record, "contact_name")} />
      <Input name="phone" label="تلفن" defaultValue={field(record, "phone")} />
      <Input name="email" label="ایمیل" type="email" defaultValue={field(record, "email")} />
      <Select name="status" label="وضعیت" defaultValue={field(record, "status") || "active"} options={[["active", "فعال"], ["inactive", "غیرفعال"]]} />
    </> : null}
    {table === "warehouses" ? <>
      <Input name="name" label="نام انبار" required defaultValue={field(record, "name")} />
      <Input name="city" label="شهر" defaultValue={field(record, "city")} />
      <Input name="description" label="نشانی" defaultValue={field(record, "address")} />
    </> : null}
    {table === "inventory_items" ? <>
      <SelectChoice name="productId" label="محصول" items={choices.products} defaultValue={field(record, "product_id")} required />
      <SelectChoice name="warehouseId" label="انبار" items={choices.warehouses} defaultValue={field(record, "warehouse_id")} required />
      <Input name="quantity" label="موجودی" type="number" step="0.001" defaultValue={field(record, "quantity")} />
      <Input name="reorderPoint" label="نقطه سفارش" type="number" step="0.001" defaultValue={field(record, "reorder_point")} />
    </> : null}
    {table === "employees" ? <>
      <Input name="firstName" label="نام" required defaultValue={field(record, "first_name")} />
      <Input name="lastName" label="نام خانوادگی" defaultValue={field(record, "last_name")} />
      <Input name="code" label="کد پرسنلی" defaultValue={field(record, "personnel_code")} />
      <Input name="jobTitle" label="سمت" defaultValue={field(record, "job_title")} />
      <Input name="department" label="واحد" defaultValue={field(record, "department")} />
      <Input name="phone" label="موبایل" defaultValue={field(record, "phone")} />
      <Input name="email" label="ایمیل" type="email" defaultValue={field(record, "email")} />
      <Input name="date" label="تاریخ استخدام" type="date" defaultValue={field(record, "hire_date")} />
      <Select name="status" label="وضعیت همکاری" defaultValue={field(record, "employment_status") || "active"} options={[["active", "فعال"], ["on_leave", "مرخصی"], ["terminated", "قطع همکاری"]]} />
    </> : null}
    {table === "projects" ? <>
      <Input name="name" label="نام پروژه" required defaultValue={field(record, "name")} />
      <Input name="description" label="شرح پروژه" defaultValue={field(record, "description")} />
      <Input name="date" label="تاریخ شروع" type="date" defaultValue={field(record, "start_date")} />
      <Input name="dueDate" label="موعد پایان" type="date" defaultValue={field(record, "due_date")} />
      <Input name="progress" label="درصد پیشرفت" type="number" defaultValue={field(record, "progress")} />
      <Select name="status" label="وضعیت" defaultValue={field(record, "status") || "planned"} options={[["planned", "برنامه‌ریزی"], ["active", "فعال"], ["on_hold", "متوقف"], ["completed", "تکمیل‌شده"], ["cancelled", "لغوشده"]]} />
    </> : null}
    {table === "project_tasks" ? <>
      <Input name="title" label="عنوان وظیفه" required defaultValue={field(record, "title")} />
      <SelectChoice name="relationId" label="پروژه" items={choices.projects} defaultValue={field(record, "project_id")} empty="بدون پروژه" />
      <Select name="priority" label="اولویت" defaultValue={field(record, "priority") || "medium"} options={[["low", "کم"], ["medium", "متوسط"], ["high", "زیاد"], ["urgent", "فوری"]]} />
      <Select name="status" label="وضعیت" defaultValue={field(record, "status") || "todo"} options={[["todo", "برای انجام"], ["doing", "در حال انجام"], ["done", "انجام‌شده"], ["blocked", "مسدود"]]} />
      <Input name="date" label="سررسید" type="date" defaultValue={field(record, "due_date")} />
    </> : null}
    {table === "tickets" ? <>
      <Input name="title" label="موضوع تیکت" required defaultValue={field(record, "subject")} />
      <SelectChoice name="companyId" label="شرکت" items={choices.companies} defaultValue={field(record, "company_id")} empty="بدون شرکت" />
      <SelectChoice name="contactId" label="مخاطب" items={choices.contacts} defaultValue={field(record, "contact_id")} empty="بدون مخاطب" />
      <Select name="priority" label="اولویت" defaultValue={field(record, "priority") || "normal"} options={[["low", "کم"], ["normal", "عادی"], ["high", "زیاد"], ["urgent", "فوری"]]} />
      <Select name="status" label="وضعیت" defaultValue={field(record, "status") || "open"} options={[["open", "باز"], ["pending", "در انتظار"], ["resolved", "حل‌شده"], ["closed", "بسته"]]} />
    </> : null}
    <button className="btn btn-primary" type="submit">{record ? "ذخیره تغییرات" : "ثبت و ذخیره"}</button>
  </form>;
}
