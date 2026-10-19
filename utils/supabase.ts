import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

const USER_ID_KEY = 'eugene_user_id';

export function getUserId(): string {
  let userId = localStorage.getItem(USER_ID_KEY);
  if (!userId) {
    userId = crypto.randomUUID();
    localStorage.setItem(USER_ID_KEY, userId);
  }
  return userId;
}

export async function loadFromSupabase<T>(key: string): Promise<T | null> {
  try {
    const userId = getUserId();
    const { data, error } = await supabase
      .from('eugene_app_state')
      .select('value')
      .eq('user_id', userId)
      .eq('key', key)
      .maybeSingle();

    if (error) {
      console.error(`Supabase load error for key "${key}":`, error.message);
      return null;
    }
    return data ? (data.value as T) : null;
  } catch (err) {
    console.error(`Supabase load failed for key "${key}":`, err);
    return null;
  }
}

export async function saveToSupabase<T>(key: string, value: T): Promise<void> {
  try {
    const userId = getUserId();
    const { error } = await supabase
      .from('eugene_app_state')
      .upsert({ user_id: userId, key, value, updated_at: new Date().toISOString() });

    if (error) {
      console.error(`Supabase save error for key "${key}":`, error.message);
    }
  } catch (err) {
    console.error(`Supabase save failed for key "${key}":`, err);
  }
}
