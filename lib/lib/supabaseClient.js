import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = "https://rqvhoxjxhiauvmoznnzv.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_6M01ojlBUZBH5qk-4K9sfA_vOhr8RUo";

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
});
