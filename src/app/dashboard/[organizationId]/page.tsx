import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { signOut } from "@/app/auth/actions";
import { createClient } from "@/lib/supabase/server";

const modules = ["CRM و فروش", "مالی و حسابداری", "خرید و تأمین", "انبار", "منابع انسانی", "پروژه‌ها", "خدمات مشتریان", "اتوماسیون"];

type Props = { params: Promise<{ organizationId: string }> };

export default async function OrganizationDashboard({ params }: Props) {
  const { organizationId } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth");

  const [{ data: organization, error }, { data: membership }] = await Promise.all([
    supabase.from("organizations").select("id,name,slug").eq("id", organizationId).maybeSingle(),
    supabase.from("organization_memberships").select("role,status").eq("organization_id", organizationId).eq("user_id", user.id).eq("status", "active").maybeSingle(),
  ]);

  if (error || !organization || !membership) notFound();

  return <main className="shell">
    <aside>
      <div className="brand">Smart<span>One</span></div>
      <div className="panel"><small>سازمان فعال</small><strong>{organization.name}</strong></div>
      <nav>{modules.map((item, index) => <button className={index === 0 ? "active" : ""} key={item}>{item}</button>)}</nav>
      <Link className="secondary" href="/dashboard">تعویض سازمان</Link>
      <form action={signOut}><button className="logout">خروج از حساب</button></form>
    </aside>
    <section className="content">
      <header><div><p>{user.email} · {membership.role}</p><h1>{organization.name}</h1></div></header>
      <section className="panel">
        <p className="eyebrow">فضای کاری فعال شد</p>
        <h2>داشبورد سازمان</h2>
        <p className="muted">شما با موفقیت وارد سازمان شده‌اید. اطلاعات این فضا از سازمان‌های دیگر جدا است.</p>
      </section>
    </section>
  </main>;
}
