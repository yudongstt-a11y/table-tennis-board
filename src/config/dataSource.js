export const DATA_SOURCE = import.meta.env.VITE_DATA_SOURCE || "supabase";
export const DEFAULT_TOURNAMENT_SLUG = import.meta.env.VITE_TOURNAMENT_SLUG || "yulan-cup-2026";

export function isSupabaseMode() {
  return DATA_SOURCE === "supabase";
}
