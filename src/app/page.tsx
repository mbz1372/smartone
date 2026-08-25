const modules = ["CRM و فروش", "مالی و حسابداری", "خرید و تأمین", "انبار", "منابع انسانی", "پروژه‌ها", "خدمات مشتریان", "اتوماسیون"];

export default function Home() {
  return <main className="shell">
    <aside><div className="brand">Smart<span>One</span></div><nav>{modules.map((item, index) => <button className={index === 0 ? "active" : ""} key={item}>{item}</button>)}</nav></aside>
    <section className="content"><header><div><p>فضای کاری اصلی</p><h1>مرکز فرمان کسب‌وکار</h1></div><button className="primary">ایجاد رکورد</button></header>
      <div className="notice"><strong>زیرساخت نسخه حرفه‌ای فعال شد</strong><span>امنیت چندسازمانی، CRM، ERP و سازنده فرایند به‌صورت ماژولار توسعه داده می‌شوند.</span></div>
      <div className="cards">{[{k:"فروش پیش‌بینی‌شده",v:"۴.۸ میلیارد"},{k:"فرصت‌های فعال",v:"۱۲۸"},{k:"مطالبات باز",v:"۹۴۰ میلیون"},{k:"وظایف امروز",v:"۲۴"}].map(x=><article key={x.k}><span>{x.k}</span><strong>{x.v}</strong></article>)}</div>
      <div className="grid"><article className="panel"><h2>پایپ‌لاین فروش</h2><div className="bars"><i style={{width:"88%"}}/><i style={{width:"63%"}}/><i style={{width:"42%"}}/><i style={{width:"28%"}}/></div></article><article className="panel"><h2>آمادگی ماژول‌ها</h2>{modules.slice(0,5).map((m,i)=><div className="row" key={m}><span>{m}</span><b>{[72,34,18,16,12][i]}٪</b></div>)}</article></div>
    </section>
  </main>;
}
