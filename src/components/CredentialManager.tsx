'use client';

import { useState } from 'react';
import CredentialList from './CredentialList';
import CredentialForm from './CredentialForm';

export default function CredentialManager() {
  const [view, setView] = useState<'list' | 'form'>('list');
  const [editingCredential, setEditingCredential] = useState<any>(null);

  const handleAdd = () => {
    setEditingCredential(null);
    setView('form');
  };

  const handleEdit = (credential: any) => {
    setEditingCredential(credential);
    setView('form');
  };

  const handleSuccess = () => {
    setView('list');
    setEditingCredential(null);
  };

  const handleCancel = () => {
    setView('list');
    setEditingCredential(null);
  };

  return (
    <div>
      {view === 'list' ? (
        <>
          <div className="flex justify-end mb-4">
            <button
              onClick={handleAdd}
              className="bg-cyan-900/30 border border-cyan-500/50 text-cyan-400 px-4 py-2 rounded hover:bg-cyan-900/50 hover:text-cyan-300 hover:border-cyan-400 transition-all duration-300 font-medium uppercase tracking-wider text-xs shadow-[0_0_10px_rgba(6,182,212,0.1)] hover:shadow-[0_0_15px_rgba(6,182,212,0.3)] flex items-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Add Credential
            </button>
          </div>
          <CredentialList onEdit={handleEdit} />
        </>
      ) : (
        <CredentialForm
          initialData={editingCredential || undefined}
          onSuccess={handleSuccess}
          onCancel={handleCancel}
        />
      )}
    </div>
  );
}
