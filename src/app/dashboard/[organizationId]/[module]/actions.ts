"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import type { ErpTable } from "@/lib/erp-modules";

const id = z.string().uuid();
const tables = z.enum([
  "products",
  "invoices",
  "expenses",
  "suppliers",
  "purchase_orders",
  "warehouses",
  "inventory_items",
  "employees",
  "projects",
  "project_tasks",
  "tickets",
]);
const modules = z.enum(["finance", "catalog", "procurement", "inventory", "hr", "projects", "support"]);

function value(formData: FormData, key: string) {
  return formData.get(key)?.toString().trim() || null;
}

function required(formData: FormData, key: string) {
  return z.string().trim().min(1).max(180).parse(formData.get(key));
}

function numberValue(formData: FormData, key: string, maximum?: number) {
  const schema = maximum ? z.coerce.number().min(0).max(maximum) : z.coerce.number().min(0);
  return schema.parse(value(formData, key) ?? 0);
}

function enumValue<T extends [string, ...string[]]>(formData: FormData, key: string, choices: T, fallback: T[number]) {
  return z.enum(choices).catch(fallback).parse(value(formData, key));
}

function path(organizationId: string, moduleKey: string, table: string) {
  return `/dashboard/${organizationId}/${moduleKey}?tab=${table}`;
}

async function actionContext(formData: FormData) {
  const organizationId = id.parse(formData.get("organizationId"));
  const moduleKey = modules.parse(formData.get("module"));
  const table = tables.parse(formData.get("table")) as ErpTable;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth");
  return { organizationId, moduleKey, table, supabase, user };
}

function payloadFor(table: ErpTable, formData: FormData) {
  if (table === "products") return {
    name: required(formData, "name"),
    sku: value(formData, "sku"),
    type: enumValue(formData, "type", ["service", "product"], "service"),
    sale_price: numberValue(formData, "salePrice"),
    cost_price: numberValue(formData, "costPrice"),
    unit: value(formData, "unit") || "عدد",
    status: enumValue(formData, "status", ["active", "inactive"], "active"),
  };
  if (table === "invoices") return {
    number: required(formData, "number"),
    title: required(formData, "title"),
    company_id: value(formData, "companyId"),
    amount: numberValue(formData, "amount"),
    paid_amount: numberValue(formData, "paidAmount"),
    status: enumValue(formData, "status", ["draft", "issued", "paid", "overdue", "cancelled"], "draft"),
    due_date: value(formData, "date"),
  };
  if (table === "expenses") return {
    title: required(formData, "title"),
    category: value(formData, "category"),
    amount: numberValue(formData, "amount"),
    expense_date: value(formData, "date") || new Date().toISOString().slice(0, 10),
    status: enumValue(formData, "status", ["pending", "approved", "paid", "rejected"], "pending"),
  };
  if (table === "suppliers") return {
    name: required(formData, "name"),
    contact_name: value(formData, "contactName"),
    phone: value(formData, "phone"),
    email: value(formData, "email"),
    status: enumValue(formData, "status", ["active", "inactive"], "active"),
  };
  if (table === "purchase_orders") return {
    number: required(formData, "number"),
    title: required(formData, "title"),
    supplier_id: value(formData, "relationId"),
    amount: numberValue(formData, "amount"),
    status: enumValue(formData, "status", ["draft", "approved", "ordered", "received", "cancelled"], "draft"),
    expected_date: value(formData, "date"),
  };
  if (table === "warehouses") return {
    name: required(formData, "name"),
    city: value(formData, "city"),
    address: value(formData, "description"),
  };
  if (table === "inventory_items") return {
    product_id: id.parse(formData.get("productId")),
    warehouse_id: id.parse(formData.get("warehouseId")),
    quantity: numberValue(formData, "quantity"),
    reorder_point: numberValue(formData, "reorderPoint"),
  };
  if (table === "employees") return {
    first_name: required(formData, "firstName"),
    last_name: value(formData, "lastName"),
    personnel_code: value(formData, "code"),
    job_title: value(formData, "jobTitle"),
    department: value(formData, "department"),
    phone: value(formData, "phone"),
    email: value(formData, "email"),
    employment_status: enumValue(formData, "status", ["active", "on_leave", "terminated"], "active"),
    hire_date: value(formData, "date"),
  };
  if (table === "projects") return {
    name: required(formData, "name"),
    description: value(formData, "description"),
    status: enumValue(formData, "status", ["planned", "active", "on_hold", "completed", "cancelled"], "planned"),
    progress: numberValue(formData, "progress", 100),
    start_date: value(formData, "date"),
    due_date: value(formData, "dueDate"),
  };
  if (table === "project_tasks") return {
    title: required(formData, "title"),
    project_id: value(formData, "relationId"),
    status: enumValue(formData, "status", ["todo", "doing", "done", "blocked"], "todo"),
    priority: enumValue(formData, "priority", ["low", "medium", "high", "urgent"], "medium"),
    due_date: value(formData, "date"),
  };
  return {
    subject: required(formData, "title"),
    company_id: value(formData, "companyId"),
    contact_id: value(formData, "contactId"),
    status: enumValue(formData, "status", ["open", "pending", "resolved", "closed"], "open"),
    priority: enumValue(formData, "priority", ["low", "normal", "high", "urgent"], "normal"),
  };
}

export async function createErpRecord(formData: FormData) {
  const { organizationId, moduleKey, table, supabase, user } = await actionContext(formData);
  const payload: Record<string, unknown> = table === "inventory_items"
    ? { organization_id: organizationId, ...payloadFor(table, formData) }
    : { organization_id: organizationId, created_by: user.id, ...payloadFor(table, formData) };
  const { error } = await supabase.from(table).insert(payload);
  if (error) redirect(`${path(organizationId, moduleKey, table)}&error=${encodeURIComponent(error.message)}`);
  revalidatePath(`/dashboard/${organizationId}/${moduleKey}`);
  redirect(`${path(organizationId, moduleKey, table)}&success=created`);
}

export async function updateErpRecord(formData: FormData) {
  const { organizationId, moduleKey, table, supabase } = await actionContext(formData);
  const recordId = id.parse(formData.get("recordId"));
  const payload = { ...payloadFor(table, formData), updated_at: new Date().toISOString() };
  const { error } = await supabase.from(table).update(payload).eq("id", recordId).eq("organization_id", organizationId);
  if (error) redirect(`${path(organizationId, moduleKey, table)}&edit=${recordId}&error=${encodeURIComponent(error.message)}`);
  revalidatePath(`/dashboard/${organizationId}/${moduleKey}`);
  redirect(`${path(organizationId, moduleKey, table)}&success=updated`);
}

export async function deleteErpRecord(formData: FormData) {
  const { organizationId, moduleKey, table, supabase } = await actionContext(formData);
  const recordId = id.parse(formData.get("recordId"));
  const { error } = await supabase.from(table).delete().eq("id", recordId).eq("organization_id", organizationId);
  if (error) redirect(`${path(organizationId, moduleKey, table)}&delete=${recordId}&error=${encodeURIComponent(error.message)}`);
  revalidatePath(`/dashboard/${organizationId}/${moduleKey}`);
  redirect(`${path(organizationId, moduleKey, table)}&deleted=1`);
}
