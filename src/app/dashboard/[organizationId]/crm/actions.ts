"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

const id = z.string().uuid();
const text = z.string().trim().min(1).max(160);

async function context(formData: FormData) {
  const organizationId = id.parse(formData.get("organizationId"));
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth");
  return { organizationId, supabase, user };
}

function value(formData: FormData, key: string) {
  const result = formData.get(key)?.toString().trim();
  return result || null;
}

export async function createCompany(formData: FormData) {
  const { organizationId, supabase, user } = await context(formData);
  const name = text.parse(formData.get("name"));
  const { error } = await supabase.from("companies").insert({ organization_id: organizationId, name, phone: value(formData,"phone"), website: value(formData,"website"), industry: value(formData,"industry"), city: value(formData,"city"), owner_id: user.id });
  if (error) redirect(`/dashboard/${organizationId}/crm?tab=companies&error=${encodeURIComponent(error.message)}`);
  revalidatePath(`/dashboard/${organizationId}/crm`);
  redirect(`/dashboard/${organizationId}/crm?tab=companies&success=1`);
}

export async function createContact(formData: FormData) {
  const { organizationId, supabase, user } = await context(formData);
  const firstName = text.parse(formData.get("firstName"));
  const { error } = await supabase.from("contacts").insert({ organization_id: organizationId, first_name: firstName, last_name: value(formData,"lastName"), email: value(formData,"email"), phone: value(formData,"phone"), job_title: value(formData,"jobTitle"), company_id: value(formData,"companyId"), owner_id: user.id });
  if (error) redirect(`/dashboard/${organizationId}/crm?tab=contacts&error=${encodeURIComponent(error.message)}`);
  revalidatePath(`/dashboard/${organizationId}/crm`);
  redirect(`/dashboard/${organizationId}/crm?tab=contacts&success=1`);
}

export async function createLead(formData: FormData) {
  const { organizationId, supabase, user } = await context(formData);
  const title = text.parse(formData.get("title"));
  const { error } = await supabase.from("leads").insert({ organization_id: organizationId, title, first_name: value(formData,"firstName"), last_name: value(formData,"lastName"), company_name: value(formData,"companyName"), email: value(formData,"email"), phone: value(formData,"phone"), source: value(formData,"source"), owner_id: user.id });
  if (error) redirect(`/dashboard/${organizationId}/crm?tab=leads&error=${encodeURIComponent(error.message)}`);
  revalidatePath(`/dashboard/${organizationId}/crm`);
  redirect(`/dashboard/${organizationId}/crm?tab=leads&success=1`);
}

export async function createActivity(formData: FormData) {
  const { organizationId, supabase, user } = await context(formData);
  const subject = text.parse(formData.get("subject"));
  const activityType = z.enum(["task","call","meeting","email","note"]).parse(formData.get("type"));
  const { error } = await supabase.from("activities").insert({ organization_id: organizationId, subject, type: activityType, description: value(formData,"description"), due_at: value(formData,"dueAt"), assigned_to: user.id });
  if (error) redirect(`/dashboard/${organizationId}/crm?tab=activities&error=${encodeURIComponent(error.message)}`);
  revalidatePath(`/dashboard/${organizationId}/crm`);
  redirect(`/dashboard/${organizationId}/crm?tab=activities&success=1`);
}

export async function createDeal(formData: FormData) {
  const { organizationId, supabase, user } = await context(formData);
  const title = text.parse(formData.get("title"));
  let pipelineId = value(formData,"pipelineId");
  if (!pipelineId) {
    const { data, error } = await supabase.rpc("ensure_default_pipeline", { target_org: organizationId });
    if (error || typeof data !== "string") redirect(`/dashboard/${organizationId}/crm?tab=deals&error=${encodeURIComponent(error?.message ?? "خطا در ساخت پایپ‌لاین")}`);
    pipelineId = data;
  }
  const { data: firstStage } = await supabase.from("pipeline_stages").select("id").eq("pipeline_id",pipelineId).order("position").limit(1).maybeSingle();
  if (!firstStage) redirect(`/dashboard/${organizationId}/crm?tab=deals&error=${encodeURIComponent("مرحله پایپ‌لاین پیدا نشد.")}`);
  const amount = z.coerce.number().min(0).parse(formData.get("amount") || 0);
  const { error } = await supabase.from("deals").insert({ organization_id:organizationId,pipeline_id:pipelineId,stage_id:firstStage.id,title,amount,currency:value(formData,"currency")??"IRR",company_id:value(formData,"companyId"),owner_id:user.id });
  if (error) redirect(`/dashboard/${organizationId}/crm?tab=deals&error=${encodeURIComponent(error.message)}`);
  revalidatePath(`/dashboard/${organizationId}/crm`); redirect(`/dashboard/${organizationId}/crm?tab=deals&success=1`);
}

