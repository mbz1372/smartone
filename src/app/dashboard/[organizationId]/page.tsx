import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { WorkspaceShell } from "@/components/workspace-shell";
import { Icon, type IconName } from "@/components/ui/icon";

type Props = { params: Promise<{ organizationId: string }> };

export default async function OrganizationDashboard({ params }: Props) {
  const { organizationId } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth");

  const [
    { data: organization }, { data: membership }, leads, deals, contacts, activities,
    invoices, expenses, inventory, employees, projects, tickets,
  ] = await Promise.all([
    supabase.from("organizations").select("id,name,slug").eq("id", organizationId).maybeSingle(),
    supabase.from("organization_memberships").select("role,status").eq("organization_id", organizationId).eq("user_id", user.id).eq("status", "active").maybeSingle(),
    supabase.from("leads").select("id", { count: "exact", head: true }).eq("organization_id", organizationId).neq("status", "converted"),
    supabase.from("deals").select("amount").eq("organization_id", organizationId).eq("status", "open"),
    supabase.from("contacts").select("id", { count: "exact", head: true }).eq("organization_id", organizationId),
    supabase.from("activities").select("id,type,subject,due_at,completed_at").eq("organization_id", organizationId).order("created_at", { ascending: false }).limit(5),
    supabase.from("invoices").select("amount,paid_amount,status").eq("organization_id", organizationId).neq("status", "cancelled"),
    supabase.from("expenses").select("amount,status").eq("organization_id", organizationId).neq("status", "rejected"),
    supabase.from("inventory_items").select("quantity,reorder_point").eq("organization_id", organizationId),
    supabase.from("employees").select("id", { count: "exact", head: true }).eq("organization_id", organizationId).eq("employment_status", "active"),
    supabase.from("projects").select("id", { count: "exact", head: true }).eq("organization_id", organizationId).in("status", ["planned", "active", "on_hold"]),
    supabase.from("tickets").select("id", { count: "exact", head: true }).eq("organization_id", organizationId).in("status", ["open", "pending"]),
  ]);
  if (!organization || !membership) notFound();

  const pipelineValue = (deals.data ?? []).reduce((sum, row) => sum + Number(row.amount || 0), 0);
  const receivables = (invoices.data ?? []).reduce((sum, row) => sum + Math.max(0, Number(row.amount || 0) - Number(row.paid_amount || 0)), 0);
  const expenseTotal = (expenses.data ?? []).reduce((sum, row) => sum + Number(row.amount || 0), 0);
  const lowStock = (inventory.data ?? []).filter((row) => Number(row.quantity || 0) <= Number(row.reorder_point || 0)).length;

  const modules: Array<{ href: string; title: string; description: string; icon: IconName; metric: string }> = [
    { href: "finance", title: "مالی و حسابداری", description: "فاکتورها و هزینه‌ها", icon: "finance", metric: `${receivables.toLocaleString("fa-IR")} ریال دریافتنی` },
    { href: "catalog", title: "محصولات و خدمات", description: "کاتالوگ و قیمت‌گذاری", icon: "product", metric: "مدیریت کاتالوگ" },
    { href: "procurement", title: "خرید و تأمین", description: "تأمین‌کننده و سفارش خرید", icon: "buy", metric: "چرخه تأمین" },
    { href: "inventory", title: "مدیریت انبار", description: "موجودی و نقطه سفارش", icon: "inventory", metric: `${lowStock.toLocaleString("fa-IR")} قلم کم‌موجودی` },
    { href: "hr", title: "منابع انسانی", description: "پرسنل و وضعیت همکاری", icon: "users", metric: `${(employees.count ?? 0).toLocaleString("fa-IR")} همکار فعال` },
    { href: "projects", title: "پروژه‌ها و وظایف", description: "پیشرفت و سررسیدها", icon: "projects", metric: `${(projects.count ?? 0).toLocaleString("fa-IR")} پروژه باز` },
    { href: "support", title: "خدمات مشتریان", description: "تیکت و پیگیری پاسخ", icon: "support", metric: `${(tickets.count ?? 0).toLocaleString("fa-IR")} تیکت باز` },
  ];

  return (
    <WorkspaceShell organizationId={organizationId} organizationName={organization.name} email={user.email ?? "U"}>
      <div className="page-wrap">
        <section className="page-heading">
          <div><p>خوش آمدید · نمای زنده کسب‌وکار</p><h1>مرکز عملیات {organization.name}</h1><span className="heading-subtitle">فروش، مالی، عملیات و تیم در یک نگاه</span></div>
          <div className="heading-actions"><Link className="btn" href={`/dashboard/${organizationId}/crm?tab=activities`}>+ فعالیت</Link><Link className="btn btn-primary" href={`/dashboard/${organizationId}/crm?tab=leads`}>+ سرنخ جدید</Link></div>
        </section>

        <section className="metric-grid">
          <Metric label="ارزش پایپ‌لاین" value={pipelineValue.toLocaleString("fa-IR")} hint="ریال · معاملات باز" icon="↗" />
          <Metric label="حساب‌های دریافتنی" value={receivables.toLocaleString("fa-IR")} hint="ریال · فاکتورهای باز" icon="◫" />
          <Metric label="هزینه‌های ثبت‌شده" value={expenseTotal.toLocaleString("fa-IR")} hint="ریال · بدون موارد ردشده" icon="−" />
          <Metric label="سرنخ‌های فعال" value={(leads.count ?? 0).toLocaleString("fa-IR")} hint="در جریان پیگیری" icon="◎" />
        </section>

        <section className="business-modules">
          <div className="section-title"><div><h2>ماژول‌های عملیاتی</h2><p>ورود مستقیم به هر بخش از ERP سازمان</p></div></div>
          <div className="module-grid">
            {modules.map((module) => (
              <Link href={`/dashboard/${organizationId}/${module.href}`} className="module-card" key={module.href}>
                <span className="module-icon"><Icon name={module.icon} size={21} /></span>
                <div><strong>{module.title}</strong><p>{module.description}</p><small>{module.metric}</small></div>
                <span className="module-arrow">←</span>
              </Link>
            ))}
          </div>
        </section>

        <section className="dashboard-grid">
          <article className="surface">
            <div className="surface-head"><h2>آخرین فعالیت‌های CRM</h2><Link href={`/dashboard/${organizationId}/crm?tab=activities`}>مشاهده همه</Link></div>
            {activities.data?.length ? <div className="activity-list">{activities.data.map((activity) => <div className="activity-item" key={activity.id}><div className="activity-dot">{activity.type === "call" ? "☎" : activity.type === "meeting" ? "◷" : "✓"}</div><div><strong>{activity.subject}</strong><span>{activity.completed_at ? "انجام شده" : activity.due_at ? "برنامه‌ریزی شده" : "بدون سررسید"}</span></div><span>{activity.type}</span></div>)}</div> : <div className="empty-state"><div className="empty-visual">✓</div><strong>هنوز فعالیتی ثبت نشده</strong><p>تماس، جلسه و وظایف تیم اینجا نمایش داده می‌شوند.</p><Link className="btn" href={`/dashboard/${organizationId}/crm?tab=activities`}>ثبت اولین فعالیت</Link></div>}
          </article>
          <article className="surface">
            <div className="surface-head"><h2>نبض سازمان</h2><Link href={`/dashboard/${organizationId}/crm`}>ورود به CRM</Link></div>
            <div className="pulse-list">
              <Pulse label="مخاطبان" value={(contacts.count ?? 0).toLocaleString("fa-IR")} href={`/dashboard/${organizationId}/crm?tab=contacts`} />
              <Pulse label="کالاهای نیازمند سفارش" value={lowStock.toLocaleString("fa-IR")} href={`/dashboard/${organizationId}/inventory?tab=inventory_items`} />
              <Pulse label="پروژه‌های باز" value={(projects.count ?? 0).toLocaleString("fa-IR")} href={`/dashboard/${organizationId}/projects`} />
              <Pulse label="تیکت‌های باز" value={(tickets.count ?? 0).toLocaleString("fa-IR")} href={`/dashboard/${organizationId}/support`} />
            </div>
          </article>
        </section>
      </div>
    </WorkspaceShell>
  );
}

function Metric({ label, value, hint, icon }: { label: string; value: string; hint: string; icon: string }) {
  return <article className="metric-card"><div className="metric-label"><span>{label}</span><b>{icon}</b></div><div className="metric-value">{value}</div><div className="metric-hint">{hint}</div></article>;
}

function Pulse({ label, value, href }: { label: string; value: string; href: string }) {
  return <Link className="pulse-row" href={href}><span>{label}</span><strong>{value}</strong><b>←</b></Link>;
}
