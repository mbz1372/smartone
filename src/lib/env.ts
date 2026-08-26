const required = ["SUPABASE_URL", "SUPABASE_PUBLISHABLE_KEY"] as const;

export function env(name: (typeof required)[number]) {
  const value = process.env[name];
  if (!value) throw new Error(`Missing required environment variable: ${name}`);
  return value;
}
