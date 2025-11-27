'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [oauthConfig, setOauthConfig] = useState<{ enabled: boolean; name: string } | null>(null);

  useEffect(() => {
    fetch('/api/auth/oauth/config')
      .then(res => res.json())
      .then(data => {
        if (data.enabled) {
          setOauthConfig(data);
        }
      })
      .catch(console.error);
  }, []);

  const handleOAuthLogin = () => {
    window.location.href = '/api/auth/oauth/login';
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });

      if (res.ok) {
        setIsSuccess(true);
        setTimeout(() => {
          router.push('/');
          router.refresh();
        }, 2000);
      } else {
        const data = await res.json();
        setError(data.error || 'Login failed');
        setLoading(false);
      }
    } catch (err) {
      setError('An error occurred');
      setLoading(false);
    }
  };

  const [progress, setProgress] = useState(0);

  useEffect(() => {
    if (isSuccess) {
      // Small delay to ensure render before starting transition
      const timer = setTimeout(() => setProgress(100), 100);
      return () => clearTimeout(timer);
    }
  }, [isSuccess]);

  if (isSuccess) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#030712] p-4 overflow-hidden relative">
        {/* Matrix-like background effect */}
        <div className="absolute inset-0 bg-[linear-gradient(rgba(6,182,212,0.05)_1px,transparent_1px),linear-gradient(90deg,rgba(6,182,212,0.05)_1px,transparent_1px)] bg-[size:40px_40px] [mask-image:radial-gradient(ellipse_80%_50%_at_50%_50%,#000_70%,transparent_100%)]"></div>
        
        <div className="text-center z-10">
          <div className="mb-8 relative">
            <div className="absolute inset-0 bg-cyan-500 blur-[100px] opacity-20 animate-pulse"></div>
            <h1 className="text-6xl font-bold text-cyan-400 neon-text tracking-widest uppercase animate-bounce">
              ACCESS GRANTED
            </h1>
          </div>
          
          <div className="w-96 h-2 bg-gray-900 rounded-full mx-auto overflow-hidden border border-cyan-900">
            <div 
              className="h-full bg-cyan-400 shadow-[0_0_10px_#22d3ee] transition-all duration-[2000ms] ease-out" 
              style={{ width: `${progress}%` }}
            ></div>
          </div>
          
          <div className="mt-4 font-mono text-cyan-500 text-sm animate-pulse">
            ESTABLISHING SECURE CONNECTION...
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#030712] p-4">
      <div className="w-full max-w-md bg-[#0b101b]/80 backdrop-blur-sm p-8 border border-cyan-500/30 shadow-[0_0_30px_rgba(0,240,255,0.1)]">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-cyan-400 neon-text tracking-widest uppercase mb-2">HOMON</h1>
          <p className="text-cyan-500/50 text-sm font-mono">SYSTEM ACCESS CONTROL</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {error && (
            <div className="bg-red-900/20 border border-red-500/50 text-red-400 p-3 text-sm font-mono text-center">
              {error}
            </div>
          )}

          <div>
            <label className="block text-cyan-500 text-xs font-bold mb-2 uppercase tracking-wider">Username</label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full bg-[#030712] border border-cyan-500/30 text-cyan-100 p-3 focus:outline-none focus:border-cyan-400 focus:shadow-[0_0_10px_rgba(6,182,212,0.3)] transition-all font-mono"
              placeholder="ENTER USERNAME"
              required
            />
          </div>

          <div>
            <label className="block text-cyan-500 text-xs font-bold mb-2 uppercase tracking-wider">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-[#030712] border border-cyan-500/30 text-cyan-100 p-3 focus:outline-none focus:border-cyan-400 focus:shadow-[0_0_10px_rgba(6,182,212,0.3)] transition-all font-mono"
              placeholder="ENTER PASSWORD"
              required
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-400 border border-cyan-500/50 py-3 font-bold uppercase tracking-widest transition-all hover:shadow-[0_0_20px_rgba(6,182,212,0.4)] disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'AUTHENTICATING...' : 'INITIALIZE SESSION'}
          </button>

          {oauthConfig?.enabled && (
            <>
              <div className="relative my-6">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-cyan-500/20"></div>
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="px-2 bg-[#0b101b] text-cyan-500/50 font-mono">OR</span>
                </div>
              </div>
              <button
                type="button"
                onClick={handleOAuthLogin}
                className="w-full bg-white/5 hover:bg-white/10 text-white border border-white/20 py-3 font-bold uppercase tracking-widest transition-all hover:shadow-[0_0_20px_rgba(255,255,255,0.1)] flex items-center justify-center gap-2"
              >
                <span>Login with {oauthConfig.name}</span>
              </button>
            </>
          )}
        </form>
      </div>
    </div>
  );
}
