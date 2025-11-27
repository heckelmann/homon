'use client';

import { useState, useMemo } from 'react';
import { ProcessInfo } from '@/lib/ssh';

interface ProcessListProps {
  processes: ProcessInfo[];
}

type SortField = 'pid' | 'user' | 'cpu' | 'mem' | 'command';
type SortDirection = 'asc' | 'desc';

export default function ProcessList({ processes }: ProcessListProps) {
  const [filter, setFilter] = useState('');
  const [sortField, setSortField] = useState<SortField>('cpu');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
  };

  const sortedAndFilteredProcesses = useMemo(() => {
    let filtered = processes;
    if (filter) {
      const lowerFilter = filter.toLowerCase();
      filtered = processes.filter(p => 
        p.command.toLowerCase().includes(lowerFilter) || 
        p.user.toLowerCase().includes(lowerFilter) ||
        p.pid.includes(lowerFilter)
      );
    }

    return filtered.sort((a, b) => {
      let aValue: string | number = a[sortField];
      let bValue: string | number = b[sortField];

      if (sortField === 'cpu' || sortField === 'mem' || sortField === 'pid') {
        aValue = parseFloat(aValue as string);
        bValue = parseFloat(bValue as string);
      }

      if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });
  }, [processes, filter, sortField, sortDirection]);

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) return <span className="ml-1 text-gray-600">↕</span>;
    return <span className="ml-1 text-yellow-400">{sortDirection === 'asc' ? '↑' : '↓'}</span>;
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-bold text-yellow-400 flex items-center gap-2 uppercase tracking-wide">
          <svg className="w-5 h-5 text-yellow-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z" />
          </svg>
          Process Matrix
        </h2>
        <input
          type="text"
          placeholder="Filter processes..."
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          className="bg-[#030712] border border-yellow-500/30 text-yellow-100 px-3 py-1 text-sm focus:outline-none focus:border-yellow-400 focus:shadow-[0_0_10px_rgba(234,179,8,0.3)] w-64 font-mono"
        />
      </div>

      <div className="overflow-x-auto max-h-[400px] overflow-y-auto custom-scrollbar">
        <table className="min-w-full text-left text-sm">
          <thead className="sticky top-0 bg-[#0b101b] z-10">
            <tr className="bg-yellow-900/20 border-b border-yellow-500/30">
              <th 
                className="px-4 py-3 font-medium text-yellow-300 uppercase cursor-pointer hover:text-yellow-200 select-none"
                onClick={() => handleSort('pid')}
              >
                PID <SortIcon field="pid" />
              </th>
              <th 
                className="px-4 py-3 font-medium text-yellow-300 uppercase cursor-pointer hover:text-yellow-200 select-none"
                onClick={() => handleSort('user')}
              >
                User <SortIcon field="user" />
              </th>
              <th 
                className="px-4 py-3 font-medium text-yellow-300 uppercase cursor-pointer hover:text-yellow-200 select-none text-right"
                onClick={() => handleSort('cpu')}
              >
                CPU % <SortIcon field="cpu" />
              </th>
              <th 
                className="px-4 py-3 font-medium text-yellow-300 uppercase cursor-pointer hover:text-yellow-200 select-none text-right"
                onClick={() => handleSort('mem')}
              >
                MEM % <SortIcon field="mem" />
              </th>
              <th 
                className="px-4 py-3 font-medium text-yellow-300 uppercase cursor-pointer hover:text-yellow-200 select-none"
                onClick={() => handleSort('command')}
              >
                Command <SortIcon field="command" />
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-yellow-500/10">
            {sortedAndFilteredProcesses.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-gray-500 italic">
                  No processes found matching filter
                </td>
              </tr>
            ) : (
              sortedAndFilteredProcesses.map((process, i) => (
                <tr key={i} className="hover:bg-yellow-500/10 transition-colors font-mono text-xs">
                  <td className="px-4 py-2 text-gray-400">{process.pid}</td>
                  <td className="px-4 py-2 text-gray-300">{process.user}</td>
                  <td className="px-4 py-2 text-right">
                    <span className={`${parseFloat(process.cpu) > 50 ? 'text-red-400 font-bold' : parseFloat(process.cpu) > 10 ? 'text-yellow-400' : 'text-gray-400'}`}>
                      {process.cpu}
                    </span>
                  </td>
                  <td className="px-4 py-2 text-right">
                    <span className={`${parseFloat(process.mem) > 50 ? 'text-red-400 font-bold' : parseFloat(process.mem) > 10 ? 'text-yellow-400' : 'text-gray-400'}`}>
                      {process.mem}
                    </span>
                  </td>
                  <td className="px-4 py-2 text-cyan-300 truncate max-w-[300px]" title={process.command}>
                    {process.command}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
