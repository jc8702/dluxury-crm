import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

// Se as chaves forem as do placeholder, criamos um mock simples para evitar erros de boot
const isValid = supabaseUrl && !supabaseUrl.includes('your-project') && supabaseUrl !== '';

export const supabase = isValid 
    ? createClient(supabaseUrl, supabaseAnonKey) 
    : { from: () => ({ insert: () => Promise.resolve({ error: new Error('Supabase não configurado') }) }) } as any;
