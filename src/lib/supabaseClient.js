import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const hasSupabaseConfig = Boolean(supabaseUrl && supabaseAnonKey);

export const supabaseConfigError =
  !hasSupabaseConfig
    ? "Supabase configuration is missing. The app cannot connect to the live database."
    : "";

if (supabaseConfigError) {
  console.error(supabaseConfigError);
}

export const supabase =
  hasSupabaseConfig ? createClient(supabaseUrl, supabaseAnonKey) : null;

export function getSupabaseConfigStatus() {
  return {
    urlConfigured: Boolean(supabaseUrl),
    anonKeyConfigured: Boolean(supabaseAnonKey),
  };
}
