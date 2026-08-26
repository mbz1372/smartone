import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { WorkspaceShell } from "@/components/workspace-shell";

type Props = { params: Promise<{ organizationId: string }> };
export default async function OrganizationDashboard({ params }: Props) {
  const { organizationId } = await params; const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser(); if (!user) redirect("/auth");
  const [{ data: organization }, { data: membership }, leads, deals, contacts, activities] = await Promise.all([
    supabase.from("organizations").select("id,name,slug").eq("id",organizationId).maybeSingle(),
    supabase.from("organization_memberships").select("role,status").eq("organization_id",organizationId).eq("user_id",user.id).eq("status","active").maybeSingle(),
    supabase.from("leads").select("id",{count:"exact",head:true}).eq("organization_id",organizationId).neq("status","converted"),
    supabase.from("deals").select("amount").eq("organization_id",organizationId).eq("status","open"),
    supabase.from("contacts").select("id",{count:"exact",head:true}).eq("organization_id",organizationId),
    supabase.from("activities").select("id,type,subject,due_at,completed_at").eq("organization_id",organizationId).order("created_at",{ascending:false}).limit(5),
  ]); if (!organization || !membership) notFound();
  const pipelineValue=(deals.data??[]).reduce((sum,row)=>sum+Number(row.amount||0),0);
  return <WorkspaceShell organizationId={organizationId} organizationName={organization.name} email={user.email??"U"}>
    <div className="page-wrap"><section className="page-heading"><div><p>خوش آمدید · نمای زنده کسب‌وکار</p><h1>نمای کلی کسب‌وکار</h1></div><div className="heading-actions"><Link className="btn" href={`/dashboard/${organizationId}/crm?tab=activities`}>+ فعالیت</Link><Link className="btn btn-primary" href={`/dashboard/${organizationId}/crm?tab=leads`}>+ سرنخ جدید</Link></div></section>
      <section className="metric-grid"><Metric label="سرنخ‌های فعال" value={(leads.count??0).toLocaleString("fa-IR")} hint="در جریان پیگیری" icon="◎"/><Metric label="ارزش پایپ‌لاین" value={pipelineValue.toLocaleString("fa-IR")} hint="ریال · معاملات باز" icon="↗"/><Metric label="مخاطبان" value={(contacts.count??0).toLocaleString("fa-IR")} hint="بانک مشتریان" icon="♙"/><Metric label="نرخ تبدیل" value="۰٪" hint="با ثبت معاملات محاسبه می‌شود" icon="◫"/></section>
      <section className="dashboard-grid"><article className="surface"><div className="surface-head"><h2>آخرین فعالیت‌ها</h2><Link href={`/dashboard/${organizationId}/crm?tab=activities`}>مشاهده همه</Link></div>{activities.data?.length?<div className="activity-list">{activities.data.map(a=><div className="activity-item" key={a.id}><div className="activity-dot">{a.type==="call"?"☎":a.type==="meeting"?"◷":"✓"}</div><div><strong>{a.subject}</strong><span>{a.completed_at?"انجام شده":a.due_at?"برنامه‌ریزی شده":"بدون سررسید"}</span></div><span>{a.type}</span></div>)}</div>:<div className="empty-state"><div className="empty-visual">✓</div><strong>هنوز فعالیتی ثبت نشده</strong><p>تماس، جلسه و وظایف تیم اینجا نمایش داده می‌شوند.</p><Link className="btn" href={`/dashboard/${organizationId}/crm?tab=activities`}>ثبت اولین فعالیت</Link></div>}</article>
      <article className="surface"><div className="surface-head"><h2>دسترسی سریع</h2></div><div className="quick-grid"><Quick href={`/dashboard/${organizationId}/crm?tab=companies`} icon="⌂" title="شرکت" text="ثبت حساب جدید"/><Quick href={`/dashboard/${organizationId}/crm?tab=contacts`} icon="♙" title="مخاطب" text="افزودن شخص"/><Quick href={`/dashboard/${organizationId}/crm?tab=leads`} icon="◎" title="سرنخ" text="فرصت فروش"/><Quick href={`/dashboard/${organizationId}/crm?tab=deals`} icon="↗" title="معامله" text="مدیریت پایپ‌لاین"/></div></article></section>
    </div></WorkspaceShell>;
}
function Metric({label,value,hint,icon}:{label:string;value:string;hint:string;icon:string}){return <article className="metric-card"><div className="metric-label"><span>{label}</span><b>{icon}</b></div><div className="metric-value">{value}</div><div className="metric-hint">{hint}</div></article>}
function Quick({href,icon,title,text}:{href:string;icon:string;title:string;text:string}){return <Link className="quick-card" href={href}><strong>{icon} {title}</strong><span>{text}</span></Link>}
