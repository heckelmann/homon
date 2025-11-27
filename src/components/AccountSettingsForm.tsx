'use client';

import { useState, useEffect } from 'react';

interface AccountSettingsFormProps {
  onSuccess: () => void;
}

export default function AccountSettingsForm({ onSuccess }: AccountSettingsFormProps) {
  const [username, setUsername] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
      fetch('/api/auth/me')
        .then(res => res.json())
        .then(data => {
            if (data.user) setUsername(data.user.username);
        });
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (newPassword && newPassword !== confirmPassword) {
      setError('New passwords do not match');
      return;
    }

    setLoading(true);

    try {
      const res = await fetch('/api/auth/update-account', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
            currentPassword, 
            newUsername: username,
            newPassword: newPassword || undefined 
        }),
      });

      if (res.ok) {
        onSuccess();
      } else {
        const data = await res.json();
        setError(data.error || 'Failed to update account');
      }
    } catch (err) {
      setError('An error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6 font-mono">
      {error && (
        <div className="bg-red-900/20 border border-red-500/50 text-red-400 p-3 text-sm">
          {error}
        </div>
      )}

      <div>
        <label className="block text-cyan-500 text-xs font-bold mb-2 uppercase tracking-wider">Username</label>
        <input
          type="text"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          className="w-full bg-[#030712] border border-cyan-500/30 text-cyan-100 p-3 focus:outline-none focus:border-cyan-400 focus:shadow-[0_0_10px_rgba(6,182,212,0.3)] transition-all"
          required
        />
      </div>

      <div>
        <label className="block text-cyan-500 text-xs font-bold mb-2 uppercase tracking-wider">Current Password (Required)</label>
        <input
          type="password"
          value={currentPassword}
          onChange={(e) => setCurrentPassword(e.target.value)}
          className="w-full bg-[#030712] border border-cyan-500/30 text-cyan-100 p-3 focus:outline-none focus:border-cyan-400 focus:shadow-[0_0_10px_rgba(6,182,212,0.3)] transition-all"
          required
        />
      </div>

      <div className="pt-4 border-t border-cyan-500/20">
        <p className="text-xs text-cyan-500/70 mb-4">Leave blank to keep current password</p>
        
        <div className="mb-4">
            <label className="block text-cyan-500 text-xs font-bold mb-2 uppercase tracking-wider">New Password</label>
            <input
            type="password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            className="w-full bg-[#030712] border border-cyan-500/30 text-cyan-100 p-3 focus:outline-none focus:border-cyan-400 focus:shadow-[0_0_10px_rgba(6,182,212,0.3)] transition-all"
            />
        </div>

        <div>
            <label className="block text-cyan-500 text-xs font-bold mb-2 uppercase tracking-wider">Confirm New Password</label>
            <input
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            className="w-full bg-[#030712] border border-cyan-500/30 text-cyan-100 p-3 focus:outline-none focus:border-cyan-400 focus:shadow-[0_0_10px_rgba(6,182,212,0.3)] transition-all"
            />
        </div>
      </div>

      <button
        type="submit"
        disabled={loading}
        className="w-full bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-400 border border-cyan-500/50 py-3 font-bold uppercase tracking-widest transition-all hover:shadow-[0_0_20px_rgba(6,182,212,0.4)] disabled:opacity-50"
      >
        {loading ? 'UPDATING...' : 'UPDATE ACCOUNT'}
      </button>
    </form>
  );
}
