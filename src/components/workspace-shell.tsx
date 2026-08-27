import Link from "next/link";
import { signOut } from "@/app/auth/actions";

export function WorkspaceShell({ organizationId, organizationName, email, active="home", children }: { organizationId:string; organizationName:string; email:string; active?:string; children:React.ReactNode }) {
  const items=[
    ["home","⌂","نمای کلی",`/dashboard/${organizationId}`],
    ["crm","◉","CRM و فروش",`/dashboard/${organizationId}/crm`],
    ["finance","▤","مالی",`/dashboard/${organizationId}/finance`],
    ["catalog","◫","محصولات",`/dashboard/${organizationId}/catalog`],
    ["procurement","◇","خرید و تأمین",`/dashboard/${organizationId}/procurement`],
    ["inventory","▦","انبار",`/dashboard/${organizationId}/inventory`],
    ["hr","♙","منابع انسانی",`/dashboard/${organizationId}/hr`],
    ["projects","✓","پروژه‌ها",`/dashboard/${organizationId}/projects`],
    ["support","◌","پشتیبانی",`/dashboard/${organizationId}/support`],
  ];
  return <div className="app-frame"><aside className="app-sidebar"><Link className="app-logo" href="/dashboard"><span className="logo-mark">S</span><span>Smart<span>One</span></span></Link><div className="workspace-switch"><div className="workspace-avatar">{organizationName.slice(0,1)}</div><div><small>فضای کاری فعال</small><strong>{organizationName}</strong></div><b>⌄</b></div><div className="side-group">فضای کاری</div><nav className="side-nav">{items.map(([key,icon,label,href])=><Link className={`side-link ${active===key?"active":""}`} href={href} key={key}><span className="side-icon">{icon}</span>{label}</Link>)}</nav><div className="side-footer"><div className="account-card"><div className="user-avatar">{email.slice(0,1).toUpperCase()}</div><div><strong>{email.split("@")[0]}</strong><small>{email}</small></div></div><Link className="secondary" href="/dashboard">تعویض سازمان</Link><form action={signOut}><button>خروج از حساب</button></form></div></aside><main className="app-main"><header className="topbar"><Link className="mobile-logo" href="/dashboard"><span className="logo-mark">S</span></Link><Link className="global-search" href={`/dashboard/${organizationId}/crm`}><span>⌕</span><span>جست‌وجو در مشتریان، شرکت‌ها و معاملات...</span><kbd>Ctrl K</kbd></Link><div className="top-actions"><span className="live-badge"><i/> سیستم فعال</span><div className="user-avatar">{email.slice(0,1).toUpperCase()}</div></div></header><nav className="mobile-nav">{items.map(([key,icon,label,href])=><Link className={active===key?"active":""} href={href} key={key}><span>{icon}</span>{label}</Link>)}</nav>{children}</main></div>;
}
