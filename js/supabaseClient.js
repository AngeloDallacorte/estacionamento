import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';
import {
	SUPABASE_ANON_KEY,
	SUPABASE_PUBLISHABLE_KEY,
	SUPABASE_URL,
} from './config.js';

const supabaseApiKey = SUPABASE_PUBLISHABLE_KEY || SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !supabaseApiKey) {
	throw new Error('Configure SUPABASE_URL e uma chave pública em js/config.js.');
}

export const supabase = createClient(SUPABASE_URL, supabaseApiKey);