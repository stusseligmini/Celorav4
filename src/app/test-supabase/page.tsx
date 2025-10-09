'use client';

import { useEffect, useState } from 'react';

export default function TestSupabasePage() {
  const [status, setStatus] = useState<any>({});
  
  useEffect(() => {
    const testConnection = async () => {
      const envCheck = {
        hasUrl: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
        hasKey: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
        urlValue: process.env.NEXT_PUBLIC_SUPABASE_URL?.substring(0, 30) || 'NOT SET',
        keyLength: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.length || 0
      };
      
      setStatus((prev: any) => ({ ...prev, env: envCheck }));
      
      // Test creating Supabase client
      try {
        const { createBrowserClient } = await import('@supabase/ssr');
        
        if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
          setStatus((prev: any) => ({ 
            ...prev, 
            clientTest: { 
              success: false, 
              error: 'Missing environment variables in browser' 
            } 
          }));
          return;
        }
        
        const client = createBrowserClient(
          process.env.NEXT_PUBLIC_SUPABASE_URL,
          process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
        );
        
        // Test auth.getSession
        const { data, error } = await client.auth.getSession();
        
        setStatus((prev: any) => ({ 
          ...prev, 
          clientTest: { 
            success: !error, 
            error: error?.message,
            hasSession: !!data.session
          } 
        }));
        
      } catch (error: any) {
        setStatus((prev: any) => ({ 
          ...prev, 
          clientTest: { 
            success: false, 
            error: error.message 
          } 
        }));
      }
    };
    
    testConnection();
  }, []);
  
  return (
    <div className="min-h-screen bg-gray-900 text-white p-8">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-3xl font-bold mb-6">Supabase Connection Test</h1>
        
        <div className="space-y-4">
          <div className="bg-gray-800 p-4 rounded">
            <h2 className="text-xl font-semibold mb-2">Environment Variables (Browser)</h2>
            <pre className="text-sm text-gray-300 overflow-x-auto">
              {JSON.stringify(status.env, null, 2)}
            </pre>
          </div>
          
          <div className="bg-gray-800 p-4 rounded">
            <h2 className="text-xl font-semibold mb-2">Client Connection Test</h2>
            <pre className="text-sm text-gray-300 overflow-x-auto">
              {JSON.stringify(status.clientTest, null, 2)}
            </pre>
          </div>
          
          <div className="mt-6">
            <a 
              href="/api/diagnostics/supabase" 
              target="_blank"
              className="text-cyan-400 hover:text-cyan-300 underline"
            >
              Test Server-Side Connection →
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
