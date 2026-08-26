import type { NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/proxy";

export function proxy(request: NextRequest) {
  return updateSession(request);
}

export const config = {
  // Session refresh is only required for authenticated application routes.
  // Running a remote Supabase auth request for public pages made the sign-in
  // screen wait on the database region before it could render.
  matcher: ["/dashboard/:path*"],
};
