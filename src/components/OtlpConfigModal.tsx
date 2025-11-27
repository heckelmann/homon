'use client';

import { useState, useEffect } from 'react';

export default function OtlpConfigModal() {
  const [enabled, setEnabled] = useState(false);
  const [endpoint, setEndpoint] = useState('');
  const [headers, setHeaders] = useState('{}');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [verified, setVerified] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

  useEffect(() => {
    const fetchConfig = async () => {
      try {
        const res = await fetch('/api/otlp/config');
        if (res.ok) {
          const data = await res.json();
          if (data.endpoint) {
            setEnabled(data.enabled);
            setEndpoint(data.endpoint);
            setHeaders(data.headers || '{}');
            // If it was enabled, we assume it was verified before
            if (data.enabled) setVerified(true);
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

  const handleVerify = async () => {
    setVerifying(true);
    setMessage(null);
    try {
      const res = await fetch('/api/otlp/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ endpoint, headers }),
      });

      if (res.ok) {
        setVerified(true);
        setMessage({ type: 'success', text: 'Connection verified successfully' });
      } else {
        setVerified(false);
        setEnabled(false);
        const data = await res.json();
        setMessage({ type: 'error', text: data.error || 'Verification failed' });
      }
    } catch (err) {
      setVerified(false);
      setEnabled(false);
      setMessage({ type: 'error', text: 'Verification failed' });
    } finally {
      setVerifying(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (enabled && !verified) {
      setMessage({ type: 'error', text: 'Please verify the connection before enabling' });
      return;
    }

    setSaving(true);
    setMessage(null);

    try {
      const res = await fetch('/api/otlp/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          enabled,
          endpoint,
          headers,
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
          id="otlp-enabled"
          checked={enabled}
          onChange={(e) => setEnabled(e.target.checked)}
          disabled={!verified}
          className="w-4 h-4 rounded border-gray-600 bg-[#0b101b] text-cyan-500 focus:ring-cyan-500 focus:ring-offset-gray-900 disabled:opacity-50"
        />
        <label htmlFor="otlp-enabled" className={`text-sm font-medium ${!verified ? 'text-gray-500' : 'text-gray-300'}`}>
          Enable OTLP Export
        </label>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-400 mb-1">Collector Endpoint</label>
        <input
          type="url"
          value={endpoint}
          onChange={(e) => { setEndpoint(e.target.value); setVerified(false); if(enabled) setEnabled(false); }}
          className="w-full bg-[#0b101b] border border-gray-700 rounded p-2 text-gray-200 focus:border-cyan-500 focus:outline-none"
          placeholder="http://otel-collector:4318/v1/metrics"
          required
        />
        <p className="text-xs text-gray-500 mt-1">The HTTP endpoint of your OpenTelemetry Collector (e.g. /v1/metrics)</p>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-400 mb-1">Headers (JSON)</label>
        <textarea
          value={headers}
          onChange={(e) => { setHeaders(e.target.value); setVerified(false); if(enabled) setEnabled(false); }}
          className="w-full bg-[#0b101b] border border-gray-700 rounded p-2 text-gray-200 focus:border-cyan-500 focus:outline-none font-mono text-sm h-24"
          placeholder='{"Authorization": "Bearer token"}'
        />
      </div>

      {message && (
        <div className={`p-3 rounded text-sm ${message.type === 'success' ? 'bg-green-900/20 text-green-400 border border-green-500/30' : 'bg-red-900/20 text-red-400 border border-red-500/30'}`}>
          {message.text}
        </div>
      )}

      <div className="flex justify-between pt-4">
        <button
          type="button"
          onClick={handleVerify}
          disabled={verifying || !endpoint}
          className="px-4 py-2 bg-gray-800 text-cyan-400 border border-cyan-500/30 rounded hover:bg-gray-700 disabled:opacity-50 transition-colors font-mono uppercase text-sm tracking-wider"
        >
          {verifying ? 'Verifying...' : 'Verify Connection'}
        </button>

        <button
          type="submit"
          disabled={saving || (enabled && !verified)}
          className="px-4 py-2 bg-cyan-600 text-white rounded hover:bg-cyan-500 disabled:opacity-50 transition-colors font-mono uppercase text-sm tracking-wider"
        >
          {saving ? 'Saving...' : 'Save Configuration'}
        </button>
      </div>
    </form>
  );
}
