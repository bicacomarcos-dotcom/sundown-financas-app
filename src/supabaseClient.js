import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = "https://hftprrbsxlwsfbqvfesq.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_38mMXBmcdhM1XBEAGAvLfA_l9dW4iI8";

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
