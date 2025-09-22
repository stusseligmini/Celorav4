// Temporary placeholder for all API routes during Vercel deployment
// This replaces internal @celora/* package imports to fix build errors

export const apiPlaceholder = {
  GET: () => Response.json({ message: 'API endpoint under construction - Supabase migration in progress' }),
  POST: () => Response.json({ message: 'API endpoint under construction - Supabase migration in progress' }),
  PUT: () => Response.json({ message: 'API endpoint under construction - Supabase migration in progress' }),
  DELETE: () => Response.json({ message: 'API endpoint under construction - Supabase migration in progress' })
};