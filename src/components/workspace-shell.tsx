import Link from "next/link";
import { signOut } from "@/app/auth/actions";

export function WorkspaceShell({ organizationId, organizationName, email, active="home", children }: { organizationId:string; organizationName:string; email:string; active?:string; children:React.ReactNode }) {
  const items=[
    ["home","⌂","نمای کلی",`/dashboard/${organizationId}`],
    ["crm","◎","CRM و فروش",`/dashboard/${organizationId}/crm`],
    ["finance","◫","مالی و حسابداری",""],["buy","◇","خرید و تأمین",""],["stock","▦","انبار",""],
    ["hr","♙","منابع انسانی",""],["project","✓","پروژه‌ها",""],["support","◌","خدمات مشتریان",""],["auto","ϟ","اتوماسیون",""],
  ];
  return <div className="app-frame"><aside className="app-sidebar"><Link className="app-logo" href="/dashboard"><span className="logo-mark">S</span>SmartOne</Link><div className="workspace-switch"><small>فضای کاری فعال</small><strong>{organizationName}</strong></div><div className="side-group">فضای کاری</div><nav className="side-nav">{items.map(([key,icon,label,href])=>href?<Link className={`side-link ${active===key?"active":""}`} href={href} key={key}><span className="side-icon">{icon}</span>{label}</Link>:<span className="side-link soon" key={key}><span className="side-icon">{icon}</span>{label}<small>به‌زودی</small></span>)}</nav><div className="side-footer"><Link className="secondary" href="/dashboard">تعویض سازمان</Link><form action={signOut}><button>خروج از حساب</button></form></div></aside><main className="app-main"><header className="topbar"><Link className="global-search" href={`/dashboard/${organizationId}/crm`}><span>⌕</span><span>جست‌وجو در CRM...</span><kbd>Ctrl K</kbd></Link><div className="top-actions"><div className="user-avatar">{email.slice(0,1).toUpperCase()}</div></div></header>{children}</main></div>;
}
