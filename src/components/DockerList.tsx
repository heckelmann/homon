'use client';

import { useState } from 'react';
import { DockerContainer } from '@/lib/ssh';
import DockerLogsModal from './DockerLogsModal';

interface DockerListProps {
  containers: DockerContainer[];
  interfaces: { name: string; ip: string }[];
  mainIp?: string;
  hostId: number;
}

export default function DockerList({ containers, interfaces, mainIp, hostId }: DockerListProps) {
  const [sortField, setSortField] = useState<string>('name');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [selectedContainer, setSelectedContainer] = useState<DockerContainer | null>(null);

  const getHostIp = () => {
    if (mainIp && mainIp !== '127.0.0.1') return mainIp;
    if (!interfaces || interfaces.length === 0) return 'localhost';
    // Prioritize common physical interfaces if possible, or just first non-loopback
    const iface = interfaces.find(i => 
      !i.ip.startsWith('127.') && 
      !i.ip.startsWith('::1') &&
      !i.name.startsWith('lo')
    );
    return iface ? iface.ip.split('/')[0] : 'localhost';
  };

  const parsePorts = (portsStr: string) => {
    if (!portsStr) return [];
    const hostIp = getHostIp();
    
    return portsStr.split(',').map(p => p.trim()).map(p => {
      // Match bind_address:port->container_port
      // Examples: 
      // 0.0.0.0:80->80/tcp
      // :::80->80/tcp
      // 127.0.0.1:8080->80/tcp
      // 80/tcp (no bind)
      
      const match = p.match(/^(?:(0\.0\.0\.0|:::|127\.0\.0\.1|[0-9.]+):)?(\d+)->/);
      
      if (match) {
        const bindAddr = match[1];
        const port = match[2];
        
        let url = null;
        
        if (bindAddr === '127.0.0.1') {
            // Bound to loopback
            url = `http://127.0.0.1:${port}`;
        } else if (!bindAddr || bindAddr === '0.0.0.0' || bindAddr === ':::') {
            // Bound to all interfaces
            url = `http://${hostIp}:${port}`;
        } else {
            // Bound to specific IP
            url = `http://${bindAddr}:${port}`;
        }
        
        return { port, url, text: p };
      }
      return { port: null, url: null, text: p };
    });
  };

  const parsePercent = (str: string) => parseFloat(str.replace('%', '')) || 0;

  const sortedContainers = [...containers].sort((a, b) => {
    let aVal: any = a[sortField as keyof DockerContainer];
    let bVal: any = b[sortField as keyof DockerContainer];

    if (sortField === 'cpu') {
        aVal = parsePercent(a.cpu || '0%');
        bVal = parsePercent(b.cpu || '0%');
    } else if (sortField === 'memory') {
        aVal = parsePercent(a.memory || '0%');
        bVal = parsePercent(b.memory || '0%');
    } else {
        // String comparison for other fields
        aVal = (aVal || '').toString().toLowerCase();
        bVal = (bVal || '').toString().toLowerCase();
    }

    if (aVal < bVal) return sortDirection === 'asc' ? -1 : 1;
    if (aVal > bVal) return sortDirection === 'asc' ? 1 : -1;
    return 0;
  });

  const handleSort = (field: string) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const SortHeader = ({ field, label }: { field: string, label: string }) => (
    <th 
      className="px-4 py-3 font-medium text-blue-300 uppercase cursor-pointer hover:text-blue-100 transition-colors select-none group"
      onClick={() => handleSort(field)}
    >
      <div className="flex items-center gap-1">
        {label}
        <span className={`text-xs transition-opacity ${sortField === field ? 'opacity-100' : 'opacity-30 group-hover:opacity-70'}`}>
          {sortField === field && sortDirection === 'desc' ? '▼' : '▲'}
        </span>
      </div>
    </th>
  );

  if (containers.length === 0) {
    return (
        <div className="p-8 text-center text-gray-500 italic">
            No containers running
        </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full text-left text-sm">
        <thead>
          <tr className="bg-blue-900/20 border-b border-blue-500/30">
            <SortHeader field="id" label="ID" />
            <SortHeader field="name" label="Name" />
            <SortHeader field="image" label="Image" />
            <SortHeader field="cpu" label="CPU" />
            <SortHeader field="memory" label="Mem" />
            <SortHeader field="status" label="Status" />
            <SortHeader field="state" label="State" />
            <th className="px-4 py-3 font-medium text-blue-300 uppercase">Ports</th>
            <th className="px-4 py-3 font-medium text-blue-300 uppercase w-10">Logs</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-blue-500/10">
          {sortedContainers.map((container) => (
            <tr key={container.id} className="hover:bg-blue-500/10 transition-colors">
              <td className="px-4 py-3 font-mono text-gray-400">{container.id.substring(0, 12)}</td>
              <td className="px-4 py-3 text-cyan-400 font-medium">{container.name}</td>
              <td className="px-4 py-3 text-gray-300">{container.image}</td>
              <td className="px-4 py-3 text-gray-300 font-mono">{container.cpu || '0%'}</td>
              <td className="px-4 py-3 text-gray-300 font-mono">{container.memory || '0%'}</td>
              <td className="px-4 py-3 text-gray-300">{container.status}</td>
              <td className="px-4 py-3">
                <span className={`px-2 py-1 rounded text-xs font-bold uppercase ${
                  container.state === 'running' ? 'bg-green-900/30 text-green-400 border border-green-500/30' : 
                  'bg-gray-800 text-gray-400 border border-gray-600'
                }`}>
                  {container.state}
                </span>
              </td>
              <td className="px-4 py-3 text-gray-300 text-xs font-mono max-w-[200px]">
                <div className="flex flex-col gap-1">
                  {parsePorts(container.ports).map((p, idx) => (
                    p.url ? (
                      <a key={idx} href={p.url} target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:text-blue-300 hover:underline block truncate" title={p.text}>
                        {p.text}
                      </a>
                    ) : (
                      <span key={idx} className="block truncate" title={p.text}>{p.text}</span>
                    )
                  ))}
                </div>
              </td>
              <td className="px-4 py-3">
                <button
                  onClick={() => setSelectedContainer(container)}
                  className="p-1.5 text-cyan-400 hover:text-cyan-200 hover:bg-cyan-900/30 rounded transition-colors"
                  title="View Logs"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      
      {selectedContainer && (
        <DockerLogsModal
          isOpen={!!selectedContainer}
          onClose={() => setSelectedContainer(null)}
          hostId={hostId}
          containerId={selectedContainer.id}
          containerName={selectedContainer.name}
        />
      )}
    </div>
  );
}
