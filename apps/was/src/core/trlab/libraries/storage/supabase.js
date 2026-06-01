import { createClient } from '@supabase/supabase-js';
import { env, hasSupabaseConfig } from '#trlab/modules/configs/env';

let supabaseClient;

export function isSupabaseStorageConfigured() {
  return hasSupabaseConfig();
}

export function getSupabaseClient() {
  if (!isSupabaseStorageConfigured()) return null;
  if (!supabaseClient) {
    supabaseClient = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
      auth: {
        persistSession: false,
        autoRefreshToken: false
      }
    });
  }
  return supabaseClient;
}
