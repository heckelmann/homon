'use client';

import { useEffect, useState, useRef } from 'react';
import Modal from './Modal';

interface DockerLogsModalProps {
  isOpen: boolean;
  onClose: () => void;
  hostId: number;
  containerId: string;
  containerName: string;
}

export default function DockerLogsModal({ isOpen, onClose, hostId, containerId, containerName }: DockerLogsModalProps) {
  const [logs, setLogs] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [following, setFollowing] = useState(true);
  const logsEndRef = useRef<HTMLDivElement>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const fetchLogs = async () => {
    try {
      const res = await fetch(`/api/hosts/${hostId}/docker/${containerId}/logs?tail=200`);
      const data = await res.json();
      if (data.logs) {
        setLogs(data.logs);
      }
    } catch (error) {
      console.error('Failed to fetch logs:', error);
    }
  };

  useEffect(() => {
    if (isOpen) {
      setLoading(true);
      fetchLogs().finally(() => setLoading(false));
    } else {
      setLogs('');
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    }
  }, [isOpen, hostId, containerId]);

  useEffect(() => {
    if (isOpen && following) {
      intervalRef.current = setInterval(fetchLogs, 2000);
    } else if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [isOpen, following, hostId, containerId]);

  useEffect(() => {
    if (following && logsEndRef.current) {
      logsEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [logs, following]);

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Logs: ${containerName}`}
      className="max-w-4xl h-[80vh]"
    >
      <div className="flex flex-col h-full">
        <div className="flex-1 overflow-auto bg-[#0b101b] p-4 font-mono text-xs text-gray-300 whitespace-pre-wrap">
          {loading && !logs ? (
            <div className="flex items-center justify-center h-full text-cyan-500 animate-pulse">
              Loading logs...
            </div>
          ) : (
            <>
              {logs}
              <div ref={logsEndRef} />
            </>
          )}
        </div>
        <div className="p-4 border-t border-cyan-900/30 bg-cyan-950/10 flex justify-between items-center shrink-0">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setFollowing(!following)}
              className={`px-3 py-1.5 rounded text-xs font-medium transition-colors flex items-center gap-2 ${
                following 
                  ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/50' 
                  : 'bg-gray-800 text-gray-400 border border-gray-700 hover:bg-gray-700'
              }`}
            >
              <span className={`w-2 h-2 rounded-full ${following ? 'bg-cyan-400 animate-pulse' : 'bg-gray-500'}`}></span>
              {following ? 'Following' : 'Follow'}
            </button>
            <span className="text-xs text-gray-500">
              {following ? 'Auto-refreshing every 2s' : 'Paused'}
            </span>
          </div>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded text-xs font-medium transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </Modal>
  );
}
