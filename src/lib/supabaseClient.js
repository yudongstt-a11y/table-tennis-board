import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const hasSupabaseConfig = Boolean(supabaseUrl && supabaseAnonKey);

function getUrlError(value) {
  if (!value) return "";
  try {
    const parsed = new URL(value);
    return parsed.protocol === "https:" || parsed.protocol === "http:" ? "" : "Supabase URL must start with http or https.";
  } catch {
    return "Supabase URL is invalid.";
  }
}

const supabaseUrlError = getUrlError(supabaseUrl);
let clientCreationError = "";
let supabaseClient = null;

export const supabaseConfigError =
  !hasSupabaseConfig
    ? "Supabase configuration is missing. The app cannot connect to the live database."
    : supabaseUrlError
      ? supabaseUrlError
    : "";

if (supabaseConfigError) {
  console.error(supabaseConfigError);
}

if (hasSupabaseConfig && !supabaseConfigError) {
  try {
    supabaseClient = createClient(supabaseUrl, supabaseAnonKey);
  } catch (error) {
    clientCreationError = error?.message || String(error);
    console.error("Failed to create Supabase client:", error);
  }
}

export const supabase = supabaseClient;
export const supabaseClientError = clientCreationError;

export function getSupabaseConfigStatus() {
  return {
    urlConfigured: Boolean(supabaseUrl),
    anonKeyConfigured: Boolean(supabaseAnonKey),
    urlValid: Boolean(supabaseUrl && !supabaseUrlError),
    clientReady: Boolean(supabaseClient),
    clientError: clientCreationError,
  };
}
