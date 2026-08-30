"use server";
import {revalidatePath} from "next/cache";
import {redirect} from "next/navigation";
import {z} from "zod";
import {createClient} from "@/lib/supabase/server";
import type {ErpTable} from "@/lib/erp-modules";
const tables=z.enum(["products","invoices","expenses","suppliers","purchase_orders","warehouses","inventory_items","employees","projects","project_tasks","tickets"]);
const modules=z.enum(["finance","catalog","procurement","inventory","hr","projects","support"]);
const val=(f:FormData,k:string)=>f.get(k)?.toString().trim()||null;
export async function createErpRecord(formData:FormData){
 const organizationId=z.string().uuid().parse(formData.get("organizationId")); const moduleKey=modules.parse(formData.get("module")); const table=tables.parse(formData.get("table")) as ErpTable;
 const supabase=await createClient(); const{data:{user}}=await supabase.auth.getUser(); if(!user)redirect("/auth");
 const base={organization_id:organizationId,created_by:user.id}; let payload:Record<string,unknown>=base;
 if(table==="products")payload={...base,name:val(formData,"name"),sku:val(formData,"sku"),type:val(formData,"type")||"service",sale_price:Number(val(formData,"salePrice")||0),cost_price:Number(val(formData,"costPrice")||0),unit:val(formData,"unit")||"عدد"};
 if(table==="invoices")payload={...base,number:val(formData,"number"),title:val(formData,"title"),amount:Number(val(formData,"amount")||0),status:val(formData,"status")||"draft",due_date:val(formData,"date")};
 if(table==="expenses")payload={...base,title:val(formData,"title"),category:val(formData,"category"),amount:Number(val(formData,"amount")||0),expense_date:val(formData,"date")||new Date().toISOString().slice(0,10),status:"pending"};
 if(table==="suppliers")payload={...base,name:val(formData,"name"),contact_name:val(formData,"contactName"),phone:val(formData,"phone"),email:val(formData,"email")};
 if(table==="purchase_orders")payload={...base,number:val(formData,"number"),title:val(formData,"title"),supplier_id:val(formData,"relationId"),amount:Number(val(formData,"amount")||0),expected_date:val(formData,"date")};
 if(table==="warehouses")payload={...base,name:val(formData,"name"),city:val(formData,"city"),address:val(formData,"description")};
 if(table==="inventory_items")payload={organization_id:organizationId,product_id:val(formData,"productId"),warehouse_id:val(formData,"warehouseId"),quantity:Number(val(formData,"quantity")||0),reorder_point:Number(val(formData,"reorderPoint")||0)};
 if(table==="employees")payload={...base,first_name:val(formData,"firstName"),last_name:val(formData,"lastName"),personnel_code:val(formData,"code"),job_title:val(formData,"jobTitle"),department:val(formData,"department"),phone:val(formData,"phone"),email:val(formData,"email"),hire_date:val(formData,"date")};
 if(table==="projects")payload={...base,name:val(formData,"name"),description:val(formData,"description"),status:"planned",start_date:val(formData,"date"),due_date:val(formData,"dueDate")};
 if(table==="project_tasks")payload={...base,title:val(formData,"title"),project_id:val(formData,"relationId"),priority:val(formData,"priority")||"medium",due_date:val(formData,"date")};
 if(table==="tickets")payload={...base,subject:val(formData,"title"),priority:val(formData,"priority")||"normal",status:"open"};
 const{error}=await supabase.from(table).insert(payload); if(error)redirect(`/dashboard/${organizationId}/${moduleKey}?tab=${table}&error=${encodeURIComponent(error.message)}`);
 revalidatePath(`/dashboard/${organizationId}/${moduleKey}`); redirect(`/dashboard/${organizationId}/${moduleKey}?tab=${table}&success=1`);
}
