import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { WorkspaceShell } from "@/components/workspace-shell";
import { convertLead, createActivity, createCompany, createContact, createDeal, createLead, moveDeal } from "./actions";

const tabs=[["companies","شرکت‌ها"],["contacts","مخاطبان"],["leads","سرنخ‌ها"],["deals","معاملات"],["activities","فعالیت‌ها"]] as const;
type Tab=typeof tabs[number][0];
type Row=Record<string,unknown>;
type Props={params:Promise<{organizationId:string}>;searchParams:Promise<{tab?:string;error?:string;success?:string;converted?:string}>};

export default async function CrmPage({params,searchParams}:Props){
 const [{organizationId},query]=await Promise.all([params,searchParams]);
 const tab:Tab=tabs.some(([key])=>key===query.tab)?query.tab as Tab:"companies";
 const supabase=await createClient(); const{data:{user}}=await supabase.auth.getUser(); if(!user)redirect("/auth");
 await supabase.rpc("ensure_default_pipeline",{target_org:organizationId});
 const [{data:organization},{data:companies},{data:contacts},{data:leads},{data:deals},{data:activities},{data:pipelines},{data:stages}]=await Promise.all([
  supabase.from("organizations").select("id,name").eq("id",organizationId).maybeSingle(),
  supabase.from("companies").select("id,name,phone,industry,city,created_at").eq("organization_id",organizationId).order("created_at",{ascending:false}).limit(100),
  supabase.from("contacts").select("id,first_name,last_name,email,phone,job_title,company_id,created_at").eq("organization_id",organizationId).order("created_at",{ascending:false}).limit(100),
  supabase.from("leads").select("id,title,company_name,status,score,phone,created_at").eq("organization_id",organizationId).order("created_at",{ascending:false}).limit(100),
  supabase.from("deals").select("id,title,amount,currency,status,stage_id,company_id,created_at").eq("organization_id",organizationId).order("created_at",{ascending:false}).limit(100),
  supabase.from("activities").select("id,type,subject,due_at,completed_at,created_at").eq("organization_id",organizationId).order("created_at",{ascending:false}).limit(100),
  supabase.from("pipelines").select("id,name").eq("organization_id",organizationId).order("created_at"),
  supabase.from("pipeline_stages").select("id,pipeline_id,name,position,probability").eq("organization_id",organizationId).order("position"),
 ]); if(!organization)notFound();
 const rows={companies:companies??[],contacts:contacts??[],leads:leads??[],deals:deals??[],activities:activities??[]}[tab] as Row[];
 const title=tabs.find(([key])=>key===tab)?.[1]??"CRM";
 return <WorkspaceShell organizationId={organizationId} organizationName={organization.name} email={user.email??"U"} active="crm"><div className="page-wrap">
  <section className="page-heading"><div><p>CRM / {title}</p><h1>{title}</h1></div><div className="heading-actions"><button className="btn">ورود اطلاعات</button><a className="btn btn-primary" href="#quick-create">+ ثبت جدید</a></div></section>
  <div className="crm-toolbar"><nav className="view-tabs">{tabs.map(([key,label])=><Link className={tab===key?"active":""} href={`?tab=${key}`} key={key}>{label}</Link>)}</nav><div className="toolbar-actions"><button className="btn">فیلتر</button><button className="btn">ستون‌ها</button><span className="count-pill">{rows.length.toLocaleString("fa-IR")} رکورد</span></div></div>
  {query.error&&<p className="form-message error notice">{query.error}</p>}{(query.success||query.converted)&&<p className="form-message success notice">{query.converted?"سرنخ به مخاطب و معامله تبدیل شد.":"رکورد با موفقیت ثبت شد."}</p>}
  {tab==="deals"?<DealBoard organizationId={organizationId} deals={(deals??[]) as Row[]} stages={(stages??[]) as Row[]}/>:<section className="data-layout"><article className="surface data-card"><div className="table-tools"><input className="table-search" placeholder={`جست‌وجو در ${title}...`}/><button className="btn">عملیات گروهی</button></div><RecordTable tab={tab} rows={rows} organizationId={organizationId}/></article><article className="surface form-panel" id="quick-create"><div className="surface-head"><h2>ثبت سریع</h2></div><QuickForm tab={tab} organizationId={organizationId} companies={companies??[]} pipelines={pipelines??[]}/></article></section>}
  {tab==="deals"&&<article className="surface form-panel deal-create" id="quick-create"><div className="surface-head"><h2>معامله جدید</h2></div><QuickForm tab="deals" organizationId={organizationId} companies={companies??[]} pipelines={pipelines??[]}/></article>}
 </div></WorkspaceShell>;
}

