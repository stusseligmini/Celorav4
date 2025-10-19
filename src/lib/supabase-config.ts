// Build-time safe environment variable access
export const getSupabaseConfig = () => {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://zpcycakwdvymqhwvakrv.supabase.co';
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'fallback-anon-key';
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'fallback-service-key';

  return {
    supabaseUrl,
    supabaseAnonKey,
    supabaseServiceKey
  };
};