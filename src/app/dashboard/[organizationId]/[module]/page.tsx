import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { WorkspaceShell } from "@/components/workspace-shell";
import { createClient } from "@/lib/supabase/server";
import { erpModules, type ModuleKey, type ErpTable } from "@/lib/erp-modules";
import { createErpRecord } from "./actions";

type Props={params:Promise<{organizationId:string;module:string}>;searchParams:Promise<{tab?:string;error?:string;success?:string}>};
type Row=Record<string,unknown>;
type Choice={id:string;name:string};

export default async function ModulePage({params,searchParams}:Props){
 const [{organizationId,module:rawModule},query]=await Promise.all([params,searchParams]);
 if(!(rawModule in erpModules))notFound();
 const moduleKey=rawModule as ModuleKey;
 const config=erpModules[moduleKey];
 const tabs=config.tabs as Record<string,{label:string;table:string;primary:string}>;
 const keys=Object.keys(tabs) as ErpTable[];
 const tab=keys.includes(query.tab as ErpTable)?query.tab as ErpTable:keys[0];
 const supabase=await createClient();
 const {data:{user}}=await supabase.auth.getUser();
 if(!user)redirect("/auth");
 const [{data:organization},{data:membership},{data:rows},{data:products},{data:warehouses},{data:suppliers},{data:projects}]=await Promise.all([
  supabase.from("organizations").select("id,name").eq("id",organizationId).maybeSingle(),
  supabase.from("organization_memberships").select("role").eq("organization_id",organizationId).eq("user_id",user.id).eq("status","active").maybeSingle(),
  supabase.from(tab).select("*").eq("organization_id",organizationId).order("created_at",{ascending:false}).limit(100),
  supabase.from("products").select("id,name").eq("organization_id",organizationId),
  supabase.from("warehouses").select("id,name").eq("organization_id",organizationId),
  supabase.from("suppliers").select("id,name").eq("organization_id",organizationId),
  supabase.from("projects").select("id,name").eq("organization_id",organizationId),
 ]);
 if(!organization||!membership)notFound();
 return <WorkspaceShell organizationId={organizationId} organizationName={organization.name} email={user.email??"U"} active={moduleKey}><div className="page-wrap">
  <section className="page-heading"><div><p>SmartOne ERP</p><h1>{config.title}</h1><span className="heading-subtitle">{config.description}</span></div><a className="btn btn-primary" href="#create">+ ثبت جدید</a></section>
  <div className="crm-toolbar"><nav className="view-tabs">{keys.map(key=><Link className={tab===key?"active":""} href={`?tab=${key}`} key={key}>{tabs[key]?.label??key}</Link>)}</nav><span className="count-pill">{(rows?.length??0).toLocaleString("fa-IR")} رکورد</span></div>
  {query.error?<p className="form-message error notice">{query.error}</p>:null}{query.success?<p className="form-message success notice">رکورد با موفقیت ثبت شد.</p>:null}
  <section className="data-layout"><article className="surface data-card"><div className="record record-head"><span>عنوان</span><span>وضعیت / اطلاعات</span><span>تاریخ ثبت</span></div>{rows?.length?<div className="records">{(rows as Row[]).map(row=><div className="record" key={String(row.id)}><strong>{recordTitle(row)}</strong><span>{String(row.status??row.employment_status??row.type??row.amount??row.quantity??"فعال")}</span><span>{new Date(String(row.created_at??row.updated_at)).toLocaleDateString("fa-IR")}</span></div>)}</div>:<div className="empty-state"><div className="empty-visual">＋</div><strong>هنوز اطلاعاتی ثبت نشده</strong><p>اولین رکورد را از فرم روبه‌رو ایجاد کنید.</p></div>}</article>
  <article className="surface form-panel" id="create"><div className="surface-head"><div><small>{config.title}</small><h2>ثبت رکورد جدید</h2></div></div><ErpForm table={tab} module={moduleKey} organizationId={organizationId} products={products??[]} warehouses={warehouses??[]} suppliers={suppliers??[]} projects={projects??[]}/></article></section>
 </div></WorkspaceShell>;
}

