import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { signOut } from "@/app/auth/actions";
import { Icon } from "@/components/ui/icon";
import { createOrganization } from "./actions";

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

  return (
    <main className="workspace-hub">
      <header className="hub-header">
        <Link className="v2-brand hub-brand" href="/dashboard"><span className="v2-brand-mark">S</span><span>SmartOne<small>BUSINESS OS</small></span></Link>
        <div className="hub-user">
          <span>{user.email?.slice(0, 1).toUpperCase()}</span>
          <div><strong>{user.email}</strong><small>{isSuperAdmin ? "مدیر کل پلتفرم" : "حساب کاربری"}</small></div>
          {isSuperAdmin ? <b>SUPER ADMIN</b> : null}
          <form action={signOut}><button type="submit"><Icon name="logout" size={16} /> خروج</button></form>
        </div>
      </header>

      <section className="hub-hero">
        <div><p>فضای کاری SmartOne</p><h1>کسب‌وکارتان را از یک نقطه مدیریت کنید</h1><span>یک سازمان را انتخاب کنید یا برای تیم جدید فضای مستقل بسازید.</span></div>
        <div className="hub-summary"><strong>{(organizations?.length ?? 0).toLocaleString("fa-IR")}</strong><span>سازمان فعال</span></div>
      </section>

      {message.error ? <p className="form-message error hub-notice">{message.error}</p> : null}

      <section className="hub-layout">
        <article className="hub-organizations">
          <div className="hub-section-title"><div><h2>سازمان‌های من</h2><p>ورود امن به داده‌ها و ماژول‌های هر سازمان</p></div></div>
          {organizations?.length ? (
            <div className="organization-cards">
              {organizations.map((organization) => (
                <Link className="organization-card" href={`/dashboard/${organization.id}`} key={organization.id}>
                  <span>{organization.name.slice(0, 1)}</span>
                  <div><strong>{organization.name}</strong><small>{organization.slug}</small><p>CRM · مالی · عملیات · منابع انسانی</p></div>
                  <b>ورود به فضای کاری ←</b>
                </Link>
              ))}
            </div>
          ) : (
            <div className="hub-empty"><span><Icon name="building" size={28} /></span><strong>هنوز سازمانی ندارید</strong><p>اولین فضای کاری مستقل خود را از فرم روبه‌رو ایجاد کنید.</p></div>
          )}
        </article>

        <aside className="create-workspace-card">
          <span className="create-icon"><Icon name="building" size={24} /></span>
          <h2>سازمان جدید</h2>
          <p>اطلاعات، اعضا و سطح دسترسی این فضا کاملاً مستقل خواهد بود.</p>
          <form action={createOrganization}>
            <label>نام سازمان<input name="name" required minLength={2} maxLength={80} placeholder="مثلاً هتل ایران" /></label>
            <button className="btn btn-primary" type="submit">ایجاد و ورود به فضای کاری</button>
          </form>
          <small><Icon name="help" size={14} /> بعداً می‌توانید اعضای تیم را اضافه کنید.</small>
        </aside>
      </section>
    </main>
  );
}
