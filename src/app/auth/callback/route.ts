import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const origin = url.origin;
  const next = url.searchParams.get("next");
  if (!code) return NextResponse.redirect(`${origin}/auth?error=${encodeURIComponent("لینک تأیید نامعتبر است.")}`);
  const supabase = await createClient();
  const { error } = await supabase.auth.exchangeCodeForSession(code);
  if (error) return NextResponse.redirect(`${origin}/auth?error=${encodeURIComponent("تأیید ایمیل انجام نشد؛ دوباره تلاش کنید.")}`);
  const safeNext = next?.startsWith("/") && !next.startsWith("//") ? next : "/dashboard";
  return NextResponse.redirect(`${origin}${safeNext}`);
}
