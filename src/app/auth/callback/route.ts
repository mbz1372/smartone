import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const origin = url.origin;
  if (!code) return NextResponse.redirect(`${origin}/auth?error=${encodeURIComponent("لینک تأیید نامعتبر است.")}`);
  const supabase = await createClient();
  const { error } = await supabase.auth.exchangeCodeForSession(code);
  if (error) return NextResponse.redirect(`${origin}/auth?error=${encodeURIComponent("تأیید ایمیل انجام نشد؛ دوباره تلاش کنید.")}`);
  return NextResponse.redirect(`${origin}/dashboard`);
}
