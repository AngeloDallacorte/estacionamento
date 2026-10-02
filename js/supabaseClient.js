import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';
import { SUPABASE_ANON_KEY, SUPABASE_URL } from './config.js';

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
	throw new Error('Configure SUPABASE_URL e SUPABASE_ANON_KEY em js/config.js.');
}

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);