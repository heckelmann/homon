'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

interface Credential {
  id: number;
  name: string;
  username: string;
  _count?: {
    hosts: number;
  };
}

interface CredentialListProps {
  onEdit: (credential: Credential) => void;
}

export default function CredentialList({ onEdit }: CredentialListProps) {
  const [credentials, setCredentials] = useState<Credential[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  const fetchCredentials = async () => {
    try {
      const res = await fetch('/api/credentials');
      if (res.ok) {
        const data = await res.json();
        setCredentials(data);
      }
    } catch (error) {
      console.error('Failed to fetch credentials', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCredentials();
  }, []);

  const handleDelete = async (id: number) => {
    if (!confirm('Are you sure you want to delete this credential? Hosts using it will revert to manual configuration.')) {
      return;
    }

    try {
      await fetch(`/api/credentials/${id}`, { method: 'DELETE' });
      fetchCredentials();
      router.refresh();
    } catch (error) {
      console.error('Failed to delete credential', error);
    }
  };

  if (loading) {
    return <div className="text-center py-8 text-gray-500">Loading credentials...</div>;
  }

  if (credentials.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500 border border-dashed border-gray-800 rounded">
        No credentials saved yet.
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {credentials.map((cred) => (
        <div 
          key={cred.id}
          className="bg-[#0b101b] border border-gray-800 p-3 rounded flex justify-between items-center group hover:border-cyan-500/30 transition-colors"
        >
          <div>
            <div className="font-medium text-cyan-400 text-sm">{cred.name}</div>
            <div className="text-xs text-gray-500 font-mono">{cred.username}</div>
          </div>
          
          <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
            <button
              onClick={() => onEdit(cred)}
              className="text-xs text-yellow-500 hover:text-yellow-300 font-mono uppercase tracking-wider border border-yellow-900 hover:border-yellow-500 px-2 py-1 transition-colors"
            >
              Edit
            </button>
            <button
              onClick={() => handleDelete(cred.id)}
              className="text-xs text-red-500 hover:text-red-400 font-mono uppercase tracking-wider border border-red-900 hover:border-red-500 px-2 py-1 transition-colors"
            >
              Delete
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
