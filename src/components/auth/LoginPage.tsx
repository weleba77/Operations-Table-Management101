import React, { useState } from 'react';
import { ShieldCheck, UserCheck, Lock, Mail, ArrowRight } from 'lucide-react';
import { User } from '../../types.ts';

interface LoginPageProps {
  onLogin: (user: User) => void;
}

export const LoginPage: React.FC<LoginPageProps> = ({ onLogin }) => {
  const [email, setEmail] = useState('manager@tablewatch.io');
  const [password, setPassword] = useState('password123');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Authentication failed');
      }

      const data = await res.json();
      onLogin(data.user);
    } catch (err: any) {
      setError(err.message || 'Login failed. Please check credentials.');
    } finally {
      setLoading(false);
    }
  };

  const handleQuickLogin = (role: 'MANAGER' | 'STAFF') => {
    if (role === 'MANAGER') {
      setEmail('manager@tablewatch.io');
      setPassword('password123');
      onLogin({
        id: 'user-manager-1',
        name: 'Alice Vance',
        email: 'manager@tablewatch.io',
        role: 'MANAGER',
      });
    } else {
      setEmail('staff@tablewatch.io');
      setPassword('password123');
      onLogin({
        id: 'user-staff-1',
        name: 'Marcus Vance',
        email: 'staff@tablewatch.io',
        role: 'STAFF',
      });
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center p-4">
      <div className="max-w-md w-full">
        {/* Brand Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-indigo-600 text-white font-black text-2xl shadow-lg mb-3">
            TW
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight">TableWatch</h1>
          <p className="text-slate-400 text-xs mt-1">
            Restaurant Operations & Table Monitoring System
          </p>
        </div>

        {/* Login Card */}
        <div className="bg-white rounded-2xl shadow-2xl p-6 sm:p-8 border border-slate-100">
          <div className="mb-6">
            <h2 className="text-lg font-bold text-slate-900">Sign in to Operations</h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Select a pre-seeded development persona or sign in below
            </p>
          </div>

          {/* Quick Demo Sign In Buttons */}
          <div className="space-y-2.5 mb-6">
            <button
              type="button"
              onClick={() => handleQuickLogin('MANAGER')}
              className="w-full flex items-center justify-between p-3 rounded-xl border border-indigo-200 bg-indigo-50/70 hover:bg-indigo-100/70 text-indigo-950 transition-colors text-left"
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-indigo-600 text-white flex items-center justify-center shrink-0">
                  <ShieldCheck className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-xs font-bold">Sign in as Manager</div>
                  <div className="text-[11px] text-indigo-700">Alice Vance · Full Operations, Analytics & CCTV</div>
                </div>
              </div>
              <ArrowRight className="w-4 h-4 text-indigo-500" />
            </button>

            <button
              type="button"
              onClick={() => handleQuickLogin('STAFF')}
              className="w-full flex items-center justify-between p-3 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-900 transition-colors text-left"
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-slate-800 text-white flex items-center justify-center shrink-0">
                  <UserCheck className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-xs font-bold">Sign in as Staff</div>
                  <div className="text-[11px] text-slate-500">Marcus Vance · Floor Plan, Waiters & Queue</div>
                </div>
              </div>
              <ArrowRight className="w-4 h-4 text-slate-400" />
            </button>
          </div>

          <div className="relative flex py-2 items-center mb-6">
            <div className="flex-grow border-t border-slate-200"></div>
            <span className="flex-shrink mx-3 text-[11px] text-slate-400 font-medium">
              or enter credentials
            </span>
            <div className="flex-grow border-t border-slate-200"></div>
          </div>

          {error && (
            <div className="mb-4 p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-xs">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Email Address
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  placeholder="manager@tablewatch.io"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Password
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  placeholder="••••••••"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 px-4 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-semibold transition-colors flex items-center justify-center gap-2 shadow-sm disabled:opacity-50"
            >
              {loading ? 'Authenticating...' : 'Sign In'}
            </button>
          </form>
        </div>

        {/* Development Environment Notice */}
        <div className="mt-6 text-center text-[11px] text-slate-400">
          <span>TableWatch Demo Environment · SQLite + WebSocket Real-Time Sync</span>
        </div>
      </div>
    </div>
  );
};
