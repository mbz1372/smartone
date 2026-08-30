type PublicEnvName="SUPABASE_URL"|"SUPABASE_PUBLISHABLE_KEY";
const publicFallbacks: Record<PublicEnvName,string> = {
  SUPABASE_URL: "https://eljmkqxzxahifscjptze.supabase.co",
  SUPABASE_PUBLISHABLE_KEY: "sb_publishable_iTm4J81YJtXWgd45BbjxjQ_v7LCvVwS",
};

export function env(name:PublicEnvName) {
  const value = process.env[name] || publicFallbacks[name];
  if (!value) throw new Error(`Missing required environment variable: ${name}`);
  return value;
}
