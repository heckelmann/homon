'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

interface CredentialFormData {
  id?: number;
  name: string;
  username: string;
  password?: string;
  privateKey?: string;
}

interface CredentialFormProps {
  initialData?: CredentialFormData;
  onSuccess?: () => void;
  onCancel?: () => void;
}

export default function CredentialForm({ initialData, onSuccess, onCancel }: CredentialFormProps) {
  const router = useRouter();
  const [formData, setFormData] = useState<CredentialFormData>({
    name: '',
    username: '',
    password: '',
    privateKey: '',
    ...initialData,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isEditMode = !!initialData?.id;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const url = isEditMode ? `/api/credentials/${initialData.id}` : '/api/credentials';
      const method = isEditMode ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to save credential');
      }

      router.refresh();
      if (onSuccess) onSuccess();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 text-gray-200">
      {error && (
        <div className="bg-red-900/50 border border-red-500 text-red-200 p-3 rounded text-sm">
          {error}
        </div>
      )}

      <div className="flex flex-col">
        <label className="text-sm font-medium text-cyan-400 mb-1 uppercase tracking-wider text-xs">Name</label>
        <input
          type="text"
          placeholder="e.g. Production Keys"
          className="bg-[#0b101b] border border-gray-800 p-2 rounded text-gray-200 focus:ring-1 focus:ring-cyan-500 focus:border-cyan-500 outline-none placeholder-gray-600"
          value={formData.name}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          required
        />
      </div>

      <div className="flex flex-col">
        <label className="text-sm font-medium text-cyan-400 mb-1 uppercase tracking-wider text-xs">Username</label>
        <input
          type="text"
          placeholder="root"
          className="bg-[#0b101b] border border-gray-800 p-2 rounded text-gray-200 focus:ring-1 focus:ring-cyan-500 focus:border-cyan-500 outline-none placeholder-gray-600"
          value={formData.username}
          onChange={(e) => setFormData({ ...formData, username: e.target.value })}
          required
        />
      </div>

      <div className="flex flex-col">
        <label className="text-sm font-medium text-cyan-400 mb-1 uppercase tracking-wider text-xs">Password (Optional)</label>
        <input
          type="password"
          placeholder="••••••••"
          className="bg-[#0b101b] border border-gray-800 p-2 rounded text-gray-200 focus:ring-1 focus:ring-cyan-500 focus:border-cyan-500 outline-none placeholder-gray-600"
          value={formData.password || ''}
          onChange={(e) => setFormData({ ...formData, password: e.target.value })}
        />
      </div>

      <div className="flex flex-col">
        <label className="text-sm font-medium text-cyan-400 mb-1 uppercase tracking-wider text-xs">Private Key (Optional)</label>
        <textarea
          placeholder="-----BEGIN OPENSSH PRIVATE KEY-----"
          className="bg-[#0b101b] border border-gray-800 p-2 rounded text-gray-200 focus:ring-1 focus:ring-cyan-500 focus:border-cyan-500 outline-none font-mono text-sm placeholder-gray-600"
          rows={5}
          value={formData.privateKey || ''}
          onChange={(e) => setFormData({ ...formData, privateKey: e.target.value })}
        />
      </div>

      <div className="flex justify-end gap-2 mt-6">
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 text-gray-400 hover:text-gray-200 text-sm uppercase tracking-wider"
          >
            Cancel
          </button>
        )}
        <button
          type="submit"
          disabled={loading}
          className="bg-cyan-900/30 border border-cyan-500/50 text-cyan-400 px-6 py-2 rounded hover:bg-cyan-900/50 hover:text-cyan-300 hover:border-cyan-400 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 font-medium uppercase tracking-wider text-sm shadow-[0_0_10px_rgba(6,182,212,0.1)] hover:shadow-[0_0_15px_rgba(6,182,212,0.3)]"
        >
          {loading ? 'Saving...' : (isEditMode ? 'Update Credential' : 'Save Credential')}
        </button>
      </div>
    </form>
  );
}
