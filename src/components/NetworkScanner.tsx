'use client';

import { useState, useEffect } from 'react';
import Modal from './Modal';
import HostForm from './HostForm';

interface DiscoveredDevice {
  id: number;
  ip: string;
  mac?: string;
  hostname?: string;
  vendor?: string;
  status: string;
  lastSeen: string;
  openPorts?: string | number[]; // JSON string or array
  isMonitored: boolean;
}

export default function NetworkScanner() {
  const [range, setRange] = useState('');
  const [devices, setDevices] = useState<DiscoveredDevice[]>([]);
  const [scanning, setScanning] = useState(false);
  const [progress, setProgress] = useState(0);
  const [currentIp, setCurrentIp] = useState('');
  const [portScanning, setPortScanning] = useState<string | null>(null);
  const [adoptDevice, setAdoptDevice] = useState<DiscoveredDevice | null>(null);
  const [scanWithPorts, setScanWithPorts] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortConfig, setSortConfig] = useState<{ key: 'ip' | 'hostname'; direction: 'asc' | 'desc' }>({ key: 'ip', direction: 'asc' });

  useEffect(() => {
    fetch('/api/network/scan')
      .then(res => res.json())
      .then(data => {
        if (data.devices) setDevices(data.devices);
        if (data.defaultRange) setRange(data.defaultRange);
      })
      .catch(err => console.error('Failed to load network data', err));
  }, []);

  const handleClear = async () => {
    if (!confirm('Are you sure you want to clear all discovered devices?')) return;
    try {
      await fetch('/api/network/scan', { method: 'DELETE' });
      setDevices([]);
    } catch (error) {
      console.error('Failed to clear results', error);
    }
  };

  const handleScan = async () => {
    setScanning(true);
    setProgress(0);
    setCurrentIp('');
    try {
      const res = await fetch('/api/network/scan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ range, scanPorts: scanWithPorts }),
      });
      
      if (!res.body) return;
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || ''; // Keep incomplete line

        for (const line of lines) {
          if (!line.trim()) continue;
          try {
            const event = JSON.parse(line);
            if (event.type === 'progress') {
              setProgress(event.percent);
              setCurrentIp(event.currentIp);
            } else if (event.type === 'device') {
              setDevices(prev => {
                const exists = prev.find(d => d.ip === event.device.ip);
                if (exists) {
                    return prev.map(d => d.ip === event.device.ip ? { ...d, ...event.device, status: 'online', lastSeen: new Date().toISOString() } : d);
                }
                return [...prev, { ...event.device, id: Date.now(), status: 'online', lastSeen: new Date().toISOString(), isMonitored: false }];
              });
            }
          } catch (e) {
            console.error('Error parsing stream', e);
          }
        }
      }
      
      // Final refresh to ensure consistency with DB IDs etc
      fetch('/api/network/scan')
        .then(res => res.json())
        .then(data => {
          if (data.devices) setDevices(data.devices);
        });

    } catch (error) {
      console.error('Scan failed', error);
    } finally {
      setScanning(false);
      setProgress(0);
      setCurrentIp('');
    }
  };

  const handlePortScan = async (ip: string) => {
    setPortScanning(ip);
    try {
      const res = await fetch(`/api/network/scan/${ip}/ports`, { method: 'POST' });
      const data = await res.json();
      
      // Update local state
      setDevices(prev => prev.map(d => {
        if (d.ip === ip) {
          return { ...d, openPorts: JSON.stringify(data.ports) };
        }
        return d;
      }));
    } catch (error) {
      console.error('Port scan failed', error);
    } finally {
      setPortScanning(null);
    }
  };

  const getOpenPorts = (device: DiscoveredDevice): number[] => {
    if (Array.isArray(device.openPorts)) return device.openPorts;
    try {
      return device.openPorts ? JSON.parse(device.openPorts as string) : [];
    } catch {
      return [];
    }
  };

  const hasSsh = (device: DiscoveredDevice) => {
    const ports = getOpenPorts(device);
    return ports.includes(22);
  };

  const ipToLong = (ip: string) => {
    return ip.split('.').reduce((acc, octet) => (acc << 8) + parseInt(octet, 10), 0) >>> 0;
  };

  const handleSort = (key: 'ip' | 'hostname') => {
    setSortConfig(current => ({
      key,
      direction: current.key === key && current.direction === 'asc' ? 'desc' : 'asc'
    }));
  };

  const filteredAndSortedDevices = devices
    .filter(device => {
      const query = searchQuery.toLowerCase();
      return (
        device.ip.includes(query) ||
        (device.hostname && device.hostname.toLowerCase().includes(query))
      );
    })
    .sort((a, b) => {
      const direction = sortConfig.direction === 'asc' ? 1 : -1;
      
      if (sortConfig.key === 'ip') {
        return (ipToLong(a.ip) - ipToLong(b.ip)) * direction;
      }
      
      const hostA = a.hostname || '';
      const hostB = b.hostname || '';
      // Handle empty hostnames by pushing them to the end
      if (!hostA && !hostB) return 0;
      if (!hostA) return 1;
      if (!hostB) return -1;
      
      return hostA.localeCompare(hostB) * direction;
    });

  return (
    <div className="space-y-6">
      <div className="bg-[#0b101b]/80 backdrop-blur-sm p-6 border border-cyan-500/30 shadow-[0_0_15px_rgba(6,182,212,0.1)]">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold text-cyan-400 tracking-widest uppercase flex items-center gap-2">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z" />
            </svg>
            Network Scanner
          </h2>
        </div>

        <div className="flex gap-4 mb-8">
          <div className="flex-1 flex gap-4">
            <div className="flex-1">
              <label className="block text-xs font-medium text-cyan-400 mb-1 uppercase tracking-wider">Network Range (CIDR)</label>
              <input
                type="text"
                value={range}
                onChange={(e) => setRange(e.target.value)}
                placeholder="e.g. 192.168.1.0/24"
                className="w-full bg-[#0b101b] border border-gray-800 p-2 rounded text-gray-200 focus:ring-1 focus:ring-cyan-500 focus:border-cyan-500 outline-none placeholder-gray-600 font-mono"
              />
            </div>
            <div className="flex-1">
              <label className="block text-xs font-medium text-cyan-400 mb-1 uppercase tracking-wider">Search</label>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search IP or Hostname..."
                className="w-full bg-[#0b101b] border border-gray-800 p-2 rounded text-gray-200 focus:ring-1 focus:ring-cyan-500 focus:border-cyan-500 outline-none placeholder-gray-600 font-mono"
              />
            </div>
          </div>
          <div className="flex items-end gap-4">
            <div className="flex items-center h-10">
              <label className="flex items-center gap-3 cursor-pointer group">
                <div className={`w-5 h-5 border transition-all duration-200 flex items-center justify-center ${
                  scanWithPorts 
                    ? 'bg-cyan-900/30 border-cyan-400 shadow-[0_0_10px_rgba(6,182,212,0.3)]' 
                    : 'bg-[#0b101b] border-gray-700 group-hover:border-cyan-500/50'
                }`}>
                  {scanWithPorts && (
                    <svg className="w-3 h-3 text-cyan-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                </div>
                <input
                  type="checkbox"
                  checked={scanWithPorts}
                  onChange={(e) => setScanWithPorts(e.target.checked)}
                  className="hidden"
                />
                <span className={`text-sm font-medium transition-colors uppercase tracking-wider ${
                  scanWithPorts ? 'text-cyan-400' : 'text-gray-400 group-hover:text-cyan-300'
                }`}>
                  Scan Ports
                </span>
              </label>
            </div>
            
            <button
              onClick={handleClear}
              disabled={scanning || devices.length === 0}
              className="px-4 py-2 bg-red-900/20 hover:bg-red-900/40 text-red-400 border border-red-500/30 rounded font-medium transition-all flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              title="Clear Results"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </button>

            <button
              onClick={handleScan}
              disabled={scanning}
              className={`px-6 py-2 bg-cyan-900/30 hover:bg-cyan-900/50 text-cyan-400 border border-cyan-500/30 rounded font-medium transition-all flex items-center gap-2 ${scanning ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              {scanning ? (
                <>
                  <svg className="animate-spin h-4 w-4 text-cyan-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Scanning...
                </>
              ) : (
                <>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                  Scan Network
                </>
              )}
            </button>
          </div>
        </div>

        {scanning && (
          <div className="mb-6 bg-cyan-900/20 border border-cyan-500/30 p-4 rounded">
            <div className="flex justify-between text-xs text-cyan-400 mb-2 uppercase tracking-wider">
              <span>Scanning Network...</span>
              <span>{progress}%</span>
            </div>
            <div className="w-full bg-gray-800 rounded-full h-2 mb-2 overflow-hidden">
              <div 
                className="bg-cyan-500 h-2 rounded-full transition-all duration-300 ease-out shadow-[0_0_10px_rgba(6,182,212,0.5)]" 
                style={{ width: `${progress}%` }}
              ></div>
            </div>
            <div className="text-xs text-gray-400 font-mono">
              Current IP: <span className="text-cyan-300">{currentIp}</span>
            </div>
          </div>
        )}

        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead>
              <tr className="bg-cyan-900/20 border-b border-cyan-500/30">
                <th 
                  className="px-4 py-3 font-medium text-cyan-300 uppercase cursor-pointer hover:text-cyan-100 transition-colors select-none"
                  onClick={() => handleSort('ip')}
                >
                  <div className="flex items-center gap-2">
                    IP Address
                    {sortConfig.key === 'ip' && (
                      <span className="text-cyan-500">
                        {sortConfig.direction === 'asc' ? '↑' : '↓'}
                      </span>
                    )}
                  </div>
                </th>
                <th 
                  className="px-4 py-3 font-medium text-cyan-300 uppercase cursor-pointer hover:text-cyan-100 transition-colors select-none"
                  onClick={() => handleSort('hostname')}
                >
                  <div className="flex items-center gap-2">
                    Hostname
                    {sortConfig.key === 'hostname' && (
                      <span className="text-cyan-500">
                        {sortConfig.direction === 'asc' ? '↑' : '↓'}
                      </span>
                    )}
                  </div>
                </th>
                <th className="px-4 py-3 font-medium text-cyan-300 uppercase">Status</th>
                <th className="px-4 py-3 font-medium text-cyan-300 uppercase">Last Seen</th>
                <th className="px-4 py-3 font-medium text-cyan-300 uppercase">Open Ports</th>
                <th className="px-4 py-3 font-medium text-cyan-300 uppercase text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-cyan-500/10">
              {filteredAndSortedDevices.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-gray-500 italic">
                    {devices.length === 0 ? "No devices found. Run a scan to discover devices." : "No matching devices found."}
                  </td>
                </tr>
              ) : (
                filteredAndSortedDevices.map((device) => (
                  <tr key={device.id} className="hover:bg-cyan-500/5 transition-colors group">
                    <td className="px-4 py-3 font-mono text-gray-300">{device.ip}</td>
                    <td className="px-4 py-3 font-mono text-gray-300 text-xs">{device.hostname || '-'}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-1 rounded text-xs font-bold uppercase ${
                        device.status === 'online' ? 'bg-green-900/30 text-green-400 border border-green-500/30' : 
                        'bg-gray-800 text-gray-400 border border-gray-600'
                      }`}>
                        {device.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-400 text-xs">
                      {new Date(device.lastSeen).toLocaleString()}
                    </td>
                    <td className="px-4 py-3 text-gray-300 font-mono text-xs">
                      {getOpenPorts(device).join(', ') || '-'}
                    </td>
                    <td className="px-4 py-3 text-right flex justify-end gap-2">
                      <button
                        onClick={() => handlePortScan(device.ip)}
                        disabled={portScanning === device.ip}
                        className="p-1.5 text-cyan-400 hover:text-cyan-200 hover:bg-cyan-900/30 rounded transition-colors"
                        title="Scan Ports"
                      >
                        {portScanning === device.ip ? (
                          <svg className="animate-spin w-5 h-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                          </svg>
                        ) : (
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z" />
                          </svg>
                        )}
                      </button>
                      
                      {hasSsh(device) && !device.isMonitored && (
                        <button
                          onClick={() => setAdoptDevice(device)}
                          className="p-1.5 text-green-400 hover:text-green-200 hover:bg-green-900/30 rounded transition-colors"
                          title="Adopt Host"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                          </svg>
                        </button>
                      )}
                      
                      {device.isMonitored && (
                        <span className="p-1.5 text-gray-500 cursor-default" title="Already Monitored">
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                        </span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <Modal
        isOpen={!!adoptDevice}
        onClose={() => setAdoptDevice(null)}
        title="Initialize New Host"
      >
        {adoptDevice && (
          <HostForm
            initialData={{
              label: adoptDevice.hostname || adoptDevice.ip,
              hostname: adoptDevice.ip,
              port: 22,
              username: '',
              refreshInterval: 60,
              retentionDays: 30,
            }}
            onSuccess={() => {
              setAdoptDevice(null);
              // Refresh list to update isMonitored status
              fetch('/api/network/scan')
                .then(res => res.json())
                .then(data => {
                  if (data.devices) setDevices(data.devices);
                });
            }}
          />
        )}
      </Modal>
    </div>
  );
}
