import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createActivity, createCompany, createContact, createLead } from "./actions";

const tabs = [
  ["companies","شرکت‌ها"],["contacts","مخاطبان"],["leads","سرنخ‌ها"],["deals","معاملات"],["activities","فعالیت‌ها"],
] as const;
type Tab = typeof tabs[number][0];
type Props = { params: Promise<{ organizationId: string }>; searchParams: Promise<{ tab?: string; error?: string; success?: string }> };

export default async function CrmPage({ params, searchParams }: Props) {
  const [{ organizationId }, query] = await Promise.all([params, searchParams]);
  const tab: Tab = tabs.some(([key]) => key === query.tab) ? query.tab as Tab : "companies";
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth");
  const [{ data: organization }, { data: companies }, { data: contacts }, { data: leads }, { data: deals }, { data: activities }] = await Promise.all([
    supabase.from("organizations").select("id,name").eq("id",organizationId).maybeSingle(),
    supabase.from("companies").select("id,name,phone,industry,city,created_at").eq("organization_id",organizationId).order("created_at",{ascending:false}).limit(100),
    supabase.from("contacts").select("id,first_name,last_name,email,phone,job_title,company_id,created_at").eq("organization_id",organizationId).order("created_at",{ascending:false}).limit(100),
    supabase.from("leads").select("id,title,company_name,status,score,phone,created_at").eq("organization_id",organizationId).order("created_at",{ascending:false}).limit(100),
    supabase.from("deals").select("id,title,amount,currency,status,created_at").eq("organization_id",organizationId).order("created_at",{ascending:false}).limit(100),
    supabase.from("activities").select("id,type,subject,due_at,completed_at,created_at").eq("organization_id",organizationId).order("created_at",{ascending:false}).limit(100),
  ]);
  if (!organization) notFound();
  const rows = { companies: companies ?? [], contacts: contacts ?? [], leads: leads ?? [], deals: deals ?? [], activities: activities ?? [] }[tab] as Array<Record<string, unknown>>;

  return <main className="crm-page">
    <header className="crm-header"><div><Link href={`/dashboard/${organizationId}`}>← داشبورد</Link><h1>CRM · {organization.name}</h1></div><span>{rows.length} رکورد</span></header>
    <nav className="crm-tabs">{tabs.map(([key,label]) => <Link className={tab===key?"active":""} href={`?tab=${key}`} key={key}>{label}</Link>)}</nav>
    {query.error && <p className="form-message error">{query.error}</p>}{query.success && <p className="form-message success">رکورد با موفقیت ثبت شد.</p>}
    <section className="crm-grid"><article className="panel"><h2>{tabs.find(([key])=>key===tab)?.[1]}</h2><RecordTable tab={tab} rows={rows} /></article><article className="panel"><h2>ثبت سریع</h2><QuickForm tab={tab} organizationId={organizationId} companies={companies ?? []} /></article></section>
  </main>;
}

function RecordTable({ tab, rows }: { tab: Tab; rows: Array<Record<string, unknown>> }) {
  if (!rows.length) return <div className="empty"><strong>هنوز رکوردی وجود ندارد</strong><span>از فرم ثبت سریع اولین مورد را ایجاد کنید.</span></div>;
  return <div className="records">{rows.map(row => <div className="record" key={String(row.id)}><strong>{String(row.name ?? row.title ?? `${row.first_name ?? ""} ${row.last_name ?? ""}`)}</strong><span>{String(row.phone ?? row.email ?? row.status ?? row.type ?? "—")}</span>{tab==="deals" && <b>{Number(row.amount ?? 0).toLocaleString("fa-IR")} {String(row.currency)}</b>}</div>)}</div>;
}

function QuickForm({ tab, organizationId, companies }: { tab: Tab; organizationId: string; companies: Array<{id:string;name:string}> }) {
  if (tab === "deals") return <div className="empty"><strong>پایپ‌لاین در مرحله بعدی فعال می‌شود</strong><span>ساخت مراحل و جابه‌جایی معامله به‌صورت یکپارچه اضافه خواهد شد.</span></div>;
  const action = tab === "companies" ? createCompany : tab === "contacts" ? createContact : tab === "leads" ? createLead : createActivity;
  return <form action={action}><input type="hidden" name="organizationId" value={organizationId}/>
    {tab==="companies" && <><label>نام شرکت<input name="name" required/></label><label>تلفن<input name="phone"/></label><label>صنعت<input name="industry"/></label><label>شهر<input name="city"/></label><label>وب‌سایت<input name="website"/></label></>}
    {tab==="contacts" && <><label>نام<input name="firstName" required/></label><label>نام خانوادگی<input name="lastName"/></label><label>شرکت<select name="companyId"><option value="">بدون شرکت</option>{companies.map(c=><option value={c.id} key={c.id}>{c.name}</option>)}</select></label><label>موبایل<input name="phone"/></label><label>ایمیل<input type="email" name="email"/></label><label>سمت<input name="jobTitle"/></label></>}
    {tab==="leads" && <><label>عنوان سرنخ<input name="title" required/></label><label>نام<input name="firstName"/></label><label>نام خانوادگی<input name="lastName"/></label><label>نام شرکت<input name="companyName"/></label><label>موبایل<input name="phone"/></label><label>منبع<input name="source"/></label></>}
    {tab==="activities" && <><label>نوع<select name="type"><option value="task">وظیفه</option><option value="call">تماس</option><option value="meeting">جلسه</option><option value="email">ایمیل</option><option value="note">یادداشت</option></select></label><label>موضوع<input name="subject" required/></label><label>سررسید<input type="datetime-local" name="dueAt"/></label><label>توضیحات<textarea name="description"/></label></>}
    <button className="primary wide">ثبت</button>
  </form>;
}
