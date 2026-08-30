import Link from "next/link";
import { signIn, signUp } from "./actions";

type Props = { searchParams: Promise<{ error?: string; success?: string }> };

export default async function AuthPage({ searchParams }: Props) {
  const message = await searchParams;
  return <main className="auth-shell">
    <section className="auth-story"><div className="brand light">Smart<span>One</span></div><h1>همه فرایندهای کسب‌وکار، در یک فضای امن</h1><p>CRM، فروش، مالی، پروژه، منابع انسانی و اتوماسیون؛ قابل تنظیم برای هر سازمان.</p><div className="auth-points"><span>✓ جداسازی کامل اطلاعات سازمان‌ها</span><span>✓ فارسی، انگلیسی و تقویم سازمانی</span><span>✓ آماده رشد از CRM تا ERP</span></div></section>
    <section className="auth-card"><div><p className="eyebrow">ورود به SmartOne</p><h2>خوش آمدید</h2><p className="muted">با حساب کاری خود وارد شوید یا حساب جدید بسازید.</p></div>
      {message.error && <p className="form-message error">{message.error}</p>}
      {message.success && <p className="form-message success">{message.success}</p>}
      <form><label>ایمیل<input name="email" type="email" dir="ltr" required autoComplete="email" placeholder="you@company.com" /></label><label>رمز عبور<input name="password" type="password" dir="ltr" minLength={8} required autoComplete="current-password" placeholder="حداقل ۸ کاراکتر" /></label><Link className="forgot-link" href="/auth/forgot-password">رمز عبور را فراموش کرده‌اید؟</Link><div className="auth-actions"><button formAction={signIn} className="primary wide">ورود</button><button formAction={signUp} className="secondary wide">ساخت حساب</button></div></form>
      <small>با ادامه، شرایط استفاده و سیاست حریم خصوصی SmartOne را می‌پذیرید.</small>
    </section>
  </main>;
}
