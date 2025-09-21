"use client";
import { useEffect, useState } from 'react';
import { createBrowserClient } from '@supabase/ssr';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

export default function UpdatePasswordPage() {
  const router = useRouter();
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(()=>{
    // Ensure user is in password recovery session
    supabase.auth.getSession().then(({ data })=>{
      if(!data.session) {
        setError('No active recovery session');
      }
    });
  }, [supabase]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if(password !== confirm) { setError('Passwords do not match'); return; }
    setLoading(true); setError(null); setMessage(null);
    const { error } = await supabase.auth.updateUser({ password });
    if(error) setError(error.message); else { setMessage('Password updated'); setTimeout(()=>router.push('/signin'), 2000); }
    setLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 bg-gray-50">
      <div className="w-full max-w-md space-y-6 bg-white p-8 rounded shadow">
        <h1 className="text-2xl font-bold text-gray-900">Set new password</h1>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">New password</label>
            <input type="password" required value={password} onChange={e=>setPassword(e.target.value)} className="mt-1 w-full rounded border px-3 py-2" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Confirm password</label>
            <input type="password" required value={confirm} onChange={e=>setConfirm(e.target.value)} className="mt-1 w-full rounded border px-3 py-2" />
          </div>
          {error && <p className="text-sm text-red-600">{error}</p>}
          {message && <p className="text-sm text-green-600">{message}</p>}
          <button disabled={loading} className="w-full bg-indigo-600 text-white py-2 rounded hover:bg-indigo-700 disabled:opacity-50">{loading ? 'Updating...' : 'Update password'}</button>
        </form>
        <div className="flex justify-between text-sm">
          <Link href="/signin" className="text-indigo-600 hover:underline">Sign in</Link>
          <Link href="/signup" className="text-indigo-600 hover:underline">Create account</Link>
        </div>
      </div>
    </div>
  );
}
