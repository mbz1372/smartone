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

export async function requestPasswordReset(formData: FormData) {
  const email = z.string().trim().email("ایمیل معتبر وارد کنید.").safeParse(formData.get("email"));
  if (!email.success) redirect(`/auth/forgot-password?error=${encodeURIComponent(email.error.issues[0]?.message ?? "ایمیل نامعتبر است.")}`);
  const supabase = await createClient();
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://smartone-alpha.vercel.app";
  const { error } = await supabase.auth.resetPasswordForEmail(email.data, {
    redirectTo: `${appUrl}/auth/callback?next=/auth/update-password`,
  });
  if (error) {
    const message = error.message.toLowerCase().includes("rate limit") ? "تعداد درخواست‌های ایمیل بیش از حد مجاز است؛ کمی بعد دوباره تلاش کنید." : "ارسال لینک بازیابی انجام نشد؛ دوباره تلاش کنید.";
    redirect(`/auth/forgot-password?error=${encodeURIComponent(message)}`);
  }
  redirect(`/auth/forgot-password?success=${encodeURIComponent("اگر حسابی با این ایمیل وجود داشته باشد، لینک بازیابی برای آن ارسال می‌شود.")}`);
}

export async function updatePassword(formData: FormData) {
  const schema = z.object({password:z.string().min(8,"رمز عبور باید حداقل ۸ کاراکتر باشد."),confirmPassword:z.string()}).refine(v=>v.password===v.confirmPassword,{message:"تکرار رمز عبور یکسان نیست.",path:["confirmPassword"]});
  const parsed = schema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) redirect(`/auth/update-password?error=${encodeURIComponent(parsed.error.issues[0]?.message ?? "رمز عبور نامعتبر است.")}`);
  const supabase = await createClient();
  const { data:{user} } = await supabase.auth.getUser();
  if (!user) redirect(`/auth?error=${encodeURIComponent("لینک بازیابی منقضی یا نامعتبر است؛ دوباره درخواست بدهید.")}`);
  const { error } = await supabase.auth.updateUser({password:parsed.data.password});
  if (error) redirect(`/auth/update-password?error=${encodeURIComponent("تغییر رمز عبور انجام نشد؛ دوباره تلاش کنید.")}`);
  redirect(`/dashboard`);
}
