import { createPortalAdminClient } from "./supabase/admin";

export async function getSystemSetting<T>(key: string, defaultValue: T): Promise<T> {
  const supabase = createPortalAdminClient();
  const { data, error } = await supabase
    .from("system_settings")
    .select("value")
    .eq("key", key)
    .maybeSingle();

  if (error || !data) {
    return defaultValue;
  }

  return data.value as T;
}
