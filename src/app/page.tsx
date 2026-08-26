import { redirect } from "next/navigation";

export default function Home() {
  // Keep the public entry point deterministic and fast. Authenticated users
  // can enter the protected dashboard directly; unauthenticated users are
  // redirected back to the sign-in page by the dashboard guard.
  redirect("/auth");
}
