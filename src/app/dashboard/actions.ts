"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

export async function createOrganization(formData: FormData) {
  const parsed = z.string().trim().min(2).max(80).safeParse(formData.get("name"));
  if (!parsed.success) redirect("/dashboard?error=" + encodeURIComponent("نام سازمان باید بین ۲ تا ۸۰ کاراکتر باشد."));
  const supabase = await createClient();
  const { data: organizationId, error } = await supabase.rpc("create_organization", { organization_name: parsed.data });
  if (error) redirect("/dashboard?error=" + encodeURIComponent(error.message));
  revalidatePath("/dashboard");
  if (typeof organizationId === "string") redirect(`/dashboard/${organizationId}`);
}
