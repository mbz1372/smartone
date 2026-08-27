import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { signOut } from "@/app/auth/actions";
import { createOrganization } from "./actions";

const modules = ["CRM و فروش", "مالی و حسابداری", "خرید و تأمین", "انبار", "منابع انسانی", "پروژه‌ها", "خدمات مشتریان", "اتوماسیون"];
type Props = { searchParams: Promise<{ error?: string }> };

export default async function Dashboard({ searchParams }: Props) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth");
  const [{ data: organizations }, { data: adminRows }, message] = await Promise.all([
    supabase.from("organizations").select("id,name,slug,created_at").order("created_at", { ascending: false }),
    supabase.from("platform_admins").select("user_id").eq("user_id", user.id),
    searchParams,
  ]);
  const isSuperAdmin = Boolean(adminRows?.length);
  return <main className="shell">
    <aside><div className="brand">Smart<span>One</span></div><nav>{modules.map((item, index) => <button className={index === 0 ? "active" : ""} key={item}>{item}</button>)}</nav><form action={signOut}><button className="logout">خروج از حساب</button></form></aside>
    <section className="content"><header><div><p>{user.email} {isSuperAdmin && <span className="admin-badge">SUPER ADMIN</span>}</p><h1>فضای کاری شما</h1></div></header>
      {message.error && <p className="form-message error">{message.error}</p>}
      <section className="workspace-grid"><article className="panel"><h2>سازمان‌های من</h2>{organizations?.length ? organizations.map(org => <div className="org-row" key={org.id}><div className="org-avatar">{org.name.slice(0,1)}</div><div><strong>{org.name}</strong><span>{org.slug}</span></div><Link className="secondary button-link" href={`/dashboard/${org.id}`}>ورود به سازمان</Link></div>) : <div className="empty"><strong>هنوز سازمانی ندارید</strong><span>اولین فضای کاری خود را ایجاد کنید.</span></div>}</article>
      <article className="panel"><h2>ساخت سازمان جدید</h2><p className="muted">هر سازمان اطلاعات، اعضا و سطح دسترسی مستقل دارد.</p><form action={createOrganization}><label>نام سازمان<input name="name" required minLength={2} maxLength={80} placeholder="مثلاً اسمارت‌سینک" /></label><button className="primary wide">ایجاد فضای کاری</button></form></article></section>
    </section>
  </main>;
}