export async function convertLead(formData: FormData) {
  const { organizationId, supabase } = await context(formData); const leadId = id.parse(formData.get("leadId"));
  const { error } = await supabase.rpc("convert_lead", { target_lead: leadId });
  if (error) redirect(`/dashboard/${organizationId}/crm?tab=leads&error=${encodeURIComponent(error.message)}`);
  revalidatePath(`/dashboard/${organizationId}/crm`); redirect(`/dashboard/${organizationId}/crm?tab=deals&converted=1`);
}

export async function moveDeal(formData: FormData) {
  const { organizationId, supabase } = await context(formData); const dealId=id.parse(formData.get("dealId")); const stageId=id.parse(formData.get("stageId"));
  const { error } = await supabase.from("deals").update({stage_id:stageId,updated_at:new Date().toISOString()}).eq("id",dealId).eq("organization_id",organizationId);
  if (error) redirect(`/dashboard/${organizationId}/crm?tab=deals&error=${encodeURIComponent(error.message)}`);
  revalidatePath(`/dashboard/${organizationId}/crm`); redirect(`/dashboard/${organizationId}/crm?tab=deals`);
}

const entityConfig = {
  companies: { table: "companies", tab: "companies" },
  contacts: { table: "contacts", tab: "contacts" },
  leads: { table: "leads", tab: "leads" },
  deals: { table: "deals", tab: "deals" },
  activities: { table: "activities", tab: "activities" },
} as const;

export async function updateRecord(formData: FormData) {
  const { organizationId, supabase } = await context(formData);
  const entity = z.enum(["companies","contacts","leads","deals","activities"]).parse(formData.get("entity"));
  const recordId = id.parse(formData.get("recordId"));
  const config = entityConfig[entity];
  const common = { updated_at: new Date().toISOString() };
  let payload: Record<string, string | number | null> = common;
  if (entity === "companies") payload = { ...common, name:text.parse(formData.get("name")), phone:value(formData,"phone"), website:value(formData,"website"), industry:value(formData,"industry"), city:value(formData,"city") };
  if (entity === "contacts") payload = { ...common, first_name:text.parse(formData.get("firstName")), last_name:value(formData,"lastName"), email:value(formData,"email"), phone:value(formData,"phone"), job_title:value(formData,"jobTitle"), company_id:value(formData,"companyId") };
  if (entity === "leads") payload = { ...common, title:text.parse(formData.get("title")), first_name:value(formData,"firstName"), last_name:value(formData,"lastName"), company_name:value(formData,"companyName"), email:value(formData,"email"), phone:value(formData,"phone"), source:value(formData,"source"), status:z.enum(["new","working","qualified","unqualified","converted"]).parse(formData.get("status")), score:z.coerce.number().min(0).max(100).parse(formData.get("score") || 0) };
  if (entity === "deals") payload = { ...common, title:text.parse(formData.get("title")), amount:z.coerce.number().min(0).parse(formData.get("amount") || 0), currency:value(formData,"currency")??"IRR", company_id:value(formData,"companyId"), expected_close_date:value(formData,"expectedCloseDate"), status:z.enum(["open","won","lost"]).parse(formData.get("status")) };
  if (entity === "activities") payload = { subject:text.parse(formData.get("subject")), type:z.enum(["task","call","meeting","email","note"]).parse(formData.get("type")), description:value(formData,"description"), due_at:value(formData,"dueAt") };
  const { error } = await supabase.from(config.table).update(payload).eq("id",recordId).eq("organization_id",organizationId);
  if (error) redirect(`/dashboard/${organizationId}/crm/${entity}/${recordId}?error=${encodeURIComponent(error.message)}`);
  revalidatePath(`/dashboard/${organizationId}/crm`);
  redirect(`/dashboard/${organizationId}/crm/${entity}/${recordId}?success=1`);
}

export async function deleteRecord(formData: FormData) {
  const { organizationId, supabase } = await context(formData);
  const entity = z.enum(["companies","contacts","leads","deals","activities"]).parse(formData.get("entity"));
  const recordId = id.parse(formData.get("recordId"));
  const config = entityConfig[entity];
  const { error } = await supabase.from(config.table).delete().eq("id",recordId).eq("organization_id",organizationId);
  if (error) redirect(`/dashboard/${organizationId}/crm/${entity}/${recordId}?error=${encodeURIComponent(error.message)}`);
  revalidatePath(`/dashboard/${organizationId}/crm`);
  redirect(`/dashboard/${organizationId}/crm?tab=${config.tab}&deleted=1`);
}

export async function toggleActivity(formData: FormData) {
  const { organizationId, supabase } = await context(formData);
  const activityId=id.parse(formData.get("recordId"));
  const completed=formData.get("completed")==="true";
  const { error }=await supabase.from("activities").update({completed_at:completed?null:new Date().toISOString()}).eq("id",activityId).eq("organization_id",organizationId);
  if(error) redirect(`/dashboard/${organizationId}/crm?tab=activities&error=${encodeURIComponent(error.message)}`);
  revalidatePath(`/dashboard/${organizationId}/crm`);
  redirect(`/dashboard/${organizationId}/crm?tab=activities`);
}