function RecordTable({tab,rows,organizationId}:{tab:Tab;rows:Row[];organizationId:string}){if(!rows.length)return <Empty/>;return <div className="records">{rows.map(row=><div className="record" key={String(row.id)}><strong>{String(row.name??row.title??`${row.first_name??""} ${row.last_name??""}`)}</strong><span>{String(row.phone??row.email??row.status??row.type??"—")}</span>{tab==="leads"&&row.status!=="converted"?<form action={convertLead}><input type="hidden" name="organizationId" value={organizationId}/><input type="hidden" name="leadId" value={String(row.id)}/><button className="btn">تبدیل به مشتری</button></form>:<span>مشاهده ←</span>}</div>)}</div>}
function DealBoard({organizationId,deals,stages}:{organizationId:string;deals:Row[];stages:Row[]}){if(!stages.length)return <Empty/>;return <div className="kanban">{stages.map(stage=>{const cards=deals.filter(deal=>deal.stage_id===stage.id);return <section className="kanban-column" key={String(stage.id)}><header><strong>{String(stage.name)}</strong><span>{cards.length.toLocaleString("fa-IR")}</span></header><div className="kanban-cards">{cards.map(deal=><article className="deal-card" key={String(deal.id)}><strong>{String(deal.title)}</strong><b>{Number(deal.amount??0).toLocaleString("fa-IR")} {String(deal.currency)}</b><form action={moveDeal}><input type="hidden" name="organizationId" value={organizationId}/><input type="hidden" name="dealId" value={String(deal.id)}/><select name="stageId" defaultValue={String(stage.id)}>{stages.map(s=><option value={String(s.id)} key={String(s.id)}>{String(s.name)}</option>)}</select><button>انتقال</button></form></article>)}</div></section>})}</div>}
function Empty(){return <div className="empty-state"><div className="empty-visual">◎</div><strong>هنوز رکوردی وجود ندارد</strong><p>اولین رکورد را از فرم ثبت سریع ایجاد کنید.</p></div>}
function QuickForm({tab,organizationId,companies,pipelines}:{tab:Tab;organizationId:string;companies:Array<{id:string;name:string}>;pipelines:Array<{id:string;name:string}>}){const action=tab==="companies"?createCompany:tab==="contacts"?createContact:tab==="leads"?createLead:tab==="deals"?createDeal:createActivity;return <form action={action}><input type="hidden" name="organizationId" value={organizationId}/>
 {tab==="companies"&&<><label>نام شرکت<input name="name" required/></label><label>تلفن<input name="phone"/></label><label>صنعت<input name="industry"/></label><label>شهر<input name="city"/></label><label>وب‌سایت<input name="website"/></label></>}
 {tab==="contacts"&&<><label>نام<input name="firstName" required/></label><label>نام خانوادگی<input name="lastName"/></label><label>شرکت<select name="companyId"><option value="">بدون شرکت</option>{companies.map(c=><option value={c.id} key={c.id}>{c.name}</option>)}</select></label><label>موبایل<input name="phone"/></label><label>ایمیل<input type="email" name="email"/></label><label>سمت<input name="jobTitle"/></label></>}
 {tab==="leads"&&<><label>عنوان سرنخ<input name="title" required/></label><label>نام<input name="firstName"/></label><label>نام خانوادگی<input name="lastName"/></label><label>نام شرکت<input name="companyName"/></label><label>موبایل<input name="phone"/></label><label>منبع<input name="source"/></label></>}
 {tab==="deals"&&<><label>عنوان معامله<input name="title" required/></label><label>مبلغ<input type="number" name="amount" min="0"/></label><label>ارز<select name="currency"><option value="IRR">ریال</option><option value="USD">دلار</option><option value="EUR">یورو</option></select></label><label>شرکت<select name="companyId"><option value="">بدون شرکت</option>{companies.map(c=><option value={c.id} key={c.id}>{c.name}</option>)}</select></label><label>پایپ‌لاین<select name="pipelineId">{pipelines.map(p=><option value={p.id} key={p.id}>{p.name}</option>)}</select></label></>}
 {tab==="activities"&&<><label>نوع<select name="type"><option value="task">وظیفه</option><option value="call">تماس</option><option value="meeting">جلسه</option><option value="email">ایمیل</option><option value="note">یادداشت</option></select></label><label>موضوع<input name="subject" required/></label><label>سررسید<input type="datetime-local" name="dueAt"/></label><label>توضیحات<textarea name="description"/></label></>}
 <button className="btn btn-primary">ثبت و ذخیره</button></form>}
