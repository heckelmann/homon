'use client';

import { useState, useEffect, use, useRef } from 'react';
import Link from 'next/link';
import { HostDetails, SystemMetrics } from '@/lib/ssh';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import Terminal from '@/components/Terminal';
import FileExplorer from '@/components/FileExplorer';
import Modal from '@/components/Modal';
import ProcessList from '@/components/ProcessList';
import DockerList from '@/components/DockerList';

const Gauge = ({ value, color, label, subLabel }: { value: number, color: string, label: string, subLabel?: string }) => {
  const radius = 70;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (Math.min(Math.max(value, 0), 100) / 100) * circumference;
  
  return (
    <div className="flex flex-col items-center justify-center p-4 w-full">
      <div className="relative w-48 h-48">
        <svg className="transform -rotate-90 w-full h-full" viewBox="0 0 192 192">
          <circle
            className="text-gray-800/50"
            strokeWidth="12"
            stroke="currentColor"
            fill="transparent"
            r={radius}
            cx="96"
            cy="96"
          />
          <circle
            className="transition-all duration-1000 ease-out"
            strokeWidth="12"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            strokeLinecap="round"
            stroke={color}
            fill="transparent"
            r={radius}
            cx="96"
            cy="96"
            style={{ filter: `drop-shadow(0 0 8px ${color})` }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-4xl font-bold" style={{ color }}>{Math.round(value)}%</span>
        </div>
      </div>
      <span className="mt-4 text-lg font-bold uppercase tracking-wider" style={{ color }}>{label}</span>
      {subLabel && <span className="text-sm text-gray-500 font-mono mt-1">{subLabel}</span>}
    </div>
  );
};

export default function HostDetailsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [details, setDetails] = useState<HostDetails | null>(null);
  const [metrics, setMetrics] = useState<SystemMetrics | null>(null);
  const [history, setHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [historyError, setHistoryError] = useState<string | null>(null);
  const [range, setRange] = useState('1h');
  const [selectedDisk, setSelectedDisk] = useState<string>('/');
  const [showTerminal, setShowTerminal] = useState(false);
  const [showFileExplorer, setShowFileExplorer] = useState(false);
  const terminalBtnRef = useRef<HTMLButtonElement>(null);
  const filesBtnRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch details first
        const detailsRes = await fetch(`/api/hosts/${id}/details`);
        if (!detailsRes.ok) throw new Error('Failed to fetch host details');
        
        const detailsData = await detailsRes.json();
        setDetails(detailsData);
        setError(null);

        // Fetch current metrics
        try {
          const metricsRes = await fetch(`/api/hosts/${id}/metrics`);
          if (metricsRes.ok) {
            const metricsData = await metricsRes.json();
            setMetrics(metricsData);
          }
        } catch (err) {
          console.error('Metrics fetch error:', err);
        }

        // Fetch history separately
        try {
          const historyRes = await fetch(`/api/hosts/${id}/history?range=${range}`);
          if (!historyRes.ok) throw new Error('Failed to fetch history');
          
          const historyData = await historyRes.json();
          setHistory(historyData);
          setHistoryError(null);
        } catch (err) {
          console.error('History fetch error:', err);
          setHistoryError('Failed to load historical data');
        }
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
    const interval = setInterval(fetchData, 10000); // Increased frequency for gauges
    return () => clearInterval(interval);
  }, [id, range]);

  const chartData = history.map((d: any) => {
    let diskPercent = d.diskPercent;
    
    if (selectedDisk !== '/' && d.diskUsage) {
      try {
        const disks = typeof d.diskUsage === 'string' ? JSON.parse(d.diskUsage) : d.diskUsage;
        const disk = disks.find((disk: any) => disk.mount === selectedDisk);
        if (disk) {
          diskPercent = parseFloat(disk.usePercent.replace('%', ''));
        } else {
          diskPercent = null; // Disk not found in this record
        }
      } catch (e) {
        console.error('Error parsing disk usage:', e);
      }
    }

    return {
      ...d,
      time: new Date(d.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      memoryUsagePercent: d.memoryTotal > 0 ? (d.memoryUsed / d.memoryTotal) * 100 : 0,
      diskPercent: diskPercent
    };
  });

  if (loading && !details) {
    return (
      <div className="min-h-screen p-8 flex items-center justify-center">
        <div className="text-xl text-cyan-500 animate-pulse font-mono">INITIALIZING SYSTEM LINK...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen p-8">
        <div className="max-w-4xl mx-auto">
          <Link href="/" className="text-cyan-500 hover:text-cyan-300 mb-4 inline-block font-mono">&larr; RETURN TO GRID</Link>
          <div className="bg-red-900/20 border border-red-500 text-red-400 p-4 font-mono">
            SYSTEM ERROR: {error}
          </div>
        </div>
      </div>
    );
  }

  if (!details) return null;

  return (
    <div className="min-h-screen p-8 font-mono">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-8 border-b border-cyan-500/30 pb-4">
          <div className="flex items-center gap-4">
            <Link href="/" className="text-cyan-500 hover:text-cyan-300 transition-colors">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
            </Link>
            <h1 className="text-3xl font-bold text-cyan-400 neon-text tracking-wider uppercase">System Node: {details.network?.hostname || details.os.name}</h1>
          </div>
          <div className="flex items-center gap-4">
            <button
              ref={terminalBtnRef}
              onClick={() => setShowTerminal(true)}
              className="bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-400 border border-cyan-500/50 px-4 py-1 text-sm uppercase tracking-wider transition-all hover:shadow-[0_0_10px_rgba(0,240,255,0.3)] flex items-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 9l3 3-3 3m5 0h3M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              Terminal
            </button>
            <button
              ref={filesBtnRef}
              onClick={() => setShowFileExplorer(true)}
              className="bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-400 border border-cyan-500/50 px-4 py-1 text-sm uppercase tracking-wider transition-all hover:shadow-[0_0_10px_rgba(0,240,255,0.3)] flex items-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
              </svg>
              Files
            </button>
            <select 
              value={range}  
              onChange={(e) => setRange(e.target.value)}
              className="bg-[#0b101b] border border-cyan-500/50 text-cyan-400 rounded-none px-3 py-1 text-sm focus:outline-none focus:border-cyan-400 focus:shadow-[0_0_10px_#0ff]"
            >
              <option value="1h">T-Minus 1H</option>
              <option value="6h">T-Minus 6H</option>
              <option value="24h">T-Minus 24H</option>
              <option value="7d">T-Minus 7D</option>
            </select>
            <div className="text-sm text-cyan-500/70">
              SYNC: {new Date().toLocaleTimeString()}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          {/* System Info */}
          <div className="bg-[#0b101b]/80 backdrop-blur-sm p-6 border border-cyan-500/30 shadow-[0_0_15px_rgba(0,240,255,0.1)]">
            <h2 className="text-xl font-bold text-cyan-400 mb-4 flex items-center gap-2 uppercase tracking-wide">
              <svg className="w-5 h-5 text-cyan-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              System Core
            </h2>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between border-b border-cyan-500/20 pb-2">
                <span className="text-gray-400">OS DISTRO</span>
                <span className="font-medium text-cyan-300">{details.os.name}</span>
              </div>
              <div className="flex justify-between border-b border-cyan-500/20 pb-2">
                <span className="text-gray-400">KERNEL VER</span>
                <span className="font-medium text-cyan-300">{details.os.kernel}</span>
              </div>
              <div className="flex justify-between border-b border-cyan-500/20 pb-2">
                <span className="text-gray-400">UPTIME</span>
                <span className="font-medium text-cyan-300">{details.os.uptime}</span>
              </div>
              <div className="flex justify-between border-b border-cyan-500/20 pb-2">
                <span className="text-gray-400">VIRTUALIZATION</span>
                <span className="font-medium text-cyan-300 uppercase">{details.hardware.virtualization}</span>
              </div>
            </div>
          </div>

          {/* Hardware Info */}
          <div className="bg-[#0b101b]/80 backdrop-blur-sm p-6 border border-cyan-500/30 shadow-[0_0_15px_rgba(0,240,255,0.1)]">
            <h2 className="text-xl font-bold text-green-400 mb-4 flex items-center gap-2 uppercase tracking-wide">
              <svg className="w-5 h-5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2H5a2 2 0 00-2 2v2M7 7h10" />
              </svg>
              Hardware Matrix
            </h2>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between border-b border-green-500/20 pb-2">
                <span className="text-gray-400">CPU MODEL</span>
                <span className="font-medium text-green-300 text-right max-w-[60%]">{details.hardware.cpuModel}</span>
              </div>
              <div className="flex justify-between border-b border-green-500/20 pb-2">
                <span className="text-gray-400">CORES</span>
                <span className="font-medium text-green-300">{details.hardware.cpuCores}</span>
              </div>
              <div className="flex justify-between border-b border-green-500/20 pb-2">
                <span className="text-gray-400">MEMORY</span>
                <span className="font-medium text-green-300">{details.hardware.memoryTotal}</span>
              </div>
            </div>
          </div>

          {/* Network Info */}
          <div className="bg-[#0b101b]/80 backdrop-blur-sm p-6 border border-cyan-500/30 shadow-[0_0_15px_rgba(0,240,255,0.1)]">
            <h2 className="text-xl font-bold text-blue-400 mb-4 flex items-center gap-2 uppercase tracking-wide">
              <svg className="w-5 h-5 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
              </svg>
              Network Matrix
            </h2>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between border-b border-blue-500/20 pb-2">
                <span className="text-gray-400">HOSTNAME</span>
                <span className="font-medium text-blue-300">{details.network?.hostname || 'N/A'}</span>
              </div>
              <div className="flex justify-between border-b border-blue-500/20 pb-2">
                <span className="text-gray-400">GATEWAY</span>
                <span className="font-medium text-blue-300">{details.network?.gateway || 'N/A'}</span>
              </div>
              <div className="flex justify-between border-b border-blue-500/20 pb-2">
                <span className="text-gray-400">DNS</span>
                <span className="font-medium text-blue-300 text-right max-w-[60%] truncate" title={details.network?.dns?.join(', ')}>
                  {details.network?.dns?.join(', ') || 'N/A'}
                </span>
              </div>
              <div className="mt-2">
                <span className="text-gray-400 block mb-1 text-xs uppercase">Interfaces</span>
                <div className="space-y-1 max-h-[100px] overflow-y-auto custom-scrollbar">
                  {details.network?.interfaces.map((iface, i) => (
                    <div key={i} className="flex justify-between text-xs bg-blue-900/10 p-1 rounded border border-blue-500/10">
                      <span className="text-blue-400 font-bold">{iface.name}</span>
                      <span className="text-gray-300">{iface.ip}</span>
                    </div>
                  )) || <span className="text-gray-500 italic">No interfaces found</span>}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Live Gauges */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <div className="bg-[#0b101b]/80 backdrop-blur-sm p-6 border border-cyan-500/30 shadow-[0_0_15px_rgba(0,240,255,0.1)] flex items-center justify-center">
             <Gauge 
               value={metrics?.cpuUsage || 0} 
               color="#00f0ff" 
               label="CPU Load" 
               subLabel={`${details.hardware.cpuCores} Cores Active`}
             />
          </div>
          <div className="bg-[#0b101b]/80 backdrop-blur-sm p-6 border border-green-500/30 shadow-[0_0_15px_rgba(34,197,94,0.1)] flex items-center justify-center">
             <Gauge 
               value={metrics?.memoryUsage ? (metrics.memoryUsage.used / metrics.memoryUsage.total) * 100 : 0} 
               color="#22c55e" 
               label="Memory Usage" 
               subLabel={metrics?.memoryUsage ? `${metrics.memoryUsage.used}MB / ${metrics.memoryUsage.total}MB` : 'Calculating...'}
             />
          </div>
        </div>



        {/* Historical Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* CPU History Chart */}
          <div className="bg-[#0b101b]/80 backdrop-blur-sm p-6 border border-cyan-500/30 shadow-[0_0_15px_rgba(0,240,255,0.1)]">
            <h2 className="text-xl font-bold text-cyan-400 mb-6 uppercase tracking-wide">CPU Load History</h2>
            {historyError ? (
              <div className="h-[300px] flex items-center justify-center text-red-500 bg-red-900/10 border border-red-500/30">
                {historyError}
              </div>
            ) : (
              <div className="h-[300px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
                    <XAxis dataKey="time" stroke="#6b7280" tick={{fill: '#6b7280'}} />
                    <YAxis domain={[0, 100]} stroke="#6b7280" tick={{fill: '#6b7280'}} />
                    <Tooltip 
                      contentStyle={{ backgroundColor: '#0b101b', borderColor: '#00f0ff', color: '#00f0ff' }}
                      itemStyle={{ color: '#00f0ff' }}
                    />
                    <Line type="monotone" dataKey="cpuUsage" stroke="#00f0ff" strokeWidth={2} dot={false} name="CPU %" activeDot={{ r: 6, fill: "#00f0ff", stroke: "#fff" }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>

          {/* Memory History Chart */}
          <div className="bg-[#0b101b]/80 backdrop-blur-sm p-6 border border-green-500/30 shadow-[0_0_15px_rgba(34,197,94,0.1)]">
            <h2 className="text-xl font-bold text-green-400 mb-6 uppercase tracking-wide">Memory Usage History</h2>
            {historyError ? (
              <div className="h-[300px] flex items-center justify-center text-red-500 bg-red-900/10 border border-red-500/30">
                {historyError}
              </div>
            ) : (
              <div className="h-[300px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
                    <XAxis dataKey="time" stroke="#6b7280" tick={{fill: '#6b7280'}} />
                    <YAxis domain={[0, 100]} stroke="#6b7280" tick={{fill: '#6b7280'}} />
                    <Tooltip 
                      contentStyle={{ backgroundColor: '#0b101b', borderColor: '#22c55e', color: '#22c55e' }}
                      itemStyle={{ color: '#22c55e' }}
                    />
                    <Line type="monotone" dataKey="memoryUsagePercent" stroke="#22c55e" strokeWidth={2} dot={false} name="Memory %" activeDot={{ r: 6, fill: "#22c55e", stroke: "#fff" }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>

          {/* Process Matrix */}
          <div className="bg-[#0b101b]/80 backdrop-blur-sm p-6 border border-yellow-500/30 shadow-[0_0_15px_rgba(234,179,8,0.1)] lg:col-span-2">
            <ProcessList processes={details.processes || []} />
          </div>

          {/* Disk History Chart */}
          <div className="bg-[#0b101b]/80 backdrop-blur-sm p-6 border border-fuchsia-500/30 shadow-[0_0_15px_rgba(217,70,239,0.1)] lg:col-span-2">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-fuchsia-400 uppercase tracking-wide">Disk Usage History</h2>
              <select
                value={selectedDisk}
                onChange={(e) => setSelectedDisk(e.target.value)}
                className="bg-[#0b101b] border border-fuchsia-500/50 text-fuchsia-400 rounded-none px-3 py-1 text-sm focus:outline-none focus:border-fuchsia-400 focus:shadow-[0_0_10px_#d946ef]"
              >
                {details.disks.map((disk, i) => (
                  <option key={i} value={disk.mount}>{disk.mount} ({disk.filesystem})</option>
                ))}
              </select>
            </div>
            {historyError ? (
              <div className="h-[300px] flex items-center justify-center text-red-500 bg-red-900/10 border border-red-500/30">
                {historyError}
              </div>
            ) : (
              <div className="h-[300px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
                    <XAxis dataKey="time" stroke="#6b7280" tick={{fill: '#6b7280'}} />
                    <YAxis domain={[0, 100]} stroke="#6b7280" tick={{fill: '#6b7280'}} />
                    <Tooltip 
                      contentStyle={{ backgroundColor: '#0b101b', borderColor: '#d946ef', color: '#d946ef' }}
                      itemStyle={{ color: '#d946ef' }}
                    />
                    <Line type="monotone" dataKey="diskPercent" stroke="#d946ef" strokeWidth={2} dot={false} name="Disk %" activeDot={{ r: 6, fill: "#d946ef", stroke: "#fff" }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>
        </div>

        {/* Disk Usage */}
        <div className="bg-[#0b101b]/80 backdrop-blur-sm p-6 border border-purple-500/30 shadow-[0_0_15px_rgba(168,85,247,0.1)] mb-8">
          <h2 className="text-xl font-bold text-purple-400 mb-6 flex items-center gap-2 uppercase tracking-wide">
            <svg className="w-5 h-5 text-purple-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
            </svg>
            Storage Matrix
          </h2>
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead>
                <tr className="bg-purple-900/20 border-b border-purple-500/30">
                  <th className="px-4 py-3 font-medium text-purple-300 uppercase">Mount Point</th>
                  <th className="px-4 py-3 font-medium text-purple-300 uppercase">Filesystem</th>
                  <th className="px-4 py-3 font-medium text-purple-300 uppercase">Size</th>
                  <th className="px-4 py-3 font-medium text-purple-300 uppercase">Used</th>
                  <th className="px-4 py-3 font-medium text-purple-300 uppercase">Available</th>
                  <th className="px-4 py-3 font-medium text-purple-300 uppercase w-1/3">Usage</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-purple-500/10">
                {details.disks.map((disk, i) => (
                  <tr key={i} className="hover:bg-purple-500/10 transition-colors">
                    <td className="px-4 py-3 font-medium text-gray-200">{disk.mount}</td>
                    <td className="px-4 py-3 text-gray-400">{disk.filesystem}</td>
                    <td className="px-4 py-3 text-gray-400">{disk.size}</td>
                    <td className="px-4 py-3 text-gray-400">{disk.used}</td>
                    <td className="px-4 py-3 text-gray-400">{disk.available}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="flex-1 bg-gray-800 h-2">
                          <div
                            className={`h-2 shadow-[0_0_5px_currentColor] ${
                              parseInt(disk.usePercent) > 90 ? 'bg-red-500 text-red-500' :
                              parseInt(disk.usePercent) > 75 ? 'bg-yellow-500 text-yellow-500' : 'bg-purple-500 text-purple-500'
                            }`}
                            style={{ width: disk.usePercent }}
                          ></div>
                        </div>
                        <span className="text-gray-300 w-12 text-right">{disk.usePercent}</span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Docker Containers */}
        {details.docker && (
          <div className="bg-[#0b101b]/80 backdrop-blur-sm p-6 border border-blue-500/30 shadow-[0_0_15px_rgba(59,130,246,0.1)] mb-8">
            <h2 className="text-xl font-bold text-blue-400 mb-6 flex items-center gap-2 uppercase tracking-wide">
              <svg className="w-5 h-5 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
              </svg>
              Docker Containers
            </h2>
            <DockerList 
              containers={details.docker} 
              interfaces={details.network?.interfaces || []} 
              mainIp={details.network?.mainIp}
            />
          </div>
        )}
      </div>
      <Modal
        isOpen={showTerminal}
        onClose={() => setShowTerminal(false)}
        title="Terminal Access"
        triggerRef={terminalBtnRef}
        className="w-[90vw] h-[80vh] max-w-none"
      >
        <Terminal hostId={id} />
      </Modal>

      <Modal
        isOpen={showFileExplorer}
        onClose={() => setShowFileExplorer(false)}
        title="File Explorer"
        triggerRef={filesBtnRef}
        className="w-[90vw] h-[80vh] max-w-none"
      >
        <FileExplorer hostId={parseInt(id)} />
      </Modal>
    </div>
  );
}