function recordTitle(row:Row){const direct=row.name??row.title??row.subject;if(direct)return String(direct);const person=`${row.first_name??""} ${row.last_name??""}`.trim();return person||"رکورد"}
function Hidden({organizationId,module,table}:{organizationId:string;module:string;table:string}){return <><input type="hidden" name="organizationId" value={organizationId}/><input type="hidden" name="module" value={module}/><input type="hidden" name="table" value={table}/></>}
function Input({name,label,type="text",required=false}:{name:string;label:string;type?:string;required?:boolean}){return <label>{label}<input name={name} type={type} required={required}/></label>}
function SelectChoice({name,label,items,empty="انتخاب کنید"}:{name:string;label:string;items:Choice[];empty?:string}){return <label>{label}<select name={name}><option value="">{empty}</option>{items.map(item=><option value={item.id} key={item.id}>{item.name}</option>)}</select></label>}

function ErpForm({table,module,organizationId,products,warehouses,suppliers,projects}:{table:ErpTable;module:string;organizationId:string;products:Choice[];warehouses:Choice[];suppliers:Choice[];projects:Choice[]}){
 return <form action={createErpRecord}><Hidden organizationId={organizationId} module={module} table={table}/>
  {table==="products"?<><Input name="name" label="نام محصول یا خدمت" required/><Input name="sku" label="کد محصول"/><label>نوع<select name="type"><option value="service">خدمت</option><option value="product">کالا</option></select></label><Input name="salePrice" label="قیمت فروش" type="number"/><Input name="costPrice" label="بهای تمام‌شده" type="number"/><Input name="unit" label="واحد"/></>:null}
  {table==="invoices"||table==="purchase_orders"?<><Input name="number" label="شماره سند" required/><Input name="title" label="عنوان" required/><Input name="amount" label="مبلغ" type="number"/><Input name="date" label="تاریخ سررسید" type="date"/>{table==="purchase_orders"?<SelectChoice name="relationId" label="تأمین‌کننده" items={suppliers}/>:null}</>:null}
  {table==="expenses"?<><Input name="title" label="عنوان هزینه" required/><Input name="category" label="دسته‌بندی"/><Input name="amount" label="مبلغ" type="number"/><Input name="date" label="تاریخ" type="date"/></>:null}
  {table==="suppliers"?<><Input name="name" label="نام تأمین‌کننده" required/><Input name="contactName" label="شخص رابط"/><Input name="phone" label="تلفن"/><Input name="email" label="ایمیل" type="email"/></>:null}
  {table==="warehouses"?<><Input name="name" label="نام انبار" required/><Input name="city" label="شهر"/><Input name="description" label="نشانی"/></>:null}
  {table==="inventory_items"?<><SelectChoice name="productId" label="محصول" items={products}/><SelectChoice name="warehouseId" label="انبار" items={warehouses}/><Input name="quantity" label="موجودی" type="number"/><Input name="reorderPoint" label="نقطه سفارش" type="number"/></>:null}
  {table==="employees"?<><Input name="firstName" label="نام" required/><Input name="lastName" label="نام خانوادگی"/><Input name="code" label="کد پرسنلی"/><Input name="jobTitle" label="سمت"/><Input name="department" label="واحد"/><Input name="phone" label="موبایل"/><Input name="email" label="ایمیل" type="email"/><Input name="date" label="تاریخ استخدام" type="date"/></>:null}
  {table==="projects"?<><Input name="name" label="نام پروژه" required/><Input name="description" label="شرح پروژه"/><Input name="date" label="تاریخ شروع" type="date"/><Input name="dueDate" label="موعد پایان" type="date"/></>:null}
  {table==="project_tasks"?<><Input name="title" label="عنوان وظیفه" required/><SelectChoice name="relationId" label="پروژه" items={projects} empty="بدون پروژه"/><label>اولویت<select name="priority"><option value="medium">متوسط</option><option value="high">زیاد</option><option value="urgent">فوری</option><option value="low">کم</option></select></label><Input name="date" label="سررسید" type="date"/></>:null}
  {table==="tickets"?<><Input name="title" label="موضوع تیکت" required/><label>اولویت<select name="priority"><option value="normal">عادی</option><option value="high">زیاد</option><option value="urgent">فوری</option><option value="low">کم</option></select></label></>:null}
  <button className="btn btn-primary">ثبت و ذخیره</button>
 </form>;
}
