'use client';

import { useState, useEffect } from 'react';

export default function OAuthConfigModal() {
  const [enabled, setEnabled] = useState(false);
  const [name, setName] = useState('OpenID Connect');
  const [issuer, setIssuer] = useState('');
  const [clientId, setClientId] = useState('');
  const [clientSecret, setClientSecret] = useState('');
  const [scope, setScope] = useState('openid profile email');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);
  const [callbackUrl, setCallbackUrl] = useState('');

  useEffect(() => {
    setCallbackUrl(`${window.location.origin}/api/auth/oauth/callback`);

    const fetchConfig = async () => {
      try {
        const res = await fetch('/api/auth/oauth/config');
        if (res.ok) {
          const data = await res.json();
          if (data.issuer) { // If we have config
            setEnabled(data.enabled);
            setName(data.name);
            setIssuer(data.issuer);
            setClientId(data.clientId);
            setScope(data.scope);
            // clientSecret is not returned
          }
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchConfig();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setMessage(null);

    try {
      const res = await fetch('/api/auth/oauth/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          enabled,
          name,
          issuer,
          clientId,
          clientSecret, // Only send if updating
          scope,
        }),
      });

      if (res.ok) {
        setMessage({ type: 'success', text: 'Configuration saved successfully' });
      } else {
        setMessage({ type: 'error', text: 'Failed to save configuration' });
      }
    } catch (err) {
      setMessage({ type: 'error', text: 'An error occurred' });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="text-cyan-400 p-4">Loading configuration...</div>;
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="flex items-center gap-2 mb-4">
        <input
          type="checkbox"
          id="oauth-enabled"
          checked={enabled}
          onChange={(e) => setEnabled(e.target.checked)}
          className="w-4 h-4 rounded border-gray-600 bg-[#0b101b] text-cyan-500 focus:ring-cyan-500 focus:ring-offset-gray-900"
        />
        <label htmlFor="oauth-enabled" className="text-gray-300 text-sm font-medium">
          Enable OAuth / OpenID Connect
        </label>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-400 mb-1">Provider Name</label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="w-full bg-[#0b101b] border border-gray-700 rounded p-2 text-gray-200 focus:border-cyan-500 focus:outline-none"
          placeholder="e.g. Google, Auth0, Keycloak"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-400 mb-1">Callback URL</label>
        <div className="flex gap-2">
          <input
            type="text"
            value={callbackUrl}
            readOnly
            className="w-full bg-[#0b101b] border border-gray-700 rounded p-2 text-gray-400 focus:outline-none cursor-not-allowed font-mono text-sm"
          />
          <button
            type="button"
            onClick={() => navigator.clipboard.writeText(callbackUrl)}
            className="px-3 py-2 bg-gray-800 text-gray-300 rounded hover:bg-gray-700 border border-gray-700 transition-colors"
            title="Copy to clipboard"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
            </svg>
          </button>
        </div>
        <p className="text-xs text-gray-500 mt-1">Register this URL with your OAuth provider</p>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-400 mb-1">Issuer URL</label>
        <input
          type="url"
          value={issuer}
          onChange={(e) => setIssuer(e.target.value)}
          className="w-full bg-[#0b101b] border border-gray-700 rounded p-2 text-gray-200 focus:border-cyan-500 focus:outline-none"
          placeholder="https://accounts.google.com"
          required={enabled}
        />
        <p className="text-xs text-gray-500 mt-1">The URL of your OpenID Connect provider (must support .well-known/openid-configuration)</p>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-400 mb-1">Client ID</label>
        <input
          type="text"
          value={clientId}
          onChange={(e) => setClientId(e.target.value)}
          className="w-full bg-[#0b101b] border border-gray-700 rounded p-2 text-gray-200 focus:border-cyan-500 focus:outline-none"
          required={enabled}
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-400 mb-1">Client Secret</label>
        <input
          type="password"
          value={clientSecret}
          onChange={(e) => setClientSecret(e.target.value)}
          className="w-full bg-[#0b101b] border border-gray-700 rounded p-2 text-gray-200 focus:border-cyan-500 focus:outline-none"
          placeholder={clientId ? "(Unchanged)" : ""}
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-400 mb-1">Scopes</label>
        <input
          type="text"
          value={scope}
          onChange={(e) => setScope(e.target.value)}
          className="w-full bg-[#0b101b] border border-gray-700 rounded p-2 text-gray-200 focus:border-cyan-500 focus:outline-none"
        />
      </div>

      {message && (
        <div className={`p-3 rounded text-sm ${message.type === 'success' ? 'bg-green-900/20 text-green-400 border border-green-500/30' : 'bg-red-900/20 text-red-400 border border-red-500/30'}`}>
          {message.text}
        </div>
      )}

      <div className="flex justify-end pt-4">
        <button
          type="submit"
          disabled={saving}
          className="px-4 py-2 bg-cyan-600 text-white rounded hover:bg-cyan-500 disabled:opacity-50 transition-colors font-mono uppercase text-sm tracking-wider"
        >
          {saving ? 'Saving...' : 'Save Configuration'}
        </button>
      </div>
    </form>
  );
}
