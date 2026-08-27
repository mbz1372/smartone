export const erpModules={
 finance:{title:"مالی و حسابداری",description:"فاکتورها، دریافت‌ها و هزینه‌های کسب‌وکار",tabs:{invoices:{label:"فاکتورها",table:"invoices",primary:"title"},expenses:{label:"هزینه‌ها",table:"expenses",primary:"title"}}},
 catalog:{title:"محصولات و خدمات",description:"کاتالوگ، قیمت فروش و بهای تمام‌شده",tabs:{products:{label:"محصولات و خدمات",table:"products",primary:"name"}}},
 procurement:{title:"خرید و تأمین",description:"تأمین‌کنندگان و سفارش‌های خرید",tabs:{suppliers:{label:"تأمین‌کنندگان",table:"suppliers",primary:"name"},purchase_orders:{label:"سفارش‌های خرید",table:"purchase_orders",primary:"title"}}},
 inventory:{title:"انبار",description:"انبارها و کنترل موجودی کالا",tabs:{warehouses:{label:"انبارها",table:"warehouses",primary:"name"},inventory_items:{label:"موجودی کالا",table:"inventory_items",primary:"quantity"}}},
 hr:{title:"منابع انسانی",description:"پرسنل، سمت‌ها و وضعیت همکاری",tabs:{employees:{label:"پرسنل",table:"employees",primary:"first_name"}}},
 projects:{title:"پروژه‌ها و وظایف",description:"برنامه‌ریزی، اجرا و کنترل پیشرفت",tabs:{projects:{label:"پروژه‌ها",table:"projects",primary:"name"},project_tasks:{label:"وظایف",table:"project_tasks",primary:"title"}}},
 support:{title:"خدمات مشتریان",description:"تیکت‌ها، اولویت و وضعیت پاسخ‌گویی",tabs:{tickets:{label:"تیکت‌ها",table:"tickets",primary:"subject"}}},
} as const;
export type ModuleKey=keyof typeof erpModules;
export type ErpTable="products"|"invoices"|"expenses"|"suppliers"|"purchase_orders"|"warehouses"|"inventory_items"|"employees"|"projects"|"project_tasks"|"tickets";
