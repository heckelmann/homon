'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

interface Credential {
  id: number;
  name: string;
  username: string;
}

interface HostFormData {
  id?: number;
  label: string;
  hostname: string;
  port: number;
  username: string | null;
  password?: string;
  privateKey?: string;
  refreshInterval: number;
  retentionDays: number;
  credentialId?: number | null;
}

interface HostFormProps {
  initialData?: HostFormData;
  onSuccess?: () => void;
}

export default function HostForm({ initialData, onSuccess }: HostFormProps) {
  const router = useRouter();
  const [credentials, setCredentials] = useState<Credential[]>([]);
  const [formData, setFormData] = useState<HostFormData>({
    label: '',
    hostname: '',
    port: 22,
    username: '',
    password: '',
    privateKey: '',
    refreshInterval: 60,
    retentionDays: 30,
    credentialId: null,
    ...initialData,
  });
  const [loading, setLoading] = useState(false);

  const isEditMode = !!initialData?.id;

  useEffect(() => {
    fetch('/api/credentials')
      .then((res) => res.json())
      .then((data) => setCredentials(data))
      .catch((err) => console.error('Failed to fetch credentials:', err));
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const url = isEditMode ? `/api/hosts/${initialData.id}` : '/api/hosts';
      const method = isEditMode ? 'PUT' : 'POST';

      await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });
      router.refresh();
      if (!isEditMode) {
        setFormData({
          label: '',
          hostname: '',
          port: 22,
          username: '',
          password: '',
          privateKey: '',
          refreshInterval: 60,
          retentionDays: 30,
          credentialId: null,
        });
      }
      if (onSuccess) onSuccess();
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 text-gray-200">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="flex flex-col">
          <label className="text-sm font-medium text-cyan-400 mb-1 uppercase tracking-wider text-xs">Label</label>
          <input
            type="text"
            placeholder="e.g. Web Server"
            className="bg-[#0b101b] border border-gray-800 p-2 rounded text-gray-200 focus:ring-1 focus:ring-cyan-500 focus:border-cyan-500 outline-none placeholder-gray-600"
            value={formData.label}
            onChange={(e) => setFormData({ ...formData, label: e.target.value })}
            required
          />
        </div>
        <div className="flex flex-col">
          <label className="text-sm font-medium text-cyan-400 mb-1 uppercase tracking-wider text-xs">Hostname / IP</label>
          <input
            type="text"
            placeholder="192.168.1.100"
            className="bg-[#0b101b] border border-gray-800 p-2 rounded text-gray-200 focus:ring-1 focus:ring-cyan-500 focus:border-cyan-500 outline-none placeholder-gray-600"
            value={formData.hostname}
            onChange={(e) => setFormData({ ...formData, hostname: e.target.value })}
            required
          />
        </div>
        <div className="flex flex-col">
          <label className="text-sm font-medium text-cyan-400 mb-1 uppercase tracking-wider text-xs">Port</label>
          <input
            type="number"
            placeholder="22"
            className="bg-[#0b101b] border border-gray-800 p-2 rounded text-gray-200 focus:ring-1 focus:ring-cyan-500 focus:border-cyan-500 outline-none placeholder-gray-600"
            value={formData.port}
            onChange={(e) => setFormData({ ...formData, port: parseInt(e.target.value) })}
            required
          />
        </div>
        <div className="flex flex-col">
          <label className="text-sm font-medium text-cyan-400 mb-1 uppercase tracking-wider text-xs">Refresh Interval (sec)</label>
          <input
            type="number"
            placeholder="60"
            min="10"
            className="bg-[#0b101b] border border-gray-800 p-2 rounded text-gray-200 focus:ring-1 focus:ring-cyan-500 focus:border-cyan-500 outline-none placeholder-gray-600"
            value={formData.refreshInterval}
            onChange={(e) => setFormData({ ...formData, refreshInterval: parseInt(e.target.value) })}
            required
          />
        </div>
        <div className="flex flex-col">
          <label className="text-sm font-medium text-cyan-400 mb-1 uppercase tracking-wider text-xs">Retention (Days)</label>
          <input
            type="number"
            placeholder="30"
            min="1"
            className="bg-[#0b101b] border border-gray-800 p-2 rounded text-gray-200 focus:ring-1 focus:ring-cyan-500 focus:border-cyan-500 outline-none placeholder-gray-600"
            value={formData.retentionDays}
            onChange={(e) => setFormData({ ...formData, retentionDays: parseInt(e.target.value) })}
            required
          />
        </div>
        
        <div className="flex flex-col md:col-span-2 border-t border-gray-800 pt-4 mt-2">
          <h3 className="text-cyan-400 font-medium mb-4 uppercase tracking-wider text-xs">Authentication</h3>
          
          <div className="flex flex-col mb-4">
            <label className="text-sm font-medium text-cyan-400 mb-1 uppercase tracking-wider text-xs">Use Saved Credential</label>
            <select
              className="bg-[#0b101b] border border-gray-800 p-2 rounded text-gray-200 focus:ring-1 focus:ring-cyan-500 focus:border-cyan-500 outline-none placeholder-gray-600"
              value={formData.credentialId || ''}
              onChange={(e) => {
                const val = e.target.value ? parseInt(e.target.value) : null;
                setFormData({ ...formData, credentialId: val });
              }}
            >
              <option value="">-- Manual Configuration --</option>
              {credentials.map((cred) => (
                <option key={cred.id} value={cred.id}>
                  {cred.name} ({cred.username})
                </option>
              ))}
            </select>
            <p className="text-xs text-gray-500 mt-1">Select a saved credential or configure manually below.</p>
          </div>
        </div>

        <div className={`flex flex-col ${formData.credentialId ? 'opacity-50' : ''}`}>
          <label className="text-sm font-medium text-cyan-400 mb-1 uppercase tracking-wider text-xs">Username</label>
          <input
            type="text"
            placeholder="root"
            className="bg-[#0b101b] border border-gray-800 p-2 rounded text-gray-200 focus:ring-1 focus:ring-cyan-500 focus:border-cyan-500 outline-none placeholder-gray-600"
            value={formData.username || ''}
            onChange={(e) => setFormData({ ...formData, username: e.target.value })}
            required={!formData.credentialId}
            disabled={!!formData.credentialId}
          />
        </div>
        <div className={`flex flex-col ${formData.credentialId ? 'opacity-50' : ''}`}>
          <label className="text-sm font-medium text-cyan-400 mb-1 uppercase tracking-wider text-xs">Password (Optional)</label>
          <input
            type="password"
            placeholder="••••••••"
            className="bg-[#0b101b] border border-gray-800 p-2 rounded text-gray-200 focus:ring-1 focus:ring-cyan-500 focus:border-cyan-500 outline-none placeholder-gray-600"
            value={formData.password || ''}
            onChange={(e) => setFormData({ ...formData, password: e.target.value })}
            disabled={!!formData.credentialId}
          />
        </div>
        <div className={`flex flex-col md:col-span-2 ${formData.credentialId ? 'opacity-50' : ''}`}>
          <label className="text-sm font-medium text-cyan-400 mb-1 uppercase tracking-wider text-xs">Private Key (Optional)</label>
          <textarea
            placeholder="-----BEGIN OPENSSH PRIVATE KEY-----"
            className="bg-[#0b101b] border border-gray-800 p-2 rounded text-gray-200 focus:ring-1 focus:ring-cyan-500 focus:border-cyan-500 outline-none font-mono text-sm placeholder-gray-600"
            rows={3}
            value={formData.privateKey || ''}
            onChange={(e) => setFormData({ ...formData, privateKey: e.target.value })}
            disabled={!!formData.credentialId}
          />
        </div>
      </div>
      <div className="flex justify-end mt-4">
        <button
          type="submit"
          disabled={loading}
          className="bg-cyan-900/30 border border-cyan-500/50 text-cyan-400 px-6 py-2 rounded hover:bg-cyan-900/50 hover:text-cyan-300 hover:border-cyan-400 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 font-medium uppercase tracking-wider text-sm shadow-[0_0_10px_rgba(6,182,212,0.1)] hover:shadow-[0_0_15px_rgba(6,182,212,0.3)]"
        >
          {loading ? 'Processing...' : (isEditMode ? 'Update Node' : 'Initialize Node')}
        </button>
      </div>
    </form>
  );
}
