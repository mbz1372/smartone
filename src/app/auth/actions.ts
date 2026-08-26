"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

const credentials = z.object({
  email: z.string().trim().email("ایمیل معتبر وارد کنید."),
  password: z.string().min(8, "رمز عبور باید حداقل ۸ کاراکتر باشد."),
});

function destination(message: string, mode: "error" | "success" = "error") {
  return `/auth?${mode}=${encodeURIComponent(message)}`;
}

export async function signIn(formData: FormData) {
  const parsed = credentials.safeParse(Object.fromEntries(formData));
  if (!parsed.success) redirect(destination(parsed.error.issues[0]?.message ?? "اطلاعات نامعتبر است."));
  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword(parsed.data);
  if (error) redirect(destination("ایمیل یا رمز عبور صحیح نیست."));
  redirect("/dashboard");
}

export async function signUp(formData: FormData) {
  const parsed = credentials.safeParse(Object.fromEntries(formData));
  if (!parsed.success) redirect(destination(parsed.error.issues[0]?.message ?? "اطلاعات نامعتبر است."));
  const supabase = await createClient();
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://smartone-alpha.vercel.app";
  const { data, error } = await supabase.auth.signUp({
    ...parsed.data,
    options: { emailRedirectTo: `${appUrl}/auth/callback` },
  });
  if (error) redirect(destination(error.message));
  if (!data.session) redirect(destination("لینک تأیید برای ایمیل شما ارسال شد.", "success"));
  redirect("/dashboard");
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/auth");
}
