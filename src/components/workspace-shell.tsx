import Link from "next/link";
import { signOut } from "@/app/auth/actions";
import { Icon, type IconName } from "@/components/ui/icon";

type NavItem = {
  key: string;
  label: string;
  href: string;
  icon: IconName;
};

type WorkspaceShellProps = {
  organizationId: string;
  organizationName: string;
  email: string;
  active?: string;
  children: React.ReactNode;
};

export function WorkspaceShell({
  organizationId,
  organizationName,
  email,
  active = "home",
  children,
}: WorkspaceShellProps) {
  const main: NavItem[] = [
    { key: "home", label: "نمای کلی", href: `/dashboard/${organizationId}`, icon: "home" },
    { key: "crm", label: "ارتباط با مشتریان", href: `/dashboard/${organizationId}/crm`, icon: "crm" },
    { key: "finance", label: "مالی و حسابداری", href: `/dashboard/${organizationId}/finance`, icon: "finance" },
    { key: "catalog", label: "محصولات و خدمات", href: `/dashboard/${organizationId}/catalog`, icon: "product" },
    { key: "procurement", label: "خرید و تأمین", href: `/dashboard/${organizationId}/procurement`, icon: "buy" },
    { key: "inventory", label: "مدیریت انبار", href: `/dashboard/${organizationId}/inventory`, icon: "inventory" },
    { key: "hr", label: "منابع انسانی", href: `/dashboard/${organizationId}/hr`, icon: "users" },
    { key: "projects", label: "پروژه‌ها و وظایف", href: `/dashboard/${organizationId}/projects`, icon: "projects" },
    { key: "support", label: "خدمات مشتریان", href: `/dashboard/${organizationId}/support`, icon: "support" },
  ];

  return (
    <div className="v2-shell">
      <aside className="v2-sidebar">
        <Link className="v2-brand" href="/dashboard">
          <span className="v2-brand-mark">S</span>
          <span>
            SmartOne
            <small>BUSINESS OS</small>
          </span>
        </Link>

        <div className="v2-org">
          <span>{organizationName.slice(0, 1)}</span>
          <div>
            <small>فضای کاری فعال</small>
            <strong>{organizationName}</strong>
          </div>
        </div>

        <p className="v2-nav-title">منوی اصلی</p>
        <nav className="v2-nav" aria-label="منوی اصلی سازمان">
          {main.map((item) => (
            <Link className={active === item.key ? "active" : ""} href={item.href} key={item.key}>
              <Icon name={item.icon} />
              <span>{item.label}</span>
              {active === item.key ? <i /> : null}
            </Link>
          ))}
        </nav>

        <div className="v2-sidebar-bottom">
          <Link href="/dashboard">
            <Icon name="building" size={17} />
            <span>تعویض سازمان</span>
          </Link>
          <form action={signOut}>
            <button type="submit">
              <Icon name="logout" size={17} />
              <span>خروج از حساب</span>
            </button>
          </form>
        </div>
      </aside>

      <main className="v2-main">
        <header className="v2-topbar">
          <Link className="v2-search" href={`/dashboard/${organizationId}/crm`}>
            <Icon name="search" />
            <span>جست‌وجو در اطلاعات CRM</span>
            <kbd>
              <Icon name="command" size={12} /> K
            </kbd>
          </Link>

          <div className="v2-profile" aria-label={`کاربر ${email}`}>
            <span>{email.slice(0, 1).toUpperCase()}</span>
            <div>
              <strong>{email.split("@")[0]}</strong>
              <small>حساب کاربری</small>
            </div>
          </div>
        </header>
        {children}
      </main>

      <nav className="v2-mobile-nav" aria-label="دسترسی سریع موبایل">
        {main.slice(0, 4).map((item) => (
          <Link className={active === item.key ? "active" : ""} href={item.href} key={item.key}>
            <Icon name={item.icon} size={19} />
            <span>{item.label.split(" ")[0]}</span>
          </Link>
        ))}
      </nav>
    </div>
  );
}
