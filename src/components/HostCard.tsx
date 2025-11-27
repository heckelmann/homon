'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Modal from './Modal';
import HostForm from './HostForm';

interface Host {
  id: number;
  label: string;
  hostname: string;
  port: number;
  username: string | null;
  refreshInterval: number;
  retentionDays: number;
  credential?: {
    username: string;
  } | null;
}

interface Metrics {
  cpuUsage: number;
  memoryUsage: {
    total: number;
    used: number;
    free: number;
  };
  diskUsage: {
    total: string;
    used: string;
    free: string;
    percent: string;
  };
}

export default function HostCard({ host, dragHandleProps }: { host: Host, dragHandleProps?: any }) {
  const router = useRouter();
  const [metrics, setMetrics] = useState<Metrics | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const editButtonRef = useRef<HTMLButtonElement>(null);

  const fetchMetrics = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/hosts/${host.id}/metrics`);
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to fetch metrics');
      }
      const data = await res.json();
      setMetrics(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMetrics();
    const interval = setInterval(fetchMetrics, 10000); // Refresh every 10s
    return () => clearInterval(interval);
  }, [host.id]);

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this host?')) return;
    await fetch(`/api/hosts/${host.id}`, { method: 'DELETE' });
    router.refresh();
  };

  return (
    <>
      <div className="bg-[#0b101b]/80 backdrop-blur-sm p-6 border border-cyan-500/30 text-gray-200 hover:border-cyan-400 hover:shadow-[0_0_15px_rgba(0,240,255,0.2)] transition-all duration-300 relative overflow-hidden group-card">
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-cyan-500 to-transparent opacity-50"></div>
        
        <div className="flex justify-between items-start mb-6">
          <Link href={`/hosts/${host.id}`} className="group">
            <h3 className="text-lg font-bold text-cyan-400 group-hover:text-cyan-300 transition-colors tracking-wide font-mono uppercase">{host.label}</h3>
            <div className="text-xs text-gray-500 mt-1 font-mono">
              {host.credential?.username || host.username}@{host.hostname}
            </div>
          </Link>
          <div className="flex gap-2 items-center">
            <button
              onClick={fetchMetrics}
              className="p-1.5 text-cyan-500 hover:text-cyan-300 border border-cyan-900 hover:border-cyan-500 rounded transition-colors"
              disabled={loading}
              title="Refresh"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            </button>
            <button
              ref={editButtonRef}
              onClick={() => setIsEditModalOpen(true)}
              className="p-1.5 text-yellow-500 hover:text-yellow-300 border border-yellow-900 hover:border-yellow-500 rounded transition-colors"
              title="Edit"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
            </button>
            <button
              onClick={handleDelete}
              className="p-1.5 text-red-500 hover:text-red-400 border border-red-900 hover:border-red-500 rounded transition-colors"
              title="Delete"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </button>
            
            {dragHandleProps && (
              <div 
                {...dragHandleProps}
                className="p-1.5 cursor-grab active:cursor-grabbing text-cyan-500/30 hover:text-cyan-500 transition-colors ml-1"
                title="Drag to reorder"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8h16M4 16h16" />
                </svg>
              </div>
            )}
          </div>
        </div>

        {error && <div className="text-red-400 text-xs mb-4 bg-red-900/20 p-2 border border-red-500/30 font-mono">{error}</div>}

        {loading && !metrics && <div className="text-cyan-500/50 text-xs animate-pulse font-mono">SCANNING SYSTEM...</div>}

        {metrics && (
          <div className="space-y-5 font-mono text-xs">
            <div>
              <div className="flex justify-between mb-1">
                <span className="text-gray-500 uppercase">CPU Load</span>
                <span className="text-cyan-400">{metrics.cpuUsage.toFixed(1)}%</span>
              </div>
              <div className="w-full bg-gray-800 h-1.5">
                <div
                  className="bg-cyan-500 h-1.5 shadow-[0_0_8px_rgba(6,182,212,0.8)] transition-all duration-500"
                  style={{ width: `${Math.min(metrics.cpuUsage, 100)}%` }}
                ></div>
              </div>
            </div>

            <div>
              <div className="flex justify-between mb-1">
                <span className="text-gray-500 uppercase">Memory</span>
                <span className="text-green-400">{metrics.memoryUsage.used}MB / {metrics.memoryUsage.total}MB</span>
              </div>
              <div className="w-full bg-gray-800 h-1.5">
                <div
                  className="bg-green-500 h-1.5 shadow-[0_0_8px_rgba(34,197,94,0.8)] transition-all duration-500"
                  style={{ width: `${(metrics.memoryUsage.used / metrics.memoryUsage.total) * 100}%` }}
                ></div>
              </div>
            </div>

            <div>
              <div className="flex justify-between mb-1">
                <span className="text-gray-500 uppercase">Disk (/)</span>
                <span className="text-fuchsia-400">{metrics.diskUsage.percent}</span>
              </div>
              <div className="w-full bg-gray-800 h-1.5">
                <div
                  className="bg-fuchsia-500 h-1.5 shadow-[0_0_8px_rgba(217,70,239,0.8)] transition-all duration-500"
                  style={{ width: metrics.diskUsage.percent }}
                ></div>
              </div>
            </div>
          </div>
        )}
      </div>

      <Modal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        title="Edit System Node"
        triggerRef={editButtonRef}
      >
        <HostForm 
          initialData={host} 
          onSuccess={() => setIsEditModalOpen(false)} 
        />
      </Modal>
    </>
  );
}
