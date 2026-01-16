import React, { useState } from 'react';
import { UserPlus, Mail, Lock } from 'lucide-react';

const BACKEND_URL = 'http://localhost:3001';

export default function Signup({ onSwitchToLogin }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch(`${BACKEND_URL}/api/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      
      alert("Account created! Please log in.");
      onSwitchToLogin();
    } catch (err) {
      alert(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="h-screen flex items-center justify-center bg-slate-900 text-slate-100 font-sans">
      <div className="bg-slate-800 p-8 rounded-xl shadow-2xl w-full max-w-md border border-slate-700">
        <h2 className="text-3xl font-bold mb-6 text-center text-green-400">Create Account</h2>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-xs font-bold uppercase text-slate-400 mb-2">Email</label>
            <div className="relative">
              <Mail className="absolute left-3 top-3 text-slate-500" size={18} />
              <input 
                type="email" required 
                className="w-full bg-slate-900 border border-slate-700 rounded-lg py-3 pl-10 focus:border-green-500 outline-none transition-colors"
                placeholder="you@example.com"
                value={email} onChange={e => setEmail(e.target.value)}
              />
            </div>
          </div>
          <div>
            <label className="block text-xs font-bold uppercase text-slate-400 mb-2">Password</label>
            <div className="relative">
              <Lock className="absolute left-3 top-3 text-slate-500" size={18} />
              <input 
                type="password" required 
                className="w-full bg-slate-900 border border-slate-700 rounded-lg py-3 pl-10 focus:border-green-500 outline-none transition-colors"
                placeholder="••••••••"
                value={password} onChange={e => setPassword(e.target.value)}
              />
            </div>
          </div>
          <button disabled={loading} className="w-full bg-green-600 hover:bg-green-500 py-3 rounded-lg font-bold flex justify-center items-center gap-2 mt-4 transition-all hover:scale-105">
            {loading ? 'Creating...' : <>Sign Up <UserPlus size={18}/></>}
          </button>
        </form>
        <p className="mt-8 text-center text-sm text-slate-400">
          Already have an account? 
          <button onClick={onSwitchToLogin} className="text-green-400 hover:underline ml-1 font-bold">Login</button>
        </p>
      </div>
    </div>
  );
}