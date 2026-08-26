const required = ["SUPABASE_URL", "SUPABASE_PUBLISHABLE_KEY"] as const;
const publicFallbacks: Record<(typeof required)[number], string> = {
  SUPABASE_URL: "https://eljmkqxzxahifscjptze.supabase.co",
  SUPABASE_PUBLISHABLE_KEY: "sb_publishable_iTm4J81YJtXWgd45BbjxjQ_v7LCvVwS",
};

export function env(name: (typeof required)[number]) {
  const value = process.env[name] || publicFallbacks[name];
  if (!value) throw new Error(`Missing required environment variable: ${name}`);
  return value;
}
